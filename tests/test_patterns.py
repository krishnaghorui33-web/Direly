"""Tests for error pattern taxonomy classification and deterministic fingerprinting."""

import re
import pytest

from backend.app.analysis.patterns import (
    classify_error,
    fingerprint_error,
    normalize_error_message,
)


def test_taxonomy_classification_all_categories():
    """Verify at least one case per pattern in the taxonomy (Section 6 & 9)."""
    # 1. invalid_tool_args
    assert classify_error({
        "payload": {"message": "missing required argument: orderId", "tool": "get_order"}
    })["pattern"] == "invalid_tool_args"

    assert classify_error({
        "payload": {"message": "Unexpected argument provided", "tool": "get_order"}
    })["pattern"] == "invalid_tool_args"

    assert classify_error({
        "payload": {"errorType": "invalid_tool_args", "message": "any message", "tool": "get_order"}
    })["pattern"] == "invalid_tool_args"

    assert classify_error({
        "payload": {"message": "Schema validation failed for payload", "tool": "get_order"}
    })["pattern"] == "invalid_tool_args"

    # 2. tool_not_found
    assert classify_error({
        "payload": {"message": "unknown tool: fetch_user", "tool": "fetch_user"}
    })["pattern"] == "tool_not_found"

    assert classify_error({
        "payload": {"message": "No such tool registered", "tool": "fetch_user"}
    })["pattern"] == "tool_not_found"

    assert classify_error({
        "payload": {"errorType": "tool_not_found", "message": "something else", "tool": "fetch_user"}
    })["pattern"] == "tool_not_found"

    # 3. retrieval_empty
    assert classify_error({
        "payload": {"message": "retrieval returned 0 documents", "tool": None}
    })["pattern"] == "retrieval_empty"

    assert classify_error({
        "payload": {"message": "Empty retrieval result from knowledge base"}
    })["pattern"] == "retrieval_empty"

    assert classify_error({
        "payload": {"errorType": "retrieval_empty"}
    })["pattern"] == "retrieval_empty"

    # 4. timeout
    assert classify_error({
        "payload": {"message": "LLM call timed out after 30000ms"}
    })["pattern"] == "timeout"

    assert classify_error({
        "payload": {"errorType": "timeout"}
    })["pattern"] == "timeout"

    # 5. wrong_tool
    assert classify_error({
        "failedChecks": ["tool_called"],
        "payload": {"message": "tool check failed"}
    })["pattern"] == "wrong_tool"

    assert classify_error({
        "payload": {"message": "The wrong tool was called during generation"}
    })["pattern"] == "wrong_tool"

    # 6. other
    assert classify_error({
        "payload": {"message": "Internal server crash: division by zero"}
    })["pattern"] == "other"


def test_fingerprint_grouping_same_underlying_error():
    """Verify that the same underlying error with different numbers or IDs produces one fingerprint."""
    event1 = {
        "payload": {
            "tool": "get_order",
            "message": "missing required argument: orderId in run 48201 with transaction id 9f8a7b6c5d4e3f2a",
        }
    }
    event2 = {
        "payload": {
            "tool": "get_order",
            "message": "missing required argument: orderId in run 99120 with transaction id c8d7e6f5a4b3c2d1",
        }
    }

    fp1 = fingerprint_error(event1)
    fp2 = fingerprint_error(event2)

    assert fp1 == fp2, f"Fingerprints should match for same error across runs, got {fp1} != {fp2}"
    assert len(fp1) == 16
    assert re.match(r"^[0-9a-f]{16}$", fp1)


def test_fingerprint_distinguishes_different_errors():
    """Verify that different errors produce different fingerprints."""
    # Different argument name
    event_order_id = {
        "payload": {"tool": "get_order", "message": "missing required argument: order_id"}
    }
    event_order_id_camel = {
        "payload": {"tool": "get_order", "message": "missing required argument: orderId"}
    }
    # Different tool
    event_refund = {
        "payload": {"tool": "refund_order", "message": "missing required argument: orderId"}
    }
    # Different pattern
    event_timeout = {
        "payload": {"tool": "get_order", "message": "Request timed out after 5000ms"}
    }

    fp_id = fingerprint_error(event_order_id)
    fp_camel = fingerprint_error(event_order_id_camel)
    fp_refund = fingerprint_error(event_refund)
    fp_timeout = fingerprint_error(event_timeout)

    assert fp_id != fp_camel, "Fingerprint should distinguish between order_id and orderId"
    assert fp_camel != fp_refund, "Fingerprint should distinguish between get_order and refund_order"
    assert fp_camel != fp_timeout, "Fingerprint should distinguish between invalid_tool_args and timeout"


def test_normalize_error_message():
    """Verify normalization handles UUIDs, hex strings, digits, and spacing."""
    msg = "Error on orderId 4812 in uuid 12345678-abcd-1234-abcd-123456789abc with hash a1b2c3d4e5f67890   spaces"
    normalized = normalize_error_message(msg)
    assert "<N>" in normalized
    assert "<ID>" in normalized
    assert "orderid" in normalized
    assert "   " not in normalized
