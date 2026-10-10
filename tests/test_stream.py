"""Tests for Change Stream watcher (Review 2)."""

from datetime import datetime, timezone
import threading
import time
from backend.app.analysis.stream import watch_collection


def test_watch_collection_single_event(test_db):
    """Verify watch_collection yields insert event on findings collection."""
    proj = "stream_proj"
    results = []
    ready_flag = threading.Event()

    def watcher_thread():
        # Start watching with a short timeout
        watcher = watch_collection(test_db, "findings", proj, timeout_ms=8000)
        ready_flag.set()
        for doc in watcher:
            results.append(doc)
            break

    t = threading.Thread(target=watcher_thread)
    t.start()

    ready_flag.wait(timeout=3)
    # Give change stream listener half a second to settle
    time.sleep(0.5)

    # Insert a mock finding complying with strict $jsonSchema
    finding_doc = {
        "_id": "mock_finding_123",
        "projectId": proj,
        "versionId": "B",
        "baselineVersionId": "A",
        "suspectedComponent": "tools",
        "score": 0.85,
        "confidence": "high",
        "status": "open",
        "evidenceRefs": ["ev_1234567890abcdef12345678"],
        "reason": "Changed tool 'get_order' caused errors.",
        "createdAt": datetime.now(timezone.utc),
    }
    test_db["findings"].insert_one(finding_doc)

    t.join(timeout=10)

    assert len(results) == 1
    received = results[0]
    assert received["_id"] == "mock_finding_123"
    assert received["projectId"] == proj
    assert received["suspectedComponent"] == "tools"
    assert received["confidence"] == "high"


def test_watch_collection_timeout_empty(test_db):
    """Verify watch_collection terminates cleanly when timeout expires with no events."""
    proj = "empty_stream_proj"
    start_t = time.time()
    events = list(watch_collection(test_db, "findings", proj, timeout_ms=500))
    elapsed = time.time() - start_t

    assert len(events) == 0
    assert elapsed >= 0.4
