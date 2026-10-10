"""Deterministic version comparison and component diffing."""

import difflib
import json
import hashlib
from typing import Any, Dict, List, Optional
from pymongo.database import Database

COMPONENT_KEYS = ["prompt", "tools", "model", "retrieval", "code"]


def canonical_json_hash(obj: Any) -> str:
    """Compute sha1 hex of canonical JSON (sorted keys, no spaces).

    Args:
        obj (Any): JSON-serializable component object or string.

    Returns:
        str: SHA-1 hex digest.
    """
    raw_json = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return hashlib.sha1(raw_json.encode("utf-8")).hexdigest()


def compute_manifest_hashes(components: Dict[str, Any]) -> Dict[str, Any]:
    """Compute component hashes and overall manifestHash.

    Args:
        components (Dict[str, Any]): Dictionary of components.

    Returns:
        Dict[str, Any]: Dict with 'hashes' (dict of sha1 per component) and 'manifestHash'.
    """
    hashes = {}
    for key in COMPONENT_KEYS:
        comp_val = components.get(key, "" if key == "prompt" else {})
        hashes[key] = canonical_json_hash(comp_val)
    manifest_hash = canonical_json_hash(hashes)
    return {"hashes": hashes, "manifestHash": manifest_hash}


def diff_tools(
    baseline_tools: List[Dict[str, Any]],
    candidate_tools: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Diff tools schemas between versions.

    Identifies addedTools, removedTools, and changedTools with possibleRename.

    Args:
        baseline_tools (List[Dict[str, Any]]): Baseline tool schema list.
        candidate_tools (List[Dict[str, Any]]): Candidate tool schema list.

    Returns:
        Dict[str, Any]: Tool diff dictionary.
    """
    base_map = {t["name"]: t for t in baseline_tools if isinstance(t, dict) and "name" in t}
    cand_map = {t["name"]: t for t in candidate_tools if isinstance(t, dict) and "name" in t}

    added_tools = [name for name in cand_map if name not in base_map]
    removed_tools = [name for name in base_map if name not in cand_map]
    changed_tools: Dict[str, Any] = {}

    for name in base_map:
        if name in cand_map:
            b_tool = base_map[name]
            c_tool = cand_map[name]

            b_params = b_tool.get("parameters") or {}
            c_params = c_tool.get("parameters") or {}

            b_props = b_params.get("properties") or {}
            c_props = c_params.get("properties") or {}

            added_params = [p for p in c_props if p not in b_props]
            removed_params = [p for p in b_props if p not in c_props]

            b_req = set(b_params.get("required") or [])
            c_req = set(c_params.get("required") or [])
            required_changed = (b_req != c_req)

            possible_rename = None
            if len(removed_params) == 1 and len(added_params) == 1:
                possible_rename = [removed_params[0], added_params[0]]

            # Also check if description or other fields changed
            desc_changed = b_tool.get("description") != c_tool.get("description")

            if added_params or removed_params or required_changed or desc_changed or canonical_json_hash(b_tool) != canonical_json_hash(c_tool):
                changed_tools[name] = {
                    "addedParams": added_params,
                    "removedParams": removed_params,
                    "possibleRename": possible_rename,
                    "requiredChanged": required_changed,
                }

    return {
        "addedTools": added_tools,
        "removedTools": removed_tools,
        "changedTools": changed_tools,
    }


def compare_versions(
    db: Database,
    project_id: str,
    baseline_version_id: str,
    candidate_version_id: str,
) -> Dict[str, Any]:
    """Compare baseline and candidate versions, diffing components and tool schemas.

    Args:
        db (Database): PyMongo Database instance.
        project_id (str): Project identifier.
        baseline_version_id (str): Known-good version ID.
        candidate_version_id (str): Candidate version ID.

    Returns:
        Dict[str, Any]: Version comparison result containing:
            - changedComponents (list of str)
            - unchangedComponents (list of str)
            - toolDiff (dict)
            - prompt (dict with old, new, unifiedDiff)
            - model (dict with old, new)
            - retrieval (dict with old, new)
            - code (dict with old, new)

    Raises:
        ValueError: If either version is missing or belongs to a different project.
    """
    baseline_doc = db["versions"].find_one({"_id": baseline_version_id})
    candidate_doc = db["versions"].find_one({"_id": candidate_version_id})

    if not baseline_doc:
        raise ValueError(f"Baseline version '{baseline_version_id}' not found in database.")
    if not candidate_doc:
        raise ValueError(f"Candidate version '{candidate_version_id}' not found in database.")

    if baseline_doc.get("projectId") != project_id:
        raise ValueError(
            f"Baseline version '{baseline_version_id}' belongs to project '{baseline_doc.get('projectId')}', expected '{project_id}'."
        )
    if candidate_doc.get("projectId") != project_id:
        raise ValueError(
            f"Candidate version '{candidate_version_id}' belongs to project '{candidate_doc.get('projectId')}', expected '{project_id}'."
        )

    base_components = baseline_doc.get("components") or {}
    cand_components = candidate_doc.get("components") or {}

    base_hashes = baseline_doc.get("hashes") or {}
    cand_hashes = candidate_doc.get("hashes") or {}

    changed_components: List[str] = []
    unchanged_components: List[str] = []

    for comp in COMPONENT_KEYS:
        b_hash = base_hashes.get(comp) or canonical_json_hash(base_components.get(comp, "" if comp == "prompt" else {}))
        c_hash = cand_hashes.get(comp) or canonical_json_hash(cand_components.get(comp, "" if comp == "prompt" else {}))
        if b_hash != c_hash:
            changed_components.append(comp)
        else:
            unchanged_components.append(comp)

    # Tool diff
    base_tools = base_components.get("tools") or []
    cand_tools = cand_components.get("tools") or []
    tool_diff = diff_tools(base_tools, cand_tools)

    # Prompt unified diff
    base_prompt = str(base_components.get("prompt") or "")
    cand_prompt = str(cand_components.get("prompt") or "")
    prompt_diff_lines = list(
        difflib.unified_diff(
            base_prompt.splitlines(keepends=True),
            cand_prompt.splitlines(keepends=True),
            fromfile=f"version_{baseline_version_id}",
            tofile=f"version_{candidate_version_id}",
        )
    )

    return {
        "changedComponents": changed_components,
        "unchangedComponents": unchanged_components,
        "toolDiff": tool_diff,
        "prompt": {
            "old": base_prompt,
            "new": cand_prompt,
            "unifiedDiff": "".join(prompt_diff_lines),
        },
        "model": {
            "old": base_components.get("model"),
            "new": cand_components.get("model"),
        },
        "retrieval": {
            "old": base_components.get("retrieval"),
            "new": cand_components.get("retrieval"),
        },
        "code": {
            "old": base_components.get("code"),
            "new": cand_components.get("code"),
        },
    }
