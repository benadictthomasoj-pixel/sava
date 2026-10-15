import logging
from app.database import engine, Base, SessionLocal
from app.models import Asset, Inspection
from app.seed_data import SAMPLE_ASSETS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aayam.seed")

SAMPLE_INSPECTIONS = [
    {
        "id": "INSP-2023-001",
        "asset_id": "ASSET-BRG-001",
        "inspection_date": "2023-11-14",
        "inspection_type": "Underwater Sonar Bathymetry & Scour Survey",
        "findings": "Sub-surface scour hole depth of 2.4 meters detected beneath Pier 4 concrete footing; expansion joint gap measured at 48mm exceeding 25mm design limit; ultrasonic flaw in tendon anchorage.",
        "recommended_action": "Emergency rip-rap boulder dumping around pier footing; structural load restriction on heavy commercial transit.",
        "actual_action_taken": "Heavy commercial vehicle speed reduced to 30 km/h; boulder dumping contract tendered.",
        "responsible_user": "Executive Engineer S. Rane (Goa PWD Marine Division)",
        "status": "In Progress",
        "evidence_references": "Mandovi_Bridge_Pier_Scour_Audit_2023.pdf",
        "verification_notes": None,
        "verification_date": None,
    },
    {
        "id": "INSP-2024-002",
        "asset_id": "ASSET-WTP-002",
        "inspection_date": "2024-03-02",
        "inspection_type": "Tri-axial Vibration Spectrum & Clarifier Mechanical Audit",
        "findings": "High-lift pump motor #3 radial vibration velocity at 7.82 mm/s (ISO Class III limit: 4.5 mm/s); Clarifier #3 sludge scraper drive torque spikes at 142% rated motor current.",
        "recommended_action": "Isolate and overhaul pump impeller; central turn-table bearing replacement on clarifier.",
        "actual_action_taken": "Clarifier grease pack refreshed; pump overhaul scheduled for Q3 maintenance window.",
        "responsible_user": "Plant Superintendent R. Sharma (RUIDP Kota)",
        "status": "Pending",
        "evidence_references": "Chambal_WTP_Pump_Vibration_Report_2024.txt",
        "verification_notes": None,
        "verification_date": None,
    },
    {
        "id": "INSP-2024-003",
        "asset_id": "ASSET-CNL-004",
        "inspection_date": "2024-08-10",
        "inspection_type": "Annual Irrigation Lock Gate Pre-Monsoon Operability Inspection",
        "findings": "Lock gate hydraulic winch cables inspected; minor seal seepage observed within permissible 0.2 L/min limit.",
        "recommended_action": "Routine high-pressure grease lubrication and seal replacement.",
        "actual_action_taken": "Hydraulic oil flushed and replenished; seal replaced on Gate #12.",
        "responsible_user": "Assistant Executive Engineer V. Rao (AP Water Resources)",
        "status": "Verified",
        "evidence_references": "Field Verification Certificate #AP-WRD-2024-441",
        "verification_notes": "Post-intervention flow test successful; zero seal leakage confirmed under full head pressure.",
        "verification_date": "2024-08-14",
    },
    {
        "id": "INSP-2024-004",
        "asset_id": "ASSET-DRN-006",
        "inspection_date": "2024-02-19",
        "inspection_type": "Tidal Flap Gate Mechanical Operability Appraisal",
        "findings": "Flap gate #2 mechanically seized at 18 degrees open angle due to marine bio-fouling and silt wedging in trunnion hinge pin. High silt sedimentation in intake chamber (>65%).",
        "recommended_action": "High-pressure descaling of hinge pins and hydraulic dredging of 120m approach channel.",
        "actual_action_taken": "Emergency diver survey completed; dredging work order submitted for administrative approval.",
        "responsible_user": "Deputy Chief Engineer M. Joshi (BMC Stormwater Drainage)",
        "status": "In Progress",
        "evidence_references": "Mithi_River_Sluice_Gate_Inspection_2024.txt",
        "verification_notes": None,
        "verification_date": None,
    }
]


def init_db(force_reseed: bool = False):
    """
    Initializes SQLite tables and seeds the initial mock infrastructure assets and inspections.
    """
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        count = db.query(Asset).count()
        if count == 0 or force_reseed:
            if force_reseed and count > 0:
                logger.info("Force re-seed requested. Clearing existing records...")
                db.query(Inspection).delete()
                db.query(Asset).delete()
                db.commit()

            logger.info(f"Seeding {len(SAMPLE_ASSETS)} sample prototype assets...")
            for item in SAMPLE_ASSETS:
                asset = Asset(
                    id=item["id"],
                    name=item["name"],
                    category=item["category"],
                    district=item["district"],
                    state=item["state"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    construction_year=item.get("construction_year"),
                    status=item["status"],
                    data_source=item["data_source"],
                    risk_score=item.get("risk_score", 15.0),
                    risk_level=item.get("risk_level", "Low"),
                    health_index=item.get("health_index", 85.0),
                    last_inspection_date=item.get("last_inspection_date"),
                    flagged_reasons=item.get("flagged_reasons"),
                    description=item.get("description"),
                )
                db.add(asset)
            db.commit()

        # Seed initial inspections if table is empty
        insp_count = db.query(Inspection).count()
        if insp_count == 0:
            logger.info(f"Seeding {len(SAMPLE_INSPECTIONS)} sample inspection/intervention events...")
            for insp_data in SAMPLE_INSPECTIONS:
                insp = Inspection(
                    id=insp_data["id"],
                    asset_id=insp_data["asset_id"],
                    inspection_date=insp_data["inspection_date"],
                    inspection_type=insp_data["inspection_type"],
                    findings=insp_data["findings"],
                    recommended_action=insp_data.get("recommended_action"),
                    actual_action_taken=insp_data.get("actual_action_taken"),
                    responsible_user=insp_data.get("responsible_user"),
                    status=insp_data.get("status", "Pending"),
                    evidence_references=insp_data.get("evidence_references"),
                    verification_notes=insp_data.get("verification_notes"),
                    verification_date=insp_data.get("verification_date"),
                )
                db.add(insp)
            db.commit()
            logger.info("Seeded initial inspections.")

        logger.info(f"Database ready: {db.query(Asset).count()} assets, {db.query(Inspection).count()} inspections.")
        return db.query(Asset).count()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db(force_reseed=False)
