from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    app_name: str = Field(..., json_schema_extra={"example": "AAYAM Infrastructure Intelligence API"})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    timestamp: str
    database: str = Field(..., json_schema_extra={"example": "connected"})
    total_assets: int = Field(..., json_schema_extra={"example": 12})
    mock_mode: bool = True
    disclaimer: str = "Hackathon prototype with synthetic/mock data. Never use for operational life-safety decisions."


class AssetBase(BaseModel):
    id: str
    name: str
    category: str
    district: str
    state: str
    latitude: float
    longitude: float
    construction_year: Optional[int] = None
    status: str
    data_source: str
    risk_score: float = 15.0
    risk_level: str = "Low"
    health_index: float = 85.0
    last_inspection_date: Optional[str] = None
    flagged_reasons: List[str] = []
    description: Optional[str] = None


class AssetCreate(AssetBase):
    """Schema for creating an infrastructure asset."""
    pass

class AssetResponse(AssetBase):
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssetListResponse(BaseModel):
    total: int
    count: int
    items: List[AssetResponse]
    categories: List[str]
    disclaimer: str = "Mock dataset for hackathon local prototype. Not live official government data."


class AssetSummaryStats(BaseModel):
    total_assets: int
    critical_assets: int
    high_risk_assets: int
    inspection_due: int
    operational_assets: int
    average_health_index: float


class CopilotAskRequest(BaseModel):
    question: str = Field(..., description="Infrastructure inquiry question to be grounded in asset records")
    asset_id: Optional[str] = Field(None, description="Optional target asset ID to scope the inquiry")
    category: Optional[str] = Field(None, description="Optional asset category filter")


class EvidenceItem(BaseModel):
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None
    category: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    source: str
    evidence_type: str = "asset_telemetry_record" # "asset_telemetry_record" or "document_audit_passage"
    description: str
    risk_score: Optional[float] = None
    status: Optional[str] = None
    last_inspection_date: Optional[str] = None
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    timestamp: Optional[str] = None
    excerpt: Optional[str] = None
    citation_label: Optional[str] = None
    confidence_score: Optional[float] = None
    filename: Optional[str] = None
    source_file: Optional[str] = None
    file_type: Optional[str] = None
    chunk_id: Optional[str] = None
    relevance_score: Optional[float] = None


class DocumentPage(BaseModel):
    page_number: int
    text: str


class DocumentDetailResponse(BaseModel):
    document_name: str
    filename: str
    file_type: str
    total_pages: int
    source_agency: Optional[str] = None
    timestamp: Optional[str] = None
    asset_id: Optional[str] = None
    content: str
    pages: List[DocumentPage] = []
    status: str = "available"


class CopilotAskResponse(BaseModel):
    question: str
    matched_assets_count: int
    answer: str
    observed_facts: List[str]
    recommendations: List[str]
    evidence: List[EvidenceItem]
    citations: List[str] = []
    evidence_sufficiency: str = "sufficient" # "sufficient", "insufficient", "unmatched"
    confidence_level: str = "High"
    limitations_note: str
    pipeline_type: str = "retrieval_only_fallback" # "llm_grounded_rag" or "retrieval_only_fallback"


class ContributingFactor(BaseModel):
    id: str
    name: str
    weight: float
    score: float
    contribution: float
    description: str
    source: str


class SuggestedInvestigation(BaseModel):
    priority: str
    title: str
    detail: str


class DataCompletenessInfo(BaseModel):
    verified_fields: List[str]
    missing_fields: List[str]


class HeartbeatResponse(BaseModel):
    asset_id: str
    asset_name: str
    category: str
    district: str
    state: str
    risk_score: float
    risk_tier: str
    health_index: float
    last_inspection_date: Optional[str] = None
    days_since_inspection: int
    data_confidence_score: float
    data_completeness: DataCompletenessInfo
    contributing_factors: List[ContributingFactor]
    supporting_inspections_count: int
    has_verified_intervention: bool
    calculation_timestamp: str
    suggested_investigations: List[SuggestedInvestigation]


class InspectionCreateRequest(BaseModel):
    inspection_date: str = Field(..., description="Date of inspection in YYYY-MM-DD")
    inspection_type: str = Field(..., description="Type of audit e.g. Structural Audit, Underwater Sonar, NDT Ultrasonic")
    findings: str = Field(..., description="Observed structural findings and defect description")
    recommended_action: Optional[str] = Field(None, description="Recommended engineering remediation")
    actual_action_taken: Optional[str] = Field(None, description="Intervention action initiated or completed")
    responsible_user: Optional[str] = Field("Engineering Officer (Unauthenticated Prototype Session)", description="Responsible engineer")
    evidence_references: Optional[str] = Field(None, description="Document names, photos or report references")


class InspectionUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="Allowed: Pending, In Progress, Completed, Verified")
    actual_action_taken: Optional[str] = Field(None, description="Updated action description")
    evidence_references: Optional[str] = Field(None, description="Document or photo references")


class InspectionVerifyRequest(BaseModel):
    verification_notes: str = Field(..., description="Verification observations confirming repair efficacy")
    verification_date: Optional[str] = Field(None, description="Date verified in YYYY-MM-DD")
    verifier_name: Optional[str] = Field("Senior Verification Engineer", description="Signing authority")
    outcome: Optional[str] = Field(
        "Remediation Successful",
        description="Explicit outcome decision: 'Remediation Successful', 'Remediation Unsuccessful', or 'Further Assessment Required'",
    )
    actual_action_taken: Optional[str] = Field(
        None,
        description="Actual intervention details if not previously recorded on inspection",
    )


class InspectionResponse(BaseModel):
    id: str
    asset_id: str
    inspection_date: str
    inspection_type: str
    findings: str
    recommended_action: Optional[str] = None
    actual_action_taken: Optional[str] = None
    responsible_user: Optional[str] = None
    status: str
    evidence_references: Optional[str] = None
    verification_notes: Optional[str] = None
    verification_date: Optional[str] = None
    verification_outcome: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TimelineEvent(BaseModel):
    id: str
    event_type: str # "commissioning", "inspection", "intervention", "verification"
    date: str
    title: str
    description: str
    status: Optional[str] = None
    actor: Optional[str] = None


# ==============================================================================
# AUTHENTICATION & USER SCHEMAS
# ==============================================================================

class UserLoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., min_length=1, description="Account password")


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username (3-50 characters, letters, digits, '.', '-', '_')")
    email: str = Field(..., description="Valid email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters, maximum 72 bytes)")
    confirm_password: str = Field(..., min_length=8, description="Password confirmation matching password")


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool = True
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
