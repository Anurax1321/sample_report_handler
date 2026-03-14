"""
Comprehensive security tests for the backend authentication system.

Tests cover:
  - Login with wrong/correct credentials
  - Protected endpoints without/with/with-invalid tokens
  - Registration requiring auth
  - /health public endpoint
"""

import os
import sys

# ── 1. Override DB URI BEFORE any app imports ────────────────────────────────
os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./test_security.db"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///./test_security.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# ── 2. Import app modules (after env override) ──────────────────────────────
from app.db.base import Base
from app.db.model import User
from app.core.security import hash_password, create_access_token
from app.core.dependencies import get_db, get_current_user
from app.main import app

from fastapi.testclient import TestClient
from datetime import timedelta
from jose import jwt

# ── 3. Create tables ────────────────────────────────────────────────────────
Base.metadata.drop_all(bind=test_engine)
Base.metadata.create_all(bind=test_engine)

# ── 4. Override get_db for all routers ───────────────────────────────────────
def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# ── 5. Seed a test user directly in the DB ───────────────────────────────────
TEST_USERNAME = "testadmin"
TEST_PASSWORD = "secret1234"

db = TestSessionLocal()
user = User(
    username=TEST_USERNAME,
    hashed_password=hash_password(TEST_PASSWORD),
    is_active=True,
)
db.add(user)
db.commit()
db.close()

# ── 6. Create a valid token for the test user ────────────────────────────────
valid_token = create_access_token(subject=TEST_USERNAME)

# Create an expired token
expired_token = create_access_token(
    subject=TEST_USERNAME,
    expires_delta=timedelta(seconds=-10),  # already expired
)

# A completely bogus token
invalid_token = "this.is.not.a.jwt"

# ── 7. Helper ────────────────────────────────────────────────────────────────
client = TestClient(app)

results = []

def run_test(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append((name, passed))
    suffix = f"  ({detail})" if detail else ""
    print(f"  [{status}] {name}{suffix}")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST SUITE
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("  AUTHENTICATION & AUTHORIZATION SECURITY TESTS")
print("=" * 70 + "\n")

# ── a. POST /auth/login with wrong credentials → 401 ────────────────────────
resp = client.post("/auth/login", json={"username": "wrong", "password": "wrong"})
run_test(
    "a) Login with wrong credentials -> 401",
    resp.status_code == 401,
    f"got {resp.status_code}",
)

# ── b. POST /auth/login with correct credentials → 200 + token ──────────────
resp = client.post("/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
run_test(
    "b) Login with correct credentials -> 200 + token",
    resp.status_code == 200 and "access_token" in resp.json(),
    f"got {resp.status_code}, keys={list(resp.json().keys()) if resp.status_code == 200 else 'N/A'}",
)

# ── c. GET /samples/ without token → 401 or 403 ─────────────────────────────
resp = client.get("/samples/")
run_test(
    "c) GET /samples/ without token -> 401/403",
    resp.status_code in (401, 403),
    f"got {resp.status_code}",
)

# ── d. GET /samples/ with valid token → 200 ─────────────────────────────────
resp = client.get("/samples/", headers={"Authorization": f"Bearer {valid_token}"})
run_test(
    "d) GET /samples/ with valid token -> 200",
    resp.status_code == 200,
    f"got {resp.status_code}",
)

# ── e. GET /samples/ with expired/invalid token → 401 ───────────────────────
resp_expired = client.get("/samples/", headers={"Authorization": f"Bearer {expired_token}"})
resp_invalid = client.get("/samples/", headers={"Authorization": f"Bearer {invalid_token}"})
run_test(
    "e1) GET /samples/ with expired token -> 401",
    resp_expired.status_code == 401,
    f"got {resp_expired.status_code}",
)
run_test(
    "e2) GET /samples/ with invalid token -> 401",
    resp_invalid.status_code == 401,
    f"got {resp_invalid.status_code}",
)

# ── f. POST /auth/register without token → 401/403 ──────────────────────────
resp = client.post("/auth/register", json={"username": "newuser", "password": "pass1234"})
run_test(
    "f) POST /auth/register without token -> 401/403",
    resp.status_code in (401, 403),
    f"got {resp.status_code}",
)

# ── g. POST /auth/register with valid token → 200 ───────────────────────────
resp = client.post(
    "/auth/register",
    json={"username": "newuser", "password": "pass1234"},
    headers={"Authorization": f"Bearer {valid_token}"},
)
run_test(
    "g) POST /auth/register with valid token -> 200",
    resp.status_code == 200,
    f"got {resp.status_code}",
)

# ── h. GET /auth/me with valid token → 200 + user info ──────────────────────
resp = client.get("/auth/me", headers={"Authorization": f"Bearer {valid_token}"})
run_test(
    "h) GET /auth/me with valid token -> 200 + user info",
    resp.status_code == 200 and resp.json().get("username") == TEST_USERNAME,
    f"got {resp.status_code}, body={resp.json() if resp.status_code == 200 else 'N/A'}",
)

# ── i. GET /reports/ without token → 401/403 ────────────────────────────────
resp = client.get("/reports/")
run_test(
    "i) GET /reports/ without token -> 401/403",
    resp.status_code in (401, 403),
    f"got {resp.status_code}",
)

# ── j. POST /api/analyzer/health without token → 401/403 ────────────────────
# NOTE: The analyzer health endpoint is GET, not POST
resp = client.get("/api/analyzer/health")
run_test(
    "j) GET /api/analyzer/health without token -> 401/403",
    resp.status_code in (401, 403),
    f"got {resp.status_code}",
)

# ── k. GET /health (no auth required) → 200 ─────────────────────────────────
resp = client.get("/health")
run_test(
    "k) GET /health (public, no auth) -> 200",
    resp.status_code == 200 and resp.json().get("status") == "ok",
    f"got {resp.status_code}",
)

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "-" * 70)
passed = sum(1 for _, p in results if p)
failed = sum(1 for _, p in results if not p)
print(f"  TOTAL: {len(results)}  |  PASSED: {passed}  |  FAILED: {failed}")
if failed:
    print("\n  Failed tests:")
    for name, p in results:
        if not p:
            print(f"    - {name}")
print("-" * 70 + "\n")

# ── Cleanup ──────────────────────────────────────────────────────────────────
Base.metadata.drop_all(bind=test_engine)
test_engine.dispose()

db_path = os.path.join(os.getcwd(), "test_security.db")
if os.path.exists(db_path):
    os.remove(db_path)
    print("  Cleaned up test database.\n")

# Exit with code 1 if any test failed
sys.exit(0 if failed == 0 else 1)
