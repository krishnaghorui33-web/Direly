"""Execution harness: run the agent, emit runs and events documents.

Every run's status comes from what the agent actually did during this call.
Nothing is precomputed, so the dataset is a record of execution rather than a
description of intended outcomes.

Two schema details are load-bearing and easy to get wrong:

  * ``latencyMs`` must be an int. The runs validator declares only
    ["int", "long"], so a Python float encodes as BSON double and the document is
    rejected with code 121. Timing is taken from the agent's deterministic
    virtual clock, not wall time, which keeps runs reproducible AND sidesteps the
    float problem entirely.

  * Every event gets a distinct, increasing ``ts``. find_suspects sorts evidence
    refs by ts and takes the first 10, so tied timestamps would make that ordering
    depend on insertion order.

Event ids are not set here. insert_events_safe computes each one as
sha1("<runId>:<seq>:<type>"), which is what makes re-ingesting the same batch
idempotent and lets the duplicate-key index do its job.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from agent.agent import AgentTrace, OrderBot
from agent.manifests import build_manifest_components
from runner.cases import ATTEMPTS_PER_CASE, CASES, Case
from runner.faults import timeout_for

SUITE_VERSION = "1.0.0"

# Spacing between consecutive runs' start times. Combined with the per-event
# offsets inside a run, this guarantees every ts in a version is distinct.
_RUN_SPACING = timedelta(seconds=2)


@dataclass
class ExecutionResult:
    """The documents produced by executing a version.

    Attributes:
        version_id (str): The version that was executed.
        runs (List[Dict[str, Any]]): Run documents.
        events (List[Dict[str, Any]]): Event documents, ready for
            insert_events_safe.
        stats (Dict[str, int]): Counters summarising the run.
    """

    version_id: str
    runs: List[Dict[str, Any]] = field(default_factory=list)
    events: List[Dict[str, Any]] = field(default_factory=list)
    stats: Dict[str, int] = field(default_factory=dict)


def run_case_attempt(
    case: Case,
    version_id: str,
    attempt: int,
    project_id: str,
    started_at: datetime,
    components: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Execute one case at one attempt and return its run and event documents.

    Args:
        case (Case): The case to execute.
        version_id (str): Version whose manifest and code are in play.
        attempt (int): 1-based attempt number.
        project_id (str): Project identifier for the stored documents.
        started_at (datetime): Run start time.
        components (Optional[Dict[str, Any]]): Manifest components; rebuilt
            from the version when omitted.

    Returns:
        Dict[str, Any]: {"run": {...}, "events": [...], "trace": AgentTrace}.
    """
    manifest = components if components is not None else build_manifest_components(version_id)
    bot = OrderBot(manifest, version_id)

    injected = timeout_for(version_id, case.case_id, attempt)
    trace = bot.run(
        user_input=case.user_input,
        case_id=case.case_id,
        attempt=attempt,
        started_at=started_at,
        timeout_tool="get_order" if injected else None,
        timeout_message=injected,
    )

    run_id = f"run_{project_id}_{version_id}_{case.case_id}_att{attempt}"

    run_doc: Dict[str, Any] = {
        "_id": run_id,
        "projectId": project_id,
        "versionId": version_id,
        "caseId": case.case_id,
        "suiteVersion": SUITE_VERSION,
        "attempt": attempt,
        "status": trace.status,
        "failedChecks": list(trace.failed_checks),
        # Explicit int(): the validator rejects a BSON double here.
        "latencyMs": int(trace.latency_ms),
        "startedAt": started_at,
    }

    event_docs: List[Dict[str, Any]] = []
    for index, event in enumerate(trace.events, start=1):
        event_docs.append(
            {
                "runId": run_id,
                "projectId": project_id,
                "versionId": version_id,
                "seq": index,
                "type": event.type,
                "ts": started_at + timedelta(milliseconds=event.offset_ms),
                "payload": dict(event.payload),
            }
        )

    return {"run": run_doc, "events": event_docs, "trace": trace}


def execute_version(
    version_id: str,
    project_id: str,
    base_time: datetime,
    attempts: int = ATTEMPTS_PER_CASE,
) -> ExecutionResult:
    """Execute the whole suite against one version.

    Args:
        version_id (str): Version to execute.
        project_id (str): Project identifier.
        base_time (datetime): Timestamp for the first run.
        attempts (int): Attempts per case.

    Returns:
        ExecutionResult: The run and event documents plus summary counters.
    """
    components = build_manifest_components(version_id)
    result = ExecutionResult(version_id=version_id)

    cursor = 0
    for case in CASES:
        for attempt in range(1, attempts + 1):
            started_at = base_time + _RUN_SPACING * cursor
            cursor += 1

            executed = run_case_attempt(
                case=case,
                version_id=version_id,
                attempt=attempt,
                project_id=project_id,
                started_at=started_at,
                components=components,
            )
            result.runs.append(executed["run"])
            result.events.extend(executed["events"])

    result.stats = {
        "runs": len(result.runs),
        "events": len(result.events),
        "passes": sum(1 for r in result.runs if r["status"] == "pass"),
        "failures": sum(1 for r in result.runs if r["status"] == "fail"),
    }
    return result


def summarize(result: ExecutionResult) -> Dict[str, Any]:
    """Summarize an execution result, including which cases failed.

    Args:
        result (ExecutionResult): The completed execution.

    Returns:
        Dict[str, Any]: Counts, pass rate, and per-case failure detail.
    """
    total = len(result.runs)
    passes = result.stats.get("passes", 0)
    failed_runs = [r for r in result.runs if r["status"] == "fail"]

    return {
        "versionId": result.version_id,
        "runs": total,
        "passes": passes,
        "failures": len(failed_runs),
        "passRate": round(passes / total, 4) if total else 0.0,
        "failedCases": sorted({r["caseId"] for r in failed_runs}),
        "errorEvents": sum(1 for e in result.events if e["type"] == "error"),
    }