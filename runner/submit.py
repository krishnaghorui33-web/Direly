"""Ship finished evaluation records to Shlok's backend over HTTP.

The runner's responsibility ends at producing records. Persisting them belongs
to the backend, which owns the routes, the schema validation, and redaction. So
this module is a thin HTTP client: it serialises an EvaluationReport into the
agreed payload shape and POSTs it. It contains no MongoDB code and no fallback
that writes to the database directly, because a silent fallback would make the
data path ambiguous exactly when it matters -- during a demo, when something has
gone wrong and nobody is sure which path the data took.

Nothing here decides an outcome. The payload carries measured runs and events;
the backend computes diagnosis.

ENDPOINT CONTRACT -- needs Shlok's confirmation before this is usable.

    POST /api/runs
    Body: {"projectId": str, "runs": [...], "events": [...]}
    Expected: 2xx with {"inserted": int, "duplicates": int, "rejected": [...]}

    POST /api/replay
    Body: {"projectId": str, "versionId": str, "baselineVersionId": str|null}
    Expected: 2xx with a verdict and the diff.

The field names below match the run and event documents the runners validator
already expects (projectId, runId, versionId, caseId, status, latencyMs,
startedAt / eventId, runId, versionId, type, ts, payload), because those are the
fields the backend's ingestion route has to accept for insert_events_safe to
work. If Shlok's route names differ, only the two dicts below need to change.

When the backend is unreachable, every function here raises SubmissionError
rather than falling back. A caller that wants a file instead can call
write_payload, which is useful for the demo and for debugging a failing ingest
without a running server.
"""

import json
import os
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_BASE_URL = os.getenv("DIRELY_API_URL", "http://localhost:8000")
DEFAULT_TIMEOUT = 30.0


class SubmissionError(RuntimeError):
    """Raised when records cannot be delivered to the backend.

    Attributes:
        status (Optional[int]): HTTP status code, when the server replied.
        body (Optional[str]): Response body, for diagnosing a 4xx or 5xx.
    """

    def __init__(self, message: str, status: Optional[int] = None, body: Optional[str] = None):
        """Record the failure detail alongside the message.

        Args:
            message (str): Human-readable description.
            status (Optional[int]): HTTP status code if one was received.
            body (Optional[str]): Response body if one was received.
        """
        super().__init__(message)
        self.status = status
        self.body = body


def build_runs_payload(report: Any) -> Dict[str, Any]:
    """Build the POST /api/runs body from an evaluation report.

    Args:
        report (EvaluationReport): Completed evaluation.

    Returns:
        Dict[str, Any]: {"projectId", "runs", "events"} ready to serialise.

    Raises:
        SubmissionError: If the report contains runner errors. Sending a report
            with harness defects would let a broken runner look like a real
            evaluation, so it is refused rather than transmitted.
    """
    runner_errors = getattr(report, "runner_errors", None)
    if runner_errors:
        raise SubmissionError(
            f"Refusing to submit: {len(runner_errors)} runner error(s). A harness defect "
            "would be indistinguishable from an agent finding once stored.",
            body=json.dumps(runner_errors[:3], default=str),
        )

    return {
        "projectId": report.project_id,
        "runs": report.runs,
        "events": report.events,
    }


def build_replay_payload(
    project_id: str,
    version_id: str,
    baseline_version_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build the POST /api/replay body.

    Args:
        project_id (str): Project identifier.
        version_id (str): Version being replayed.
        baseline_version_id (Optional[str]): Version to compare against.

    Returns:
        Dict[str, Any]: Request body.
    """
    return {
        "projectId": project_id,
        "versionId": version_id,
        "baselineVersionId": baseline_version_id,
    }


def write_payload(payload: Dict[str, Any], path: str) -> str:
    """Write a payload to disk as JSON, for the demo or for debugging.

    Datetimes are stringified because the default encoder cannot handle them.
    This is a convenience for handing records to a backend that is not running;
    it is not a persistence path, and it never touches MongoDB.

    Args:
        payload (Dict[str, Any]): Payload to serialise.
        path (str): Destination file path.

    Returns:
        str: The path written.
    """
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, default=str)
    return path


def post_json(
    url: str,
    payload: Dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """POST a JSON payload and parse the JSON response.

    Args:
        url (str): Absolute endpoint URL.
        payload (Dict[str, Any]): Body to send.
        timeout (float): Seconds to wait for a response.

    Returns:
        Dict[str, Any]: Parsed response body.

    Raises:
        SubmissionError: On a transport failure, a non-2xx status, or a
            response that is not JSON.
    """
    body = json.dumps(payload, default=str).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SubmissionError(
            f"{url} returned HTTP {exc.code}",
            status=exc.code,
            body=detail,
        ) from exc
    except URLError as exc:
        raise SubmissionError(
            f"Could not reach {url}: {exc.reason}. Is the backend running?"
        ) from exc

    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        raise SubmissionError(
            f"{url} returned a non-JSON response",
            body=raw[:500],
        ) from exc


def submit_runs(
    report: Any,
    base_url: str = DEFAULT_BASE_URL,
    timeout: float = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """Send an evaluation report to POST /api/runs.

    Args:
        report (EvaluationReport): Completed evaluation.
        base_url (str): Backend root URL.
        timeout (float): Seconds to wait for a response.

    Returns:
        Dict[str, Any]: The backend's ingestion summary, expected to carry
            inserted, duplicates and rejected counts.

    Raises:
        SubmissionError: If the backend is unreachable, rejects the payload,
            or the report contains runner errors.
    """
    payload = build_runs_payload(report)
    return post_json(f"{base_url.rstrip('/')}/api/runs", payload, timeout)


def submit_replay(
    project_id: str,
    version_id: str,
    baseline_version_id: Optional[str] = None,
    base_url: str = DEFAULT_BASE_URL,
    timeout: float = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """Ask the backend to compare a replayed version against a baseline.

    Args:
        project_id (str): Project identifier.
        version_id (str): Version being replayed.
        baseline_version_id (Optional[str]): Baseline version id.
        base_url (str): Backend root URL.
        timeout (float): Seconds to wait for a response.

    Returns:
        Dict[str, Any]: The backend's replay verdict.

    Raises:
        SubmissionError: If the backend is unreachable or returns an error.
    """
    payload = build_replay_payload(project_id, version_id, baseline_version_id)
    return post_json(f"{base_url.rstrip('/')}/api/replay", payload, timeout)


def submit_all_versions(
    project_id: str = "orderbot",
    base_url: str = DEFAULT_BASE_URL,
    timeout: float = DEFAULT_TIMEOUT,
) -> List[Dict[str, Any]]:
    """Evaluate every version and submit the whole report in one request.

    Args:
        project_id (str): Project identifier.
        base_url (str): Backend root URL.
        timeout (float): Seconds to wait for a response.

    Returns:
        List[Dict[str, Any]]: A single-element list holding the backend's
            ingestion summary, so callers can treat it uniformly.

    Raises:
        SubmissionError: If evaluation produced runner errors, or submission failed.
    """
    from runner.evaluator import evaluate_all_versions

    report = evaluate_all_versions(project_id=project_id)
    return [submit_runs(report, base_url=base_url, timeout=timeout)]


def _cli() -> int:
    """Submit an evaluation to the backend from the command line.

    Returns:
        int: Exit code, non-zero on any submission failure.
    """
    import argparse

    from runner.evaluator import evaluate_all_versions, summarize_report

    parser = argparse.ArgumentParser(
        description="Evaluate OrderBot and POST the records to the backend."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Backend root URL.")
    parser.add_argument("--project", default="orderbot", help="Project identifier.")
    parser.add_argument(
        "--out",
        help="Also write the payload to this JSON file instead of POSTing.",
    )
    args = parser.parse_args()

    report = evaluate_all_versions(project_id=args.project)
    print(f"Evaluated {report.run_count} runs, {report.event_count} events")
    print(summarize_report(report))

    if report.runner_errors:
        print("Refusing to submit: the runner itself failed.")
        return 1

    if args.out:
        path = write_payload(build_runs_payload(report), args.out)
        print(f"Payload written to {path}")
        return 0

    try:
        response = submit_runs(report, base_url=args.base_url)
    except SubmissionError as exc:
        print(f"Submission failed: {exc}")
        if exc.body:
            print(exc.body[:800])
        return 1

    print(f"Backend response: {response}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())