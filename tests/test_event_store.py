"""Tests for safe event store ingestion, duplicate suppression, and validation rejection."""

from datetime import datetime, timezone
import hashlib
import pytest

from backend.app.analysis.event_store import (
    compute_event_id,
    insert_events_safe,
)


def test_compute_event_id_formula():
    """Verify eventId formula sha1 hex('<runId>:<seq>:<type>')."""
    run_id = "run-abc-123"
    seq = 4
    event_type = "tool_call"
    expected = hashlib.sha1(f"{run_id}:{seq}:{event_type}".encode("utf-8")).hexdigest()

    assert compute_event_id(run_id, seq, event_type) == expected


def test_invalid_event_data_rejected_without_db():
    """Verify that an event without runId, and an event with an unknown type, both land in rejected with a reason."""
    now = datetime.now(timezone.utc)
    events = [
        # Missing runId
        {
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 1,
            "type": "user_input",
            "ts": now,
            "payload": {"text": "hello"},
        },
        # Unknown event type
        {
            "runId": "r1",
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 2,
            "type": "invalid_magic_type",
            "ts": now,
            "payload": {},
        },
    ]

    # Calling with None or dummy db should cleanly reject during pre-validation
    result = insert_events_safe(None, events)
    assert result["inserted"] == 0
    assert result["duplicates"] == 0
    assert len(result["rejected"]) == 2

    # Verify clear reasons
    assert result["rejected"][0]["index"] == 0
    assert "Missing required field" in result["rejected"][0]["reason"]
    assert "runId" in result["rejected"][0]["reason"]

    assert result["rejected"][1]["index"] == 1
    assert "Invalid event type" in result["rejected"][1]["reason"]


def test_duplicate_events_and_storage_with_db(test_db):
    """Verify duplicate events suppression and persistence when database is available (Section 9)."""
    now = datetime.now(timezone.utc)
    batch = [
        {
            "runId": "r100",
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 1,
            "type": "user_input",
            "ts": now,
            "payload": {"input": "check order 12"},
        },
        {
            "runId": "r100",
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 2,
            "type": "tool_call",
            "ts": now,
            "payload": {"tool": "get_order", "args": {"order_id": 12}},
        },
        {
            "runId": "r100",
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 3,
            "type": "error",
            "ts": now,
            "payload": {"tool": "get_order", "message": "missing required argument: orderId"},
        },
    ]

    # First insertion: all should be inserted
    res1 = insert_events_safe(test_db, batch)
    assert res1["inserted"] == 3
    assert res1["duplicates"] == 0
    assert len(res1["rejected"]) == 0
    assert test_db["events"].count_documents({"runId": "r100"}) == 3

    # Error event payload was enriched with pattern and fingerprint
    error_doc = test_db["events"].find_one({"runId": "r100", "type": "error"})
    assert error_doc is not None
    assert error_doc["payload"]["pattern"] == "invalid_tool_args"
    assert "fingerprint" in error_doc["payload"]

    # Second insertion with the same batch: inserted 0, duplicates N, collection count unchanged
    res2 = insert_events_safe(test_db, batch)
    assert res2["inserted"] == 0
    assert res2["duplicates"] == 3
    assert len(res2["rejected"]) == 0
    assert test_db["events"].count_documents({"runId": "r100"}) == 3


def test_invalid_events_and_rejections_with_db(test_db):
    """Verify that invalid events land in rejected, duplicates in duplicates, and valid ones insert."""
    now = datetime.now(timezone.utc)
    mixed_batch = [
        # Valid event
        {
            "runId": "r_valid_01",
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 1,
            "type": "user_input",
            "ts": now,
            "payload": {"text": "hello"},
        },
        # Invalid event 1: missing runId
        {
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 2,
            "type": "user_input",
            "ts": now,
            "payload": {"text": "missing runId"},
        },
        # Invalid event 2: unknown event type
        {
            "runId": "r_invalid_02",
            "projectId": "orderbot",
            "versionId": "A",
            "seq": 3,
            "type": "unrecognized_lifecycle_event",
            "ts": now,
            "payload": {},
        },
    ]

    res = insert_events_safe(test_db, mixed_batch)
    assert res["inserted"] == 1
    assert res["duplicates"] == 0
    assert len(res["rejected"]) == 2

    # Check rejected indices and reasons
    assert res["rejected"][0]["index"] == 1
    assert "Missing required field" in res["rejected"][0]["reason"]
    assert "runId" in res["rejected"][0]["reason"]

    assert res["rejected"][1]["index"] == 2
    assert "Invalid event type" in res["rejected"][1]["reason"]

    # Verify only the valid event is stored
    assert test_db["events"].count_documents({"runId": "r_valid_01"}) == 1
    assert test_db["events"].count_documents({"runId": "r_invalid_02"}) == 0

    # Ingesting same mixed batch again: inserted 0, duplicates 1, rejected 2
    res_repeat = insert_events_safe(test_db, mixed_batch)
    assert res_repeat["inserted"] == 0
    assert res_repeat["duplicates"] == 1
    assert len(res_repeat["rejected"]) == 2
    assert test_db["events"].count_documents({"runId": "r_valid_01"}) == 1

