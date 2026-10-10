"""Deterministic error pattern classification and failure fingerprinting."""

import hashlib
import re
from typing import Any, Dict, Optional

# Taxonomy order per Section 6 of BRIEF.md:
# 1. invalid_tool_args: message contains "missing required", "unexpected argument", "invalid argument", "validation", or "schema"; or errorType is invalid_tool_args.
# 2. tool_not_found: message contains "unknown tool", "no such tool", or "tool not found".
# 3. retrieval_empty: message contains "no documents", "empty retrieval", or "retrieval returned 0".
# 4. timeout: message contains "timeout" or "timed out".
# 5. wrong_tool: the failed check is tool_called, or message says the wrong tool was used.
# 6. other: anything else.

PATTERN_TO_COMPONENT = {
    "invalid_tool_args": "tools",
    "tool_not_found": "tools",
    "retrieval_empty": "retrieval",
    "wrong_tool": "prompt",
    "timeout": "model and code",
    "other": None,
}


def normalize_error_message(msg: str) -> str:
    """Normalize error message for deterministic fingerprinting.

    Preserves identifier-like argument names (e.g. orderId, order_id) while normalizing:
    - lowercasing
    - replacing hex or UUID strings of 8 or more characters with <ID>
    - replacing quoted literal values with <VAL> (preserving argument name identifiers)
    - replacing digits with <N>
    - collapsing whitespace

    Args:
        msg (str): Raw error message string.

    Returns:
        str: Normalized message string.
    """
    if not msg:
        return ""

    text = msg.lower()

    # 1. Replace UUIDs and hex strings of 8 or more hex characters with <ID>
    uuid_hex_pattern = r"\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{8,})\b"
    text = re.sub(uuid_hex_pattern, "<ID>", text)

    # 2. Replace quoted literal values with <VAL>, preserving identifier argument names
    # Match quoted strings '...' or "..."
    def replace_quoted(match: re.Match) -> str:
        content = match.group(2)
        # Check if the quoted string is an identifier name (like orderId, order_id)
        if re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", content):
            # Check preceding context in the original text up to match start
            preceding = text[: match.start()].strip()
            if any(preceding.endswith(kw) for kw in ["argument", "parameter", "param", "field", "property", "key", "argument:", "param:", "parameter:"]):
                return content  # preserve argument name
        return "<VAL>"

    text = re.sub(r"('([^']*)'|\"([^\"]*)\")", replace_quoted, text)

    # 3. Replace digit sequences with <N>
    text = re.sub(r"\d+", "<N>", text)

    # 4. Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def classify_error(event: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """Classify an error event into one of the 6 canonical pattern categories.

    Evaluates errorType, message, and failed checks in strict taxonomy order.

    Args:
        event (Dict[str, Any]): Event document containing payload and optional check metadata.

    Returns:
        Dict[str, Optional[str]]: Dict with 'pattern' (str) and 'tool' (str or None).
    """
    payload = event.get("payload") or {}
    error_type = str(payload.get("errorType") or "").lower()
    message = str(payload.get("message") or "").lower()

    # Tool identification
    tool = payload.get("tool") or event.get("tool")
    if tool is not None:
        tool = str(tool)

    # Extract failed checks
    checks = event.get("failedChecks") or payload.get("failedChecks") or payload.get("failed_checks") or []
    if isinstance(checks, str):
        checks = [checks]
    checks_lower = [str(c).lower() for c in checks]

    # 1. invalid_tool_args
    invalid_arg_keywords = ["missing required", "unexpected argument", "invalid argument", "validation", "schema"]
    if error_type == "invalid_tool_args" or any(kw in message for kw in invalid_arg_keywords):
        return {"pattern": "invalid_tool_args", "tool": tool}

    # 2. tool_not_found
    tool_not_found_keywords = ["unknown tool", "no such tool", "tool not found"]
    if error_type == "tool_not_found" or any(kw in message for kw in tool_not_found_keywords):
        return {"pattern": "tool_not_found", "tool": tool}

    # 3. retrieval_empty
    retrieval_empty_keywords = ["no documents", "empty retrieval", "retrieval returned 0"]
    if error_type == "retrieval_empty" or any(kw in message for kw in retrieval_empty_keywords):
        return {"pattern": "retrieval_empty", "tool": tool}

    # 4. timeout
    if error_type == "timeout" or "timeout" in message or "timed out" in message:
        return {"pattern": "timeout", "tool": tool}

    # 5. wrong_tool
    if (
        error_type == "wrong_tool"
        or "tool_called" in checks_lower
        or "wrong tool" in message
        or "wrong tool was used" in message
    ):
        return {"pattern": "wrong_tool", "tool": tool}

    # 6. other
    return {"pattern": "other", "tool": tool}


def fingerprint_error(event: Dict[str, Any]) -> str:
    """Compute the deterministic 16-hex-character failure fingerprint for an error event.

    Formula: first 16 hex characters of sha1("<pattern>|<tool>|<normalized message>").

    Args:
        event (Dict[str, Any]): Event document with error payload.

    Returns:
        str: 16-character hexadecimal fingerprint.
    """
    classification = classify_error(event)
    pattern = classification["pattern"]
    tool = classification["tool"] or ""

    payload = event.get("payload") or {}
    message = str(payload.get("message") or "")
    normalized_message = normalize_error_message(message)

    raw_signature = f"{pattern}|{tool}|{normalized_message}"
    return hashlib.sha1(raw_signature.encode("utf-8")).hexdigest()[:16]
