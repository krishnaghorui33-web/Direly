"""Version manifests for OrderBot.

The three manifests are the subject of the whole demo:

    A  known-good baseline. get_order takes order_id, and the agent sends
       order_id, so every call validates.
    B  the regression. get_order now REQUIRES orderId, but the agent code was
       never updated and still sends order_id. Every get_order call therefore
       fails argument validation for real. Prompt, model, retrieval and code
       are untouched, so changedComponents for A vs B is exactly ["tools"].
    C  the fix. The agent code is updated to send orderId, matching the B
       schema, so the calls validate again.

Contract notes (these are asserted by tests/test_compare.py and
tests/test_culprit.py, so they are deliberate rather than incidental):

  * Between A and B, get_order changes EXACTLY one parameter name,
    order_id -> orderId, and nothing else. compare.diff_tools only reports a
    ``possibleRename`` when precisely one parameter was removed and one added
    (backend/app/analysis/compare.py), so adding any second parameter here
    would silently turn the rename into an anonymous add/remove.
  * No tool is added or removed between A and B; the tool set stays
    {get_order, refund_order, search_policy}.
  * The prompt, model, retrieval and code components are byte-identical
    between A and B, so changedComponents for A vs B is exactly ["tools"].
    Only C carries a different code commit, which is what makes the fix a real
    change rather than a relabelling.
  * ``prompt`` stays a plain mutable str, because tests mutate it.
"""

from typing import Any, Dict, List, Optional

# Order in which components are hashed by compare.compute_manifest_hashes.
COMPONENT_KEYS = ["prompt", "tools", "model", "retrieval", "code"]

VERSION_IDS = ["A", "B", "C"]

PROMPT = (
    "You are an AI order processing agent. Help users check order statuses, "
    "process refunds, and search return policies."
)

# Identical across A and B. Only C differs (see CODE_COMMITS).
MODEL: Dict[str, Any] = {"name": "gpt-4o", "temperature": 0.0}

# Identical across all three versions.
RETRIEVAL: Dict[str, Any] = {"index": "order_policies_v1", "topK": 3}

# The regression is a schema change in code the agent calls, not a code change:
# A and B therefore share a commit. C carries the fix.
CODE_COMMITS: Dict[str, str] = {
    "A": "c0ffee11",
    "B": "c0ffee11",
    "C": "c0ffee22_fix_orderId",
}


def _get_order_tool(param_name: str) -> Dict[str, Any]:
    """Build the get_order schema for a given required-parameter spelling.

    Args:
        param_name (str): Either "order_id" (versions A and B) or "orderId"
            (version C).

    Returns:
        Dict[str, Any]: A single tool schema object.
    """
    return {
        "name": "get_order",
        "description": f"Retrieve order details by {param_name}",
        "parameters": {
            "type": "object",
            "properties": {
                param_name: {"type": "string", "description": "The unique order identifier"}
            },
            "required": [param_name],
        },
    }


def _refund_order_tool() -> Dict[str, Any]:
    """Build the refund_order schema, which never changes across versions.

    Returns:
        Dict[str, Any]: A single tool schema object.
    """
    return {
        "name": "refund_order",
        "description": "Process refund for order_id",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "Order ID"},
            },
            "required": ["order_id"],
        },
    }


def _search_policy_tool() -> Dict[str, Any]:
    """Build the search_policy schema, which never changes across versions.

    Returns:
        Dict[str, Any]: A single tool schema object.
    """
    return {
        "name": "search_policy",
        "description": "Search return policies",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keywords"}
            },
            "required": ["query"],
        },
    }


def get_order_param_name(version_id: str) -> str:
    """Return the parameter name the get_order SCHEMA requires in a version.

    This is the contract the tool publishes, and it is what the agent must
    satisfy. Version B is where the contract changed: it now requires
    "orderId" while versions A and C use "order_id"/"orderId" as noted below.

    Args:
        version_id (str): One of "A", "B", "C".

    Returns:
        str: "order_id" for A, "orderId" for B and C.
    """
    return "order_id" if version_id == "A" else "orderId"


def get_agent_param_name(version_id: str) -> str:
    """Return the parameter name the AGENT CODE actually sends for get_order.

    This is deliberately not the same function as get_order_param_name, and the
    gap between them is the whole point of the demo:

        A  schema order_id, code order_id  -> agrees
        B  schema orderId, code order_id   -> DISAGREES, every call fails
        C  schema orderId, code orderId    -> agrees again

    The agent code was only updated in C, which is what a real fix looks like:
    someone renames a schema parameter, the calling code is not updated with it,
    the tests go red, and the rename is later applied to the code too.

    Args:
        version_id (str): One of "A", "B", "C".

    Returns:
        str: "order_id" for A and B, "orderId" for C.
    """
    return "orderId" if version_id == "C" else "order_id"


def build_manifest_components(version_id: str) -> Dict[str, Any]:
    """Build the components dictionary for version A, B or C.

    Args:
        version_id (str): One of "A", "B", "C".

    Returns:
        Dict[str, Any]: Dict with keys prompt, tools, model, retrieval, code.
            Each call returns fresh, independently mutable objects, so callers
            (and tests) may mutate the result without affecting later calls.
    """
    if version_id not in VERSION_IDS:
        raise ValueError(f"Unknown version_id {version_id!r}; expected one of {VERSION_IDS}")

    param_name = get_order_param_name(version_id)

    return {
        "prompt": PROMPT,
        "tools": [_get_order_tool(param_name), _refund_order_tool(), _search_policy_tool()],
        "model": dict(MODEL),
        "retrieval": dict(RETRIEVAL),
        "code": {"commit": CODE_COMMITS[version_id]},
    }


def get_tool_schema(components: Dict[str, Any], tool_name: str) -> Optional[Dict[str, Any]]:
    """Look up one tool's schema from a components dictionary.

    Args:
        components (Dict[str, Any]): A manifest components dict.
        tool_name (str): Name of the tool to find.

    Returns:
        Optional[Dict[str, Any]]: The tool schema, or None if the tool is not
            declared in this manifest.
    """
    for tool in components.get("tools", []):
        if isinstance(tool, dict) and tool.get("name") == tool_name:
            return tool
    return None


def manifest_for(version_id: str) -> Dict[str, Any]:
    """Alias for build_manifest_components, kept for readability at call sites.

    Args:
        version_id (str): One of "A", "B", "C".

    Returns:
        Dict[str, Any]: The manifest components dict.
    """
    return build_manifest_components(version_id)


def tool_names(components: Dict[str, Any]) -> List[str]:
    """List the tool names declared in a manifest, in declaration order.

    Args:
        components (Dict[str, Any]): A manifest components dict.

    Returns:
        List[str]: Tool names.
    """
    return [t["name"] for t in components.get("tools", []) if isinstance(t, dict) and "name" in t]