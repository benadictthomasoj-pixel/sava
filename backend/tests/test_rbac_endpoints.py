import sys
from pathlib import Path
from datetime import timedelta
import pytest
import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.models import User, Asset, Inspection
from app.security import create_access_token, hash_password


SAMPLE_NEW_ASSET_PAYLOAD = {
    "id": "ASSET-RBAC-001",
    "name": "RBAC Verification Flyover",
    "category": "Bridge",
    "district": "North Goa",
    "state": "Goa",
    "latitude": 15.4989,
    "longitude": 73.8278,
    "construction_year": 2021,
    "status": "Operational",
    "data_source": "Department of Public Works",
    "risk_score": 20.0,
    "risk_level": "Low",
    "health_index": 80.0,
    "description": "Four-lane urban grade separator.",
}

SAMPLE_NEW_INSPECTION_PAYLOAD = {
    "inspection_date": "2026-05-10",
    "inspection_type": "Ultrasonic Weld Examination",
    "findings": "Girder bearing plate ultrasonic test indicates minor micro-porosity within tolerances.",
    "recommended_action": "Apply anti-corrosive epoxy coat.",
    "actual_action_taken": "Surface wire-brushed and zinc-rich primer applied.",
    "responsible_user": "Spoofed Client Field Worker",
    "evidence_references": "NDT_Ultrasonic_Report_2026.pdf",
}


@pytest.fixture
def inactive_admin_token(isolated_db: Session) -> str:
    """Creates a deactivated admin user and returns a signed token."""
    inactive_user = User(
        id="USER-DEACTIVATED-ADM",
        username="inactive_admin",
        email="inactive_admin@infra.gov.in",
        full_name="Deactivated Administrator",
        password_hash=hash_password("Pass123456!"),
        role="admin",
        is_active=False,
    )
    isolated_db.add(inactive_user)
    isolated_db.commit()
    return create_access_token({
        "sub": "inactive_admin",
        "username": "inactive_admin",
        "role": "admin",
        "user_id": "USER-DEACTIVATED-ADM",
    })


@pytest.fixture
def expired_token() -> str:
    """Returns an expired access token."""
    return create_access_token(
        {"sub": "admin", "username": "admin", "role": "admin"},
        expires_delta=timedelta(seconds=-30),
    )


# ==============================================================================
# 1. POST /api/assets (Asset Registration) RBAC
# ==============================================================================

def test_create_asset_rbac_matrix(
    unauth_client: TestClient,
    common_user_token: str,
    admin_token: str,
    inactive_admin_token: str,
    expired_token: str,
):
    endpoint = "/api/assets"

    # Case A: Unauthenticated request -> HTTP 401
    res_unauth = unauth_client.post(endpoint, json=SAMPLE_NEW_ASSET_PAYLOAD)
    assert res_unauth.status_code == 401
    assert "credentials were not provided" in res_unauth.json()["detail"].lower()

    # Case B: Expired token -> HTTP 401
    res_expired = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_ASSET_PAYLOAD,
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res_expired.status_code == 401
    assert "expired" in res_expired.json()["detail"].lower()

    # Case C: Malformed token -> HTTP 401
    res_malformed = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_ASSET_PAYLOAD,
        headers={"Authorization": "Bearer invalid.malformed.token"},
    )
    assert res_malformed.status_code == 401

    # Case D: Inactive user -> HTTP 403
    res_inactive = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_ASSET_PAYLOAD,
        headers={"Authorization": f"Bearer {inactive_admin_token}"},
    )
    assert res_inactive.status_code == 403
    assert "deactivated" in res_inactive.json()["detail"].lower()

    # Case E: Authenticated Common User -> HTTP 403 Forbidden
    res_common = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_ASSET_PAYLOAD,
        headers={"Authorization": f"Bearer {common_user_token}"},
    )
    assert res_common.status_code == 403
    assert "administrative privileges required" in res_common.json()["detail"].lower()

    # Case F: Authenticated Administrator -> HTTP 201 Created
    res_admin = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_ASSET_PAYLOAD,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 201
    data = res_admin.json()
    assert data["id"] == SAMPLE_NEW_ASSET_PAYLOAD["id"]
    assert data["name"] == SAMPLE_NEW_ASSET_PAYLOAD["name"]


# ==============================================================================
# 2. POST /api/assets/{asset_id}/inspections (Record Inspection) RBAC & Audit
# ==============================================================================

def test_create_inspection_rbac_and_audit_trail(
    unauth_client: TestClient,
    common_user_token: str,
    admin_token: str,
    inactive_admin_token: str,
):
    asset_id = "ASSET-BRG-001"
    endpoint = f"/api/assets/{asset_id}/inspections"

    # Case A: Unauthenticated request -> HTTP 401
    res_unauth = unauth_client.post(endpoint, json=SAMPLE_NEW_INSPECTION_PAYLOAD)
    assert res_unauth.status_code == 401

    # Case B: Inactive user -> HTTP 403
    res_inactive = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_INSPECTION_PAYLOAD,
        headers={"Authorization": f"Bearer {inactive_admin_token}"},
    )
    assert res_inactive.status_code == 403

    # Case C: Authenticated Common User -> HTTP 403 Forbidden
    res_common = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_INSPECTION_PAYLOAD,
        headers={"Authorization": f"Bearer {common_user_token}"},
    )
    assert res_common.status_code == 403
    assert "administrative privileges required" in res_common.json()["detail"].lower()

    # Case D: Authenticated Administrator -> HTTP 201 Created & Verified Audit Record
    res_admin = unauth_client.post(
        endpoint,
        json=SAMPLE_NEW_INSPECTION_PAYLOAD,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 201
    data = res_admin.json()
    assert data["status"] == "Pending"

    # CRITICAL AUDIT VERIFICATION:
    # Must record the authenticated administrator's real identity rather than blindly trusting client spoofing
    responsible_user_recorded = data["responsible_user"]
    assert "System Administrator" in responsible_user_recorded
    assert "@admin" in responsible_user_recorded
    assert "Spoofed Client Field Worker" in responsible_user_recorded


# ==============================================================================
# 3. PATCH /api/inspections/{inspection_id} (Update Status/Action) RBAC
# ==============================================================================

def test_update_inspection_rbac_matrix(
    unauth_client: TestClient,
    common_user_token: str,
    admin_token: str,
    inactive_admin_token: str,
):
    # INSP-2023-001 starts in 'In Progress' in sample data
    insp_id = "INSP-2023-001"
    endpoint = f"/api/inspections/{insp_id}"
    update_payload = {"status": "Completed"}

    # Case A: Unauthenticated request -> HTTP 401
    res_unauth = unauth_client.patch(endpoint, json=update_payload)
    assert res_unauth.status_code == 401

    # Case B: Inactive user -> HTTP 403
    res_inactive = unauth_client.patch(
        endpoint,
        json=update_payload,
        headers={"Authorization": f"Bearer {inactive_admin_token}"},
    )
    assert res_inactive.status_code == 403

    # Case C: Authenticated Common User -> HTTP 403 Forbidden
    res_common = unauth_client.patch(
        endpoint,
        json=update_payload,
        headers={"Authorization": f"Bearer {common_user_token}"},
    )
    assert res_common.status_code == 403
    assert "administrative privileges required" in res_common.json()["detail"].lower()

    # Case D: Authenticated Administrator -> HTTP 200 OK
    res_admin = unauth_client.patch(
        endpoint,
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "Completed"


# ==============================================================================
# 4. POST /api/inspections/{inspection_id}/verify (Outcome Certification) RBAC
# ==============================================================================

def test_verify_inspection_outcome_rbac_and_verifier_audit(
    unauth_client: TestClient,
    common_user_token: str,
    admin_token: str,
    inactive_admin_token: str,
):
    # Use INSP-2023-001: first transition to Completed via admin, then test verify
    insp_id = "INSP-2023-001"
    prepare_res = unauth_client.patch(
        f"/api/inspections/{insp_id}",
        json={"status": "Completed"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert prepare_res.status_code == 200

    verify_endpoint = f"/api/inspections/{insp_id}/verify"
    verify_payload = {
        "outcome": "Remediation Successful",
        "verification_notes": "Official engineering audit completed and verified.",
        "verifier_name": "Field Signoff Engineer",
        "actual_action_taken": "Rock armor rip-rap placement confirmed by diver survey.",
    }

    # Case A: Unauthenticated request -> HTTP 401
    res_unauth = unauth_client.post(verify_endpoint, json=verify_payload)
    assert res_unauth.status_code == 401

    # Case B: Inactive user -> HTTP 403
    res_inactive = unauth_client.post(
        verify_endpoint,
        json=verify_payload,
        headers={"Authorization": f"Bearer {inactive_admin_token}"},
    )
    assert res_inactive.status_code == 403

    # Case C: Authenticated Common User -> HTTP 403 Forbidden
    res_common = unauth_client.post(
        verify_endpoint,
        json=verify_payload,
        headers={"Authorization": f"Bearer {common_user_token}"},
    )
    assert res_common.status_code == 403
    assert "administrative privileges required" in res_common.json()["detail"].lower()

    # Case D: Authenticated Administrator -> HTTP 200 OK & Certified Verifier Audit
    res_admin = unauth_client.post(
        verify_endpoint,
        json=verify_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    verified_data = res_admin.json()
    assert verified_data["status"] == "Verified"
    assert verified_data["verification_outcome"] == "Remediation Successful"

    # CRITICAL AUDIT VERIFICATION:
    # Verifier audit trail must anchor to the authenticated administrator
    responsible_user_audit = verified_data["responsible_user"]
    assert "System Administrator" in responsible_user_audit
    assert "@admin" in responsible_user_audit
    assert "Field Signoff Engineer" in responsible_user_audit


# ==============================================================================
# 5. Public / Read-Only Endpoints Remain Accessible Without Login
# ==============================================================================

def test_public_and_read_only_routes_remain_open(unauth_client: TestClient):
    """
    Verifies that public and read-only intelligence endpoints do not require authentication:
    - Root and Health
    - Asset registry, summary stats, asset detail
    - Digital Heartbeat diagnostics and timeline
    - Inspection historical logs
    - Copilot inquiry and verified source documents
    """
    # 1. Health
    res_health = unauth_client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # 2. Asset list & summary stats
    res_assets = unauth_client.get("/api/assets")
    assert res_assets.status_code == 200
    assert res_assets.json()["total"] > 0

    res_stats = unauth_client.get("/api/assets/summary/stats")
    assert res_stats.status_code == 200
    assert res_stats.json()["total_assets"] > 0

    # 3. Single asset detail
    res_asset = unauth_client.get("/api/assets/ASSET-BRG-001")
    assert res_asset.status_code == 200

    # 4. Digital Heartbeat & Timeline
    res_hb = unauth_client.get("/api/assets/ASSET-BRG-001/heartbeat")
    assert res_hb.status_code == 200
    assert "risk_score" in res_hb.json()

    res_timeline = unauth_client.get("/api/assets/ASSET-BRG-001/timeline")
    assert res_timeline.status_code == 200
    assert isinstance(res_timeline.json(), list)

    # 5. Historical inspections list
    res_insps = unauth_client.get("/api/assets/ASSET-BRG-001/inspections")
    assert res_insps.status_code == 200
    assert len(res_insps.json()) > 0

    # 6. Source evidence document reader
    res_doc = unauth_client.get("/api/copilot/documents/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf")
    assert res_doc.status_code == 200
    assert res_doc.json()["total_pages"] == 2
