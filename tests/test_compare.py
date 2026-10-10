"""Tests for version comparison and component diffing (Section 9)."""

from datetime import datetime, timezone
import pytest

from backend.app.analysis.compare import (
    canonical_json_hash,
    compute_manifest_hashes,
    diff_tools,
    compare_versions,
)
from scripts.seed_demo import build_manifest_components


def test_diff_tools_detects_parameter_rename():
    """Verify toolDiff identifies added, removed, and possibleRename parameters."""
    tools_a = build_manifest_components("A")["tools"]
    tools_b = build_manifest_components("B")["tools"]

    diff = diff_tools(tools_a, tools_b)
    assert diff["addedTools"] == []
    assert diff["removedTools"] == []
    assert "get_order" in diff["changedTools"]

    get_order_diff = diff["changedTools"]["get_order"]
    assert get_order_diff["addedParams"] == ["orderId"]
    assert get_order_diff["removedParams"] == ["order_id"]
    assert get_order_diff["possibleRename"] == ["order_id", "orderId"]
    assert get_order_diff["requiredChanged"] is True


def test_compare_versions_with_db(test_db):
    """Verify changedComponents is exactly ['tools'] for A vs B, and missing version raises ValueError."""
    now = datetime.now(timezone.utc)
    proj_id = "test_compare_proj"

    # Setup project and versions A and B
    test_db["projects"].insert_one({"_id": proj_id, "name": "Test", "createdAt": now})

    for v_id in ["A", "B"]:
        comp = build_manifest_components(v_id)
        meta = compute_manifest_hashes(comp)
        test_db["versions"].insert_one({
            "_id": f"{proj_id}_{v_id}",
            "projectId": proj_id,
            "label": v_id,
            "createdAt": now,
            "components": comp,
            "hashes": meta["hashes"],
            "manifestHash": meta["manifestHash"],
        })

    # Compare A vs B
    res = compare_versions(test_db, proj_id, f"{proj_id}_A", f"{proj_id}_B")
    assert res["changedComponents"] == ["tools"]
    assert set(res["unchangedComponents"]) == {"prompt", "model", "retrieval", "code"}
    assert res["toolDiff"]["changedTools"]["get_order"]["possibleRename"] == ["order_id", "orderId"]

    # Missing version raises ValueError
    with pytest.raises(ValueError, match="not found"):
        compare_versions(test_db, proj_id, f"{proj_id}_A", "non_existent_version")

    # Mismatched project raises ValueError
    with pytest.raises(ValueError, match="different project"):
        compare_versions(test_db, "wrong_project_id", f"{proj_id}_A", f"{proj_id}_B")
