"""Deterministic regression fix verification and finding status progression."""

from typing import Any, Dict, Optional
from pymongo.database import Database

from backend.app.analysis.stats import success_rate_by_version, failure_counts_by_fingerprint


def verify_fix(
    db: Database,
    project_id: str,
    bad_version_id: str,
    fix_version_id: Optional[str] = None,
    baseline_version_id: Optional[str] = None,
    fixed_version_id: Optional[str] = None,
    min_runs: int = 10,
) -> Dict[str, Any]:
    """Verify whether a candidate fix resolved a regression between versions.

    Args:
        db (Database): PyMongo Database instance.
        project_id (str): Project identifier.
        bad_version_id (str): Regressed version ID.
        fix_version_id (Optional[str]): Fix candidate version ID (alias for fixed_version_id).
        baseline_version_id (Optional[str]): Optional known-good version ID.
        fixed_version_id (Optional[str]): Fix candidate version ID.
        min_runs (int): Minimum required runs per version (default 10).

    Returns:
        Dict[str, Any]: Decision outcome dictionary containing:
            - 'result': 'resolved' | 'remains' | 'inconclusive'
            - 'status': alias for result
            - 'newStatus': updated finding status ('verified_fixed' | 'still_failing' | 'inconclusive')
            - 'metrics': supporting metrics dict
            - 'reason': plain-English rationale
    """
    target_fix = fix_version_id or fixed_version_id
    if not target_fix:
        raise ValueError("Either fix_version_id or fixed_version_id must be provided.")

    # 1. Gatekeepers: Fetch stats for fix_version and bad_version using success_rate_by_version
    stats_list = success_rate_by_version(db, project_id)
    stats_map = {s["versionId"]: s for s in stats_list}

    bad_stats = stats_map.get(bad_version_id, {"runs": 0, "passRate": 0.0, "passes": 0, "failures": 0})
    fix_stats = stats_map.get(target_fix, {"runs": 0, "passRate": 0.0, "passes": 0, "failures": 0})

    bad_runs = bad_stats["runs"]
    fix_runs = fix_stats["runs"]

    bad_rate = bad_stats["passRate"]
    fix_rate = fix_stats["passRate"]
    improvement = round(fix_rate - bad_rate, 4)

    # Gatekeeper check: < 10 runs
    if bad_runs < min_runs or fix_runs < min_runs:
        result = "inconclusive"
        reason = f"insufficient runs: bad version has {bad_runs}, fix version has {fix_runs} (minimum {min_runs} required)."
        db["findings"].update_many(
            {"projectId": project_id, "versionId": bad_version_id},
            {"$set": {"status": "inconclusive"}},
        )
        return {
            "result": result,
            "status": result,
            "newStatus": "inconclusive",
            "metrics": {
                "badVersion": {"versionId": bad_version_id, "passRate": bad_rate, "totalRuns": bad_runs},
                "fixVersion": {"versionId": target_fix, "passRate": fix_rate, "totalRuns": fix_runs},
            },
            "reason": reason,
        }

    # 2. Pass Rate Check
    base_rate = None
    pass_rate_recovered = False
    if baseline_version_id:
        base_stats = stats_map.get(baseline_version_id, {"runs": 0, "passRate": 0.0})
        base_rate = base_stats["passRate"]
        # within 0.05 of baseline
        pass_rate_recovered = (base_rate - fix_rate) <= 0.05
    else:
        # >= 0.30 above bad version
        pass_rate_recovered = (fix_rate - bad_rate) >= 0.30

    # 3. Fingerprint Drop (top fingerprints making up first 80% of bad version failures)
    bad_fps = failure_counts_by_fingerprint(db, project_id, bad_version_id)
    total_bad_failures = sum(f["count"] for f in bad_fps)

    top_fingerprints = []
    top_bad_count = 0
    running_count = 0
    target_count = 0.8 * total_bad_failures

    for fp_info in bad_fps:
        top_fingerprints.append(fp_info["fingerprint"])
        top_bad_count += fp_info["count"]
        running_count += fp_info["count"]
        if running_count >= target_count:
            break

    fixed_fps = failure_counts_by_fingerprint(db, project_id, target_fix)
    fixed_fp_counts = {f["fingerprint"]: f["count"] for f in fixed_fps}
    fixed_top_count = sum(fixed_fp_counts.get(fp, 0) for fp in top_fingerprints)

    if top_bad_count > 0:
        fp_drop_ratio = (top_bad_count - fixed_top_count) / top_bad_count
    else:
        fp_drop_ratio = 1.0 if fixed_top_count == 0 else 0.0

    fp_drop_ratio = round(fp_drop_ratio, 4)

    # 4. Verdict Logic
    if pass_rate_recovered and fp_drop_ratio >= 0.80:
        result = "resolved"
        reason = f"Pass rate recovered ({fix_rate:.2%}) and top failure fingerprints dropped by {fp_drop_ratio:.1%}."
    elif improvement < 0.10 or fp_drop_ratio < 0.30:
        result = "remains"
        reason = f"Pass rate improvement ({improvement:.2%}) or failure reduction ({fp_drop_ratio:.1%}) insufficient."
    else:
        result = "inconclusive"
        reason = "Pass rate and error reductions did not reach the threshold for full resolution."

    # 5. Database Update
    status_map = {
        "resolved": "verified_fixed",
        "remains": "still_failing",
        "inconclusive": "inconclusive",
    }
    new_finding_status = status_map[result]

    updated_findings = db["findings"].update_many(
        {"projectId": project_id, "versionId": bad_version_id},
        {"$set": {"status": new_finding_status}},
    )

    return {
        "result": result,
        "status": result,
        "newStatus": new_finding_status,
        "updatedFindingsCount": updated_findings.modified_count,
        "metrics": {
            "badVersion": {"versionId": bad_version_id, "passRate": bad_rate, "totalRuns": bad_runs},
            "fixVersion": {"versionId": target_fix, "passRate": fix_rate, "totalRuns": fix_runs},
            "baselineVersion": {
                "versionId": baseline_version_id,
                "passRate": base_rate,
            } if baseline_version_id else None,
            "improvement": improvement,
            "topFingerprints": top_fingerprints,
            "badTopFailuresCount": top_bad_count,
            "fixedTopFailuresCount": fixed_top_count,
            "fingerprintDropRatio": fp_drop_ratio,
        },
        "reason": reason,
    }
