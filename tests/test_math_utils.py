"""Tests for statistical hypothesis testing and confidence intervals (Review 2 criteria)."""

import pytest
from backend.app.analysis.math_utils import calculate_z_test, calculate_wilson_interval


def test_calculate_z_test_significant_regression():
    """Verify high-confidence regression (e.g. 58/60 down to 22/60) is statistically significant."""
    # Baseline: 58 passes out of 60 (96.7%)
    # Candidate: 22 passes out of 60 (36.7%)
    res = calculate_z_test(runs_a=60, passes_a=58, runs_b=60, passes_b=22)

    assert res["significant"] is True
    assert res["p_value"] < 0.0001
    assert res["z_score"] > 6.0
    assert pytest.approx(res["drop"], 0.01) == 0.60
    assert "a" in res["wilson_intervals"]
    assert "b" in res["wilson_intervals"]
    assert res["wilson_intervals"]["a"][0] > 0.85
    assert res["wilson_intervals"]["b"][1] < 0.55


def test_calculate_z_test_not_significant():
    """Verify small drops or small sample sizes fail the p < 0.01 and drop >= 0.10 threshold."""
    # 1. Very small drop: 58/60 vs 55/60 (drop ~0.05 < 0.10)
    res_small_drop = calculate_z_test(runs_a=60, passes_a=58, runs_b=60, passes_b=55)
    assert res_small_drop["significant"] is False
    assert res_small_drop["drop"] < 0.10

    # 2. Insignificant p-value due to small sample size: 10/10 vs 8/10 (drop = 0.20, but p > 0.01)
    res_small_sample = calculate_z_test(runs_a=10, passes_a=10, runs_b=10, passes_b=8)
    assert res_small_sample["drop"] == 0.20
    assert res_small_sample["p_value"] > 0.01
    assert res_small_sample["significant"] is False


def test_calculate_wilson_interval_bounds():
    """Verify Wilson interval properties."""
    interval = calculate_wilson_interval(runs=100, passes=50)
    assert interval[0] < 0.50
    assert interval[1] > 0.50
    assert 0.0 <= interval[0] <= interval[1] <= 1.0

    # Edge cases: 0 runs and 100% passes
    assert calculate_wilson_interval(runs=0, passes=0) == [0.0, 0.0]
    interval_perfect = calculate_wilson_interval(runs=20, passes=20)
    assert interval_perfect[1] == 1.0
    assert interval_perfect[0] > 0.80
