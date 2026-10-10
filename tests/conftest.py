"""Pytest fixtures for Direly test suite with temporary database isolation."""

import os
import sys
import uuid
import pytest
from dotenv import load_dotenv

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pymongo
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from backend.app.db import setup_db

load_dotenv()


def is_atlas_connected() -> bool:
    """Check if MongoDB Atlas is reachable within a short timeout."""
    uri = os.getenv("MONGODB_URI")
    if not uri or "paste_your_atlas" in uri or "<cluster>" in uri:
        return False
    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=2000)
        client.admin.command("ping")
        return True
    except (PyMongoError, Exception):
        return False


@pytest.fixture(scope="session")
def atlas_available() -> bool:
    """Fixture indicating whether Atlas is reachable."""
    return is_atlas_connected()


@pytest.fixture(scope="function")
def test_db():
    """Create a temporary test database named direly_test_<random>, apply schema, and drop on teardown.

    Yields:
        pymongo.database.Database: Isolated temporary test database instance.
    """
    uri = os.getenv("MONGODB_URI")
    if not uri or "paste_your_atlas" in uri or "<cluster>" in uri:
        pytest.skip("Atlas database not configured or reachable. Skipping test that requires database.")

    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")
    except Exception as exc:
        pytest.skip(f"Atlas database not reachable ({exc}). Skipping test that requires database.")

    # Isolated test database name matching direly_test_<random>
    random_id = uuid.uuid4().hex[:10]
    test_db_name = f"direly_test_{random_id}"
    db = client[test_db_name]

    try:
        # Initialize strict validators and idempotent indexes
        setup_db(db)
        yield db
    finally:
        # Safe cleanup: drop only the temporary test database
        try:
            client.drop_database(test_db_name)
        except Exception:
            pass
