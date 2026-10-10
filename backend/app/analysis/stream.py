"""MongoDB Change Stream watcher for reactive real-time updates."""

from datetime import datetime
import json
import time
from typing import Any, Dict, Generator, Optional
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import PyMongoError


class MongoJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to safely serialize BSON/MongoDB types for SSE."""

    def default(self, o: Any) -> Any:
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all BSON types in the document are JSON serializable.

    Args:
        doc (Dict[str, Any]): MongoDB document.

    Returns:
        Dict[str, Any]: JSON-safe dictionary.
    """
    return json.loads(json.dumps(doc, cls=MongoJSONEncoder))


def watch_collection(
    db: Database,
    collection_name: str,
    project_id: str,
    timeout_ms: int = 60000,
) -> Generator[Dict[str, Any], None, None]:
    """Watch a MongoDB collection for real-time insert/update/replace operations.

    Yields JSON-serializable fullDocument payloads matching the target projectId,
    suitable for streaming to clients via FastAPI Server-Sent Events (SSE).

    Args:
        db (Database): PyMongo Database instance.
        collection_name (str): Name of the collection to watch.
        project_id (str): Project identifier to filter events.
        timeout_ms (int): Maximum duration to watch in milliseconds (default 60000).

    Yields:
        Dict[str, Any]: Serialized fullDocument of each matching change event.
    """
    pipeline = [
        {
            "$match": {
                "operationType": {"$in": ["insert", "update", "replace"]},
                "fullDocument.projectId": project_id,
            }
        }
    ]

    start_time = time.time()
    max_duration_sec = timeout_ms / 1000.0

    try:
        # max_await_time_ms controls how long getMore waits for events per batch
        await_ms = min(1000, timeout_ms)
        with db[collection_name].watch(
            pipeline=pipeline,
            full_document="updateLookup",
            max_await_time_ms=await_ms,
        ) as stream:
            while stream.alive:
                # Check overall timeout
                if (time.time() - start_time) >= max_duration_sec:
                    break

                change = stream.try_next()
                if change is not None:
                    full_doc = change.get("fullDocument")
                    if full_doc is not None:
                        yield serialize_doc(full_doc)
                else:
                    # No new event in this batch interval; sleep briefly to prevent busy waiting
                    time.sleep(0.05)
    except PyMongoError:
        # Handle or bubble MongoDB errors cleanly on connection loss or timeout
        return
