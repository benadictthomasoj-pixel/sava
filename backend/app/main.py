from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional, List
import logging

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import APP_NAME, ENV, CORS_ORIGINS
from app.database import get_db, Base, engine
from app.models import Asset, Inspection
from app.schemas import (
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
)
from app.copilot_service import query_copilot_evidence
from app.heartbeat_engine import calculate_digital_heartbeat
from app.seed import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aayam.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context:
    Initializes database tables and sample mock records if the database is empty.
    """
    logger.info("AAYAM API starting up. Verifying database and seed data...")
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
def ask_copilot(payload: CopilotAskRequest, db: Session = Depends(get_db)):
    """
    Submits an inquiry to the AI Decision Copilot.
    Validates the question, searches existing SQLite asset records,
    retrieves relevant evidence, separates observed facts from recommendations,
    and returns transparent, grounded findings without generative hallucination.
    """
    if not payload.question or not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty. Please enter an infrastructure asset inquiry.",
        )

    return query_copilot_evidence(
        db,
        payload.question,
        asset_id_filter=payload.asset_id,
        category_filter=payload.category,
    )


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
def create_inspection(asset_id: str, payload: InspectionCreateRequest, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found.",
        )

    # Generate unique inspection ID
    existing_count = db.query(Inspection).count()
    new_id = f"INSP-2026-{(existing_count + 1):03d}"

    inspection = Inspection(
        id=new_id,
        asset_id=asset_id,
        inspection_date=payload.inspection_date,
        inspection_type=payload.inspection_type,
        findings=payload.findings,
        recommended_action=payload.recommended_action,
        actual_action_taken=payload.actual_action_taken,
        responsible_user=payload.responsible_user,
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
    db.commit()
    db.refresh(inspection)

    logger.info(f"Recorded inspection {new_id} for asset {asset_id}. New Risk Score: {asset.risk_score}")
    return InspectionResponse(**inspection.to_dict())


@app.patch(
    "/api/inspections/{inspection_id}",
    response_model=InspectionResponse,
    tags=["Inspections"],
    summary="Update inspection action status or recorded repair intervention",
)
def update_inspection(inspection_id: str, payload: InspectionUpdateRequest, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    if payload.status:
        allowed_statuses = ["Pending", "In Progress", "Completed", "Verified"]
        if payload.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{payload.status}'. Allowed values: {', '.join(allowed_statuses)}",
            )
        inspection.status = payload.status

    if payload.actual_action_taken is not None:
        inspection.actual_action_taken = payload.actual_action_taken

    if payload.evidence_references is not None:
        inspection.evidence_references = payload.evidence_references

    db.commit()

    # Recalculate parent asset heartbeat
    asset = db.query(Asset).filter(Asset.id == inspection.asset_id).first()
    if asset:
        all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).order_by(Inspection.inspection_date.desc()).all()
        updated_hb = calculate_digital_heartbeat(asset, all_inspections)
        asset.risk_score = updated_hb["risk_score"]
        asset.risk_level = updated_hb["risk_tier"]
        asset.health_index = updated_hb["health_index"]
        db.commit()

    db.refresh(inspection)
    return InspectionResponse(**inspection.to_dict())


@app.post(
    "/api/inspections/{inspection_id}/verify",
    response_model=InspectionResponse,
    tags=["Inspections"],
    summary="Record verified outcome of an engineering intervention",
)
def verify_inspection_outcome(inspection_id: str, payload: InspectionVerifyRequest, db: Session = Depends(get_db)):
    """
    Outcome verification step: Confirms that recommended interventions have been
    physically executed and verified in the field. Updates asset health index.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    verification_date = payload.verification_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    inspection.status = "Verified"
    inspection.verification_notes = payload.verification_notes
    inspection.verification_date = verification_date
    if payload.verifier_name:
        inspection.responsible_user = f"{inspection.responsible_user} | Verified by: {payload.verifier_name}"

    db.commit()

    # Recalculate parent asset heartbeat reflecting verified intervention
    asset = db.query(Asset).filter(Asset.id == inspection.asset_id).first()
    if asset:
        all_inspections = db.query(Inspection).filter(Inspection.asset_id == asset.id).order_by(Inspection.inspection_date.desc()).all()
        updated_hb = calculate_digital_heartbeat(asset, all_inspections)
        asset.risk_score = updated_hb["risk_score"]
        asset.risk_level = updated_hb["risk_tier"]
        asset.health_index = updated_hb["health_index"]
        # If risk dropped significantly, update status
        if asset.risk_score < 40.0:
            asset.status = "Operational"
        elif asset.risk_score < 60.0:
            asset.status = "Requires Inspection"
        db.commit()

    db.refresh(inspection)
    logger.info(f"Verified outcome for inspection {inspection_id}. Asset {asset.id} updated risk: {asset.risk_score}")
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



