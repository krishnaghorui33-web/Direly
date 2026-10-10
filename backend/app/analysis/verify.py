"""Deterministic regression fix verification and finding status progression."""

from typing import Any, Dict, Optional
from pymongo.database import Database

from backend.app.analysis.stats import failure_counts_by_fingerprint


def verify_fix(
    db: Database,
    project_id: str,
    bad_version_id: str,
    fixed_version_id: str,
    baseline_version_id: Optional[str] = None,
    min_runs: int = 10,
) -> Dict[str, Any]:
    """Verify whether a candidate fix resolved regression between versions.

    Compares pass rates and failure fingerprint reductions.
    Top fingerprints are those making up the first 80% of bad version's failures.

    Criteria:
    - 'resolved': fixed runs >= min_runs, pass rate within 0.05 of baseline (or >= 0.30 above bad),
                  and top fingerprints dropped by >= 80%.
    - 'remains': pass rate improved by < 0.10, or top fingerprints dropped by < 30%.
    - 'inconclusive': everything else, or fixed runs < min_runs.

    Args:
        db (Database): PyMongo Database instance.
        project_id (str): Project identifier.
        bad_version_id (str): Regressed version ID.
        fixed_version_id (str): Fix candidate version ID.
        baseline_version_id (Optional[str]): Known-good version ID.
        min_runs (int): Minimum required runs (default 10).

    Returns:
        Dict[str, Any]: Decision outcome with supporting metrics and finding updates.
    """
    bad_runs = list(db["runs"].find({"projectId": project_id, "versionId": bad_version_id}))
    fixed_runs = list(db["runs"].find({"projectId": project_id, "versionId": fixed_version_id}))

    bad_total = len(bad_runs)
    fixed_total = len(fixed_runs)

    bad_passes = sum(1 for r in bad_runs if r.get("status") == "pass")
    fixed_passes = sum(1 for r in fixed_runs if r.get("status") == "pass")

    bad_rate = round(bad_passes / bad_total, 4) if bad_total > 0 else 0.0
    fixed_rate = round(fixed_passes / fixed_total, 4) if fixed_total > 0 else 0.0
    improvement = round(fixed_rate - bad_rate, 4)

    base_rate = None
    if baseline_version_id:
        base_runs = list(db["runs"].find({"projectId": project_id, "versionId": baseline_version_id}))
        base_total = len(base_runs)
        base_passes = sum(1 for r in base_runs if r.get("status") == "pass")
        base_rate = round(base_passes / base_total, 4) if base_total > 0 else 0.0

    # Top fingerprints calculation (first 80% of bad version's failures)
    bad_fps = failure_counts_by_fingerprint(db, project_id, bad_version_id)
    total_bad_fps = sum(f["count"] for f in bad_fps)

    top_fingerprints = []
    top_bad_count = 0
    running_count = 0
    target_count = 0.8 * total_bad_fps

    for fp_info in bad_fps:
        top_fingerprints.append(fp_info["fingerprint"])
        top_bad_count += fp_info["count"]
        running_count += fp_info["count"]
        if running_count >= target_count:
            break

    fixed_fps = failure_counts_by_fingerprint(db, project_id, fixed_version_id)
    fixed_fp_counts = {f["fingerprint"]: f["count"] for f in fixed_fps}
    fixed_top_count = sum(fixed_fp_counts.get(fp, 0) for fp in top_fingerprints)

    if top_bad_count > 0:
        fp_drop_ratio = (top_bad_count - fixed_top_count) / top_bad_count
    else:
        fp_drop_ratio = 1.0 if fixed_top_count == 0 else 0.0

    fp_drop_ratio = round(fp_drop_ratio, 4)

    # Decision logic
    if fixed_total < min_runs:
        result = "inconclusive"
        reason = f"Fixed version has only {fixed_total} runs (minimum {min_runs} required)."
    elif (
        fp_drop_ratio >= 0.80
        and (
            (base_rate is not None and (base_rate - fixed_rate) <= 0.05)
            or (base_rate is None and improvement >= 0.30)
        )
    ):
        result = "resolved"
        reason = f"Pass rate restored to {fixed_rate:.2%} and top failure fingerprints dropped by {fp_drop_ratio:.1%}."
    elif improvement < 0.10 or fp_drop_ratio < 0.30:
        result = "remains"
        reason = f"Pass rate improvement ({improvement:.2%}) or failure reduction ({fp_drop_ratio:.1%}) insufficient."
    else:
        result = "inconclusive"
        reason = "Pass rate and error reductions did not reach the threshold for full resolution."

    # Status mapping to update findings
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
        "newStatus": new_finding_status,
        "updatedFindingsCount": updated_findings.modified_count,
        "metrics": {
            "badVersion": {"versionId": bad_version_id, "passRate": bad_rate, "totalRuns": bad_total},
            "fixedVersion": {"versionId": fixed_version_id, "passRate": fixed_rate, "totalRuns": fixed_total},
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
