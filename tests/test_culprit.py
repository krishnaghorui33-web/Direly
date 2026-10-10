"""Tests for culprit ranking, scoring breakdown, and regression diagnoses (Section 9)."""

from datetime import datetime, timezone, timedelta
import pytest

from backend.app.analysis.culprit import find_suspects
from backend.app.analysis.compare import compute_manifest_hashes
from scripts.seed_demo import seed_demo, build_manifest_components


def test_suspect_ranking_on_demo_data(test_db):
    """Verify demo data ranks 'tools' first with high confidence and real evidenceRefs."""
    # Seed demo dataset into isolated test database
    seed_demo(test_db)

    res = find_suspects(test_db, "orderbot", "A", "B", min_runs=10, save=True)

    assert res["status"] == "diagnosed"
    assert res["drop"] >= 0.10
    assert len(res["suspects"]) > 0

    top_suspect = res["suspects"][0]
    assert top_suspect["component"] == "tools"
    assert top_suspect["confidence"] == "high"
    assert top_suspect["score"] >= 0.75
    assert top_suspect["matchingFailedRuns"] >= 5

    # Verify evidenceRefs all exist in db and belong to candidate failed runs
    assert len(top_suspect["evidenceRefs"]) > 0
    for ev_id in top_suspect["evidenceRefs"]:
        ev_doc = test_db["events"].find_one({"eventId": ev_id})
        assert ev_doc is not None, f"evidenceRef {ev_id} not found in database"
        assert ev_doc["versionId"] == "B"
        assert ev_doc["type"] == "error"

        # Check run status was fail
        run_doc = test_db["runs"].find_one({"_id": ev_doc["runId"]})
        assert run_doc is not None
        assert run_doc["status"] == "fail"

    # Verify finding was saved to findings collection
    finding_doc = test_db["findings"].find_one({
        "projectId": "orderbot",
        "versionId": "B",
        "baselineVersionId": "A",
        "suspectedComponent": "tools",
    })
    assert finding_doc is not None
    assert finding_doc["status"] == "open"
    assert finding_doc["confidence"] == "high"


def test_insufficient_evidence_threshold(test_db):
    """Verify fewer than min_runs runs returns 'insufficient_evidence'."""
    now = datetime.now(timezone.utc)
    proj = "insufficient_proj"
    test_db["projects"].insert_one({"_id": proj, "name": "Insufficient", "createdAt": now})

    for v_id in ["A", "B"]:
        comp = build_manifest_components("A")
        meta = compute_manifest_hashes(comp)
        test_db["versions"].insert_one({
            "_id": v_id,
            "projectId": proj,
            "createdAt": now,
            "components": comp,
            "hashes": meta["hashes"],
            "manifestHash": meta["manifestHash"],
        })

    # Only 3 runs each (min_runs=10)
    for i in range(3):
        test_db["runs"].insert_one({
            "_id": f"run_a_{i}",
            "projectId": proj,
            "versionId": "A",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 100,
            "startedAt": now,
        })
        test_db["runs"].insert_one({
            "_id": f"run_b_{i}",
            "projectId": proj,
            "versionId": "B",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "fail",
            "latencyMs": 100,
            "startedAt": now,
        })

    res = find_suspects(test_db, proj, "A", "B", min_runs=10, save=False)
    assert res["status"] == "insufficient_evidence"


def test_no_regression_threshold(test_db):
    """Verify pass-rate drop < 0.10 returns 'no_regression' even when components changed."""
    now = datetime.now(timezone.utc)
    proj = "no_reg_proj"
    test_db["projects"].insert_one({"_id": proj, "name": "NoReg", "createdAt": now})

    for v_id in ["A", "B"]:
        comp = build_manifest_components(v_id)
        meta = compute_manifest_hashes(comp)
        test_db["versions"].insert_one({
            "_id": v_id,
            "projectId": proj,
            "createdAt": now,
            "components": comp,
            "hashes": meta["hashes"],
            "manifestHash": meta["manifestHash"],
        })

    # 10 passes on A, 10 passes on B (drop = 0.0 < 0.10)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_a_{i}",
            "projectId": proj,
            "versionId": "A",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 100,
            "startedAt": now,
        })
        test_db["runs"].insert_one({
            "_id": f"run_b_{i}",
            "projectId": proj,
            "versionId": "B",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 100,
            "startedAt": now,
        })

    res = find_suspects(test_db, proj, "A", "B", min_runs=10, save=False)
    assert res["status"] == "no_regression"
    assert res["drop"] < 0.10


def test_no_component_change_threshold(test_db):
    """Verify regression with no changed components returns 'no_component_change'."""
    now = datetime.now(timezone.utc)
    proj = "no_comp_proj"
    test_db["projects"].insert_one({"_id": proj, "name": "NoComp", "createdAt": now})

    for v_id in ["A", "B"]:
        # Both versions have identical components
        comp = build_manifest_components("A")
        meta = compute_manifest_hashes(comp)
        test_db["versions"].insert_one({
            "_id": v_id,
            "projectId": proj,
            "createdAt": now,
            "components": comp,
            "hashes": meta["hashes"],
            "manifestHash": meta["manifestHash"],
        })

    # 10 passes on A, 10 fails on B (drop = 1.0 >= 0.10, but no component changed)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_a_{i}",
            "projectId": proj,
            "versionId": "A",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 100,
            "startedAt": now,
        })
        test_db["runs"].insert_one({
            "_id": f"run_b_{i}",
            "projectId": proj,
            "versionId": "B",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "fail",
            "latencyMs": 100,
            "startedAt": now,
        })

    res = find_suspects(test_db, proj, "A", "B", min_runs=10, save=False)
    assert res["status"] == "no_component_change"
    assert "No component definitions changed" in res["uncertainty"][0]



def test_two_changed_components_lowers_exclusivity(test_db):
    """Verify that having two changed components lowers exclusivity from 1.0 to 0.5."""
    now = datetime.now(timezone.utc)
    proj = "multi_comp_proj"
    test_db["projects"].insert_one({"_id": proj, "name": "Multi", "createdAt": now})

    comp_a = build_manifest_components("A")
    meta_a = compute_manifest_hashes(comp_a)
    test_db["versions"].insert_one({
        "_id": "A",
        "projectId": proj,
        "createdAt": now,
        "components": comp_a,
        "hashes": meta_a["hashes"],
        "manifestHash": meta_a["manifestHash"],
    })

    # Version B has changed tools AND changed prompt
    comp_b = build_manifest_components("B")
    comp_b["prompt"] = "Completely altered system prompt for test."
    meta_b = compute_manifest_hashes(comp_b)
    test_db["versions"].insert_one({
        "_id": "B",
        "projectId": proj,
        "createdAt": now + timedelta(days=1),
        "components": comp_b,
        "hashes": meta_b["hashes"],
        "manifestHash": meta_b["manifestHash"],
    })

    # Populate 10 runs on A (all pass), 10 runs on B (all fail)
    for i in range(10):
        test_db["runs"].insert_one({
            "_id": f"run_a_{i}",
            "projectId": proj,
            "versionId": "A",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "pass",
            "latencyMs": 100,
            "startedAt": now,
        })
        run_b_id = f"run_b_{i}"
        test_db["runs"].insert_one({
            "_id": run_b_id,
            "projectId": proj,
            "versionId": "B",
            "caseId": f"c{i}",
            "attempt": 1,
            "status": "fail",
            "latencyMs": 100,
            "startedAt": now + timedelta(days=1),
        })

    res = find_suspects(test_db, proj, "A", "B", min_runs=10, save=False)
    assert res["status"] == "diagnosed"
    assert len(res["changedComponents"]) == 2
    for susp in res["suspects"]:
        assert susp["scoreBreakdown"]["exclusivity"] == 0.5
