"""Evaluation runner: execute cases against versions and emit real records.

This is the entry point Shlok's backend and the demo both drive. It executes the
same case suite against each version, in the same order, with the same attempt
counts, and returns run and event documents describing what actually happened.

Three properties this module is responsible for:

  1. **A runner error is never a pass.** If the agent raises something the
     harness does not expect -- a bug in the agent, a malformed case, a tool
     that vanished -- the run is recorded as status "fail" with the exception in
     failedChecks and the message in an error event. It is never dropped
     silently and never counted as a success. A swallowed exception here would
     inflate every pass rate in the product and make the whole demo a lie. The
     runs validator only permits "pass" or "fail", so "fail" is the only honest
     option available.

  2. **The same cases, every version.** CASES is module-level and frozen, and
     evaluate_version walks it in the same order for A, B and C. Comparing two
     versions therefore compares the same inputs, which is the precondition for
     every comparison the backend performs.

  3. **Nothing is precomputed.** Pass rates in the returned summary are counted
     from the run documents, and latencyMs comes from the agent's deterministic
     virtual clock. No version is special-cased, and nothing here knows that B
     is the broken one.

Replay is not a separate code path. replay_version re-executes a version's cases
and diffs the outcome against the stored baseline, which is why the output is
comparable by construction rather than by convention.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

from runner.agent import OrderBot
from runner.cases import ATTEMPTS_PER_CASE, CASES, Case
from runner.faults import timeout_for
from runner.harness import ExecutionResult, run_case_attempt
from runner.manifests import build_manifest_components

# Pure function, no database access: used so every event ships with the id the
# validator requires and the duplicate-key index recognises.
from backend.app.analysis.event_store import compute_event_id

VERSION_IDS = ("A", "B", "C")

# Runs are spaced so every event timestamp is distinct. find_suspects sorts
# evidence refs by ts and truncates, so tied timestamps would make that ordering
# depend on insertion order.
_RUN_SPACING = timedelta(seconds=2)

# The tool the injected fault aims at. get_order is the interesting choice
# because it is also the tool version B breaks, which keeps the two failure
# modes separable by message.
_TIMEOUT_TOOL = "get_order"


@dataclass
class EvaluationReport:
    """The result of evaluating one or more versions.

    Attributes:
        project_id (str): Project identifier stamped on every record.
        runs (List[Dict[str, Any]]): Run documents across all versions evaluated.
        events (List[Dict[str, Any]]): Event documents awaiting ingestion.
        per_version (Dict[str, Dict[str, Any]]): Per-version counters and rates.
        runner_errors (List[Dict[str, Any]]): Detail for any run that failed
            because the harness itself broke, as opposed to the agent failing a
            case. Empty in a healthy run; anything in here is a bug in this
            repository, not a finding about the agent.
    """

    project_id: str
    runs: List[Dict[str, Any]] = field(default_factory=list)
    events: List[Dict[str, Any]] = field(default_factory=list)
    per_version: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    runner_errors: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def run_count(self) -> int:
        """Return the total number of runs recorded.

        Returns:
            int: Count of run documents.
        """
        return len(self.runs)

    @property
    def event_count(self) -> int:
        """Return the total number of events recorded.

        Returns:
            int: Count of event documents.
        """
        return len(self.events)

    def rate(self, version_id: str) -> float:
        """Return the measured pass rate for one version.

        Args:
            version_id (str): Version identifier.

        Returns:
            float: Passes divided by runs, or 0.0 when the version was not run.
        """
        stats = self.per_version.get(version_id)
        if not stats or not stats["runs"]:
            return 0.0
        return stats["passes"] / stats["runs"]

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable view for transport to the backend.

        The backend needs the documents, not the dataclass, so this is what the
        submit path sends.

        Returns:
            Dict[str, Any]: Project id, documents, per-version stats, and any
                runner errors.
        """
        return {
            "projectId": self.project_id,
            "runs": self.runs,
            "events": self.events,
            "perVersion": self.per_version,
            "runnerErrors": self.runner_errors,
        }


def _stats_for(version_id: str, runs: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Count outcomes for one version.

    Args:
        version_id (str): Version identifier.
        runs (Sequence[Dict[str, Any]]): That version's run documents.

    Returns:
        Dict[str, Any]: Counts, pass rate, failed case ids, and error totals.
    """
    total = len(runs)
    passes = sum(1 for r in runs if r["status"] == "pass")
    failures = sum(1 for r in runs if r["status"] == "fail")
    latencies = [r["latencyMs"] for r in runs]

    return {
        "versionId": version_id,
        "runs": total,
        "passes": passes,
        "failures": failures,
        # Counted from the documents, never assumed.
        "passRate": round(passes / total, 4) if total else 0.0,
        "failedCases": sorted({r["caseId"] for r in runs if r["status"] == "fail"}),
        "avgLatencyMs": int(sum(latencies) / len(latencies)) if latencies else 0,
        "maxLatencyMs": max(latencies) if latencies else 0,
    }


def _record_runner_error(
    case: Case,
    version_id: str,
    project_id: str,
    attempt: int,
    started_at: datetime,
    exc: BaseException,
) -> Dict[str, Any]:
    """Build a failed run and an error event for a harness-level failure.

    Used when the agent raises something the harness did not anticipate. The run
    is recorded as "fail" because the alternative -- leaving it out, or counting
    it as a pass -- would both misrepresent the evaluation. The run documents why
    it failed so it is distinguishable from a genuine agent regression.

    Args:
        case (Case): The case that was executing.
        version_id (str): Version under evaluation.
        project_id (str): Project identifier.
        attempt (int): 1-based attempt number.
        started_at (datetime): Run start time.
        exc (BaseException): The exception raised.

    Returns:
        Dict[str, Any]: {"run": {...}, "events": [...], "error": {...}}.
    """
    run_id = f"run_{project_id}_{version_id}_{case.case_id}_att{attempt}"
    message = f"{type(exc).__name__}: {exc}"

    run_doc = {
        "_id": run_id,
        "projectId": project_id,
        "versionId": version_id,
        "caseId": case.case_id,
        "suiteVersion": "1.0.0",
        "attempt": attempt,
        "status": "fail",
        # runner_error is not a product taxonomy value; it marks this failure as
        # a defect in the harness rather than a behaviour of the agent.
        "failedChecks": ["runner_error"],
        "latencyMs": 0,
        "startedAt": started_at,
    }

    event_docs = [
        {
            "eventId": compute_event_id(run_id, 1, "error"),
            "runId": run_id,
            "projectId": project_id,
            "versionId": version_id,
            "seq": 1,
            "type": "error",
            "ts": started_at,
            "payload": {
                "tool": None,
                "message": message,
                # Distinct from ToolValidationError, and deliberately not a
                # taxonomy label, so classify_error has to match on the message.
                "errorType": "RunnerError",
                "attempt": attempt,
                "caseId": case.case_id,
            },
        },
        {
            "eventId": compute_event_id(run_id, 2, "output"),
            "runId": run_id,
            "projectId": project_id,
            "versionId": version_id,
            "seq": 2,
            "type": "output",
            "ts": started_at + timedelta(milliseconds=1),
            "payload": {"text": "Evaluation aborted: the runner could not execute this case."},
        },
    ]

    return {
        "run": run_doc,
        "events": event_docs,
        "error": {
            "versionId": version_id,
            "caseId": case.case_id,
            "attempt": attempt,
            "exception": type(exc).__name__,
            "message": str(exc),
        },
    }


def evaluate_version(
    version_id: str,
    project_id: str = "orderbot",
    base_time: Optional[datetime] = None,
    attempts: int = ATTEMPTS_PER_CASE,
    cases: Optional[Sequence[Case]] = None,
) -> ExecutionResult:
    """Execute the full case suite against one version.

    Args:
        version_id (str): One of "A", "B", "C".
        project_id (str): Project identifier stamped on every record.
        base_time (Optional[datetime]): Timestamp for the first run. Defaults to
            a fixed instant so repeated evaluations produce identical documents.
        attempts (int): Attempts per case.
        cases (Optional[Sequence[Case]]): Subset of the suite to run. Defaults to
            all of CASES. Passing the same subset for two versions is what makes
            a like-for-like comparison.

    Returns:
        ExecutionResult: Run documents, event documents, and counters.

    Raises:
        ValueError: If version_id is not a known version.
    """
    if version_id not in VERSION_IDS:
        raise ValueError(f"Unknown version {version_id!r}; expected one of {list(VERSION_IDS)}")

    suite = list(cases) if cases is not None else list(CASES)
    components = build_manifest_components(version_id)
    result = ExecutionResult(version_id=version_id)

    start = base_time or datetime(2026, 1, 1, 10, 0, tzinfo=None)
    cursor = 0

    for case in suite:
        for attempt in range(1, attempts + 1):
            started_at = start + _RUN_SPACING * cursor
            cursor += 1

            try:
                executed = run_case_attempt(
                    case=case,
                    version_id=version_id,
                    attempt=attempt,
                    project_id=project_id,
                    started_at=started_at,
                    components=components,
                )
            except Exception as exc:  # noqa: BLE001 - must never escape as a pass
                executed = _record_runner_error(
                    case, version_id, project_id, attempt, started_at, exc
                )
                result.runner_errors.append(executed["error"])

            result.runs.append(executed["run"])
            result.events.extend(executed["events"])

    result.stats = {
        "runs": len(result.runs),
        "events": len(result.events),
        "passes": sum(1 for r in result.runs if r["status"] == "pass"),
        "failures": sum(1 for r in result.runs if r["status"] == "fail"),
    }
    result.details = _stats_for(version_id, result.runs)
    return result


def evaluate_all_versions(
    project_id: str = "orderbot",
    base_time: Optional[datetime] = None,
    attempts: int = ATTEMPTS_PER_CASE,
    version_ids: Sequence[str] = VERSION_IDS,
) -> EvaluationReport:
    """Evaluate every version against the identical case suite.

    Args:
        project_id (str): Project identifier.
        base_time (Optional[datetime]): Timestamp for the first run. Each
            version starts a day apart so createdAt ordering is meaningful.
        attempts (int): Attempts per case.
        version_ids (Sequence[str]): Versions to evaluate, in order.

    Returns:
        EvaluationReport: All documents plus per-version statistics.
    """
    anchor = base_time or datetime(2026, 1, 1, 10, 0)
    report = EvaluationReport(project_id=project_id)

    for offset, version_id in enumerate(version_ids):
        result = evaluate_version(
            version_id=version_id,
            project_id=project_id,
            base_time=anchor + timedelta(days=offset),
            attempts=attempts,
        )
        report.runs.extend(result.runs)
        report.events.extend(result.events)
        report.per_version[version_id] = result.details
        report.runner_errors.extend(result.runner_errors)

    return report


def replay_version(
    version_id: str,
    baseline: Optional[EvaluationReport] = None,
    project_id: str = "orderbot",
    attempts: int = ATTEMPTS_PER_CASE,
) -> Dict[str, Any]:
    """Re-execute a version's cases and diff against a stored baseline.

    Replay reuses the same case objects and the same attempt counts, so a
    difference in outcome can only come from a change in the agent or its
    manifest, never from a different test set.

    Args:
        version_id (str): Version to re-run.
        baseline (Optional[EvaluationReport]): Earlier results to compare against.
            When None, the replay runs standalone and reports itself only.
        project_id (str): Project identifier.
        attempts (int): Attempts per case.

    Returns:
        Dict[str, Any]: The fresh run documents plus a diff describing which
            (caseId, attempt) pairs changed status, and the measured rates.
    """
    fresh = evaluate_version(
        version_id=version_id,
        project_id=project_id,
        attempts=attempts,
    )

    outcome = {
        "versionId": version_id,
        "runs": len(fresh.runs),
        "events": len(fresh.events),
        "passRate": fresh.details["passRate"],
        "failedCases": fresh.details["failedCases"],
        "runnerErrors": fresh.runner_errors,
        "deterministic": True,
        "comparedAgainst": None,
        "changed": [],
        "regressed": [],
        "recovered": [],
    }

    if baseline is None:
        return outcome

    def key(run: Dict[str, Any]) -> str:
        """Return the identity of a run for comparison.

        Args:
            run (Dict[str, Any]): Run document.

        Returns:
            str: "caseId/attempt".
        """
        return f"{run['caseId']}/{run['attempt']}"

    before = {key(r): r["status"] for r in baseline.runs if r["versionId"] == version_id}
    after = {key(r): r["status"] for r in fresh.runs}

    changed = sorted(k for k in set(before) & set(after) if before[k] != after[k])
    outcome["comparedAgainst"] = f"stored:{version_id}"
    outcome["changed"] = changed
    outcome["regressed"] = [k for k in changed if after[k] == "fail"]
    outcome["recovered"] = [k for k in changed if after[k] == "pass"]
    outcome["deterministic"] = not changed
    return outcome


def summarize_report(report: EvaluationReport) -> str:
    """Render an evaluation report as a short human-readable table.

    Args:
        report (EvaluationReport): Completed evaluation.

    Returns:
        str: One summary line per version, plus a runner-error count.
    """
    lines = []
    for version_id in report.per_version:
        stats = report.per_version[version_id]
        lines.append(
            f"  version {version_id}: {stats['passes']}/{stats['runs']} pass "
            f"({stats['passRate']:.2%}), {stats['failures']} fail, "
            f"avg {stats['avgLatencyMs']}ms"
        )
    if report.runner_errors:
        lines.append(f"  RUNNER ERRORS: {len(report.runner_errors)} (harness defects, not agent findings)")
    else:
        lines.append("  runner errors: none")
    return "\n".join(lines)


def _cli() -> int:
    """Run the evaluation from the command line and print the summary.

    Returns:
        int: Exit code. Non-zero if the harness itself failed, so a broken
            runner cannot be mistaken for a clean evaluation.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Run the OrderBot evaluation suite.")
    parser.add_argument("--version", choices=list(VERSION_IDS), help="Evaluate a single version.")
    parser.add_argument("--project", default="orderbot", help="Project identifier.")
    args = parser.parse_args()

    if args.version:
        result = evaluate_version(version_id=args.version, project_id=args.project)
        print(f"  version {args.version}: {result.stats}")
        print(f"  failed cases: {result.details['failedCases']}")
        return 1 if result.runner_errors else 0

    report = evaluate_all_versions(project_id=args.project)
    print(f"Project: {report.project_id}")
    print(f"Total: {report.run_count} runs, {report.event_count} events")
    print(summarize_report(report))
    return 1 if report.runner_errors else 0


if __name__ == "__main__":
    raise SystemExit(_cli())