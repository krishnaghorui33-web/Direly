"""Tool implementations and the argument validator that version B breaks.

The validator is the load-bearing piece of this module. It is ordinary,
inspectable code that compares the arguments an agent actually produced against
the JSON schema the active manifest declares. When version B renames
get_order's required parameter from ``order_id`` to ``orderId``, the agent's
unchanged code still sends ``order_id``, and this function raises
``ToolValidationError`` for real. Nothing about that outcome is hardcoded.

Message wording matters more than it looks. ``classify_error``
(backend/app/analysis/patterns.py) reads the error payload's message text and
tests it against the taxonomy keywords in a fixed order. To land in the
``invalid_tool_args`` branch, the message must contain one of: "missing
required", "unexpected argument", "invalid argument", "validation", "schema".
Phrasings that read naturally but miss all of those keywords fall through to
``other``, e.g. "required property 'orderId' is missing". So the messages below
deliberately use the literal phrase "missing required argument '<name>'".
"""

from typing import Any, Dict, List, Optional

# Realistic upstream error class name. Deliberately NOT the taxonomy label:
# classify_error short-circuits on errorType when it exactly equals a taxonomy
# string, which would short-circuit the message-matching path we want exercised.
ERR_TYPE_VALIDATION = "ToolValidationError"
ERR_TYPE_TIMEOUT = "GatewayTimeoutError"
ERR_TYPE_NOT_FOUND = "ToolNotFoundError"


class ToolValidationError(Exception):
    """Raised when call arguments do not satisfy the declared tool schema.

    Attributes:
        tool (str): Name of the tool that rejected the call.
        errors (List[str]): Human-readable descriptions of each schema violation.
    """

    def __init__(self, tool: str, errors: List[str]):
        self.tool = tool
        self.errors = errors
        super().__init__(f"{tool}: {errors[0] if errors else 'validation failed'}")


class ToolNotFoundError(Exception):
    """Raised when the agent calls a tool the manifest does not declare.

    Attributes:
        tool (str): The undeclared tool name.
    """

    def __init__(self, tool: str):
        self.tool = tool
        super().__init__(f"unknown tool {tool}")


class ToolTimeout(Exception):
    """Raised when a simulated environment fault stalls a tool call.

    Attributes:
        tool (str): The tool that timed out.
        message (str): A timeout message, worded so classify_error maps it to
            the ``timeout`` pattern.
    """

    def __init__(self, tool: str, message: str):
        self.tool = tool
        self.message = message
        super().__init__(message)


_TYPE_MAP: Dict[str, tuple] = {
    "string": (str,),
    "integer": (int,),
    "number": (int, float),
    "boolean": (bool,),
}


def _type_ok(value: Any, expected: str) -> bool:
    """Check a value against a JSON-schema primitive type name.

    Args:
        value (Any): The value to check.
        expected (str): JSON-schema type name.

    Returns:
        bool: True if the value satisfies the type.
    """
    allowed = _TYPE_MAP.get(expected)
    if allowed is None:
        return True
    if expected in ("integer", "number") and isinstance(value, bool):
        # bool is a subclass of int in Python; reject it for numeric types.
        return False
    return isinstance(value, allowed)


def validate_args(schema: Dict[str, Any], tool_name: str, args: Dict[str, Any]) -> None:
    """Validate call arguments against a tool's declared JSON schema.

    Checks, in order: argument object shape, undeclared arguments, missing
    required arguments, then per-argument types. Raises on the first category
    that has violations so the message names one specific problem.

    Args:
        schema (Dict[str, Any]): A tool schema with a "parameters" object.
        tool_name (str): Tool name, used in the error message.
        args (Dict[str, Any]): Arguments the agent produced.

    Raises:
        ToolValidationError: If the arguments do not satisfy the schema.
    """
    params = (schema or {}).get("parameters") or {}
    properties: Dict[str, Any] = params.get("properties") or {}
    required: List[str] = list(params.get("required") or [])

    errors: List[str] = []

    for key in sorted(args.keys()):
        if key not in properties:
            errors.append(f"unexpected argument '{key}' for {tool_name}")

    for key in required:
        if key not in args:
            errors.append(f"missing required argument '{key}' for {tool_name}")

    for key, spec in properties.items():
        if key not in args:
            continue
        expected_type = (spec or {}).get("type")
        if expected_type and not _type_ok(args[key], expected_type):
            errors.append(
                f"invalid argument '{key}' for {tool_name}: "
                f"expected {expected_type}, got {type(args[key]).__name__}"
            )

    if errors:
        raise ToolValidationError(tool_name, errors)


def _seeded_value(seed_text: str) -> Dict[str, Any]:
    """Build a deterministic order record from a seed string.

    Uses a stable hash rather than random state so the same case always yields
    the same order, which keeps the whole run set reproducible.

    Args:
        seed_text (str): Stable seed, typically an order id.

    Returns:
        Dict[str, Any]: A synthetic order record.
    """
    digest = sha1_hex(seed_text)
    status_options = ["shipped", "delivered", "processing", "returned"]
    item_options = ["SKU-1180", "SKU-2245", "SKU-3390", "SKU-4417"]
    index = int(digest[:4], 16)
    return {
        "orderId": seed_text,
        "status": status_options[index % len(status_options)],
        "items": [item_options[index % len(item_options)]],
        "totalCents": 1500 + (index % 90) * 100,
    }


def sha1_hex(text: str) -> str:
    """Return the hex SHA-1 digest of a string.

    Args:
        text (str): Input string.

    Returns:
        str: Hex digest.
    """
    import hashlib

    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def execute_tool(
    tool_name: str,
    schema: Optional[Dict[str, Any]],
    args: Dict[str, Any],
    timeout_message: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate and execute one tool call.

    Args:
        tool_name (str): Name of the tool to invoke.
        schema (Optional[Dict[str, Any]]): The declared schema; None if the
            tool is not declared in this manifest.
        args (Dict[str, Any]): Arguments produced by the agent.
        timeout_message (Optional[str]): When provided, the call is treated as
            having stalled in the environment and raises ToolTimeout. This is
            simulated infrastructure flakiness only; it never fakes a tool
            result and never fakes the get_order regression.

    Returns:
        Dict[str, Any]: The tool's result payload.

    Raises:
        ToolNotFoundError: If the tool is not declared in the manifest.
        ToolTimeout: If timeout_message is provided.
        ToolValidationError: If the arguments violate the declared schema.
    """
    if schema is None:
        raise ToolNotFoundError(tool_name)

    if timeout_message is not None:
        raise ToolTimeout(tool_name, timeout_message)

    validate_args(schema, tool_name, args)

    if tool_name == "get_order":
        return _seeded_value(str(args[list(args.keys())[0]]))

    if tool_name == "refund_order":
        order_key = args.get("order_id")
        return {
            "refundId": sha1_hex(f"refund:{order_key}")[:12],
            "orderId": order_key,
            "reason": args.get("reason", "customer_request"),
            "status": "refund_queued",
        }

    if tool_name == "search_policy":
        return {"query": args.get("query", ""), "documents": [], "index": "order_policies_v1"}

    raise ToolNotFoundError(tool_name)