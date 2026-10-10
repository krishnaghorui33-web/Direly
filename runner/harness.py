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

from runner.agent import AgentTrace, OrderBot
from runner.manifests import build_manifest_components
from runner.cases import ATTEMPTS_PER_CASE, Case
from runner.faults import timeout_for

# Imported for the eventId formula only. This is a pure function with no
# database access, so the runner stays free of MongoDB while producing ids the
# backend's duplicate-key index recognises.
from backend.app.analysis.event_store import compute_event_id

SUITE_VERSION = "1.0.0"


@dataclass
class ExecutionResult:
    """The documents produced by executing a version.

    Attributes:
        version_id (str): The version that was executed.
        runs (List[Dict[str, Any]]): Run documents.
        events (List[Dict[str, Any]]): Event documents, ready for
            insert_events_safe.
        stats (Dict[str, int]): Counters summarising the run.
        details (Dict[str, Any]): Richer per-version statistics, including the
            measured pass rate and the failed case ids.
        runner_errors (List[Dict[str, Any]]): Cases that failed because the
            harness raised, rather than because the agent misbehaved. Empty in a
            healthy run. Populated by runner.evaluator.
    """

    version_id: str
    runs: List[Dict[str, Any]] = field(default_factory=list)
    events: List[Dict[str, Any]] = field(default_factory=list)
    stats: Dict[str, int] = field(default_factory=dict)
    details: Dict[str, Any] = field(default_factory=dict)
    runner_errors: List[Dict[str, Any]] = field(default_factory=list)


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
                # Computed here rather than left to insert_events_safe. The
                # events validator requires eventId, and the HTTP submit path
                # has to be able to ship complete records. Using the backend's
                # own formula keeps the id identical whichever route ingests it,
                # so the duplicate-key index still makes re-submission idempotent.
                "eventId": compute_event_id(run_id, index, event.type),
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
    project_id: str = "orderbot",
    base_time: Optional[datetime] = None,
    attempts: int = ATTEMPTS_PER_CASE,
) -> ExecutionResult:
    """Execute the whole suite against one version.

    Thin delegate to runner.evaluator.evaluate_version, which owns the execution
    loop and the runner-error handling. This alias exists because
    scripts/seed_demo.py calls it, and keeping one implementation means the
    seeder and the evaluator can never drift apart.

    Args:
        version_id (str): Version to execute.
        project_id (str): Project identifier.
        base_time (Optional[datetime]): Timestamp for the first run.
        attempts (int): Attempts per case.

    Returns:
        ExecutionResult: The run and event documents plus summary counters.
    """
    from runner.evaluator import evaluate_version

    return evaluate_version(
        version_id=version_id,
        project_id=project_id,
        base_time=base_time,
        attempts=attempts,
    )


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