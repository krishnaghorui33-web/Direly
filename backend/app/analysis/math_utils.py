"""Mathematical utilities for statistical hypothesis testing and confidence intervals."""

import math
from typing import Any, Dict, List


def calculate_wilson_interval(runs: int, passes: int, z: float = 1.96) -> List[float]:
    """Calculate the Wilson score confidence interval for a binomial proportion.

    Args:
        runs (int): Total number of trials/runs.
        passes (int): Number of successful trials/passes.
        z (float): Z-score for desired confidence level (default 1.96 for 95% CI).

    Returns:
        List[float]: [lower_bound, upper_bound] bounded between 0.0 and 1.0.
    """
    if runs <= 0:
        return [0.0, 0.0]

    p = passes / runs
    denominator = 1.0 + (z * z) / runs
    center = (p + (z * z) / (2.0 * runs)) / denominator

    variance_term = (p * (1.0 - p)) / runs + (z * z) / (4.0 * runs * runs)
    margin = (z / denominator) * math.sqrt(max(0.0, variance_term))

    low = max(0.0, center - margin)
    high = min(1.0, center + margin)

    return [round(low, 4), round(high, 4)]


def calculate_z_test(
    runs_a: int,
    passes_a: int,
    runs_b: int,
    passes_b: int,
) -> Dict[str, Any]:
    """Calculate the two-proportion z-test, p-value, and Wilson score intervals.

    Evaluates whether the pass rate of candidate version B has significantly regressed
    relative to baseline version A.

    Args:
        runs_a (int): Total runs in baseline version A.
        passes_a (int): Passing runs in baseline version A.
        runs_b (int): Total runs in candidate version B.
        passes_b (int): Passing runs in candidate version B.

    Returns:
        Dict[str, Any]: Dict containing:
            - significant (bool): True if p < 0.01 and drop >= 0.10
            - p_value (float): Two-tailed p-value
            - z_score (float): Calculated z-score
            - drop (float): Pass rate drop (p_a - p_b)
            - wilson_intervals (Dict[str, List[float]]): {'a': [low, high], 'b': [low, high]}
    """
    if runs_a <= 0 or runs_b <= 0:
        return {
            "significant": False,
            "p_value": 1.0,
            "z_score": 0.0,
            "drop": 0.0,
            "wilson_intervals": {"a": [0.0, 0.0], "b": [0.0, 0.0]},
        }

    p_a = passes_a / runs_a
    p_b = passes_b / runs_b
    drop = round(p_a - p_b, 4)

    # Pooled proportion
    total_runs = runs_a + runs_b
    total_passes = passes_a + passes_b
    p_pool = total_passes / total_runs

    # Standard error of the difference
    se = math.sqrt(p_pool * (1.0 - p_pool) * (1.0 / runs_a + 1.0 / runs_b))

    if se == 0.0:
        z_score = 0.0
        p_value = 1.0
    else:
        z_score = (p_a - p_b) / se
        # Two-tailed p-value computed using complementary error function erfc
        p_value = math.erfc(abs(z_score) / math.sqrt(2.0))

    p_value = round(p_value, 6)
    z_score = round(z_score, 4)

    # Statistical significance: p < 0.01 and practical drop >= 0.10
    significant = bool(p_value < 0.01 and drop >= 0.10)

    wilson_a = calculate_wilson_interval(runs_a, passes_a)
    wilson_b = calculate_wilson_interval(runs_b, passes_b)

    return {
        "significant": significant,
        "p_value": p_value,
        "z_score": z_score,
        "drop": drop,
        "wilson_intervals": {
            "a": wilson_a,
            "b": wilson_b,
        },
    }
