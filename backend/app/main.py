from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional, List
import logging
import json
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import APP_NAME, ENV, CORS_ORIGINS
from app.database import get_db, Base, engine
from app.models import Asset, Inspection, User, parse_flagged_reasons, serialize_flagged_reasons
import re
import uuid
from app.schemas import (
    AssetCreate,
    HealthResponse,
    AssetResponse,
    AssetListResponse,
    AssetSummaryStats,
    CopilotAskRequest,
    CopilotAskResponse,
    HeartbeatResponse,
    InspectionCreateRequest,
    InspectionUpdateRequest,
    InspectionVerifyRequest,
    InspectionResponse,
    TimelineEvent,
    DocumentDetailResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    TokenResponse,
)
from app.security import verify_password, create_access_token, hash_password
from app.dependencies import get_current_user, require_admin
from app.document_store import evidence_store
from app.copilot_service import query_copilot_evidence, query_copilot_evidence_async
from app.heartbeat_engine import calculate_digital_heartbeat, determine_asset_status
from app.database import ensure_schema_compatibility, engine
from app.seed import init_db

logging.basicConfig(level=logging.INFO)
from app.copilot_service import install_sensitive_param_filters
install_sensitive_param_filters()
logger = logging.getLogger("aayam.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context:
    Initializes database tables and sample mock records if the database is empty.
    """
    logger.info("AAYAM API starting up. Verifying database and seed data...")
    ensure_schema_compatibility(engine)
    init_db(force_reseed=False)
    yield
    logger.info("AAYAM API shutting down.")


app = FastAPI(
    title=APP_NAME,
    description=(
        "AAYAM — AI-Powered Public Infrastructure Intelligence Layer Prototype. "
        "REST API serving asset records, condition telemetry, and Digital Heartbeat indicators."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS) for frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def root():
    return {
        "app": APP_NAME,
        "version": "0.1.0",
        "status": "online",
        "documentation": "/docs",
        "environment": ENV,
        "note": "Prototype mock dataset mode active.",
    }


@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Service Health and Database Connectivity Check",
)
def get_health(db: Session = Depends(get_db)):
    """
    Verifies that the FastAPI application is alive and can query the SQLite database.
    Returns status, environment, mock mode disclosure, and active asset count.
    """
    try:
        total_assets = db.query(Asset).count()
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"unreachable: {str(e)}"
        total_assets = 0

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        app_name=APP_NAME,
        environment=ENV,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=db_status,
        total_assets=total_assets,
        mock_mode=True,
        disclaimer="Hackathon prototype with synthetic/mock data. Never use for operational life-safety decisions.",
    )


# ==============================================================================
# AUTHENTICATION & ACCESS CONTROL FOUNDATION ENDPOINTS
# ==============================================================================

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{3,50}$")


@app.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    summary="Public self-registration for Common Users",
)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Public self-registration for Common Users.
    Enforces that:
    1. Every publicly registered account is assigned role='common_user'. Requests attempting
       to specify or escalate to 'admin' privileges are rejected / overridden.
    2. Username and email must be unique across the platform.
    3. Passwords must be at least 8 characters long, maximum 72 bytes, and match confirm_password.
    4. Passwords are securely hashed with bcrypt (12 salt rounds).
    5. Required fields are validated; clear HTTP 400 / 409 errors returned without leaking DB internals.

    NOTE: Email verification and password recovery workflows are not implemented in this version.
    """
    clean_username = payload.username.strip()
    clean_email = payload.email.strip().lower()
    clean_fullname = payload.full_name.strip()

    # 1. Validate username format
    if not USERNAME_REGEX.match(clean_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username format. Must be 3-50 characters consisting of letters, digits, '.', '-', or '_'.",
        )

    # 2. Validate email format
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Please provide a valid email address.",
        )

    # 3. Validate full name
    if not clean_fullname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty.",
        )

    # 4. Validate password and confirmation
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    password_bytes = payload.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must not exceed 72 bytes.",
        )

    # 5. Check uniqueness (Username and Email)
    existing_username = db.query(User).filter(User.username == clean_username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{clean_username}' is already registered. Please choose another username.",
        )

    existing_email = db.query(User).filter(User.email == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{clean_email}' is already registered. Please sign in or use another email address.",
        )

    # 6. Hash password safely
    password_hash = hash_password(payload.password)
    user_id = f"USER-COM-{uuid.uuid4().hex[:8].upper()}"

    # 7. Create user with strictly enforced 'common_user' role
    new_user = User(
        id=user_id,
        username=clean_username,
        email=clean_email,
        full_name=clean_fullname,
        password_hash=password_hash,
        role="common_user",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Registered new public common user: {new_user.username} ({new_user.id})")
    return UserResponse(**new_user.to_dict())


@app.post(
    "/api/auth/login",
    response_model=TokenResponse,
    tags=["Authentication"],
    summary="Authenticate user and issue signed JWT access token",
)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user via username or email address and password.
    Validates password hash using bcrypt.
    Returns a signed, expiring JWT access token and user metadata.
    Rejects inactive accounts with HTTP 403 Forbidden.
    """
    clean_identifier = payload.username.strip()
    user = (
        db.query(User)
        .filter(or_(User.username == clean_identifier, User.email == clean_identifier.lower()))
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Access denied.",
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "username": user.username,
            "role": user.role,
            "user_id": user.id,
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.to_dict()),
    )


@app.get(
    "/api/auth/me",
    response_model=UserResponse,
    tags=["Authentication"],
    summary="Get authenticated user profile and active role",
)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns profile details and active role for the currently authenticated user session.
    Requires a valid, non-expired Bearer access token in the Authorization header.
    """
    return UserResponse(**current_user.to_dict())



@app.get(
    "/api/assets/summary/stats",
    response_model=AssetSummaryStats,
    tags=["Assets"],
    summary="Get aggregated asset intelligence metrics for dashboard cards",
)
def get_asset_stats(db: Session = Depends(get_db)):
    """
    Returns high-level overview metrics such as critical assets, inspection due,
    and average asset health index across the monitored network.
    """
    all_assets = db.query(Asset).all()
    total = len(all_assets)
    if total == 0:
        return AssetSummaryStats(
            total_assets=0,
            critical_assets=0,
            high_risk_assets=0,
            inspection_due=0,
            operational_assets=0,
            average_health_index=0.0,
        )

    critical_count = sum(1 for a in all_assets if a.status == "Critical Attention" or a.risk_level == "Critical")
    high_risk_count = sum(1 for a in all_assets if a.risk_level == "High" and a.status != "Critical Attention")
    inspection_due = sum(1 for a in all_assets if a.status == "Requires Inspection")
    operational_count = sum(1 for a in all_assets if a.status == "Operational")
    avg_health = sum(a.health_index for a in all_assets) / total

    return AssetSummaryStats(
        total_assets=total,
        critical_assets=critical_count,
        high_risk_assets=high_risk_count,
        inspection_due=inspection_due,
        operational_assets=operational_count,
        average_health_index=round(avg_health, 1),
    )


@app.get(
    "/api/assets",
    response_model=AssetListResponse,
    tags=["Assets"],
    summary="List all infrastructure assets with optional filtering and search",
)
def list_assets(
    category: Optional[str] = Query(None, description="Filter by category (e.g. Bridge, Highway, Canal)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (e.g. Operational, Critical Attention)"),
    district: Optional[str] = Query(None, description="Filter by district"),
    search: Optional[str] = Query(None, description="Text search on name, district, or ID"),
    db: Session = Depends(get_db),
):
    """
    Retrieve infrastructure assets. Supports filtering by category, status, district,
    and text search. Always returns full asset metadata including risk scores.
    """
    query = db.query(Asset)

    if category:
        query = query.filter(Asset.category == category)
    if status_filter:
        query = query.filter(Asset.status == status_filter)
    if district:
        query = query.filter(Asset.district == district)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Asset.name.ilike(search_pattern),
                Asset.id.ilike(search_pattern),
                Asset.district.ilike(search_pattern),
                Asset.state.ilike(search_pattern),
            )
        )

    items = query.order_by(Asset.risk_score.desc()).all()

    # Extract distinct categories for frontend filter dropdowns
    categories = [cat[0] for cat in db.query(Asset.category).distinct().all()]

    return AssetListResponse(
        total=db.query(Asset).count(),
        count=len(items),
        items=[AssetResponse(**item.to_dict()) for item in items],
        categories=categories,
        disclaimer="Mock dataset for hackathon local prototype. Not live official government data.",
    )

      
@app.post(
    "/api/assets",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Assets"],
    summary="Register a new infrastructure asset",
)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):

    # Prevent duplicate asset IDs
    existing_asset = (
        db.query(Asset)
        .filter(Asset.id == payload.id)
        .first()
    )

    if existing_asset:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset with ID '{payload.id}' already exists.",
        )

    # Create and save the asset
    asset_data = payload.model_dump()
    asset_data["flagged_reasons"] = serialize_flagged_reasons(asset_data.get("flagged_reasons"))

    asset = Asset(**asset_data)
    try:
        db.add(asset)
        db.commit()
        db.refresh(asset)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create asset '{payload.id}': {e}")
        raise

    return AssetResponse(**asset.to_dict())



@app.get(
    "/api/assets/{asset_id}",
    response_model=AssetResponse,
    tags=["Assets"],
    summary="Retrieve detailed metadata and Digital Heartbeat indicators for a single asset",
)
def get_asset_by_id(asset_id: str, db: Session = Depends(get_db)):
    """
    Find a specific infrastructure asset by its unique identifier.
    Returns 404 if no asset matching the identifier is found.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found in the infrastructure registry.",
        )
    return AssetResponse(**asset.to_dict())


@app.post(
    "/api/copilot/ask",
    response_model=CopilotAskResponse,
    tags=["Copilot"],
    summary="Query AI Decision Copilot grounded in infrastructure evidence",
)
async def ask_copilot(payload: CopilotAskRequest, db: Session = Depends(get_db)):
    """
    Submits an inquiry to the AI Decision Copilot.
    Validates the question, searches existing SQLite asset records,
    retrieves relevant evidence, separates observed facts from recommendations,
    and returns transparent, grounded findings without generative hallucination.
    Supports Google Gemini, OpenAI, and Anthropic LLM synthesis with automatic fallback.
    """
    if not payload.question or not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty. Please enter an infrastructure asset inquiry.",
        )

    return await query_copilot_evidence_async(
        db,
        payload.question,
        asset_id_filter=payload.asset_id,
        category_filter=payload.category,
    )


@app.get(
    "/api/copilot/documents/{document_identifier:path}",
    response_model=DocumentDetailResponse,
    tags=["Copilot"],
    summary="Retrieve verified source evidence document content and metadata",
)
def get_evidence_document(document_identifier: str):
    """
    Retrieves the actual verified supporting evidence document for inspection.
    Returns parsed pages, metadata, and full text for indexed engineering documents.
    Returns 404 if the document is not present in the verified evidence archive.
    Rejects directory traversal attempts.
    """
    if not document_identifier or not document_identifier.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document identifier must be specified.",
        )

    doc_info = evidence_store.get_document_content(document_identifier)
    if not doc_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source document '{document_identifier}' was not found in the verified evidence archive.",
        )
    return DocumentDetailResponse(**doc_info)


# ==============================================================================
# DIGITAL HEARTBEAT & EXPLAINABLE RISK ENDPOINTS
# ==============================================================================

@app.get(
    "/api/assets/{asset_id}/heartbeat",
    response_model=HeartbeatResponse,
    tags=["Heartbeat"],
    summary="Get live explainable Digital Heartbeat telemetry and factor breakdown",
)
def get_asset_heartbeat(asset_id: str, db: Session = Depends(get_db)):
    """
    Computes and returns the dynamic Digital Heartbeat for an infrastructure asset.
    Derives risk scores, structural health index, contributing factor weights,
    inspection recency, and suggested next investigations based on actual DB records.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    inspections = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.desc()).all()
    heartbeat_data = calculate_digital_heartbeat(asset, inspections)
    return HeartbeatResponse(**heartbeat_data)


# ==============================================================================
# INSPECTION & INTERVENTION CLOSED-LOOP WORKFLOW ENDPOINTS
# ==============================================================================

@app.get(
    "/api/assets/{asset_id}/inspections",
    response_model=List[InspectionResponse],
    tags=["Inspections"],
    summary="List all historical and active inspection/intervention records for an asset",
)
def get_asset_inspections(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    records = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.desc()).all()
    return [InspectionResponse(**r.to_dict()) for r in records]


@app.post(
    "/api/assets/{asset_id}/inspections",
    response_model=InspectionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Inspections"],
    summary="Record a new field inspection and recommended action",
)
def create_inspection(
    asset_id: str,
    payload: InspectionCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    # Generate unique inspection ID
    existing_count = db.query(Inspection).count()
    new_id = f"INSP-2026-{(existing_count + 1):03d}"

    # Record authenticated administrator identity in audit field rather than trusting client-supplied identity
    admin_identity = f"{admin_user.full_name} (@{admin_user.username})"
    if (
        payload.responsible_user
        and payload.responsible_user.strip()
        and payload.responsible_user != "Engineering Officer (Unauthenticated Prototype Session)"
    ):
        responsible_user_audit = f"{admin_identity} - {payload.responsible_user.strip()}"
    else:
        responsible_user_audit = admin_identity

    inspection = Inspection(
        id=new_id,
        asset_id=asset_id,
        inspection_date=payload.inspection_date,
        inspection_type=payload.inspection_type,
        findings=payload.findings,
        recommended_action=payload.recommended_action,
        actual_action_taken=payload.actual_action_taken,
        responsible_user=responsible_user_audit,
        status="Pending",
        evidence_references=payload.evidence_references,
    )
    db.add(inspection)

    # Update asset latest inspection date and recalculate risk
    asset.last_inspection_date = payload.inspection_date
    db.commit()

    # Recalculate asset risk with newly added inspection
    all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.desc()).all()
    updated_hb = calculate_digital_heartbeat(asset, all_inspections)
    asset.risk_score = updated_hb["risk_score"]
    asset.risk_level = updated_hb["risk_tier"]
    asset.health_index = updated_hb["health_index"]
    asset.status = determine_asset_status(asset.risk_score)
    db.commit()
    db.refresh(inspection)

    logger.info(f"Recorded inspection {new_id} for asset {asset_id}. New Risk Score: {asset.risk_score}, Status: {asset.status}")
    return InspectionResponse(**inspection.to_dict())


@app.patch(
    "/api/inspections/{inspection_id}",
    response_model=InspectionResponse,
    tags=["Inspections"],
    summary="Update inspection action status or recorded repair intervention",
)
def update_inspection(
    inspection_id: str,
    payload: InspectionUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    # 1. Enforce lifecycle: terminal certified state cannot be modified
    if inspection.status == "Verified":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Inspection record '{inspection_id}' is already Verified and certified. Modifications are prohibited.",
        )

    # 2. Enforce permitted state transitions
    if payload.status:
        if payload.status == "Verified":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Direct transition to 'Verified' via PATCH is not permitted. Please use 'POST /api/inspections/{id}/verify' to record verification notes and outcome decision.",
            )

        valid_transitions = {
            "Pending": ["Pending", "In Progress", "Completed"],
            "In Progress": ["In Progress", "Completed", "Pending"],
            "Completed": ["Completed", "In Progress"],
            "Verified": [],
        }
        allowed_next = valid_transitions.get(inspection.status, [])
        if payload.status not in allowed_next:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid inspection status transition from '{inspection.status}' to '{payload.status}'. Allowed transitions: {', '.join(allowed_next) if allowed_next else 'None'}.",
            )
        inspection.status = payload.status

    if payload.actual_action_taken is not None:
        inspection.actual_action_taken = payload.actual_action_taken

    if payload.evidence_references is not None:
        inspection.evidence_references = payload.evidence_references

    db.commit()

    # Recalculate parent asset heartbeat and synchronize status
    asset = db.query(Asset).filter(Asset.id == inspection.asset_id).first()
    if asset:
        all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).order_by(Inspection.inspection_date.desc()).all()
        updated_hb = calculate_digital_heartbeat(asset, all_inspections)
        asset.risk_score = updated_hb["risk_score"]
        asset.risk_level = updated_hb["risk_tier"]
        asset.health_index = updated_hb["health_index"]
        asset.status = determine_asset_status(asset.risk_score)
        db.commit()

    db.refresh(inspection)
    return InspectionResponse(**inspection.to_dict())


ALLOWED_VERIFICATION_OUTCOMES = [
    "Remediation Successful",
    "Remediation Unsuccessful",
    "Further Assessment Required",
]

@app.post(
    "/api/inspections/{inspection_id}/verify",
    response_model=InspectionResponse,
    tags=["Inspections"],
    summary="Record verified outcome of an engineering intervention",
)
def verify_inspection_outcome(
    inspection_id: str,
    payload: InspectionVerifyRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Closed-loop outcome verification step.
    Enforces that:
    1. Inspection must reach 'Completed' state before verification.
    2. Already verified inspections cannot be re-verified (terminal state).
    3. Outcome decision explicitly distinguishes success, failure, or further assessment.
    4. Actual intervention details must be documented for successful remediation.
    5. Parent asset health index, risk score, and status are consistently updated.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    # 1. Reject re-verification of already verified records
    if inspection.status == "Verified":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Inspection record '{inspection_id}' is already Verified and certified. Re-verification is not permitted.",
        )

    # 2. Reject verification if inspection has not reached Completed state
    if inspection.status != "Completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot verify inspection in '{inspection.status}' state. Inspection must reach 'Completed' state with documented findings and actions before outcome verification.",
        )

    # 3. Validate outcome decision
    outcome = payload.outcome or "Remediation Successful"
    if outcome not in ALLOWED_VERIFICATION_OUTCOMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification outcome '{outcome}'. Allowed outcomes: {', '.join(ALLOWED_VERIFICATION_OUTCOMES)}.",
        )

    # 4. Update actual_action_taken if supplied in payload
    if payload.actual_action_taken and payload.actual_action_taken.strip():
        inspection.actual_action_taken = payload.actual_action_taken.strip()

    # 5. Require actual intervention details when certifying successful remediation
    if outcome == "Remediation Successful":
        if not (inspection.actual_action_taken and inspection.actual_action_taken.strip()):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Actual intervention details ('actual_action_taken') must be documented before certifying successful remediation.",
            )

    verification_date = payload.verification_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Record authenticated administrator identity in verification audit field rather than trusting client-supplied identity
    admin_identity = f"{admin_user.full_name} (@{admin_user.username})"
    if payload.verifier_name and payload.verifier_name.strip():
        verifier_display = f"{admin_identity} [{payload.verifier_name.strip()}]"
    else:
        verifier_display = admin_identity

    inspection.status = "Verified"
    inspection.verification_outcome = outcome
    inspection.verification_notes = payload.verification_notes
    inspection.verification_date = verification_date
    inspection.responsible_user = f"{inspection.responsible_user} | Verified by: {verifier_display} ({outcome})"

    db.commit()

    # 6. Recalculate parent asset heartbeat and synchronize status consistently
    asset = db.query(Asset).filter(Asset.id == inspection.asset_id).first()
    if asset:
        all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).order_by(Inspection.inspection_date.desc()).all()
        updated_hb = calculate_digital_heartbeat(asset, all_inspections)
        asset.risk_score = updated_hb["risk_score"]
        asset.risk_level = updated_hb["risk_tier"]
        asset.health_index = updated_hb["health_index"]
        asset.status = determine_asset_status(asset.risk_score)
        db.commit()

    db.refresh(inspection)
    logger.info(f"Verified outcome '{outcome}' for inspection {inspection_id}. Asset {asset.id} updated risk: {asset.risk_score}, status: {asset.status}")
    return InspectionResponse(**inspection.to_dict())


@app.get(
    "/api/assets/{asset_id}/timeline",
    response_model=List[TimelineEvent],
    tags=["Inspections"],
    summary="Unified chronological lifecycle timeline for an asset",
)
def get_asset_timeline(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    timeline: List[TimelineEvent] = []

    # 1. Commissioning
    if asset.construction_year:
        timeline.append(TimelineEvent(
            id=f"{asset.id}-commissioning",
            event_type="commissioning",
            date=f"{asset.construction_year}-01-01",
            title="Asset Commissioned",
            description=f"{asset.name} constructed and commissioned for public service in {asset.district}, {asset.state}.",
            status="Operational",
            actor="Public Works Authority",
        ))

    # 2. Inspections & Interventions
    inspections = db.query(Inspection).filter(Inspection.asset_id == asset_id).order_by(Inspection.inspection_date.asc()).all()
    for insp in inspections:
        timeline.append(TimelineEvent(
            id=f"{insp.id}-insp",
            event_type="inspection",
            date=insp.inspection_date,
            title=f"Inspection: {insp.inspection_type}",
            description=insp.findings,
            status=insp.status,
            actor=insp.responsible_user,
        ))

        if insp.actual_action_taken:
            timeline.append(TimelineEvent(
                id=f"{insp.id}-act",
                event_type="intervention",
                date=insp.inspection_date,
                title="Maintenance Intervention",
                description=insp.actual_action_taken,
                status=insp.status,
                actor=insp.responsible_user,
            ))

        if insp.verification_notes and insp.verification_date:
            timeline.append(TimelineEvent(
                id=f"{insp.id}-verif",
                event_type="verification",
                date=insp.verification_date,
                title="Outcome Verification Certified",
                description=insp.verification_notes,
                status="Verified",
                actor=insp.responsible_user,
            ))

    # Sort descending by date
    timeline.sort(key=lambda x: x.date, reverse=True)
    return timeline



