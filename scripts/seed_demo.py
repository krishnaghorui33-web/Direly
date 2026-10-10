"""Seed demo dataset for OrderBot benchmark across versions A, B, and C."""

from datetime import datetime, timezone, timedelta
import hashlib
import random
import uuid
from typing import Any, Dict, List, Optional
from pymongo.database import Database

from backend.app.db import get_db, setup_db
from backend.app.analysis.compare import compute_manifest_hashes
from backend.app.analysis.event_store import insert_events_safe


def build_manifest_components(version_id: str) -> Dict[str, Any]:
    """Build components dictionary for version A, B, or C."""
    prompt = "You are an AI order processing agent. Help users check order statuses, process refunds, and search return policies."
    model = {"name": "gpt-4o", "temperature": 0.0}
    retrieval = {"index": "order_policies_v1", "topK": 3}
    code = {"commit": "c0ffee11" if version_id != "C" else "c0ffee22"}

    tool_refund = {
        "name": "refund_order",
        "description": "Process refund for order_id",
        "parameters": {
            "type": "object",
            "properties": {"order_id": {"type": "string", "description": "Order ID"}},
            "required": ["order_id"],
        },
    }
    tool_search = {
        "name": "search_policy",
        "description": "Search return policies",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Search keywords"}},
            "required": ["query"],
        },
    }

    if version_id == "A":
        tool_get_order = {
            "name": "get_order",
            "description": "Retrieve order details by order_id",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string", "description": "The unique order identifier"}
                },
                "required": ["order_id"],
            },
        }
    else:
        # B and C use parameter rename to 'orderId'
        tool_get_order = {
            "name": "get_order",
            "description": "Retrieve order details by orderId",
            "parameters": {
                "type": "object",
                "properties": {
                    "orderId": {"type": "string", "description": "The unique order identifier"}
                },
                "required": ["orderId"],
            },
        }

    return {
        "prompt": prompt,
        "tools": [tool_get_order, tool_refund, tool_search],
        "model": model,
        "retrieval": retrieval,
        "code": code,
    }


def seed_demo(db: Optional[Database] = None) -> Dict[str, Any]:
    """Seed benchmark project 'orderbot' with versions A, B, and C (60 runs each).

    Args:
        db (Optional[Database]): PyMongo Database instance. Defaults to get_db().

    Returns:
        Dict[str, Any]: Summary of seeded versions, runs, and events.
    """
    database = db if db is not None else get_db()
    setup_db(database)

    # 1. Project document with dependencyMap
    project_id = "orderbot"
    project_doc = {
        "_id": project_id,
        "name": "OrderBot",
        "createdAt": datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        "dependencyMap": {
            "get_order": ["refund_order", "order_tracking_workflow"],
        },
    }
    database["projects"].replace_one({"_id": project_id}, project_doc, upsert=True)

    # 2. Versions A, B, C
    base_time = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
    version_ids = ["A", "B", "C"]

    for idx, v_id in enumerate(version_ids):
        components = build_manifest_components(v_id)
        manifest_meta = compute_manifest_hashes(components)
        v_doc = {
            "_id": v_id,
            "projectId": project_id,
            "label": f"Release {v_id}",
            "createdAt": base_time + timedelta(days=idx),
            "components": components,
            "hashes": manifest_meta["hashes"],
            "manifestHash": manifest_meta["manifestHash"],
        }
        database["versions"].replace_one({"_id": v_id}, v_doc, upsert=True)

    # 3. 20 cases (c01 - c20) x 3 attempts = 60 runs per version
    cases = [f"c{i:02d}" for i in range(1, 21)]
    order_cases = set(cases[:12])  # c01 to c12 exercise get_order / refund_order

    total_runs_created = 0
    total_events_created = 0

    # Deterministic seed for reproducible runs
    rng = random.Random(42)

    for v_id in version_ids:
        v_runs = []
        v_events = []

        for case_id in cases:
            for attempt in [1, 2, 3]:
                run_id = f"run_{project_id}_{v_id}_{case_id}_att{attempt}"
                run_start = base_time + timedelta(hours=attempt, minutes=int(case_id[1:]))

                # Determine outcome status
                status = "pass"
                failed_checks = []
                error_msg = None
                error_tool = None
                error_pattern = None

                if v_id == "A":
                    # Incidental timeout on c15 att 2
                    if case_id == "c15" and attempt == 2:
                        status = "fail"
                        failed_checks = ["timeout"]
                        error_msg = "Model request timed out after 30000ms"
                        error_pattern = "timeout"
                    # Real flaky case on c03: att 1 pass, att 2 fail, att 3 pass
                    elif case_id == "c03" and attempt == 2:
                        status = "fail"
                        failed_checks = ["tool_result"]
                        error_msg = "Gateway timed out during policy retrieval"
                        error_pattern = "timeout"
                elif v_id == "B":
                    # Every attempt of c01 to c12 fails due to renamed argument
                    if case_id in order_cases:
                        status = "fail"
                        failed_checks = ["invalid_arguments"]
                        tx_hash = hashlib.sha1(f"{case_id}_{attempt}_{rng.randint(1000, 9999)}".encode()).hexdigest()[:16]
                        digits = rng.randint(100, 999)
                        error_msg = f"missing required argument: orderId in txn {tx_hash} (code {digits})"
                        error_tool = "get_order"
                        error_pattern = "invalid_tool_args"
                    elif case_id == "c18" and attempt == 3:
                        status = "fail"
                        failed_checks = ["timeout"]
                        error_msg = "Connection timed out"
                        error_pattern = "timeout"
                elif v_id == "C":
                    # Fix: c01-c12 pass; rare incidental timeout
                    if case_id == "c20" and attempt == 1:
                        status = "fail"
                        failed_checks = ["timeout"]
                        error_msg = "Model generation timed out"
                        error_pattern = "timeout"

                run_doc = {
                    "_id": run_id,
                    "projectId": project_id,
                    "versionId": v_id,
                    "caseId": case_id,
                    "suiteVersion": "1.0.0",
                    "attempt": attempt,
                    "status": status,
                    "failedChecks": failed_checks,
                    "latencyMs": rng.randint(150, 450) if status == "pass" else rng.randint(600, 1500),
                    "startedAt": run_start,
                }
                v_runs.append(run_doc)

                # Events for run
                # seq 1: user_input
                v_events.append({
                    "runId": run_id,
                    "projectId": project_id,
                    "versionId": v_id,
                    "seq": 1,
                    "type": "user_input",
                    "ts": run_start,
                    "payload": {"text": f"Process order inquiry for case {case_id}"},
                })

                # seq 2: tool_call
                called_tool = "get_order" if case_id in order_cases else "search_policy"
                call_args = {"order_id": f"ord_{case_id}"} if v_id in ("A", "B") else {"orderId": f"ord_{case_id}"}
                v_events.append({
                    "runId": run_id,
                    "projectId": project_id,
                    "versionId": v_id,
                    "seq": 2,
                    "type": "tool_call",
                    "ts": run_start + timedelta(milliseconds=100),
                    "payload": {"tool": called_tool, "args": call_args},
                })

                # seq 3: tool_result or error
                if status == "pass":
                    v_events.append({
                        "runId": run_id,
                        "projectId": project_id,
                        "versionId": v_id,
                        "seq": 3,
                        "type": "tool_result",
                        "ts": run_start + timedelta(milliseconds=200),
                        "payload": {"tool": called_tool, "status": "success", "result": {"id": f"ord_{case_id}", "status": "shipped"}},
                    })
                else:
                    v_events.append({
                        "runId": run_id,
                        "projectId": project_id,
                        "versionId": v_id,
                        "seq": 3,
                        "type": "error",
                        "ts": run_start + timedelta(milliseconds=200),
                        "payload": {
                            "tool": error_tool,
                            "message": error_msg,
                            "errorType": error_pattern,
                        },
                    })

                # seq 4: output
                v_events.append({
                    "runId": run_id,
                    "projectId": project_id,
                    "versionId": v_id,
                    "seq": 4,
                    "type": "output",
                    "ts": run_start + timedelta(milliseconds=300),
                    "payload": {"text": "Finished response" if status == "pass" else "Execution failed with error"},
                })

        # Save runs
        for r in v_runs:
            database["runs"].replace_one({"_id": r["_id"]}, r, upsert=True)
        total_runs_created += len(v_runs)

        # Ingest events safely through insert_events_safe
        ingest_res = insert_events_safe(database, v_events)
        total_events_created += ingest_res["inserted"]

    return {
        "status": "success",
        "projectId": project_id,
        "versions": version_ids,
        "totalRuns": total_runs_created,
        "totalEvents": total_events_created,
    }


if __name__ == "__main__":
    result = seed_demo()
    print(f"Seeding completed: {result}")
