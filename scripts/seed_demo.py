"""Seed the OrderBot demo dataset into MongoDB.

Unlike the earlier version of this script, nothing here decides an outcome. The
project, the three version manifests, the runs and the events are all produced
by actually executing the agent in agent/ and runner/: the version B regression
exists because the agent code sends "order_id" while the B schema requires
"orderId", and every run's status is whatever the agent did.

The script then hands the stored data to the analysis engine, so the demo shows
the diagnosis being computed from evidence rather than asserted by the seeder.

Public API is load-bearing and must not change: tests/test_culprit.py,
tests/test_compare.py, tests/test_stats.py and tests/test_verify.py all import
build_manifest_components and call seed_demo(db).
"""

from datetime import datetime, timedelta, timezone
import os
import sys
from typing import Any, Dict, List, Optional

# Ensure repository root is on the python path, matching the existing convention.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pymongo.database import Database

from agent.manifests import build_manifest_components
from backend.app.analysis.compare import compute_manifest_hashes
from backend.app.analysis.culprit import find_suspects
from backend.app.analysis.event_store import insert_events_safe
from backend.app.analysis.verify import verify_fix
from backend.app.db import get_db, setup_db
from runner.harness import execute_version, summarize

PROJECT_ID = "orderbot"
VERSION_IDS = ["A", "B", "C"]
SUITE_VERSION = "1.0.0"

# Versions are spaced a day apart so find_suspects can order them by createdAt
# and award full timing credit when A is compared against B.
VERSION_BASE_TIME = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
RUN_BASE_TIME = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)

# The dependency map is a real claim about the agent, not decoration: refund_order
# is only reached through get_order. blast_radius reads it.
DEPENDENCY_MAP = {
    "get_order": ["refund_order", "order_tracking_workflow"],
}


def build_manifest_components_for(version_id: str) -> Dict[str, Any]:
    """Return the stored manifest components for a version.

    Thin wrapper kept so the seeder has one obvious place to reach the agent's
    manifests. Equivalent to agent.manifests.build_manifest_components.

    Args:
        version_id (str): One of "A", "B", "C".

    Returns:
        Dict[str, Any]: The components dict.
    """
    return build_manifest_components(version_id)


def _ingest(db: Database, events: List[Dict[str, Any]], label: str) -> int:
    """Ingest events and fail loudly if any were rejected.

    insert_events_safe returns rejected documents in a list rather than raising.
    Ignoring that list is how a demo ends up with a third of its regression
    evidence silently missing while every test still reports green: the schema
    validator rejecting a document reduces the evidence count, the score stays
    above the confidence threshold, and nothing surfaces the loss. So this
    raises instead.

    Args:
        db (Database): Target database.
        events (List[Dict[str, Any]]): Event documents to ingest.
        label (str): Description used in the error message.

    Returns:
        int: Number of newly inserted events.

    Raises:
        RuntimeError: If MongoDB rejected or deduplicated anything unexpectedly.
    """
    result = insert_events_safe(db, events)

    if result["rejected"]:
        detail = "; ".join(f"[{r['index']}] {r['reason']}" for r in result["rejected"][:5])
        raise RuntimeError(f"{label}: {len(result['rejected'])} event(s) rejected by MongoDB: {detail}")

    if result["duplicates"]:
        raise RuntimeError(
            f"{label}: {result['duplicates']} duplicate event(s). The demo project should have "
            "been cleared before seeding."
        )

    return result["inserted"]


def seed_demo(db: Optional[Database] = None, run_analysis: bool = True) -> Dict[str, Any]:
    """Seed the orderbot benchmark by executing the agent across versions A, B and C.

    Args:
        db (Optional[Database]): Target database. Defaults to the configured DB_NAME.
        run_analysis (bool): Whether to run find_suspects and verify_fix afterwards.
            Defaults to True, which the test suite depends on: test_verify.py
            requires a finding to already exist before verify_fix runs.

    Returns:
        Dict[str, Any]: Summary with per-version stats, totals, and the analysis
            results when run_analysis is True.
    """
    database = db if db is not None else get_db()
    print(f"Target database: {database.name}")

    setup_db(database)

    # Clear prior state for this project. version_stats is included because
    # stats.success_rate_by_version $merges into it; leaving stale rows would let
    # an older run's pass rates leak into a later analysis.
    for collection in ("projects", "versions", "runs", "events", "findings", "version_stats"):
        database[collection].delete_many({"projectId": PROJECT_ID})

    database["projects"].insert_one(
        {
            "_id": PROJECT_ID,
            "name": "OrderBot",
            "createdAt": VERSION_BASE_TIME,
            "dependencyMap": DEPENDENCY_MAP,
        }
    )

    # Insert the three version manifests.
    for index, version_id in enumerate(VERSION_IDS):
        components = build_manifest_components_for(version_id)
        hashes = compute_manifest_hashes(components)
        database["versions"].insert_one(
            {
                "_id": version_id,
                "projectId": PROJECT_ID,
                "label": f"Release {version_id}",
                "createdAt": VERSION_BASE_TIME + timedelta(days=index),
                "components": components,
                "hashes": hashes["hashes"],
                "manifestHash": hashes["manifestHash"],
            }
        )

    # Execute the agent for every version and store what actually happened.
    per_version: Dict[str, Any] = {}
    total_runs = 0
    total_events = 0

    for version_id in VERSION_IDS:
        executed = execute_version(version_id, PROJECT_ID, RUN_BASE_TIME)
        database["runs"].insert_many(executed.runs)
        total_runs += len(executed.runs)

        inserted = _ingest(database, executed.events, f"version {version_id}")
        total_events += inserted

        stats = summarize(executed)
        per_version[version_id] = stats
        print(
            f"  version {version_id}: {stats['runs']} runs, {stats['passes']} pass, "
            f"{stats['failures']} fail (pass rate {stats['passRate']:.2%})"
        )

    diagnosis = None
    verification = None

    if run_analysis:
        print("\nRunning find_suspects('A', 'B')...")
        diagnosis = find_suspects(database, PROJECT_ID, "A", "B", min_runs=10, save=True)
        suspects = diagnosis.get("suspects") or []
        if suspects:
            top = suspects[0]
            print(
                f"  top suspect: {top['component']} "
                f"(confidence {top['confidence']}, score {top['score']}, "
                f"{top['matchingFailedRuns']}/{top['totalFailedRuns']} failed runs explained)"
            )
            print(f"  reason: {top['reason']}")
        for note in diagnosis.get("uncertainty", []):
            print(f"  uncertainty: {note}")

        print("\nRunning verify_fix('B', 'C', baseline='A')...")
        verification = verify_fix(
            database,
            PROJECT_ID,
            bad_version_id="B",
            fix_version_id="C",
            baseline_version_id="A",
            min_runs=10,
        )
        print(f"  verdict: {verification['result']} -> findings marked {verification['newStatus']}")
        print(f"  reason: {verification['reason']}")

    return {
        "status": "success",
        "projectId": PROJECT_ID,
        "versions": VERSION_IDS,
        "perVersion": per_version,
        "totalRuns": total_runs,
        "totalEvents": total_events,
        "diagnosis": diagnosis,
        "verification": verification,
    }


if __name__ == "__main__":
    print(
        "Seeding will clear existing 'orderbot' data in the target database.\n"
        "Ctrl+C now to abort."
    )
    import time

    time.sleep(3)

    result = seed_demo()
    print(f"\nSeeding complete: {result['totalRuns']} runs, {result['totalEvents']} events.")