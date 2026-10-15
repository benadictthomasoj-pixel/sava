from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Asset(Base):
    """
    SQLAlchemy model representing a Public Infrastructure Asset.
    Includes baseline attributes along with preliminary Digital Heartbeat telemetry indicators.
    """
    __tablename__ = "assets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    construction_year = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="Operational", index=True) 
    
    data_source = Column(
        String(255),
        nullable=False,
        default="Sample Record (Prototype Mock - Not Live Govt Data)"
    )
    
    # Extended intelligence metrics for the Digital Heartbeat concept
    risk_score = Column(Float, nullable=False, default=15.0) # 0 to 100 scale
    risk_level = Column(String(30), nullable=False, default="Low") # Low, Moderate, High, Critical
    health_index = Column(Float, nullable=False, default=85.0) # 0 to 100 scale
    last_inspection_date = Column(String(30), nullable=True)
    flagged_reasons = Column(Text, nullable=True) # Semicolon delimited investigation flags
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship to inspection records
    inspections = relationship("Inspection", back_populates="asset", cascade="all, delete-orphan", order_by="desc(Inspection.inspection_date)")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "district": self.district,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "construction_year": self.construction_year,
            "status": self.status,
            "data_source": self.data_source,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "health_index": self.health_index,
            "last_inspection_date": self.last_inspection_date,
            "flagged_reasons": self.flagged_reasons.split("; ") if self.flagged_reasons else [],
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Inspection(Base):
    """
    SQLAlchemy model representing field inspections, interventions, and verified outcomes.
    Forms the closed-loop workflow: Detect -> Understand -> Prioritise -> Intervene -> Verify -> Learn.
    """
    __tablename__ = "inspections"

    id = Column(String(64), primary_key=True, index=True)
    asset_id = Column(String(64), ForeignKey("assets.id"), nullable=False, index=True)
    inspection_date = Column(String(30), nullable=False, index=True)
    inspection_type = Column(String(100), nullable=False) # e.g. "Structural Audit", "Underwater Sonar", "Emergency Post-Weather", "NDT Ultrasonic"
    findings = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    actual_action_taken = Column(Text, nullable=True)
    responsible_user = Column(String(100), nullable=True, default="Engineering Officer (Unauthenticated Prototype Session)")
    status = Column(String(50), nullable=False, default="Pending", index=True) # "Pending", "In Progress", "Completed", "Verified"
    evidence_references = Column(Text, nullable=True) # References to audit documents, photos, or reports
    verification_notes = Column(Text, nullable=True)
    verification_date = Column(String(30), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset", back_populates="inspections")

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "inspection_date": self.inspection_date,
            "inspection_type": self.inspection_type,
            "findings": self.findings,
            "recommended_action": self.recommended_action,
            "actual_action_taken": self.actual_action_taken,
            "responsible_user": self.responsible_user,
            "status": self.status,
            "evidence_references": self.evidence_references,
            "verification_notes": self.verification_notes,
            "verification_date": self.verification_date,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
