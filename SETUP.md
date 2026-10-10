# DIRELY Setup Guide

This guide walks through configuring and running the DIRELY MongoDB and diagnosis backend.

---

## 1. MongoDB Atlas M0 Cluster Setup

1. **Create an Atlas Account & Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Create or select an organization and project.
   - Click **Create Deployment** and select the free **M0 (Shared)** tier.
   - Choose a cloud provider and region closest to your team.

2. **Create a Database User**:
   - Under **Security** > **Database Access**, click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set a secure username and password (e.g. `direly_admin`).
   - Database User Privileges: `Read and write to any database` (or `atlasAdmin` for testing).

3. **Configure Network Access**:
   - Under **Security** > **Network Access**, click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) for hackathon development and testing.
   - Confirm and wait for the status to become active.

4. **Obtain Connection String**:
   - In Atlas, go to **Clusters / Database Deployments** > click **Connect**.
   - Choose **Drivers** (Python, version 3.11 or later).
   - Copy the SRV URI formatted as:
     `mongodb+srv://<username>:<password>@<cluster-address>.mongodb.net/?retryWrites=true&w=majority`

---

## 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

2. Open `.env` and configure your credentials:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=direly
   ```
   > **Note**: Never commit or log `.env`.

---

## 3. Python Environment Setup

Requires Python 3.11 or newer.

```bash
# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt
```

---

## 4. Run Setup (Schema, Validators, and Indexes)

The setup routine creates required collections (`versions`, `runs`, `events`, `findings`), registers `$jsonSchema` validators with `validationLevel: "strict"` and `validationAction: "error"`, and builds indexes idempotently.

Run via python:
```bash
python -c "from backend.app.db import setup_db, get_db; db = get_db(); setup_db(db); print('Database setup completed successfully.')"
```

---

## 5. Seed Demo Data

To populate MongoDB with the `orderbot` benchmark dataset (versions A, B, and C with 60 runs each):

```bash
python scripts/seed_demo.py
```

---

## 6. Run Test Suite

Run pytest against a temporary test database (`direly_test_<random>`):

```bash
pytest -v
```

---

## 7. Verify Schema and Indexes with mongosh

Connect to your Atlas cluster via `mongosh`:
```bash
mongosh "mongodb+srv://<cluster>.mongodb.net/direly" --username <username>
```

Run the following commands inside `mongosh` to verify indexes and collection validators:

```javascript
// Switch to direly database
use direly;

// 1. Verify collections and validators
db.getCollectionInfos({ name: { $in: ["versions", "runs", "events", "findings"] } }).forEach(col => {
  print("Collection: " + col.name);
  printjson(col.options.validator);
});

// 2. Verify indexes on versions
db.versions.getIndexes();

// 3. Verify indexes on runs
db.runs.getIndexes();

// 4. Verify indexes on events
db.events.getIndexes();

// 5. Verify indexes on findings
db.findings.getIndexes();
```
