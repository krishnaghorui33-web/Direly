"""MongoDB connection management, collections, jsonSchema validators, and index setup."""

import os
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

# Load environment variables from .env if present
load_dotenv()

# JSON Schema definitions for strict validation
SCHEMA_EVENTS: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["eventId", "runId", "projectId", "versionId", "seq", "type", "ts"],
        "properties": {
            "eventId": {"bsonType": "string", "description": "Unique SHA-1 hex ID of the event"},
            "runId": {"bsonType": "string", "description": "Identifier of the run"},
            "projectId": {"bsonType": "string", "description": "Identifier of the project"},
            "versionId": {"bsonType": "string", "description": "Identifier of the version"},
            "seq": {"bsonType": ["int", "long"], "description": "Sequence number of the event in run"},
            "type": {
                "enum": [
                    "user_input",
                    "prompt",
                    "retrieval",
                    "tool_call",
                    "tool_result",
                    "error",
                    "output",
                ],
                "description": "Lifecycle event type",
            },
            "ts": {"bsonType": "date", "description": "Timestamp of the event"},
            "payload": {"bsonType": "object", "description": "Free-form event payload object"},
        },
    }
}

SCHEMA_RUNS: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "projectId",
            "versionId",
            "caseId",
            "attempt",
            "status",
            "latencyMs",
            "startedAt",
        ],
        "properties": {
            "_id": {"bsonType": "string", "description": "Unique run ID"},
            "projectId": {"bsonType": "string", "description": "Project ID"},
            "versionId": {"bsonType": "string", "description": "Version ID"},
            "caseId": {"bsonType": "string", "description": "Test case ID"},
            "suiteVersion": {"bsonType": "string", "description": "Suite version string"},
            "attempt": {"bsonType": ["int", "long"], "minimum": 1, "description": "Attempt counter"},
            "status": {"enum": ["pass", "fail"], "description": "Outcome status"},
            "failedChecks": {
                "bsonType": "array",
                "items": {"bsonType": "string"},
                "description": "List of failed checks",
            },
            "latencyMs": {"bsonType": ["int", "long"], "description": "Latency in milliseconds"},
            "startedAt": {"bsonType": "date", "description": "Start timestamp"},
        },
    }
}

SCHEMA_VERSIONS: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["projectId", "components", "hashes", "manifestHash"],
        "properties": {
            "_id": {"bsonType": "string", "description": "Version ID"},
            "projectId": {"bsonType": "string", "description": "Project ID"},
            "label": {"bsonType": "string", "description": "Human-readable label"},
            "createdAt": {"bsonType": "date", "description": "Creation timestamp"},
            "components": {"bsonType": "object", "description": "Component definitions object"},
            "hashes": {"bsonType": "object", "description": "SHA-1 hashes of components"},
            "manifestHash": {"bsonType": "string", "description": "SHA-1 canonical hash of hashes"},
        },
    }
}

SCHEMA_FINDINGS: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "projectId",
            "versionId",
            "baselineVersionId",
            "suspectedComponent",
            "evidenceRefs",
            "reason",
            "status",
            "createdAt",
        ],
        "properties": {
            "_id": {"bsonType": "string", "description": "Finding ID"},
            "projectId": {"bsonType": "string", "description": "Project ID"},
            "versionId": {"bsonType": "string", "description": "Candidate version ID"},
            "baselineVersionId": {"bsonType": "string", "description": "Baseline version ID"},
            "suspectedComponent": {"bsonType": "string", "description": "Suspected component name"},
            "detail": {"bsonType": "object", "description": "Detailed suspect metrics and context"},
            "failureFingerprint": {"bsonType": "string", "description": "Failure fingerprint hash"},
            "evidenceRefs": {
                "bsonType": "array",
                "items": {"bsonType": "string"},
                "description": "List of real eventId references",
            },
            "matchingFailedRuns": {"bsonType": ["int", "long"], "description": "Matching failed run count"},
            "totalFailedRuns": {"bsonType": ["int", "long"], "description": "Total failed runs"},
            "score": {"bsonType": ["double", "int", "long"], "description": "Diagnosis score"},
            "confidence": {"enum": ["high", "medium", "low"], "description": "Confidence level"},
            "reason": {"bsonType": "string", "description": "Plain language diagnosis reason"},
            "status": {
                "enum": ["open", "verified_fixed", "still_failing", "inconclusive"],
                "description": "Finding status",
            },
            "createdAt": {"bsonType": "date", "description": "Creation timestamp"},
        },
    }
}


def get_client(uri: Optional[str] = None) -> MongoClient:
    """Connect to MongoDB using the configured connection string.

    Args:
        uri (Optional[str]): MongoDB connection string. If omitted, loaded from MONGODB_URI env var.

    Returns:
        MongoClient: Configured PyMongo client instance.

    Raises:
        RuntimeError: If connection URI is not provided or configured in environment.
    """
    connection_uri = uri or os.getenv("MONGODB_URI")
    if not connection_uri:
        raise RuntimeError("MONGODB_URI is not set. Check your .env file.")
    return MongoClient(connection_uri)


def get_db(client: Optional[MongoClient] = None, db_name: Optional[str] = None) -> Database:
    """Retrieve a MongoDB Database instance.

    Args:
        client (Optional[MongoClient]): Optional existing client; created via get_client() if None.
        db_name (Optional[str]): Optional database name override; defaults to DB_NAME env var.

    Returns:
        Database: PyMongo Database instance.

    Raises:
        RuntimeError: If MONGODB_URI or DB_NAME is missing or empty.
    """
    target_name = db_name or os.getenv("DB_NAME")
    if not target_name:
        raise RuntimeError("DB_NAME is not set. Check your .env file.")
    mongo_client = client or get_client()
    return mongo_client[target_name]


def get_collections(db: Database) -> Dict[str, Collection]:
    """Retrieve mapping of all core DIRELY collections.

    Args:
        db (Database): PyMongo Database instance.

    Returns:
        Dict[str, Collection]: Mapping containing 'projects', 'versions', 'runs', 'events', 'findings'.
    """
    return {
        "projects": db["projects"],
        "versions": db["versions"],
        "runs": db["runs"],
        "events": db["events"],
        "findings": db["findings"],
    }


def setup_db(db: Database) -> Dict[str, Any]:
    """Apply strict $jsonSchema validators and idempotent indexes across all core collections.

    Safe to run repeatedly without dropping or conflicting with existing schemas/indexes.

    Args:
        db (Database): Target PyMongo Database instance.

    Returns:
        Dict[str, Any]: Summary dictionary containing status and created index names per collection.

    Raises:
        RuntimeError: If target database is 'direly' and ALLOW_SHARED_DB=1 is not set.
    """
    if db.name == "direly" and os.getenv("ALLOW_SHARED_DB") != "1":
        raise RuntimeError(
            "Refusing to run setup against shared database 'direly'. Set ALLOW_SHARED_DB=1 to override."
        )

    validators = {
        "versions": SCHEMA_VERSIONS,
        "runs": SCHEMA_RUNS,
        "events": SCHEMA_EVENTS,
        "findings": SCHEMA_FINDINGS,
    }

    existing_collections = set(db.list_collection_names())

    # Create projects collection if missing (free-form dependency map)
    if "projects" not in existing_collections:
        db.create_collection("projects")

    # Apply strict validation
    for col_name, validator_doc in validators.items():
        if col_name not in existing_collections:
            db.create_collection(
                col_name,
                validator=validator_doc,
                validationLevel="strict",
                validationAction="error",
            )
        else:
            db.command({
                "collMod": col_name,
                "validator": validator_doc,
                "validationLevel": "strict",
                "validationAction": "error",
            })

    # Create idempotent indexes
    indexes_created: Dict[str, list] = {}

    # versions: (projectId, createdAt)
    idx_versions = db["versions"].create_index(
        [("projectId", ASCENDING), ("createdAt", ASCENDING)],
        name="idx_versions_project_created",
    )
    indexes_created["versions"] = [idx_versions]

    # runs: (projectId, versionId, status); (versionId, caseId, attempt)
    idx_runs_pvs = db["runs"].create_index(
        [("projectId", ASCENDING), ("versionId", ASCENDING), ("status", ASCENDING)],
        name="idx_runs_proj_ver_status",
    )
    idx_runs_vca = db["runs"].create_index(
        [("versionId", ASCENDING), ("caseId", ASCENDING), ("attempt", ASCENDING)],
        name="idx_runs_ver_case_attempt",
    )
    indexes_created["runs"] = [idx_runs_pvs, idx_runs_vca]

    # events: UNIQUE (eventId); (runId, seq); (projectId, versionId, type); (versionId, payload.fingerprint)
    idx_events_id = db["events"].create_index(
        [("eventId", ASCENDING)],
        unique=True,
        name="idx_events_unique_event_id",
    )
    idx_events_run_seq = db["events"].create_index(
        [("runId", ASCENDING), ("seq", ASCENDING)],
        name="idx_events_run_seq",
    )
    idx_events_pvt = db["events"].create_index(
        [("projectId", ASCENDING), ("versionId", ASCENDING), ("type", ASCENDING)],
        name="idx_events_proj_ver_type",
    )
    idx_events_ver_fp = db["events"].create_index(
        [("versionId", ASCENDING), ("payload.fingerprint", ASCENDING)],
        name="idx_events_ver_payload_fp",
    )
    indexes_created["events"] = [idx_events_id, idx_events_run_seq, idx_events_pvt, idx_events_ver_fp]

    # findings: (projectId, versionId, createdAt); UNIQUE (projectId, versionId, baselineVersionId, suspectedComponent, failureFingerprint)
    idx_findings_pvc = db["findings"].create_index(
        [("projectId", ASCENDING), ("versionId", ASCENDING), ("createdAt", ASCENDING)],
        name="idx_findings_proj_ver_created",
    )
    idx_findings_unique = db["findings"].create_index(
        [
            ("projectId", ASCENDING),
            ("versionId", ASCENDING),
            ("baselineVersionId", ASCENDING),
            ("suspectedComponent", ASCENDING),
            ("failureFingerprint", ASCENDING),
        ],
        unique=True,
        name="idx_findings_unique_diagnosis",
    )
    indexes_created["findings"] = [idx_findings_pvc, idx_findings_unique]

    return {
        "status": "success",
        "indexes": indexes_created,
    }


def setup_database(db: Database) -> Dict[str, Any]:
    """Alias for setup_db to maintain backwards compatibility.

    Args:
        db (Database): Target PyMongo Database instance.

    Returns:
        Dict[str, Any]: Summary dictionary containing status and created index names.
    """
    return setup_db(db)
