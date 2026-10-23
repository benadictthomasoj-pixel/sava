import sys
from pathlib import Path
from datetime import timedelta
import pytest
import jwt
from fastapi.testclient import TestClient
from fastapi import Depends
from sqlalchemy.orm import Session

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.models import User
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.dependencies import get_current_user, require_admin
from app.cli import interactive_create_admin

# Helper test route to test require_admin dependency isolation (non 'test_' prefix)
@app.get("/api/test-admin-only-guard", tags=["Testing"])
def dummy_admin_only_endpoint(admin_user: User = Depends(require_admin)):
    return {"message": "Admin access granted", "admin": admin_user.username}


def test_password_hashing_and_verification():
    """
    Verifies that bcrypt securely hashes passwords with distinct salts,
    correctly verifies matching passwords, and safely rejects wrong or invalid inputs.
    """
    raw_pwd = "SuperSecretPassword123!"
    hash1 = hash_password(raw_pwd)
    hash2 = hash_password(raw_pwd)

    # Hashes must be unique due to salt generation
    assert hash1 != hash2
    assert hash1.startswith("$2b$") or hash1.startswith("$2a$")

    # Correct password verifies
    assert verify_password(raw_pwd, hash1) is True
    assert verify_password(raw_pwd, hash2) is True

    # Incorrect password fails
    assert verify_password("WrongPassword!", hash1) is False
    assert verify_password("", hash1) is False
    assert verify_password(raw_pwd, "") is False
    assert verify_password(raw_pwd, "invalid_hash_string") is False

    # Validation: empty password raises ValueError
    with pytest.raises(ValueError, match="non-empty string"):
        hash_password("")

    # Validation: password > 72 bytes raises ValueError (bcrypt limit)
    with pytest.raises(ValueError, match="exceeds maximum allowed length"):
        hash_password("A" * 75)


def test_token_generation_and_decoding():
    """
    Verifies that JWT access tokens are properly signed and decoded with custom claims.
    """
    payload = {
        "sub": "test_engineer",
        "username": "test_engineer",
        "role": "admin",
        "user_id": "USER-TEST-001",
    }
    token = create_access_token(payload, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == "test_engineer"
    assert decoded["username"] == "test_engineer"
    assert decoded["role"] == "admin"
    assert "exp" in decoded
    assert "iat" in decoded


def test_token_expiry_validation(client: TestClient):
    """
    Verifies that expired access tokens are rejected by both the token decoder
    and the /api/auth/me endpoint with HTTP 401.
    """
    payload = {"sub": "test_expired_user", "username": "test_expired_user", "role": "common_user"}
    # Generate an already-expired token
    expired_token = create_access_token(payload, expires_delta=timedelta(seconds=-10))

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(expired_token)

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_invalid_or_tampered_token_rejection(unauth_client: TestClient):
    """
    Verifies that malformed or improperly signed tokens are rejected with HTTP 401.
    """
    # 1. Missing Authorization header
    res_no_auth = unauth_client.get("/api/auth/me")
    assert res_no_auth.status_code == 401

    # 2. Malformed token string
    res_malformed = unauth_client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt.token"},
    )
    assert res_malformed.status_code == 401
    assert "invalid" in res_malformed.json()["detail"].lower()

    # 3. Token signed with wrong secret key
    tampered_token = jwt.encode(
        {"sub": "attacker", "role": "admin"},
        "wrong_untrusted_secret_key_1234567890",
        algorithm="HS256",
    )
    res_tampered = unauth_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert res_tampered.status_code == 401


def test_login_success_and_me_profile_endpoints(client: TestClient, isolated_db: Session):
    """
    Verifies that registered users can log in with username or email,
    receive an expiring JWT, and fetch their profile via /api/auth/me.
    """
    admin_user = User(
        id="USER-TEST-ADM-01",
        username="test_admin_user",
        email="test_admin@infra.gov.in",
        full_name="Chief Executive Engineer",
        password_hash=hash_password("SecureAdminPass2026!"),
        role="admin",
        is_active=True,
    )
    common_user = User(
        id="USER-TEST-USR-01",
        username="test_common_user",
        email="test_viewer@infra.gov.in",
        full_name="Field Auditor",
        password_hash=hash_password("AuditorPass2026!"),
        role="common_user",
        is_active=True,
    )
    isolated_db.add(admin_user)
    isolated_db.add(common_user)
    isolated_db.commit()

    # 1. Admin login via username
    login_res = client.post(
        "/api/auth/login",
        json={"username": "test_admin_user", "password": "SecureAdminPass2026!"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    assert login_data["user"]["role"] == "admin"
    assert login_data["user"]["username"] == "test_admin_user"
    token = login_data["access_token"]

    # 2. Fetch profile via /api/auth/me using Bearer token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "test_admin_user"
    assert me_data["email"] == "test_admin@infra.gov.in"
    assert me_data["role"] == "admin"

    # 3. Common user login via email address
    common_login_res = client.post(
        "/api/auth/login",
        json={"username": "test_viewer@infra.gov.in", "password": "AuditorPass2026!"},
    )
    assert common_login_res.status_code == 200
    common_data = common_login_res.json()
    assert common_data["user"]["role"] == "common_user"
    assert common_data["user"]["username"] == "test_common_user"


def test_login_invalid_credentials(client: TestClient, isolated_db: Session):
    """
    Verifies that incorrect passwords and non-existent usernames return HTTP 401.
    """
    user = User(
        id="USER-TEST-PWD-01",
        username="test_auth_target",
        email="test_target@infra.gov.in",
        full_name="Target User",
        password_hash=hash_password("CorrectPass2026!"),
        role="common_user",
        is_active=True,
    )
    isolated_db.add(user)
    isolated_db.commit()

    # Wrong password
    res_wrong_pw = client.post(
        "/api/auth/login",
        json={"username": "test_auth_target", "password": "IncorrectPassword!"},
    )
    assert res_wrong_pw.status_code == 401
    assert "invalid username or password" in res_wrong_pw.json()["detail"].lower()

    # Non-existent username
    res_no_user = client.post(
        "/api/auth/login",
        json={"username": "test_ghost_user_9999", "password": "SomePassword123!"},
    )
    assert res_no_user.status_code == 401
    assert "invalid username or password" in res_no_user.json()["detail"].lower()


def test_inactive_user_access_blocked(client: TestClient, isolated_db: Session):
    """
    Verifies that deactivated/inactive users cannot log in (HTTP 403)
    and any tokens for deactivated accounts are rejected by get_current_user (HTTP 403).
    """
    inactive_user = User(
        id="USER-TEST-INACTIVE-01",
        username="test_deactivated_user",
        email="test_deactivated@infra.gov.in",
        full_name="Deactivated Officer",
        password_hash=hash_password("ValidPassword2026!"),
        role="admin",
        is_active=False,
    )
    isolated_db.add(inactive_user)
    isolated_db.commit()

    # 1. Login attempt must fail with 403 Forbidden
    login_res = client.post(
        "/api/auth/login",
        json={"username": "test_deactivated_user", "password": "ValidPassword2026!"},
    )
    assert login_res.status_code == 403
    assert "deactivated" in login_res.json()["detail"].lower()

    # 2. Token issued prior to deactivation must also be rejected
    token = create_access_token({"sub": "test_deactivated_user", "username": "test_deactivated_user"})
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 403
    assert "deactivated" in me_res.json()["detail"].lower()


def test_require_admin_dependency_enforcement(client: TestClient, isolated_db: Session):
    """
    Verifies that the require_admin dependency allows users with role='admin'
    and strictly forbids users with role='common_user'.
    """
    admin = User(
        id="USER-TEST-GUARD-ADM",
        username="test_guard_admin",
        email="guard_admin@infra.gov.in",
        full_name="Guard Admin",
        password_hash=hash_password("Pass123456!"),
        role="admin",
        is_active=True,
    )
    common = User(
        id="USER-TEST-GUARD-COM",
        username="test_guard_common",
        email="guard_common@infra.gov.in",
        full_name="Guard Common",
        password_hash=hash_password("Pass123456!"),
        role="common_user",
        is_active=True,
    )
    isolated_db.add(admin)
    isolated_db.add(common)
    isolated_db.commit()

    admin_token = create_access_token({"sub": "test_guard_admin", "username": "test_guard_admin", "role": "admin"})
    common_token = create_access_token({"sub": "test_guard_common", "username": "test_guard_common", "role": "common_user"})

    # Admin access succeeds
    res_admin = client.get(
        "/api/test-admin-only-guard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["admin"] == "test_guard_admin"

    # Common user access is denied with 403 Forbidden
    res_common = client.get(
        "/api/test-admin-only-guard",
        headers={"Authorization": f"Bearer {common_token}"},
    )
    assert res_common.status_code == 403
    assert "administrative privileges required" in res_common.json()["detail"].lower()


def test_cli_create_admin_interactive_helper(isolated_db: Session):
    """
    Verifies that the CLI administrator creation helper creates a valid admin account
    with a bcrypt hash and active status in SQLite, and prevents duplicate registration.
    """
    admin = interactive_create_admin(
        username="test_cli_admin",
        email="test_cli@infra.gov.in",
        full_name="CLI Chief Administrator",
        password="SecureCLIPassword2026!",
        db_session=isolated_db,
    )
    assert admin is not None
    assert admin.username == "test_cli_admin"
    assert admin.role == "admin"
    assert admin.is_active is True
    assert verify_password("SecureCLIPassword2026!", admin.password_hash) is True

    # Test duplicate username rejection
    with pytest.raises(ValueError, match="already exists"):
        interactive_create_admin(
            username="test_cli_admin",
            email="another_email@infra.gov.in",
            full_name="Another Admin",
            password="SecureCLIPassword2026!",
            db_session=isolated_db,
        )


def test_public_registration_creates_common_user_and_hashes_password(client: TestClient, unauth_client: TestClient, isolated_db: Session):
    """
    Verifies that public registration assigns common_user role, hashes passwords with bcrypt,
    rejects password leakage in responses, and allows immediate login.
    """
    reg_payload = {
        "username": "citizen_priya",
        "email": "priya.sharma@gov.in",
        "full_name": "Priya Sharma",
        "password": "CitizenSecretPassword2026!",
        "confirm_password": "CitizenSecretPassword2026!",
    }

    res = unauth_client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()

    assert data["username"] == "citizen_priya"
    assert data["email"] == "priya.sharma@gov.in"
    assert data["full_name"] == "Priya Sharma"
    assert data["role"] == "common_user"
    assert data["is_active"] is True
    assert "password" not in data
    assert "password_hash" not in data

    # Verify database persistence and password hashing
    user_in_db = isolated_db.query(User).filter(User.username == "citizen_priya").first()
    assert user_in_db is not None
    assert user_in_db.role == "common_user"
    assert user_in_db.password_hash != "CitizenSecretPassword2026!"
    assert user_in_db.password_hash.startswith("$2b$") or user_in_db.password_hash.startswith("$2a$")
    assert verify_password("CitizenSecretPassword2026!", user_in_db.password_hash) is True

    # Verify that the newly registered user can sign in immediately
    login_res = unauth_client.post(
        "/api/auth/login",
        json={"username": "citizen_priya", "password": "CitizenSecretPassword2026!"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["user"]["role"] == "common_user"


def test_public_registration_blocks_role_escalation_attempt(unauth_client: TestClient, isolated_db: Session):
    """
    Critical security test: An adversary sending role='admin' or other privileged fields
    must NEVER be granted administrator rights through public registration.
    """
    malicious_payload = {
        "username": "hacker_officer",
        "email": "hacker@domain.com",
        "full_name": "Rogue Operator",
        "password": "HackerPassword2026!",
        "confirm_password": "HackerPassword2026!",
        "role": "admin",
        "is_admin": True,
        "governance_rights": "full",
    }

    res = unauth_client.post("/api/auth/register", json=malicious_payload)
    assert res.status_code == 201
    data = res.json()

    # Must be forced to common_user
    assert data["role"] == "common_user"

    # Direct database verification
    db_user = isolated_db.query(User).filter(User.username == "hacker_officer").first()
    assert db_user is not None
    assert db_user.role == "common_user"

    # Verify that this user's token CANNOT access admin-only endpoints
    login_res = unauth_client.post(
        "/api/auth/login",
        json={"username": "hacker_officer", "password": "HackerPassword2026!"},
    )
    user_token = login_res.json()["access_token"]
    guard_res = unauth_client.get(
        "/api/test-admin-only-guard",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert guard_res.status_code == 403
    assert "administrative privileges required" in guard_res.json()["detail"].lower()


def test_public_registration_rejects_duplicates_and_validates_inputs(unauth_client: TestClient):
    """
    Verifies rejection of duplicate usernames, duplicate emails, password mismatches,
    and weak/short passwords without exposing SQL errors.
    """
    base_payload = {
        "username": "inspector_anand",
        "email": "anand@railways.gov.in",
        "full_name": "Anand V.",
        "password": "SecurePassword2026!",
        "confirm_password": "SecurePassword2026!",
    }

    # Initial successful registration
    res1 = unauth_client.post("/api/auth/register", json=base_payload)
    assert res1.status_code == 201

    # 1. Duplicate username rejection
    dup_user_payload = base_payload.copy()
    dup_user_payload["email"] = "different_email@railways.gov.in"
    res_dup_user = unauth_client.post("/api/auth/register", json=dup_user_payload)
    assert res_dup_user.status_code == 409
    assert "already registered" in res_dup_user.json()["detail"]

    # 2. Duplicate email rejection
    dup_email_payload = base_payload.copy()
    dup_email_payload["username"] = "different_user_name"
    res_dup_email = unauth_client.post("/api/auth/register", json=dup_email_payload)
    assert res_dup_email.status_code == 409
    assert "already registered" in res_dup_email.json()["detail"]

    # 3. Mismatched passwords rejection
    mismatch_payload = base_payload.copy()
    mismatch_payload["username"] = "user_mismatch"
    mismatch_payload["email"] = "mismatch@gov.in"
    mismatch_payload["confirm_password"] = "DifferentPassword999!"
    res_mismatch = unauth_client.post("/api/auth/register", json=mismatch_payload)
    assert res_mismatch.status_code == 400
    assert "passwords do not match" in res_mismatch.json()["detail"].lower()

    # 4. Short password (< 8 chars) rejection
    short_pwd_payload = base_payload.copy()
    short_pwd_payload["username"] = "short_pwd_user"
    short_pwd_payload["email"] = "short@gov.in"
    short_pwd_payload["password"] = "short"
    short_pwd_payload["confirm_password"] = "short"
    res_short = unauth_client.post("/api/auth/register", json=short_pwd_payload)
    assert res_short.status_code in (400, 422)

    # 5. Invalid email rejection
    bad_email_payload = base_payload.copy()
    bad_email_payload["username"] = "bad_email_user"
    bad_email_payload["email"] = "not_an_email_at_all"
    res_bad_email = unauth_client.post("/api/auth/register", json=bad_email_payload)
    assert res_bad_email.status_code == 400

