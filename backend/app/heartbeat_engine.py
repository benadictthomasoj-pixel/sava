from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import math
from app.models import Asset, Inspection, parse_flagged_reasons

CURRENT_YEAR = 2026


def determine_asset_status(risk_score: float) -> str:
    """
    Synchronizes operational asset status consistently with the calculated risk score.
    - risk_score >= 60.0: 'Critical Attention'
    - 40.0 <= risk_score < 60.0: 'Requires Inspection'
    - risk_score < 40.0: 'Operational'
    """
    if risk_score >= 60.0:
        return "Critical Attention"
    elif risk_score >= 40.0:
        return "Requires Inspection"
    else:
        return "Operational"


def is_flag_remediated(flag_text: str, verified_inspections: List[Inspection]) -> bool:
    """
    Checks if a specific flagged defect has been successfully remediated by a verified inspection.
    Criteria:
    1. Inspection status == 'Verified'
    2. Inspection verification_outcome == 'Remediation Successful'
    3. actual_action_taken is documented and non-empty
    4. Inspection findings/action/type explicitly relate to the flagged defect domain keywords.
    """
    flag_lower = flag_text.lower()

    if "scour" in flag_lower:
        keywords = ["scour", "rip-rap", "riprap", "bathymetry", "pier foundation", "sediment depth", "underwater sonar"]
    elif "seizure" in flag_lower:
        keywords = ["seizure", "gate", "sluice", "hoist", "actuator", "bearing", "lubricat", "motor", "greas"]
    elif "joint" in flag_lower:
        keywords = ["joint", "seal", "expansion", "elastomer", "deck slab"]
    elif "vibration" in flag_lower:
        keywords = ["vibration", "resonance", "balancing", "bearing", "harmonic", "amplitude", "damp"]
    elif "fissure" in flag_lower or "crack" in flag_lower:
        keywords = ["fissure", "crack", "epoxy", "grout", "ultrasonic", "spall", "flaw"]
    elif "overdue" in flag_lower:
        keywords = ["audit", "inspection", "survey", "check", "overdue"]
    else:
        # Meaningful tokens (> 3 chars) from the flag text
        keywords = [w for w in flag_lower.replace(";", " ").replace(",", " ").split() if len(w) > 3]

    for insp in verified_inspections:
        outcome = getattr(insp, "verification_outcome", None) or "Remediation Successful"
        if outcome != "Remediation Successful":
            continue

        # Must have documented actual intervention
        if not (insp.actual_action_taken and insp.actual_action_taken.strip()):
            continue

        insp_domain = f"{insp.findings} {insp.recommended_action or ''} {insp.actual_action_taken or ''} {insp.inspection_type}".lower()
        if any(kw in insp_domain for kw in keywords):
            return True

    return False


def has_unresolved_critical_defects(inspections: List[Inspection], verified_inspections: List[Inspection]) -> bool:
    """
    Checks if there are any active/unresolved critical defects (scour, bearing seizure, fissure/crack)
    observed in inspections that have not been remediated by an eligible verified successful intervention.

    A critical finding remains unresolved if:
    1. The inspection is in 'Pending', 'In Progress', or 'Completed' status (not yet certified).
    2. The inspection is 'Verified' with outcome 'Remediation Unsuccessful' or 'Further Assessment Required'.
    AND no verified inspection has successfully remediated that specific critical defect.
    """
    critical_keywords = ["scour", "seizure", "fissure"]

    for insp in inspections:
        findings_lower = (insp.findings or "").lower()
        active_critical_kws = [kw for kw in critical_keywords if kw in findings_lower]
        if not active_critical_kws:
            continue

        # Check inspection's own state
        is_unverified = insp.status in ["Pending", "In Progress", "Completed"]
        outcome = getattr(insp, "verification_outcome", None)
        is_unsuccessful_or_assessment = insp.status == "Verified" and outcome in [
            "Remediation Unsuccessful",
            "Further Assessment Required",
        ]

        if is_unverified or is_unsuccessful_or_assessment:
            # Check if this critical defect has been resolved by ANY verified successful inspection
            for kw in active_critical_kws:
                if not is_flag_remediated(kw, verified_inspections):
                    return True

    return False


def calculate_digital_heartbeat(asset: Asset, db_inspections: Optional[List[Inspection]] = None) -> Dict[str, Any]:
    """
    Transparent, explainable mathematical risk and health assessment engine.
    Calculates multidimensional risk score, structural health index,
    contributing factor weights, data completeness, and suggested investigations.
    """
    # Use linked inspections if provided or query from asset relationship
    inspections = db_inspections if db_inspections is not None else list(asset.inspections or [])

    # Latest inspection details
    latest_inspection = inspections[0] if inspections else None
    latest_insp_date = latest_inspection.inspection_date if latest_inspection else asset.last_inspection_date

    # Determine verified interventions
    verified_inspections = [insp for insp in inspections if insp.status == "Verified"]
    has_verified_intervention = any(
        insp.status == "Verified" and (getattr(insp, "verification_outcome", None) or "Remediation Successful") == "Remediation Successful"
        for insp in inspections
    )
    has_pending_critical_inspection = has_unresolved_critical_defects(inspections, verified_inspections)

    # -------------------------------------------------------------
    # FACTOR 1: Structural & Physical Material Integrity (Weight 35%)
    # -------------------------------------------------------------
    # Baseline from design service life (assumed 50-year concrete/steel baseline)
    age = (CURRENT_YEAR - asset.construction_year) if asset.construction_year else 30
    age_component = min(50.0, (age / 50.0) * 45.0)

    # Defect severity from flagged reasons and inspections - targeted per defect
    flags = parse_flagged_reasons(asset.flagged_reasons)
    defect_component = 0.0
    for f in flags:
        f_lower = f.lower()
        if "scour" in f_lower or "seizure" in f_lower:
            base_penalty = 25.0
        elif "joint" in f_lower or "vibration" in f_lower or "fissure" in f_lower:
            base_penalty = 18.0
        elif "overdue" in f_lower:
            base_penalty = 12.0
        else:
            base_penalty = 8.0

        # Check if this specific defect has a verified successful remediation
        if is_flag_remediated(f, verified_inspections):
            # Mitigated penalty: residual monitoring baseline (floor of 3.0 or 25% of base)
            defect_component += max(3.0, round(base_penalty * 0.25, 1))
        else:
            # Unremediated active defect maintains full penalty
            defect_component += base_penalty

    if has_pending_critical_inspection:
        defect_component += 15.0

    factor1_score = min(100.0, max(5.0, age_component + defect_component))
    factor1_weight = 0.35
    factor1_contribution = round(factor1_score * factor1_weight, 2)

    # -------------------------------------------------------------
    # FACTOR 2: Environmental & Climate Vulnerability (Weight 25%)
    # -------------------------------------------------------------
    env_score = 20.0
    category_lower = asset.category.lower()
    district_lower = asset.district.lower()

    if "goa" in district_lower or "mumbai" in district_lower:
        env_score += 45.0 # Coastal marine salinity and spring tide surge
    elif "idukki" in district_lower:
        env_score += 48.0 # Extreme Western Ghats monsoon runoff and slope landslide creep
    elif "kota" in district_lower or "rajasthan" in asset.state.lower():
        env_score += 25.0 # Thermal cycling and heavy raw intake turbidity
    elif "guntur" in district_lower:
        env_score += 15.0 # Irrigation delta siltation
    elif "delhi" in district_lower:
        env_score += 35.0 # High urban vibration resonance and atmospheric pollutants
    else:
        env_score += 10.0

    factor2_score = min(100.0, env_score)
    factor2_weight = 0.25
    factor2_contribution = round(factor2_score * factor2_weight, 2)

    # -------------------------------------------------------------
    # FACTOR 3: Inspection Recency & Regulatory Compliance (Weight 25%)
    # -------------------------------------------------------------
    compliance_score = 25.0
    days_elapsed = 180

    if latest_insp_date:
        try:
            insp_dt = datetime.strptime(latest_insp_date, "%Y-%m-%d")
            # Calculate days relative to 2026-10-15 benchmark
            ref_dt = datetime(2026, 10, 15)
            days_elapsed = max(0, (ref_dt - insp_dt).days)
        except Exception:
            days_elapsed = 300

    if days_elapsed > 365:
        # Overdue inspection penalty
        compliance_score = min(100.0, 75.0 + (days_elapsed - 365) * 0.05)
    elif days_elapsed > 180:
        compliance_score = 45.0 + (days_elapsed - 180) * 0.15
    else:
        compliance_score = max(10.0, days_elapsed * 0.12)

    # Bonus if an inspection was completed recently
    if inspections and inspections[0].status in ["Completed", "Verified"]:
        compliance_score = max(15.0, compliance_score - 20.0)

    factor3_score = round(compliance_score, 1)
    factor3_weight = 0.25
    factor3_contribution = round(factor3_score * factor3_weight, 2)

    # -------------------------------------------------------------
    # FACTOR 4: Operational Strain & Criticality Demand (Weight 15%)
    # -------------------------------------------------------------
    operational_score = 30.0
    if category_lower in ["bridge", "highway"]:
        operational_score = 65.0 # Heavy freight and passenger loads
    elif category_lower in ["water treatment", "drainage"]:
        operational_score = 60.0 # Continuous flow, chemical/saline erosion
    elif category_lower in ["power substation"]:
        operational_score = 40.0
    elif category_lower in ["canal"]:
        operational_score = 35.0

    if any("vibration" in f.lower() or "torque" in f.lower() or "seizure" in f.lower() for f in flags):
        operational_score += 25.0

    factor4_score = min(100.0, operational_score)
    factor4_weight = 0.15
    factor4_contribution = round(factor4_score * factor4_weight, 2)

    # -------------------------------------------------------------
    # TOTAL CALCULATED RISK SCORE (0 - 100)
    # -------------------------------------------------------------
    total_risk = round(factor1_contribution + factor2_contribution + factor3_contribution + factor4_contribution, 1)
    total_risk = min(100.0, max(0.0, total_risk))

    if total_risk >= 80.0:
        risk_tier = "Critical"
    elif total_risk >= 60.0:
        risk_tier = "High"
    elif total_risk >= 40.0:
        risk_tier = "Moderate"
    else:
        risk_tier = "Low"

    # -------------------------------------------------------------
    # STRUCTURAL HEALTH INDEX (0 - 100, where higher is better health)
    # -------------------------------------------------------------
    # Physical health is inversely tied to structural wear and operational defect
    health_index = round(max(10.0, min(100.0, 100.0 - (factor1_score * 0.65 + factor4_score * 0.35))), 1)

    # -------------------------------------------------------------
    # DATA COMPLETENESS & CONFIDENCE EVALUATION
    # -------------------------------------------------------------
    verified_fields = []
    missing_fields = []

    if asset.construction_year:
        verified_fields.append("Commissioning Construction Year")
    else:
        missing_fields.append("Commissioning Construction Year")

    if latest_insp_date:
        verified_fields.append("Certified Field Audit Record")
    else:
        missing_fields.append("Certified Field Audit Record")

    if asset.latitude and asset.longitude:
        verified_fields.append("Geospatial GPS Coordinates")
    else:
        missing_fields.append("Geospatial GPS Coordinates")

    if parse_flagged_reasons(asset.flagged_reasons):
        verified_fields.append("Structural Defect Inventory")
    else:
        missing_fields.append("Structural Defect Inventory")

    if inspections:
        verified_fields.append(f"Recorded Inspection Events ({len(inspections)})")
    else:
        missing_fields.append("Recorded Inspection Events")

    confidence_score = round((len(verified_fields) / (len(verified_fields) + len(missing_fields))) * 100.0, 1)

    # -------------------------------------------------------------
    # SUGGESTED NEXT INVESTIGATIONS
    # -------------------------------------------------------------
    suggested_investigations = []
    if total_risk >= 80.0:
        suggested_investigations.append({
            "priority": "Immediate (Within 48h)",
            "title": "Emergency Non-Destructive Testing (NDT)",
            "detail": "Deploy ultrasonic flaw detection and structural strain acoustic sensors to determine sub-surface defect progression."
        })
        suggested_investigations.append({
            "priority": "Immediate (Within 48h)",
            "title": "Operational Load Restriction",
            "detail": "Enforce temporary axle weight limits or hydraulic flow bypass until structural safety factor is verified."
        })
    elif total_risk >= 60.0:
        suggested_investigations.append({
            "priority": "High (Within 14 days)",
            "title": "Specialized Mechanical & Hydraulic Overhaul",
            "detail": "Perform physical sounding, desilting, and mechanical torque clearance on critical moving components."
        })
    else:
        suggested_investigations.append({
            "priority": "Routine (Quarterly)",
            "title": "Periodic Visual & Sensor Calibration",
            "detail": "Perform standard quarterly visual audit and verify telemetry sensor alignment against manual grab samples."
        })

    return {
        "asset_id": asset.id,
        "asset_name": asset.name,
        "category": asset.category,
        "district": asset.district,
        "state": asset.state,
        "risk_score": total_risk,
        "risk_tier": risk_tier,
        "health_index": health_index,
        "last_inspection_date": latest_insp_date,
        "days_since_inspection": days_elapsed,
        "data_confidence_score": confidence_score,
        "data_completeness": {
            "verified_fields": verified_fields,
            "missing_fields": missing_fields,
        },
        "contributing_factors": [
            {
                "id": "factor_structural",
                "name": "Structural & Material Degradation",
                "weight": factor1_weight,
                "score": round(factor1_score, 1),
                "contribution": factor1_contribution,
                "description": f"Calculated from asset age ({age} yrs) and {len(flags)} registered physical anomalies.",
                "source": "Physical registry and inspection defect logs"
            },
            {
                "id": "factor_environmental",
                "name": "Environmental & Climate Exposure",
                "weight": factor2_weight,
                "score": round(factor2_score, 1),
                "contribution": factor2_contribution,
                "description": f"Climate stress index for {asset.district}, {asset.state} (salinity, precipitation, slope hazard).",
                "source": "Regional geographical and hydrological hazard profiles"
            },
            {
                "id": "factor_compliance",
                "name": "Inspection Recency & Compliance",
                "weight": factor3_weight,
                "score": round(factor3_score, 1),
                "contribution": factor3_contribution,
                "description": f"{days_elapsed} days elapsed since last certified audit ({latest_insp_date or 'Unrecorded'}).",
                "source": "PWD / municipal compliance inspection ledger"
            },
            {
                "id": "factor_operational",
                "name": "Operational Strain & Demand",
                "weight": factor4_weight,
                "score": round(factor4_score, 1),
                "contribution": factor4_contribution,
                "description": f"Load category baseline for {asset.category} with active mechanical stress indicators.",
                "source": "Operating load telemetry"
            }
        ],
        "supporting_inspections_count": len(inspections),
        "has_verified_intervention": has_verified_intervention,
        "calculation_timestamp": datetime.now(timezone.utc).isoformat(),
        "suggested_investigations": suggested_investigations,
    }
