"""Deterministic evidence-based culprit ranking and finding generation."""

from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional
from pymongo.database import Database

from backend.app.analysis.compare import compare_versions
from backend.app.analysis.patterns import PATTERN_TO_COMPONENT


def pattern_matches_component(
    pattern: str,
    tool: Optional[str],
    component: str,
    tool_diff: Dict[str, Any],
) -> bool:
    """Determine whether an error pattern and tool match a suspected component.

    For tools: an error matches only if pattern maps to tools AND its tool is in changed
    tools (or tool is unknown/None).

    Args:
        pattern (str): Error pattern classification.
        tool (Optional[str]): Tool name associated with error.
        component (str): Component under evaluation.
        tool_diff (Dict[str, Any]): Tool diff from compare_versions.

    Returns:
        bool: True if error matches component.
    """
    if component == "tools":
        if pattern not in ("invalid_tool_args", "tool_not_found"):
            return False
        if tool is None or tool == "":
            return True
        changed_tools_set = set(tool_diff.get("changedTools", {}).keys())
        changed_tools_set.update(tool_diff.get("addedTools", []))
        changed_tools_set.update(tool_diff.get("removedTools", []))
        return tool in changed_tools_set or len(changed_tools_set) == 0

    if component == "retrieval":
        return pattern == "retrieval_empty"

    if component == "prompt":
        return pattern == "wrong_tool"

    if component in ("model", "code"):
        return pattern == "timeout"

    return False


def find_suspects(
    db: Database,
    project_id: str,
    baseline_version_id: str,
    candidate_version_id: str,
    min_runs: int = 10,
    save: bool = True,
) -> Dict[str, Any]:
    """Identify and rank suspected components explaining a regression between versions.

    Args:
        db (Database): PyMongo Database instance.
        project_id (str): Project identifier.
        baseline_version_id (str): Known-good baseline version ID.
        candidate_version_id (str): Regressed candidate version ID.
        min_runs (int): Minimum required runs per version (default 10).
        save (bool): Whether to persist findings idempotently to MongoDB.

    Returns:
        Dict[str, Any]: Diagnosis dictionary containing status, pass rates, suspects list,
                        score breakdowns, evidence event IDs, and uncertainty notes.
    """
    # 1. Compute pass rates for baseline and candidate
    base_runs = list(db["runs"].find({"projectId": project_id, "versionId": baseline_version_id}))
    cand_runs = list(db["runs"].find({"projectId": project_id, "versionId": candidate_version_id}))

    base_total = len(base_runs)
    cand_total = len(cand_runs)

    base_passes = sum(1 for r in base_runs if r.get("status") == "pass")
    cand_passes = sum(1 for r in cand_runs if r.get("status") == "pass")

    base_rate = round(base_passes / base_total, 4) if base_total > 0 else 0.0
    cand_rate = round(cand_passes / cand_total, 4) if cand_total > 0 else 0.0
    drop = round(base_rate - cand_rate, 4)

    limits_note = "Likely cause from historical evidence, not proof."

    # a) Check min_runs
    if base_total < min_runs or cand_total < min_runs:
        return {
            "status": "insufficient_evidence",
            "baselineVersionId": baseline_version_id,
            "candidateVersionId": candidate_version_id,
            "passRates": {"baseline": base_rate, "candidate": cand_rate},
            "drop": drop,
            "changedComponents": [],
            "suspects": [],
            "uncertainty": [
                f"Insufficient runs: baseline has {base_total}, candidate has {cand_total} (minimum required is {min_runs})."
            ],
            "limits": limits_note,
        }

    # b) Check regression threshold
    if drop < 0.10:
        return {
            "status": "no_regression",
            "baselineVersionId": baseline_version_id,
            "candidateVersionId": candidate_version_id,
            "passRates": {"baseline": base_rate, "candidate": cand_rate},
            "drop": drop,
            "changedComponents": [],
            "suspects": [],
            "uncertainty": [f"Pass-rate drop ({drop:.2%}) is below the regression threshold (10.00%)."],
            "limits": limits_note,
        }

    # c) Call compare_versions
    comparison = compare_versions(db, project_id, baseline_version_id, candidate_version_id)
    changed_components = comparison.get("changedComponents", [])
    tool_diff = comparison.get("toolDiff", {})
    unchanged_components = comparison.get("unchangedComponents", [])

    if not changed_components:
        return {
            "status": "no_component_change",
            "baselineVersionId": baseline_version_id,
            "candidateVersionId": candidate_version_id,
            "passRates": {"baseline": base_rate, "candidate": cand_rate},
            "drop": drop,
            "changedComponents": [],
            "suspects": [],
            "uncertainty": [
                "No component definitions changed between versions; regression may be due to flakiness or environment."
            ],
            "limits": limits_note,
        }

    # d) Gather candidate's failed-run error events
    cand_failed_runs = [r for r in cand_runs if r.get("status") == "fail"]
    total_failed_runs = len(cand_failed_runs)
    failed_run_ids = {r["_id"] for r in cand_failed_runs}

    error_events_cursor = db["events"].find({
        "projectId": project_id,
        "versionId": candidate_version_id,
        "type": "error",
    }).sort("ts", 1)
    cand_error_events = [e for e in error_events_cursor if e.get("runId") in failed_run_ids]

    runs_with_errors = {e.get("runId") for e in cand_error_events}
    unexplained_failed_runs = len(failed_run_ids - runs_with_errors)

    # Determine timing score
    all_versions = list(db["versions"].find({"projectId": project_id}).sort("createdAt", 1))
    version_order = [v["_id"] for v in all_versions]
    timing = 0.5
    if (
        baseline_version_id in version_order
        and candidate_version_id in version_order
        and version_order.index(candidate_version_id) - version_order.index(baseline_version_id) == 1
    ):
        timing = 1.0

    exclusivity = 1.0 / len(changed_components)

    suspects: List[Dict[str, Any]] = []
    uncertainty_notes: List[str] = [
        "Flakiness was not assessed for baseline version."
    ]
    if unexplained_failed_runs > 0:
        uncertainty_notes.append(f"{unexplained_failed_runs} failed runs had no associated error event.")

    for comp in changed_components:
        # Filter matching error events
        matching_events = [
            e for e in cand_error_events
            if pattern_matches_component(
                e.get("payload", {}).get("pattern", ""),
                e.get("payload", {}).get("tool"),
                comp,
                tool_diff,
            )
        ]

        matching_run_ids = {e.get("runId") for e in matching_events}
        matching_failed_runs = len(matching_run_ids)
        pattern_match = matching_failed_runs / total_failed_runs if total_failed_runs > 0 else 0.0

        score = 0.4 * timing + 0.4 * pattern_match + 0.2 * exclusivity
        score = round(score, 4)

        if score >= 0.75 and matching_failed_runs >= 5:
            confidence = "high"
        elif score >= 0.5:
            confidence = "medium"
        else:
            confidence = "low"

        # Evidence references: up to 10 real eventId values ordered by ts
        evidence_refs = [e["eventId"] for e in matching_events if "eventId" in e][:10]

        # Fingerprints grouping
        fp_counts: Dict[str, Dict[str, Any]] = {}
        for ev in matching_events:
            fp = ev.get("payload", {}).get("fingerprint") or "unknown"
            if fp not in fp_counts:
                fp_counts[fp] = {
                    "fingerprint": fp,
                    "pattern": ev.get("payload", {}).get("pattern", "other"),
                    "tool": ev.get("payload", {}).get("tool"),
                    "count": 0,
                }
            fp_counts[fp]["count"] += 1
        fingerprints_list = sorted(fp_counts.values(), key=lambda x: x["count"], reverse=True)

        # Build plain-English reason
        reason_parts = []
        if comp == "tools" and tool_diff.get("changedTools"):
            for t_name, t_info in tool_diff["changedTools"].items():
                if t_info.get("possibleRename"):
                    old_p, new_p = t_info["possibleRename"]
                    reason_parts.append(
                        f"Changed tool '{t_name}' with renamed parameter '{old_p}' -> '{new_p}'"
                    )
                elif t_info.get("addedParams") or t_info.get("removedParams"):
                    reason_parts.append(f"Changed tool '{t_name}' parameters")
        else:
            reason_parts.append(f"Component '{comp}' was modified")

        reason_parts.append(f"explaining {matching_failed_runs} of {total_failed_runs} failed runs")
        if unchanged_components:
            reason_parts.append(f"while {', '.join(unchanged_components)} remained unchanged")
        reason = "; ".join(reason_parts) + "."

        suspect_item = {
            "component": comp,
            "detail": {
                "changedTools": tool_diff.get("changedTools", {}),
                "unexplainedRuns": unexplained_failed_runs,
            },
            "score": score,
            "scoreBreakdown": {
                "timing": timing,
                "patternMatch": round(pattern_match, 4),
                "exclusivity": round(exclusivity, 4),
            },
            "confidence": confidence,
            "matchingFailedRuns": matching_failed_runs,
            "totalFailedRuns": total_failed_runs,
            "fingerprints": fingerprints_list,
            "evidenceRefs": evidence_refs,
            "reason": reason,
        }
        suspects.append(suspect_item)

    # Sort suspects descending by score
    suspects.sort(key=lambda s: s["score"], reverse=True)

    # Uncertainty checks on top suspect
    if suspects:
        top_suspect = suspects[0]
        if top_suspect["score"] < 0.5:
            uncertainty_notes.append("Top suspect score is below 0.50 (low statistical correlation).")
        if top_suspect["matchingFailedRuns"] < 5:
            uncertainty_notes.append("Fewer than 5 matching failed runs for top suspect.")
        if len(suspects) > 1 and abs(suspects[0]["score"] - suspects[1]["score"]) <= 0.10:
            uncertainty_notes.append("Ambiguous diagnosis: top two suspects have scores within 0.10 of each other.")

    # i) If save is True, upsert findings idempotently
    if save:
        findings_col = db["findings"]
        for susp in suspects:
            top_fp = susp["fingerprints"][0]["fingerprint"] if susp["fingerprints"] else "no_fingerprint"
            finding_id = hashlib.sha1(
                f"{project_id}:{candidate_version_id}:{baseline_version_id}:{susp['component']}:{top_fp}".encode("utf-8")
            ).hexdigest()[:24]

            finding_doc = {
                "_id": finding_id,
                "projectId": project_id,
                "versionId": candidate_version_id,
                "baselineVersionId": baseline_version_id,
                "suspectedComponent": susp["component"],
                "detail": susp["detail"],
                "failureFingerprint": top_fp,
                "evidenceRefs": susp["evidenceRefs"],
                "matchingFailedRuns": susp["matchingFailedRuns"],
                "totalFailedRuns": susp["totalFailedRuns"],
                "score": susp["score"],
                "confidence": susp["confidence"],
                "reason": susp["reason"],
                "status": "open",
                "createdAt": datetime.now(timezone.utc),
            }

            filter_doc = {
                "projectId": project_id,
                "versionId": candidate_version_id,
                "baselineVersionId": baseline_version_id,
                "suspectedComponent": susp["component"],
                "failureFingerprint": top_fp,
            }
            findings_col.replace_one(filter_doc, finding_doc, upsert=True)

    return {
        "status": "diagnosed",
        "baselineVersionId": baseline_version_id,
        "candidateVersionId": candidate_version_id,
        "passRates": {"baseline": base_rate, "candidate": cand_rate},
        "drop": drop,
        "changedComponents": changed_components,
        "suspects": suspects,
        "uncertainty": uncertainty_notes,
        "limits": limits_note,
    }
