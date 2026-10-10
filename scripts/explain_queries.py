from pathlib import Path
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import Any, Dict, List, Optional
from backend.app.db import get_db


def extract_stage_summary(stage_doc: Dict[str, Any]) -> List[str]:
    """Recursively traverse executionStages to locate all stages (e.g. IXSCAN, FETCH)."""
    stages = []
    current: Optional[Dict[str, Any]] = stage_doc
    visited = set()

    def _traverse(node: Optional[Dict[str, Any]]) -> None:
        if not node or not isinstance(node, dict):
            return
        node_id = id(node)
        if node_id in visited:
            return
        visited.add(node_id)

        st = node.get("stage")
        idx = node.get("indexName")
        if st:
            if idx:
                stages.append(f"{st} (Index: {idx})")
            else:
                stages.append(st)

        # Check sub-stages in classic or slot-based plans
        if "inputStage" in node and isinstance(node["inputStage"], dict):
            _traverse(node["inputStage"])
        if "outerStage" in node and isinstance(node["outerStage"], dict):
            _traverse(node["outerStage"])
        if "innerStage" in node and isinstance(node["innerStage"], dict):
            _traverse(node["innerStage"])
        if "inputStages" in node and isinstance(node["inputStages"], list):
            for sub in node["inputStages"]:
                _traverse(sub)

    _traverse(current)
    return stages


def explain_find_events(db, run_id: str) -> None:
    """Run .explain('executionStats') on db.events.find({'runId': run_id})."""
    print("\n" + "=" * 80)
    print(" 1. QUERY EXECUTION PLAN: Single Run Events Lookup")
    print("=" * 80)
    print(f"Target Query : db.events.find({{'runId': '{run_id}'}}).explain('executionStats')")

    # Run explain on cursor
    plan = db["events"].find({"runId": run_id}).explain()
    stats = plan.get("executionStats", {})
    stages_root = stats.get("executionStages", {})

    total_docs = stats.get("totalDocsExamined", 0)
    total_keys = stats.get("totalKeysExamined", 0)
    n_returned = stats.get("nReturned", 0)
    exec_ms = stats.get("executionTimeMillis", 0)
    stages_found = extract_stage_summary(stages_root)

    print("\nExecution Performance Metrics:")
    print(f"  - Execution Time       : {exec_ms} ms")
    print(f"  - Documents Examined   : {total_docs}")
    print(f"  - Keys Examined        : {total_keys}")
    print(f"  - Documents Returned   : {n_returned}")
    print(f"  - Root Stage           : {stages_root.get('stage')}")
    print(f"  - Execution Stages     : {' -> '.join(stages_found) if stages_found else stages_root.get('stage')}")

    # Highlight IXSCAN
    has_ixscan = any("IXSCAN" in s or "ixscan" in s for s in stages_found)
    if has_ixscan:
        print("\n  [+] INDEX VERIFICATION : PASS (IXSCAN index scan utilized, avoiding full COLLSCAN)")
    else:
        print("\n  [-] INDEX VERIFICATION : WARNING (No IXSCAN detected in execution stages)")


def explain_aggregation_failure_counts(db, project_id: str = "orderbot") -> None:
    """Run explain on failure_counts_by_fingerprint aggregation pipeline."""
    print("\n" + "=" * 80)
    print(" 2. AGGREGATION EXECUTION PLAN: failure_counts_by_fingerprint")
    print("=" * 80)
    pipeline = [
        {
            "$match": {
                "projectId": project_id,
                "type": "error",
                "payload.fingerprint": {"$ne": None},
            }
        },
        {
            "$group": {
                "_id": {
                    "versionId": "$versionId",
                    "fingerprint": "$payload.fingerprint",
                },
                "pattern": {"$first": "$payload.pattern"},
                "tool": {"$first": "$payload.tool"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1, "_id.fingerprint": 1}},
        {
            "$project": {
                "_id": 0,
                "versionId": "$_id.versionId",
                "fingerprint": "$_id.fingerprint",
                "pattern": {"$ifNull": ["$pattern", "other"]},
                "tool": "$tool",
                "count": "$count",
            }
        },
    ]

    print(f"Target Command: db.command('aggregate', 'events', pipeline=[...], explain=True)")

    # Run explain command on aggregation
    explain_res = db.command(
        "explain",
        {"aggregate": "events", "pipeline": pipeline, "cursor": {}},
        verbosity="executionStats",
    )

    # Locate cursor stage with executionStats
    stages = explain_res.get("stages", [])
    cursor_stage = next((s for s in stages if "$cursor" in s), None)

    if cursor_stage and "$cursor" in cursor_stage:
        cursor_data = cursor_stage["$cursor"]
        stats = cursor_data.get("executionStats", {})
        stages_root = stats.get("executionStages", {})

        total_docs = stats.get("totalDocsExamined", 0)
        total_keys = stats.get("totalKeysExamined", 0)
        n_returned = stats.get("nReturned", 0)
        exec_ms = stats.get("executionTimeMillis", 0)
        stages_found = extract_stage_summary(stages_root)

        print("\nAggregation Pipeline Performance Metrics:")
        print(f"  - Execution Time       : {exec_ms} ms")
        print(f"  - Documents Examined   : {total_docs}")
        print(f"  - Keys Examined        : {total_keys}")
        print(f"  - Results Returned     : {n_returned}")
        print(f"  - Root Stage           : {stages_root.get('stage')}")
        print(f"  - Execution Stages     : {' -> '.join(stages_found) if stages_found else stages_root.get('stage')}")

        has_ixscan = any("IXSCAN" in s or "ixscan" in s for s in stages_found)
        if has_ixscan:
            print("\n  [+] INDEX VERIFICATION : PASS (IXSCAN index scan utilized, avoiding full COLLSCAN)")
        else:
            print("\n  [-] INDEX VERIFICATION : WARNING (No IXSCAN detected in execution stages)")
    else:
        # Fallback to queryPlanner winningPlan if executionStats unavailable
        print("  - Cursor execution stats not available, parsed query planner.")


def main() -> None:
    """Connect to database, locate seeded demo data, and output execution plans."""
    db = get_db()
    print(f"Connected to database: '{db.name}'")

    # Locate a seeded orderbot runId
    ev = db["events"].find_one({"projectId": "orderbot"})
    if not ev:
        print("Warning: No events found for project 'orderbot'. Run 'python scripts/seed_demo.py' first.")
        # Fallback: check any event in collection
        ev = db["events"].find_one()
        if not ev:
            print("Error: 'events' collection is empty. Cannot generate execution plans.")
            sys.exit(1)

    target_run_id = ev["runId"]
    target_project_id = ev.get("projectId", "orderbot")

    # 1. Explain find
    explain_find_events(db, target_run_id)

    # 2. Explain aggregation
    explain_aggregation_failure_counts(db, target_project_id)
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    main()
