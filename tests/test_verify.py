"""Tests for regression fix verification rules and finding status transitions (Section 7 & 9)."""

import pytest

from backend.app.analysis.culprit import find_suspects
from backend.app.analysis.verify import verify_fix
from scripts.seed_demo import seed_demo


def test_verify_fix_b_to_c_resolved(test_db):
    """Verify B (regression) to C (fix) from orderbot scenario returns 'resolved' and updates finding."""
    # Seed benchmark dataset: version A (baseline), version B (fails), version C (fix)
    seed_demo(test_db)

    # 1. Run diagnosis on candidate B against baseline A
    diag = find_suspects(test_db, "orderbot", "A", "B", min_runs=10, save=True)
    assert diag["status"] == "diagnosed"

    # Verify finding exists with status 'open'
    initial_finding = test_db["findings"].find_one({
        "projectId": "orderbot",
        "versionId": "B",
        "suspectedComponent": "tools",
    })
    assert initial_finding is not None
    assert initial_finding["status"] == "open"

    # 2. Verify fix from B to C using fix_version_id parameter
    res = verify_fix(
        test_db,
        project_id="orderbot",
        bad_version_id="B",
        fix_version_id="C",
        baseline_version_id="A",
        min_runs=10,
    )

    # Assert verdict is 'resolved'
    assert res["result"] == "resolved"
    assert res["metrics"]["fingerprintDropRatio"] >= 0.80

    # 3. Assert database update in findings collection
    updated_finding = test_db["findings"].find_one({
        "projectId": "orderbot",
        "versionId": "B",
        "suspectedComponent": "tools",
    })
    assert updated_finding is not None
    assert updated_finding["status"] == "verified_fixed"


def test_verify_fix_b_to_b_remains(test_db):
    """Verify comparing B against itself returns 'remains' and updates finding to still_failing."""
    seed_demo(test_db)

    # Create finding for version B
    find_suspects(test_db, "orderbot", "A", "B", min_runs=10, save=True)

    # Verify B against B: no improvement, error fingerprints do not drop
    res = verify_fix(
        test_db,
        project_id="orderbot",
        bad_version_id="B",
        fix_version_id="B",
        baseline_version_id="A",
        min_runs=10,
    )

    assert res["result"] == "remains"
    assert res["newStatus"] == "still_failing"

    finding = test_db["findings"].find_one({
        "projectId": "orderbot",
        "versionId": "B",
        "suspectedComponent": "tools",
    })
    assert finding is not None
    assert finding["status"] == "still_failing"


def test_verify_fix_gatekeeper_insufficient_runs(test_db):
    """Verify gatekeeper: if either version has < min_runs runs, returns inconclusive (reason: insufficient runs)."""
    seed_demo(test_db)

    # Requiring min_runs=100 when each version has 60 runs
    res = verify_fix(
        test_db,
        project_id="orderbot",
        bad_version_id="B",
        fix_version_id="C",
        baseline_version_id="A",
        min_runs=100,
    )

    assert res["result"] == "inconclusive"
    assert "insufficient runs" in res["reason"].lower()


def test_verify_fix_without_baseline_resolved(test_db):
    """Verify that when no baseline is provided, fix pass rate >= 0.30 above bad version resolves."""
    seed_demo(test_db)

    # Without baseline_version_id (checks improvement >= 0.30)
    res = verify_fix(
        test_db,
        project_id="orderbot",
        bad_version_id="B",
        fix_version_id="C",
        baseline_version_id=None,
        min_runs=10,
    )

    assert res["result"] == "resolved"
    assert res["metrics"]["improvement"] >= 0.30
    assert res["metrics"]["fingerprintDropRatio"] >= 0.80
