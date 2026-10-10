"""Tests for fix verification logic and findings status transitions (Section 9)."""

import pytest

from backend.app.analysis.culprit import find_suspects
from backend.app.analysis.verify import verify_fix
from scripts.seed_demo import seed_demo


def test_verify_fix_b_to_c_resolved(test_db):
    """Verify B to C with baseline A returns 'resolved' and updates findings to verified_fixed."""
    # Seed demo dataset (versions A, B, C)
    seed_demo(test_db)

    # First diagnose B against A so finding is created with status 'open'
    diag = find_suspects(test_db, "orderbot", "A", "B", min_runs=10, save=True)
    assert diag["status"] == "diagnosed"

    finding_before = test_db["findings"].find_one({"projectId": "orderbot", "versionId": "B"})
    assert finding_before is not None
    assert finding_before["status"] == "open"

    # Verify fix from B to C
    res = verify_fix(test_db, "orderbot", "B", "C", baseline_version_id="A", min_runs=10)
    assert res["result"] == "resolved"
    assert res["metrics"]["fingerprintDropRatio"] >= 0.80

    # Finding status should be updated to verified_fixed
    finding_after = test_db["findings"].find_one({"projectId": "orderbot", "versionId": "B"})
    assert finding_after["status"] == "verified_fixed"


def test_verify_fix_b_to_b_remains(test_db):
    """Verify B to B returns 'remains' and updates findings to still_failing."""
    seed_demo(test_db)

    # First diagnose B against A
    find_suspects(test_db, "orderbot", "A", "B", min_runs=10, save=True)

    # Verifying B against itself: 0% improvement, 0% error drop
    res = verify_fix(test_db, "orderbot", "B", "B", baseline_version_id="A", min_runs=10)
    assert res["result"] == "remains"

    finding = test_db["findings"].find_one({"projectId": "orderbot", "versionId": "B"})
    assert finding["status"] == "still_failing"


def test_verify_fix_insufficient_runs_inconclusive(test_db):
    """Verify fixed version with fewer than min_runs runs returns 'inconclusive'."""
    seed_demo(test_db)

    res = verify_fix(test_db, "orderbot", "B", "C", baseline_version_id="A", min_runs=100)
    assert res["result"] == "inconclusive"
