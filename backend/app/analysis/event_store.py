"""Safe event ingestion store with idempotent deduplication and error enrichment."""

import copy
import hashlib
from datetime import datetime
from typing import Any, Dict, List
from pymongo.database import Database
from pymongo.errors import BulkWriteError

from backend.app.analysis.patterns import classify_error, fingerprint_error

VALID_EVENT_TYPES = {
    "user_input",
    "prompt",
    "retrieval",
    "tool_call",
    "tool_result",
    "error",
    "output",
}

REQUIRED_EVENT_FIELDS = ["runId", "projectId", "versionId", "seq", "type", "ts"]


def compute_event_id(run_id: str, seq: int, event_type: str) -> str:
    """Compute deterministic SHA-1 eventId from runId, seq, and event type.

    Args:
        run_id (str): Run identifier.
        seq (int): Sequence integer.
        event_type (str): Event lifecycle type.

    Returns:
        str: Hexadecimal SHA-1 hash.
    """
    raw = f"{run_id}:{seq}:{event_type}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def insert_events_safe(db: Database, events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Safely ingest a batch of events with deduplication and error enrichment.

    Computes eventId if missing. For error events, enriches payload with pattern and fingerprint.
    Uses insert_many(ordered=False). Duplicate keys (error code 11000) are counted as duplicates.
    Schema validation failures or missing required fields are captured in rejected.

    Args:
        db (Database): PyMongo Database instance.
        events (List[Dict[str, Any]]): List of raw event dictionaries.

    Returns:
        Dict[str, Any]: Dictionary with:
            - 'inserted': int count of newly inserted events
            - 'duplicates': int count of duplicate events ignored
            - 'rejected': list of {'index': int, 'reason': str}
    """
    if not events:
        return {"inserted": 0, "duplicates": 0, "rejected": []}

    rejected: List[Dict[str, Any]] = []
    docs_to_insert: List[Dict[str, Any]] = []
    batch_index_map: List[int] = []  # maps index in docs_to_insert back to original index

    for idx, raw_event in enumerate(events):
        event = copy.deepcopy(raw_event)

        # Validate event type
        ev_type = event.get("type")
        if ev_type not in VALID_EVENT_TYPES:
            rejected.append({
                "index": idx,
                "reason": f"Invalid event type: {ev_type}. Must be one of {sorted(VALID_EVENT_TYPES)}",
            })
            continue

        # Validate required fields
        missing_fields = [f for f in REQUIRED_EVENT_FIELDS if event.get(f) is None]
        if missing_fields:
            rejected.append({
                "index": idx,
                "reason": f"Missing required field(s): {', '.join(missing_fields)}",
            })
            continue

        # Ensure ts is a datetime object if given as string/timestamp
        ts_val = event.get("ts")
        if isinstance(ts_val, (int, float)):
            event["ts"] = datetime.fromtimestamp(ts_val)
        elif isinstance(ts_val, str):
            try:
                event["ts"] = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
            except Exception:
                pass  # Keep as is, MongoDB validator will check bsonType date

        # Ensure payload object exists
        if "payload" not in event or event["payload"] is None:
            event["payload"] = {}
        elif not isinstance(event["payload"], dict):
            rejected.append({
                "index": idx,
                "reason": "Field 'payload' must be an object/dict",
            })
            continue

        # Compute eventId if missing
        if not event.get("eventId"):
            event["eventId"] = compute_event_id(str(event["runId"]), int(event["seq"]), str(event["type"]))

        # For error events, classify and compute fingerprint
        if event["type"] == "error":
            classification = classify_error(event)
            event["payload"]["pattern"] = classification["pattern"]
            if classification["tool"] and "tool" not in event["payload"]:
                event["payload"]["tool"] = classification["tool"]
            event["payload"]["fingerprint"] = fingerprint_error(event)

        docs_to_insert.append(event)
        batch_index_map.append(idx)

    if not docs_to_insert:
        return {"inserted": 0, "duplicates": 0, "rejected": rejected}

    inserted_count = 0
    duplicate_count = 0

    try:
        result = db["events"].insert_many(docs_to_insert, ordered=False)
        inserted_count = len(result.inserted_ids)
    except BulkWriteError as bwe:
        inserted_count = bwe.details.get("nInserted", 0)
        write_errors = bwe.details.get("writeErrors", [])
        for err in write_errors:
            err_code = err.get("code")
            err_idx = err.get("index", 0)
            orig_idx = batch_index_map[err_idx] if err_idx < len(batch_index_map) else err_idx

            if err_code == 11000:
                duplicate_count += 1
            else:
                reason = err.get("errmsg") or f"MongoDB write error code {err_code}"
                if "errInfo" in err:
                    reason = f"{reason} | {err['errInfo']}"
                rejected.append({"index": orig_idx, "reason": reason})

    return {
        "inserted": inserted_count,
        "duplicates": duplicate_count,
        "rejected": rejected,
    }
