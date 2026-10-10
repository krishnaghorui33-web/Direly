"""Tests for aggregation statistics pipelines (Section 7 & 10)."""

from datetime import datetime, timezone, timedelta
import pytest

from backend.app.analysis.stats import (
    success_rate_by_version,
    failure_counts_by_fingerprint,
)
from backend.app.analysis.compare import compute_manifest_hashes
from scripts.seed_demo import build_manifest_components


def test_success_rate_by_version_pipeline(test_db):
    """Verify success_rate_by_version returns correct counts, passRate, and createdAt ordering."""
    proj = "stats_proj"
    t0 = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)

    # Insert versions with explicit createdAt order
    for idx, v_id in enumerate(["A", "B"]):
        comp = build_manifest_components(v_id)
        meta = compute_manifest_hashes(comp)
        test_db["versions"].insert_one({
            "_id": v_id,
            "projectId": proj,
            "label": f"Release {v_id}",
            "createdAt": t0 + timedelta(days=idx),
            "components": comp,
            "hashes": meta["hashes"],
            "manifestHash": meta["manifestHash"],
        })

    # Version A: 10 runs (8 pass, 2 fail -> passRate = 0.8)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_a_{i}",
            "projectId": proj,
            "versionId": "A",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass" if i < 8 else "fail",
            "latencyMs": 100,
            "startedAt": t0 + timedelta(minutes=i),
        })

    # Version B: 10 runs (3 pass, 7 fail -> passRate = 0.3)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_b_{i}",
            "projectId": proj,
            "versionId": "B",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass" if i < 3 else "fail",
            "latencyMs": 200,
            "startedAt": t0 + timedelta(days=1, minutes=i),
        })

    results = success_rate_by_version(test_db, proj)
    assert len(results) == 2

    # Verify version_stats collection was materialized by $merge stage
    stats_docs = list(test_db["version_stats"].find({"projectId": proj}))
    assert len(stats_docs) == 2
    version_ids_in_stats = {d["versionId"] for d in stats_docs}
    assert version_ids_in_stats == {"A", "B"}

    # Ordered by createdAt: A first, then B
    res_a = results[0]
    assert res_a["versionId"] == "A"
    assert res_a["runs"] == 10
    assert res_a["passes"] == 8
    assert res_a["failures"] == 2
    assert pytest.approx(res_a["passRate"], 0.001) == 0.8

    res_b = results[1]
    assert res_b["versionId"] == "B"
    assert res_b["runs"] == 10
    assert res_b["passes"] == 3
    assert res_b["failures"] == 7
    assert pytest.approx(res_b["passRate"], 0.001) == 0.3


def test_failure_counts_by_fingerprint_pipeline(test_db):
    """Verify failure_counts_by_fingerprint groups by fingerprint and sorts by count descending."""
    proj = "stats_proj_fp"
    now = datetime.now(timezone.utc)

    # Insert error events
    events = [
        # 3 events with fp_alpha
        {
            "eventId": "ev_01",
            "runId": "r1",
            "projectId": proj,
            "versionId": "B",
            "seq": 1,
            "type": "error",
            "ts": now,
            "payload": {"fingerprint": "fp_alpha", "pattern": "invalid_tool_args", "tool": "get_order"},
        },
        {
            "eventId": "ev_02",
            "runId": "r2",
            "projectId": proj,
            "versionId": "B",
            "seq": 1,
            "type": "error",
            "ts": now,
            "payload": {"fingerprint": "fp_alpha", "pattern": "invalid_tool_args", "tool": "get_order"},
        },
        {
            "eventId": "ev_03",
            "runId": "r3",
            "projectId": proj,
            "versionId": "B",
            "seq": 1,
            "type": "error",
            "ts": now,
            "payload": {"fingerprint": "fp_alpha", "pattern": "invalid_tool_args", "tool": "get_order"},
        },
        # 1 event with fp_beta
        {
            "eventId": "ev_04",
            "runId": "r4",
            "projectId": proj,
            "versionId": "B",
            "seq": 1,
            "type": "error",
            "ts": now,
            "payload": {"fingerprint": "fp_beta", "pattern": "timeout", "tool": None},
        },
    ]

    test_db["events"].insert_many(events)

    # 1. Without version_id filter
    counts_all = failure_counts_by_fingerprint(test_db, proj)
    assert len(counts_all) == 2
    assert counts_all[0]["fingerprint"] == "fp_alpha"
    assert counts_all[0]["count"] == 3
    assert counts_all[0]["pattern"] == "invalid_tool_args"
    assert counts_all[0]["tool"] == "get_order"

    assert counts_all[1]["fingerprint"] == "fp_beta"
    assert counts_all[1]["count"] == 1
    assert counts_all[1]["pattern"] == "timeout"
    assert counts_all[1]["tool"] is None

    # 2. With version_id filter
    counts_b = failure_counts_by_fingerprint(test_db, proj, version_id="B")
    assert len(counts_b) == 2

    # 3. With nonexistent version_id
    counts_none = failure_counts_by_fingerprint(test_db, proj, version_id="NONEXISTENT")
    assert len(counts_none) == 0


def test_detect_change_points_with_window_fields(test_db):
    """Verify detect_change_points identifies versions where passRate drop >= 0.10."""
    proj = "change_point_proj"
    t0 = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)

    # Insert versions A (good), B (regressed), C (fixed)
    for idx, v_id in enumerate(["A", "B", "C"]):
        comp = build_manifest_components(v_id)
        meta = compute_manifest_hashes(comp)
        test_db["versions"].insert_one({
            "_id": v_id,
            "projectId": proj,
            "label": f"Release {v_id}",
            "createdAt": t0 + timedelta(days=idx),
            "components": comp,
            "hashes": meta["hashes"],
            "manifestHash": meta["manifestHash"],
        })

    # A: 10 runs, 10 passes -> passRate = 1.0
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_cp_a_{i}",
            "projectId": proj,
            "versionId": "A",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 100,
            "startedAt": t0 + timedelta(minutes=i),
        })

    # B: 10 runs, 4 passes -> passRate = 0.4 (drop from A: 1.0 - 0.4 = 0.6 >= 0.10)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_cp_b_{i}",
            "projectId": proj,
            "versionId": "B",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass" if i < 4 else "fail",
            "latencyMs": 200,
            "startedAt": t0 + timedelta(days=1, minutes=i),
        })

    # C: 10 runs, 10 passes -> passRate = 1.0 (drop from B: 0.4 - 1.0 = -0.6 < 0.10)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_cp_c_{i}",
            "projectId": proj,
            "versionId": "C",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 150,
            "startedAt": t0 + timedelta(days=2, minutes=i),
        })

    # Materialize version_stats
    success_rate_by_version(test_db, proj)

    # Detect change points
    from backend.app.analysis.stats import detect_change_points
    change_points = detect_change_points(test_db, proj)

    # Only B should be returned as a change point
    assert len(change_points) == 1
    cp = change_points[0]
    assert cp["versionId"] == "B"
    assert pytest.approx(cp["passRate"], 0.001) == 0.4
    assert pytest.approx(cp["prevPassRate"], 0.001) == 1.0
    assert pytest.approx(cp["passRateDrop"], 0.001) == 0.6

