/**
 * AAYAM Infrastructure Intelligence — Demo Mode Simulated Data
 *
 * CRITICAL COMPLIANCE NOTICE:
 * All records, telemetry readings, documents, citations, and structural metrics in this module
 * are STRICTLY FICTIONAL AND SYNTHETIC, authored solely for offline walkthroughs and UI demonstrations.
 * None of this data represents certified engineering findings, verified real-world infrastructure,
 * or official government records.
 */

export const DEMO_DISCLAIMER =
  'SIMULATED DEMO RECORD: All data, metrics, and documents are fictional specimens authored for offline demonstration. Never use for life-safety or official operational decisions.';

// ==============================================================================
// 1. THREE CURATED SAMPLE INFRASTRUCTURE ASSETS
// ==============================================================================

export const DEMO_ASSETS = [
  {
    id: 'DEMO-BRG-001',
    name: 'Mandovi Estuary Memorial Bridge (Demo Specimen)',
    category: 'Bridge',
    district: 'North Goa (Simulated Sector)',
    state: 'Goa',
    latitude: 15.5002,
    longitude: 73.834,
    construction_year: 1998,
    status: 'Critical Attention',
    data_source: 'Simulated Bathymetric Sonar Stream (Fictional Demo Specimen)',
    risk_score: 86.5,
    risk_level: 'Critical',
    health_index: 32.0,
    last_inspection_date: '2024-03-12',
    flagged_reasons: [
      'Severe underwater pier scour degradation (-4.2m bed level recession at Pier P-04)',
      'Foundation bedrock exposure exceeds structural safety envelope (IS 14593 Section 7)',
      'Hydrodynamic vortex scouring accelerating during simulated tidal cycles',
    ],
    description:
      'Simulated four-lane prestressed concrete box girder estuary bridge undergoing artificial tidal degradation analysis for demonstration purposes.',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-03-12T14:30:00Z',
  },
  {
    id: 'DEMO-WTP-002',
    name: 'Chambal Valley Water Treatment Plant (Demo Specimen)',
    category: 'Water Supply',
    district: 'Kota (Simulated Sector)',
    state: 'Rajasthan',
    latitude: 25.18,
    longitude: 75.83,
    construction_year: 2014,
    status: 'Operational',
    data_source: 'Simulated SCADA Telemetry & Ultrasonic Sensor Feed (Fictional Demo Specimen)',
    risk_score: 12.0,
    risk_level: 'Low',
    health_index: 94.0,
    last_inspection_date: '2024-05-18',
    flagged_reasons: [],
    description:
      'Simulated 120 MLD municipal rapid gravity filtration facility operating well within nominal telemetry tolerances.',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-05-18T11:15:00Z',
  },
  {
    id: 'DEMO-HWY-003',
    name: 'Kazhakootam Skyway Corridor (Demo Specimen)',
    category: 'Highway',
    district: 'Thiruvananthapuram (Simulated Sector)',
    state: 'Kerala',
    latitude: 8.5686,
    longitude: 76.8731,
    construction_year: 2019,
    status: 'Requires Inspection',
    data_source: 'Simulated Vibration Array & Inspection Tracker (Fictional Demo Specimen)',
    risk_score: 58.0,
    risk_level: 'Moderate',
    health_index: 64.0,
    last_inspection_date: '2023-09-04',
    flagged_reasons: [
      'Periodic seismic elastomeric bearing pad audit overdue by 45 days',
      'Surface thermal expansion joint sealant debonding along Span S-12',
    ],
    description:
      'Simulated 6-lane elevated viaduct corridor carrying urban expressway traffic, awaiting statutory periodic maintenance verification.',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2023-09-04T16:45:00Z',
  },
];

export const DEMO_CATEGORIES = ['Bridge', 'Water Supply', 'Highway'];

export const DEMO_STATS = {
  total_assets: 3,
  critical_assets: 1,
  high_risk_assets: 1,
  inspection_due: 1,
  operational_assets: 1,
  average_health_index: 63.33,
};

// ==============================================================================
// 2. SIMULATED DIGITAL HEARTBEAT TELEMETRY FOR EACH DEMO ASSET
// ==============================================================================

export const DEMO_HEARTBEATS = {
  'DEMO-BRG-001': {
    asset_id: 'DEMO-BRG-001',
    asset_name: 'Mandovi Estuary Memorial Bridge (Demo Specimen)',
    category: 'Bridge',
    district: 'North Goa (Simulated Sector)',
    state: 'Goa',
    risk_score: 86.5,
    risk_tier: 'Critical',
    health_index: 32.0,
    last_inspection_date: '2024-03-12',
    days_since_inspection: 225,
    data_confidence_score: 91.0,
    data_completeness: {
      verified_fields: [
        'Multi-beam Bathymetric Sonar Scour Depth (-4.2m)',
        'Accelerometer Spectral Vibration Analysis',
        'Underwater Drone Pier Inspection Video Logs',
        'Tidal Velocity Telemetry (2.4 m/s peak ebb)',
      ],
      missing_fields: [
        'Geotechnical Sub-bottom Core Resistivity Profile',
      ],
    },
    contributing_factors: [
      {
        id: 'DEMO-FAC-01',
        name: 'Pier Scour Hydraulic Degradation',
        weight: 0.45,
        score: 94.0,
        contribution: 42.3,
        description:
          'Severe sediment evacuation at Pier P-04 exposing foundational well steining by 4.2m below nominal riverbed datum.',
        source: 'Simulated Bathymetric Survey Unit (Specimen #SONAR-2024-03)',
      },
      {
        id: 'DEMO-FAC-02',
        name: 'Foundation Exposure & Lateral Stability',
        weight: 0.3,
        score: 88.0,
        contribution: 26.4,
        description:
          'Reduced passive lateral earth resistance increasing structural deflection susceptibility under heavy commercial axle loads.',
        source: 'Simulated Finite Element Static Soil Model (Specimen)',
      },
      {
        id: 'DEMO-FAC-03',
        name: 'Inspection Interval & Maintenance Lag',
        weight: 0.25,
        score: 71.2,
        contribution: 17.8,
        description:
          'Overdue underwater riprap remediation and post-monsoon stabilizing intervention.',
        source: 'Simulated Maintenance Scheduling Ledger',
      },
    ],
    supporting_inspections_count: 2,
    has_verified_intervention: false,
    calculation_timestamp: '2024-10-22T10:00:00Z',
    suggested_investigations: [
      {
        priority: 'Immediate',
        title: 'Emergency Geotextile Mattress & Riprap Deployment',
        detail:
          'Mobilize high-density underwater riprap rock pitching around Pier P-04 perimeter to arrest further sediment evacuation.',
      },
      {
        priority: 'High',
        title: 'Real-Time Scour Sensor Continuous Telemetry',
        detail:
          'Install permanent ultrasonic time-domain reflectometry scour transponders linked to the AAYAM digital heartbeat.',
      },
    ],
  },

  'DEMO-WTP-002': {
    asset_id: 'DEMO-WTP-002',
    asset_name: 'Chambal Valley Water Treatment Plant (Demo Specimen)',
    category: 'Water Supply',
    district: 'Kota (Simulated Sector)',
    state: 'Rajasthan',
    risk_score: 12.0,
    risk_tier: 'Low',
    health_index: 94.0,
    last_inspection_date: '2024-05-18',
    days_since_inspection: 157,
    data_confidence_score: 96.5,
    data_completeness: {
      verified_fields: [
        'Raw Water Inlet Turbidity (42 NTU) and Finished Effluent (0.38 NTU)',
        'Centrifugal Pump Acoustic Bearing Vibration Spectra',
        'Chlorine Residual Multi-sensor Spectrophotometry',
        'Filter Bed Differential Pressure Telemetry (0.12 bar)',
      ],
      missing_fields: [],
    },
    contributing_factors: [
      {
        id: 'DEMO-FAC-04',
        name: 'Electromechanical Vibration Profile',
        weight: 0.4,
        score: 10.0,
        contribution: 4.0,
        description:
          'High-lift distribution pump bearings exhibit nominal harmonic vibrations within ISO 10816 Zone A limits.',
        source: 'Simulated SCADA Vibration Monitor',
      },
      {
        id: 'DEMO-FAC-05',
        name: 'Chemical & Hydraulic Integrity',
        weight: 0.35,
        score: 11.5,
        contribution: 4.025,
        description:
          'Coagulant dosing and filter media backwash cycles running autonomously within certified thresholds.',
        source: 'Simulated Process Telemetry SCADA',
      },
      {
        id: 'DEMO-FAC-06',
        name: 'Scheduled Preventative Maintenance Status',
        weight: 0.25,
        score: 15.9,
        contribution: 3.975,
        description:
          'Routine quarterly impeller lubrication and stator winding insulation checks completed on schedule.',
        source: 'Simulated CMMS Maintenance Log',
      },
    ],
    supporting_inspections_count: 2,
    has_verified_intervention: true,
    calculation_timestamp: '2024-10-22T10:00:00Z',
    suggested_investigations: [
      {
        priority: 'Routine',
        title: 'Quarterly Filter Media Depth Verification',
        detail:
          'Measure dual-media anthracite layer compaction during next scheduled backwash cycle.',
      },
    ],
  },

  'DEMO-HWY-003': {
    asset_id: 'DEMO-HWY-003',
    asset_name: 'Kazhakootam Skyway Corridor (Demo Specimen)',
    category: 'Highway',
    district: 'Thiruvananthapuram (Simulated Sector)',
    state: 'Kerala',
    risk_score: 58.0,
    risk_tier: 'Moderate',
    health_index: 64.0,
    last_inspection_date: '2023-09-04',
    days_since_inspection: 414,
    data_confidence_score: 82.0,
    data_completeness: {
      verified_fields: [
        'Bridge Weigh-in-Motion Axle Load Histograms',
        'Expansion Joint Thermal Gap Transducers',
        'Deck Surface Skid Resistance Profilometry',
      ],
      missing_fields: [
        'Sub-surface Pier Core Carbonation Depth Test',
        'Elastomeric Bearing Pad Shear Deformation Metric',
      ],
    },
    contributing_factors: [
      {
        id: 'DEMO-FAC-07',
        name: 'Overdue Statutory Bearing Audit',
        weight: 0.45,
        score: 72.0,
        contribution: 32.4,
        description:
          'Mandatory 36-month elastomeric bearing inspection interval exceeded by 45 days.',
        source: 'Simulated Asset Lifecycle Compliance Engine',
      },
      {
        id: 'DEMO-FAC-08',
        name: 'Expansion Joint Thermal Wear',
        weight: 0.35,
        score: 56.0,
        contribution: 19.6,
        description:
          'Elastomeric neoprene glands at Expansion Joint J-08 show localized weathering and water leakage ingress.',
        source: 'Simulated Visual Drone Audit (Specimen #DRN-2023-09)',
      },
      {
        id: 'DEMO-FAC-09',
        name: 'Dynamic Traffic Loading Strain',
        weight: 0.2,
        score: 30.0,
        contribution: 6.0,
        description:
          'Overweight commercial vehicle pass-through rates within acceptable 95th percentile safety envelope.',
        source: 'Simulated WIM Axle Sensor Unit',
      },
    ],
    supporting_inspections_count: 1,
    has_verified_intervention: false,
    calculation_timestamp: '2024-10-22T10:00:00Z',
    suggested_investigations: [
      {
        priority: 'High',
        title: 'Elastomeric Bearing Pad In-Situ Thickness & Shear Survey',
        detail:
          'Execute ultrasonic nondestructive testing to verify bearing pad rubber elasticity and pier cap clearance.',
      },
      {
        priority: 'Medium',
        title: 'Reseal Deck Expansion Joints along Spans S-08 to S-14',
        detail:
          'Install replacement vulcanized elastomeric compression strip to prevent saline water leakage onto pier caps.',
      },
    ],
  },
};

// ==============================================================================
// 3. SIMULATED INSPECTIONS & CLOSED-LOOP TIMELINE RECORDS
// ==============================================================================

export const DEMO_INSPECTIONS = {
  'DEMO-BRG-001': [
    {
      id: 'DEMO-INSP-BRG-001',
      asset_id: 'DEMO-BRG-001',
      inspection_date: '2024-03-12',
      inspection_type: 'Underwater Multibeam Bathymetry & Sonar Audit',
      findings:
        'Acoustic sonar survey confirmed accelerated hydrodynamic bed degradation at Pier P-04. Scour depth measured at 4.20m below reference riverbed datum, with localized exposure of well cap foundation steining.',
      recommended_action:
        'Immediate mobilization of geotextile riprap aprons (minimum 250 kg stone gradations) and 24/7 hydraulic sensor telemetry.',
      actual_action_taken:
        'Emergency speed restriction of 20 km/h enforced on outer spans; tender issued for riprap armor stabilization.',
      responsible_user: 'Dr. A. Sen (Simulated Coastal Hydrodynamics Specialist)',
      status: 'In Progress',
      evidence_references: 'SIMULATED-DOC-BRG-01-SCOUR.pdf (Section 3.2)',
      verification_notes: null,
      verification_date: null,
      verification_outcome: null,
      created_at: '2024-03-12T15:00:00Z',
      updated_at: '2024-03-18T11:00:00Z',
    },
    {
      id: 'DEMO-INSP-BRG-002',
      asset_id: 'DEMO-BRG-001',
      inspection_date: '2023-04-10',
      inspection_type: 'Annual Superstructure & Girder Diagnostic',
      findings:
        'Prestressed concrete box girders in sound structural condition. Minor longitudinal hairline shrinkage cracks detected on Pier 2 cross-beam (width < 0.15mm), non-critical.',
      recommended_action:
        'Apply hydrophobic silane penetrant coating on pier splash zones during low-tide window.',
      actual_action_taken:
        'Silane barrier coating applied across Pier 1 and Pier 2 tidal splash zones.',
      responsible_user: 'M. K. Rao (Simulated Bridge Inspection Engineer)',
      status: 'Verified',
      evidence_references: 'SIMULATED-DOC-BRG-00-HISTORIC.pdf',
      verification_notes:
        'Post-application coating thickness verified with ultrasonic gauge; moisture ingress arrested.',
      verification_date: '2023-05-02',
      verification_outcome: 'Remediation Successful',
      created_at: '2023-04-10T11:30:00Z',
      updated_at: '2023-05-02T16:20:00Z',
    },
  ],

  'DEMO-WTP-002': [
    {
      id: 'DEMO-INSP-WTP-001',
      asset_id: 'DEMO-WTP-002',
      inspection_date: '2024-05-18',
      inspection_type: 'Comprehensive Electromechanical & Water Quality Audit',
      findings:
        'All three raw water intake turbines and five high-lift centrifugal distribution pumps exhibit vibration levels below 1.8 mm/s RMS (ISO 10816 Zone A). Clarifier sludge scrapers and flocculation baffles in excellent condition.',
      recommended_action:
        'Continue standard bi-monthly lubrication and statutory chlorine sensor recalibration.',
      actual_action_taken:
        'Recalibrated optical turbidimeters and ultrasonic level transmitters.',
      responsible_user: 'P. Verma (Simulated Municipal Water Systems Auditor)',
      status: 'Verified',
      evidence_references: 'SIMULATED-DOC-WTP-01-ANNUAL.pdf (Pages 4-6)',
      verification_notes:
        'Dual calibration standards confirmed zero drift across all process sensors.',
      verification_date: '2024-05-20',
      verification_outcome: 'Remediation Successful',
      created_at: '2024-05-18T10:00:00Z',
      updated_at: '2024-05-20T14:00:00Z',
    },
  ],

  'DEMO-HWY-003': [
    {
      id: 'DEMO-INSP-HWY-001',
      asset_id: 'DEMO-HWY-003',
      inspection_date: '2023-09-04',
      inspection_type: 'Drone Photogrammetry & Expansion Joint Audit',
      findings:
        'High-resolution drone survey revealed elastomeric joint sealant debonding on Span S-12 over 4.8 meters length. Rainwater seepage marks visible on pier cap bearing shelf below.',
      recommended_action:
        'Clean joint groove, replace debonded neoprene sealant with polyurethane elastomer, and execute overdue elastomeric bearing pad deflection audit.',
      actual_action_taken:
        'Work order logged in municipal maintenance register; field execution pending traffic diversion clearance.',
      responsible_user: 'K. Nair (Simulated Highway Corridor Inspector)',
      status: 'Pending',
      evidence_references: 'SIMULATED-DOC-HWY-01-VIADUCT.pdf (Section 2.1)',
      verification_notes: null,
      verification_date: null,
      verification_outcome: null,
      created_at: '2023-09-04T14:15:00Z',
      updated_at: '2023-09-10T09:30:00Z',
    },
  ],
};

export const DEMO_TIMELINES = {
  'DEMO-BRG-001': [
    {
      id: 'EVT-BRG-01',
      event_type: 'commissioning',
      date: '1998-11-15',
      title: 'Bridge Commissioning & Structural Load Test',
      description: 'Completed static and dynamic live proof loading under 400t test vehicle trains.',
      status: 'Completed',
      actor: 'Ministry of Road Transport & Highways (Simulated)',
    },
    {
      id: 'EVT-BRG-02',
      event_type: 'inspection',
      date: '2023-04-10',
      title: 'Annual Superstructure Integrity Diagnostic',
      description: 'Minor superficial shrinkage cracking detected and silane hydrophobic treatment applied.',
      status: 'Completed',
      actor: 'M. K. Rao (Simulated Bridge Engineer)',
    },
    {
      id: 'EVT-BRG-03',
      event_type: 'inspection',
      date: '2024-03-12',
      title: 'Underwater Sonar Multibeam Scour Diagnostic',
      description: '4.2m foundation scour cavity detected at Pier P-04; high risk declared.',
      status: 'Flagged',
      actor: 'Dr. A. Sen (Simulated Coastal Hydrodynamics Specialist)',
    },
    {
      id: 'EVT-BRG-04',
      event_type: 'intervention',
      date: '2024-03-18',
      title: 'Traffic Speed Restriction & Riprap Mobilization',
      description: 'Enforced 20 km/h speed threshold and initiated armor riprap procurement.',
      status: 'In Progress',
      actor: 'State PWD Infrastructure Command Unit (Simulated)',
    },
  ],

  'DEMO-WTP-002': [
    {
      id: 'EVT-WTP-01',
      event_type: 'commissioning',
      date: '2014-08-20',
      title: 'Plant Commissioning & Potable Water Certification',
      description: 'Full 120 MLD capacity test successfully verified under BIS 10500 standards.',
      status: 'Completed',
      actor: 'State Water Supply & Drainage Board (Simulated)',
    },
    {
      id: 'EVT-WTP-02',
      event_type: 'inspection',
      date: '2024-05-18',
      title: 'Annual Electromechanical Comprehensive Audit',
      description: 'All rotating equipment verified within ISO 10816 Zone A nominal parameters.',
      status: 'Verified',
      actor: 'P. Verma (Simulated Municipal Water Systems Auditor)',
    },
    {
      id: 'EVT-WTP-03',
      event_type: 'verification',
      date: '2024-05-20',
      title: 'Digital Calibration Verification Signed Off',
      description: 'Dual standard verification completed confirming zero telemetry drift.',
      status: 'Completed',
      actor: 'Quality Assurance Directorate (Simulated)',
    },
  ],

  'DEMO-HWY-003': [
    {
      id: 'EVT-HWY-01',
      event_type: 'commissioning',
      date: '2019-12-01',
      title: 'Elevated Corridor Commercial Opening',
      description: '6-lane skyway opened to commercial traffic following safety clearance.',
      status: 'Completed',
      actor: 'National Highway Authority (Simulated)',
    },
    {
      id: 'EVT-HWY-02',
      event_type: 'inspection',
      date: '2023-09-04',
      title: 'Drone Photogrammetry & Expansion Joint Audit',
      description: 'Joint gland debonding recorded along Span S-12; bearing audit flagged as overdue.',
      status: 'Pending',
      actor: 'K. Nair (Simulated Highway Corridor Inspector)',
    },
  ],
};

// ==============================================================================
// 4. THREE DETERMINISTIC COPILOT QUESTIONS & SYNTHETIC EVIDENCE
// ==============================================================================

export const DEMO_COPILOT_QUESTIONS = [
  {
    id: 'DEMO-Q-001',
    prompt: 'What is the structural risk status of the Mandovi Estuary Memorial Bridge?',
    shortLabel: 'Mandovi Bridge Scour Status',
    target_asset_id: 'DEMO-BRG-001',
  },
  {
    id: 'DEMO-Q-002',
    prompt: 'Are there any anomalies or maintenance requirements for the Chambal Valley Water Treatment Plant?',
    shortLabel: 'Chambal WTP Telemetry Check',
    target_asset_id: 'DEMO-WTP-002',
  },
  {
    id: 'DEMO-Q-003',
    prompt: 'Why is the Kazhakootam Skyway Corridor flagged for inspection?',
    shortLabel: 'Kazhakootam Skyway Status',
    target_asset_id: 'DEMO-HWY-003',
  },
];

export const DEMO_COPILOT_RESPONSES = {
  'DEMO-Q-001': {
    question: 'What is the structural risk status of the Mandovi Estuary Memorial Bridge?',
    matched_assets_count: 1,
    answer: `#### Executive Structural Summary
The **Mandovi Estuary Memorial Bridge (Demo Specimen)** is presently classified under **Critical Attention** status with an elevated risk score of **86.5 / 100** and a deteriorated condition Health Index of **32.0 / 100**.

#### Primary Risk Finding: Foundation Pier Scour
Bathymetric multibeam sonar profiling identified severe underwater hydraulic scour around the perimeter of **Pier P-04** [Ref 1]. The localized sediment evacuation has reached **-4.20 meters** below reference bed datum, directly exposing the foundation well steining and exceeding the permissible safety threshold specified in IS 14593 Section 7 [Ref 1].

#### Recommended Remediations
1. **Riprap Armor Pitching**: Deploy high-density geotextile mattressing and heavy quarry stone armour around the Pier P-04 footprint [Ref 2].
2. **Traffic Restrictions**: Maintain the active 20 km/h speed restriction and axial weight surveillance to minimize dynamic cyclic stresses [Ref 2].
3. **Continuous Scour Monitoring**: Deploy acoustic time-domain reflectometry transducers to track bed level changes through monsoon high-tide surges.`,
    observed_facts: [
      'Current condition status: Critical Attention (Risk Score: 86.5, Health Index: 32.0).',
      'Bathymetric sonar survey measured -4.2m bed level recession around foundation Pier P-04.',
      'Exceeds IS 14593 Section 7 permissible foundation exposure envelope.',
      'Active intervention: 20 km/h speed restriction enforced on outer spans.',
    ],
    recommendations: [
      'Mobilize emergency heavy riprap armor pitching around Pier P-04 perimeter.',
      'Deploy continuous real-time ultrasonic scour depth transponders.',
      'Schedule follow-up acoustic bathymetric scan within 30 days of riprap placement.',
    ],
    citations: ['[Ref 1]', '[Ref 2]'],
    evidence: [
      {
        citation_label: '[Ref 1]',
        source: 'Simulated Underwater Sonar Survey (Specimen #SONAR-2024-03)',
        document_name: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
        filename: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
        section_title: 'Section 3.2: Pier P-04 Bathymetric Scour Profile',
        page_number: 3,
        excerpt:
          'High-density multibeam acoustic depth sounding across the navigation channel recorded bed level recession of -4.20m adjacent to Pier P-04. The scour cavity extends into the lateral support mantle, compromising passive lateral soil friction under heavy dynamic axle loading.',
        evidence_type: 'document_audit_passage',
        relevance_score: 96.0,
        description: 'Simulated sonar multibeam audit documenting 4.2m bed degradation at Pier P-04.',
        asset_id: 'DEMO-BRG-001',
        asset_name: 'Mandovi Estuary Memorial Bridge (Demo Specimen)',
        status: 'Critical Attention',
        risk_score: 86.5,
      },
      {
        citation_label: '[Ref 2]',
        source: 'Simulated Bridge Engineering Remediation Plan (Specimen #REM-2024-03)',
        document_name: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
        filename: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
        section_title: 'Section 5.1: Emergency Mitigation & Riprap Sizing',
        page_number: 7,
        excerpt:
          'Immediate placement of d50=450mm quarry stone riprap with an underlying non-woven geotextile filter apron is mandated to arrest sediment transport under 2.4 m/s peak tidal currents. Traffic speed control must remain active until post-remediation sonar verification.',
        evidence_type: 'document_audit_passage',
        relevance_score: 88.0,
        description: 'Simulated engineering remediation specification for riprap deployment.',
        asset_id: 'DEMO-BRG-001',
        asset_name: 'Mandovi Estuary Memorial Bridge (Demo Specimen)',
        status: 'Critical Attention',
        risk_score: 86.5,
      },
    ],
    evidence_sufficiency: 'sufficient',
    confidence_level: 'High (Simulated)',
    limitations_note: DEMO_DISCLAIMER,
    pipeline_type: 'simulated_demo_pipeline',
  },

  'DEMO-Q-002': {
    question: 'Are there any anomalies or maintenance requirements for the Chambal Valley Water Treatment Plant?',
    matched_assets_count: 1,
    answer: `#### Facility Operational Assessment
The **Chambal Valley Water Treatment Plant (Demo Specimen)** is performing in **Nominal Operational** state, maintaining an excellent Health Index of **94.0 / 100** and a minimal risk rating of **12.0 / 100**.

#### Key Telemetry & Diagnostic Findings
1. **Vibration Analysis**: Spectral vibration diagnostics on primary intake turbines and high-lift pumps indicate maximum velocity amplitudes of **1.62 mm/s RMS**, well within the ISO 10816-3 Class II Zone A boundary (< 2.8 mm/s) [Ref 1].
2. **Filtration Performance**: Finished effluent turbidity consistently averages **0.38 NTU**, exceeding BIS 10500 potable water quality standards [Ref 1].
3. **Filter Bed Resistance**: Rapid gravity filter differential pressure remains stable at **0.12 bar**, indicating no media fouling or bed compaction [Ref 2].

#### Maintenance Actions
- No immediate emergency intervention required.
- Continue scheduled quarterly dual-media anthracite depth audits and standard lubrication routines [Ref 2].`,
    observed_facts: [
      'Status: Operational (Risk Score: 12.0, Health Index: 94.0).',
      'Pump vibration spectra 1.62 mm/s RMS (ISO 10816 Zone A nominal).',
      'Effluent turbidity 0.38 NTU conforms with BIS 10500 water quality standards.',
      'Filter bed differential pressure nominal at 0.12 bar.',
    ],
    recommendations: [
      'Maintain standard scheduled preventative lubrication routines.',
      'Conduct quarterly dual-media anthracite bed depth sounding during routine backwash.',
    ],
    citations: ['[Ref 1]', '[Ref 2]'],
    evidence: [
      {
        citation_label: '[Ref 1]',
        source: 'Simulated SCADA Plant Audit Report (Specimen #SCADA-2024-05)',
        document_name: 'SIMULATED-DOC-WTP-01-ANNUAL.pdf',
        filename: 'SIMULATED-DOC-WTP-01-ANNUAL.pdf',
        section_title: 'Section 2.4: Mechanical Rotating Equipment Vibration Analysis',
        page_number: 4,
        excerpt:
          'Triaxial accelerometer spectral logs across high-lift pumps P-101 through P-105 exhibited uncalibrated harmonic peaks below 1.62 mm/s RMS. In-situ thermal imaging revealed motor winding temperatures steady at 48°C, comfortably below the 75°C insulation threshold.',
        evidence_type: 'document_audit_passage',
        relevance_score: 94.0,
        description: 'Simulated vibration and thermal telemetry audit confirming nominal pump performance.',
        asset_id: 'DEMO-WTP-002',
        asset_name: 'Chambal Valley Water Treatment Plant (Demo Specimen)',
        status: 'Operational',
        risk_score: 12.0,
      },
      {
        citation_label: '[Ref 2]',
        source: 'Simulated Water Process Quality Log (Specimen #PROC-2024-05)',
        document_name: 'SIMULATED-DOC-WTP-01-ANNUAL.pdf',
        filename: 'SIMULATED-DOC-WTP-01-ANNUAL.pdf',
        section_title: 'Section 4.1: Filtration Hydraulics & Turbidity Index',
        page_number: 6,
        excerpt:
          'Continuous nephelometric effluent monitoring registered mean turbidity of 0.38 NTU over the 30-day monitoring window. Backwash frequency of 36 hours maintained filter head loss within 0.12 bar.',
        evidence_type: 'document_audit_passage',
        relevance_score: 91.0,
        description: 'Simulated process quality metrics confirming compliance with potable standards.',
        asset_id: 'DEMO-WTP-002',
        asset_name: 'Chambal Valley Water Treatment Plant (Demo Specimen)',
        status: 'Operational',
        risk_score: 12.0,
      },
    ],
    evidence_sufficiency: 'sufficient',
    confidence_level: 'High (Simulated)',
    limitations_note: DEMO_DISCLAIMER,
    pipeline_type: 'simulated_demo_pipeline',
  },

  'DEMO-Q-003': {
    question: 'Why is the Kazhakootam Skyway Corridor flagged for inspection?',
    matched_assets_count: 1,
    answer: `#### Infrastructure Condition Status
The **Kazhakootam Skyway Corridor (Demo Specimen)** is categorized as **Requires Inspection** with a Moderate risk score of **58.0 / 100** and a Health Index of **64.0 / 100**.

#### Why the Corridor is Flagged
1. **Overdue Bearing Pad Audit**: The statutory 36-month inspection cycle for elastomeric bearing pads is overdue by **45 days** [Ref 1].
2. **Expansion Joint Debonding**: High-definition drone aerial photogrammetry detected localized debonding of the elastomeric expansion joint sealant along **Span S-12** (approx. 4.8m continuous separation) [Ref 1].
3. **Moisture Infiltration**: Early water seepage tracks were identified on the pier cap bearing shelf directly below the unsealed joint, risking chloride ingress toward internal reinforcing rebars if unmitigated [Ref 2].

#### Immediate Engineering Guidance
- Schedule an in-situ ultrasonic non-destructive shear test for bearing pads on Piers 11 through 14 [Ref 2].
- Execute joint raking and polyurethane elastomeric sealant re-injection during scheduled nighttime lane closures.`,
    observed_facts: [
      'Status: Requires Inspection (Risk Score: 58.0, Health Index: 64.0).',
      'Periodic elastomeric bearing pad inspection overdue by 45 days.',
      'Drone photogrammetry recorded 4.8m sealant debonding on Span S-12 expansion joint.',
      'Localized water staining recorded on pier cap bearing shelf.',
    ],
    recommendations: [
      'Conduct ultrasonic shear modulus survey of elastomeric bearing pads on Spans S-11 to S-14.',
      'Re-seal expansion joint J-08 with polyurethane sealant during scheduled nighttime maintenance.',
    ],
    citations: ['[Ref 1]', '[Ref 2]'],
    evidence: [
      {
        citation_label: '[Ref 1]',
        source: 'Simulated Corridor Drone Survey (Specimen #DRN-2023-09)',
        document_name: 'SIMULATED-DOC-HWY-01-VIADUCT.pdf',
        filename: 'SIMULATED-DOC-HWY-01-VIADUCT.pdf',
        section_title: 'Section 2.1: Span S-12 Expansion Joint Photogrammetry',
        page_number: 2,
        excerpt:
          'Sub-millimeter drone aerial imagery revealed continuous debonding of the vulcanized joint gland over a 4.8-meter segment on Span S-12. Thermal movement during diurnal temperature cycling has induced tear propagation along the concrete interface.',
        evidence_type: 'document_audit_passage',
        relevance_score: 92.0,
        description: 'Simulated drone photogrammetry documenting joint debonding.',
        asset_id: 'DEMO-HWY-003',
        asset_name: 'Kazhakootam Skyway Corridor (Demo Specimen)',
        status: 'Requires Inspection',
        risk_score: 58.0,
      },
      {
        citation_label: '[Ref 2]',
        source: 'Simulated Viaduct Structural Audit Ledger (Specimen #VIADUCT-2023-09)',
        document_name: 'SIMULATED-DOC-HWY-01-VIADUCT.pdf',
        filename: 'SIMULATED-DOC-HWY-01-VIADUCT.pdf',
        section_title: 'Section 4.3: Pier Cap Drainage & Bearing Shelf Condition',
        page_number: 5,
        excerpt:
          'Moisture runoff bypassing debonded expansion joint J-08 has deposited superficial calcium efflorescence on Pier Cap 12. Mandatory 3-year bearing shear distortion survey is overdue and requires prioritization before monsoon onset.',
        evidence_type: 'document_audit_passage',
        relevance_score: 87.0,
        description: 'Simulated structural ledger detailing pier cap drainage and overdue bearing audit.',
        asset_id: 'DEMO-HWY-003',
        asset_name: 'Kazhakootam Skyway Corridor (Demo Specimen)',
        status: 'Requires Inspection',
        risk_score: 58.0,
      },
    ],
    evidence_sufficiency: 'sufficient',
    confidence_level: 'High (Simulated)',
    limitations_note: DEMO_DISCLAIMER,
    pipeline_type: 'simulated_demo_pipeline',
  },
};

// ==============================================================================
// 5. SYNTHETIC EVIDENCE DOCUMENTS (FOR DEMO EVIDENCE VIEWER MODAL)
// ==============================================================================

export const DEMO_SOURCE_DOCUMENTS = {
  'SIMULATED-DOC-BRG-01-SCOUR.pdf': {
    document_name: 'Mandovi Estuary Bridge Pier Scour Underwater Bathymetric Audit (Simulated Specimen)',
    filename: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
    file_type: 'pdf',
    total_pages: 8,
    source_agency: 'State Coastal Infrastructure Research Board (Simulated Specimen)',
    timestamp: '2024-03-12',
    asset_id: 'DEMO-BRG-001',
    content: `[SIMULATED DEMO SPECIMEN - STRICTLY FOR DEMONSTRATION USE]
Title: Underwater Sonar Scour & Bathymetric Investigation
Asset: Mandovi Estuary Memorial Bridge (Demo Specimen - DEMO-BRG-001)
Date of Audit: 2024-03-12

EXECUTIVE SUMMARY:
Multi-beam acoustic sonar depth sounding across the estuary navigation channel recorded severe localized seabed degradation adjacent to Pier P-04. The bed level recession measures -4.20 meters below standard low-water reference datum.

SECTION 1: GEOTECHNICAL BASELINE
The estuary sub-bottom consists of medium-coarse marine sand overlying weathered basalt bedrock at depths between -14m and -18m. Well foundation P-04 was designed for an anticipated 100-year maximum scour depth of -2.8m. Current measured scour of -4.2m significantly exceeds the original engineering design threshold.

SECTION 2: HYDRODYNAMIC FORCING
Peak spring ebb tidal velocities reach 2.4 m/s through the central bridge spans. Hydrodynamic vortex shedding at the blunt upstream nose of Pier P-04 accelerates sand evacuation during monsoonal storm discharges.

SECTION 3: ACOUSTIC BATHYMETRIC FINDINGS
Section 3.2: Pier P-04 Bathymetric Scour Profile (Page 3)
High-density multibeam acoustic depth sounding across the navigation channel recorded bed level recession of -4.20m adjacent to Pier P-04. The scour cavity extends into the lateral support mantle, compromising passive lateral soil friction under heavy dynamic axle loading.

SECTION 4: STRUCTURAL INTEGRITY ASSESSMENT
Three-dimensional finite element analysis reveals that while the foundation well steining maintains vertical axial load capacity, lateral stiffness is reduced by 28%. Under concurrent seismic excitation and high tidal drag, safety margins approach unity.

SECTION 5: REMEDIATION MANDATE
Section 5.1: Emergency Mitigation & Riprap Sizing (Page 7)
Immediate placement of d50=450mm quarry stone riprap with an underlying non-woven geotextile filter apron is mandated to arrest sediment transport under 2.4 m/s peak tidal currents. Traffic speed control must remain active until post-remediation sonar verification.`,
    pages: [
      {
        page_number: 1,
        text: 'Title: Underwater Sonar Scour Investigation (Simulated Specimen)\nExecutive Summary: Pier P-04 bed recession measured at -4.20m.',
      },
      {
        page_number: 2,
        text: 'Section 1: Geotechnical Baseline & Sub-bottom Profile.\nOriginal design scour allowance: -2.8m. Current measured scour: -4.2m.',
      },
      {
        page_number: 3,
        text: 'Section 3.2: Pier P-04 Bathymetric Scour Profile\nHigh-density multibeam acoustic depth sounding across the navigation channel recorded bed level recession of -4.20m adjacent to Pier P-04. The scour cavity extends into the lateral support mantle, compromising passive lateral soil friction under heavy dynamic axle loading.',
      },
      {
        page_number: 4,
        text: 'Section 3.3: Sonar Point Cloud Visualization and Contour Mapping.\nCavity volume estimated at 380 cubic meters of evacuated marine sand.',
      },
      {
        page_number: 5,
        text: 'Section 4: Structural Soil-Structure Interaction & Lateral Deflection Limits.',
      },
      {
        page_number: 6,
        text: 'Section 4.4: Dynamic Wheel Load Impact Analysis under Indian Road Congress (IRC) Class 70R Loading.',
      },
      {
        page_number: 7,
        text: 'Section 5.1: Emergency Mitigation & Riprap Sizing\nImmediate placement of d50=450mm quarry stone riprap with an underlying non-woven geotextile filter apron is mandated to arrest sediment transport under 2.4 m/s peak tidal currents. Traffic speed control must remain active until post-remediation sonar verification.',
      },
      {
        page_number: 8,
        text: 'Sign-off and Approvals (Simulated Specimen)\nDr. A. Sen, Coastal Hydrodynamics Unit.\nDISCLAIMER: Fictional demonstration record.',
      },
    ],
    status: 'available',
  },

  'SIMULATED-DOC-WTP-01-ANNUAL.pdf': {
    document_name: 'Chambal Valley WTP Annual Electromechanical & Water Quality Diagnostic (Simulated Specimen)',
    filename: 'SIMULATED-DOC-WTP-01-ANNUAL.pdf',
    file_type: 'pdf',
    total_pages: 7,
    source_agency: 'Municipal Water Infrastructure Directorate (Simulated Specimen)',
    timestamp: '2024-05-18',
    asset_id: 'DEMO-WTP-002',
    content: `[SIMULATED DEMO SPECIMEN - STRICTLY FOR DEMONSTRATION USE]
Title: Comprehensive Annual Electromechanical & Water Quality Diagnostic
Asset: Chambal Valley Water Treatment Plant (Demo Specimen - DEMO-WTP-002)
Date of Audit: 2024-05-18

EXECUTIVE SUMMARY:
Comprehensive operational audit confirms the Chambal Valley 120 MLD facility operates in high-efficiency compliance with statutory potable water supply norms. All mechanical rotating assets maintain nominal vibration indices.

SECTION 1: RAW WATER INTAKE & SETTLING
Intake pumps operating at 94% efficiency. Gravity clariflocculator turbidity reduction exceeds 92%.

SECTION 2: ELECTROMECHANICAL INTEGRITY
Section 2.4: Mechanical Rotating Equipment Vibration Analysis (Page 4)
Triaxial accelerometer spectral logs across high-lift pumps P-101 through P-105 exhibited uncalibrated harmonic peaks below 1.62 mm/s RMS. In-situ thermal imaging revealed motor winding temperatures steady at 48°C, comfortably below the 75°C insulation threshold.

SECTION 3: CHEMICAL DOSING & DISINFECTION
Automated alum and polyaluminum chloride dosing loops demonstrated zero deviation from jar-test stoichiometry. Gas chlorination safety scrubbers tested functional.

SECTION 4: FILTRATION HYDRAULICS
Section 4.1: Filtration Hydraulics & Turbidity Index (Page 6)
Continuous nephelometric effluent monitoring registered mean turbidity of 0.38 NTU over the 30-day monitoring window. Backwash frequency of 36 hours maintained filter head loss within 0.12 bar.`,
    pages: [
      {
        page_number: 1,
        text: 'Title: Annual Diagnostic Audit (Simulated Specimen)\nExecutive Summary: 120 MLD facility operates with high reliability.',
      },
      {
        page_number: 2,
        text: 'Section 1: Intake & Sedimentation Clarifier Performance.\nMean intake turbidity: 42 NTU.',
      },
      {
        page_number: 3,
        text: 'Section 2.1: Motor Control Center Electrical Harmonics and Power Factor (0.98).',
      },
      {
        page_number: 4,
        text: 'Section 2.4: Mechanical Rotating Equipment Vibration Analysis\nTriaxial accelerometer spectral logs across high-lift pumps P-101 through P-105 exhibited uncalibrated harmonic peaks below 1.62 mm/s RMS. In-situ thermal imaging revealed motor winding temperatures steady at 48°C, comfortably below the 75°C insulation threshold.',
      },
      {
        page_number: 5,
        text: 'Section 3: Disinfection Residuals & Contact Chamber Hydraulics.',
      },
      {
        page_number: 6,
        text: 'Section 4.1: Filtration Hydraulics & Turbidity Index\nContinuous nephelometric effluent monitoring registered mean turbidity of 0.38 NTU over the 30-day monitoring window. Backwash frequency of 36 hours maintained filter head loss within 0.12 bar.',
      },
      {
        page_number: 7,
        text: 'Recommendations & Sign-off (Simulated Specimen)\nRoutine maintenance confirmed. Next inspection May 2025.',
      },
    ],
    status: 'available',
  },

  'SIMULATED-DOC-HWY-01-VIADUCT.pdf': {
    document_name: 'Kazhakootam Skyway Elevated Corridor Photogrammetric Audit (Simulated Specimen)',
    filename: 'SIMULATED-DOC-HWY-01-VIADUCT.pdf',
    file_type: 'pdf',
    total_pages: 6,
    source_agency: 'State Highway Safety & Maintenance Authority (Simulated Specimen)',
    timestamp: '2023-09-04',
    asset_id: 'DEMO-HWY-003',
    content: `[SIMULATED DEMO SPECIMEN - STRICTLY FOR DEMONSTRATION USE]
Title: Drone Photogrammetry & Expansion Joint Diagnostic Report
Asset: Kazhakootam Skyway Corridor (Demo Specimen - DEMO-HWY-003)
Date of Audit: 2023-09-04

EXECUTIVE SUMMARY:
Aerial photogrammetric diagnostic of the 6-lane elevated expressway viaduct identified localized failure of expansion joint sealing material on Span S-12 and highlighted that statutory elastomeric bearing pad audits are overdue.

SECTION 1: VIADUCT SUPERSTRUCTURE
Prestressed concrete U-girders and reinforced deck slab show zero structural cracking. Riding surface roughness index is nominal (IRI 1.8 m/km).

SECTION 2: EXPANSION JOINTS
Section 2.1: Span S-12 Expansion Joint Photogrammetry (Page 2)
Sub-millimeter drone aerial imagery revealed continuous debonding of the vulcanized joint gland over a 4.8-meter segment on Span S-12. Thermal movement during diurnal temperature cycling has induced tear propagation along the concrete interface.

SECTION 3: BEARING CONDITIONS & OVERDUE AUDITS
Section 4.3: Pier Cap Drainage & Bearing Shelf Condition (Page 5)
Moisture runoff bypassing debonded expansion joint J-08 has deposited superficial calcium efflorescence on Pier Cap 12. Mandatory 3-year bearing shear distortion survey is overdue and requires prioritization before monsoon onset.`,
    pages: [
      {
        page_number: 1,
        text: 'Title: Drone Photogrammetric Viaduct Audit (Simulated Specimen)\nSummary: Joint sealant debonding and overdue bearing survey.',
      },
      {
        page_number: 2,
        text: 'Section 2.1: Span S-12 Expansion Joint Photogrammetry\nSub-millimeter drone aerial imagery revealed continuous debonding of the vulcanized joint gland over a 4.8-meter segment on Span S-12. Thermal movement during diurnal temperature cycling has induced tear propagation along the concrete interface.',
      },
      {
        page_number: 3,
        text: 'Section 2.3: Joint Movement Envelope Analysis under 15°C - 38°C Thermal Cycling.',
      },
      {
        page_number: 4,
        text: 'Section 3: Pier Column Visual Concrete Carbonation Survey (Carbonation depth < 2mm).',
      },
      {
        page_number: 5,
        text: 'Section 4.3: Pier Cap Drainage & Bearing Shelf Condition\nMoisture runoff bypassing debonded expansion joint J-08 has deposited superficial calcium efflorescence on Pier Cap 12. Mandatory 3-year bearing shear distortion survey is overdue and requires prioritization before monsoon onset.',
      },
      {
        page_number: 6,
        text: 'Maintenance Work Order Summary (Simulated Specimen)\nAction items: Reseal joint J-08; schedule bearing ultrasonic testing.',
      },
    ],
    status: 'available',
  },
};

// ==============================================================================
// 7. DEMO MEDIA, SOURCES, AND FINDINGS FIXTURES
// ==============================================================================

export const DEMO_MEDIA = [
  {
    id: 'DEMO-MED-001',
    asset_id: 'DEMO-BRG-001',
    file_name: 'mandovi_pier_scour_sonar.svg',
    caption: 'Pier P-04 Multibeam Sonar Bathymetry showing -4.2m bed level scour cone (Simulated Specimen)',
    category: 'Visible Damage',
    source_uploader: 'National Port Hydrographic Survey Unit',
    capture_date: '2024-03-12',
    verification_status: 'Verified by Hydrographic Diver',
    media_url: '/api/media/mandovi_pier_scour_sonar.svg',
  },
  {
    id: 'DEMO-MED-002',
    asset_id: 'DEMO-BRG-001',
    file_name: 'mandovi_bridge_overview.svg',
    caption: 'Acoustic Doppler Current Profiler (ADCP) hydrodynamic vortex vectors around Pier P-04 (Simulated Specimen)',
    category: 'Structural Components',
    source_uploader: 'State River Navigation Department',
    capture_date: '2024-03-10',
    verification_status: 'Verified by Sonar Lead',
    media_url: '/api/media/mandovi_bridge_overview.svg',
  },
  {
    id: 'DEMO-MED-003',
    asset_id: 'DEMO-WTP-002',
    file_name: 'chambal_clarifier_unit3.svg',
    caption: 'Cascade aerator tray visual inspection showing zero scale or algal fouling (Simulated Specimen)',
    category: 'General Infrastructure',
    source_uploader: 'Municipal Water Quality Division',
    capture_date: '2024-05-18',
    verification_status: 'Verified Field Photograph',
    media_url: '/api/media/chambal_clarifier_unit3.svg',
  },
  {
    id: 'DEMO-MED-004',
    asset_id: 'DEMO-HWY-003',
    file_name: 'mandovi_expansion_joint.svg',
    caption: 'Span S-12 Expansion Joint photogrammetry showing 4.8m elastomer gland tear (Simulated Specimen)',
    category: 'Visible Damage',
    source_uploader: 'Highway Drone Surveillance Unit',
    capture_date: '2023-09-04',
    verification_status: 'Verified Drone Inspection',
    media_url: '/api/media/mandovi_expansion_joint.svg',
  },
];

export const DEMO_SOURCES = [
  {
    id: 'DEMO-SRC-001',
    asset_id: 'DEMO-BRG-001',
    title: 'Sonar Bathymetric Scour Survey — Final Field Report',
    source_type: 'Technical Audit Document',
    origin_provider: 'National Port Hydrographic Survey Unit',
    document_name: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
    page_reference: 'Section 3.2, Page 4',
    verification_status: 'Verified Document',
    relationship_finding: 'Corroborates 4.2m seabed crater at Pier P-04 foundation',
    exact_excerpt: 'Bathymetric survey confirms localized seabed depression of 4.2 meters beneath Pier P-04 footing.',
  },
  {
    id: 'DEMO-SRC-002',
    asset_id: 'DEMO-WTP-002',
    title: 'SCADA Ultrasonic Vibration & Pumping Station Telemetry Log',
    source_type: 'Telemetry Stream',
    origin_provider: 'Kota Municipal Water Supply SCADA Center',
    document_name: 'SIMULATED-DOC-WTP-02-SCADA.pdf',
    page_reference: 'Table 4, Page 2',
    verification_status: 'Verified Telemetry',
    relationship_finding: 'Confirms continuous nominal delivery at 120 MLD with zero pump vibration excursions',
    exact_excerpt: 'High-lift pump vibration RMS measured at 1.4 mm/s, well within ISO 10816 class 2 limits.',
  },
  {
    id: 'DEMO-SRC-003',
    asset_id: 'DEMO-HWY-003',
    title: 'Drone Photogrammetry & Expansion Joint Diagnostic Report',
    source_type: 'Drone Survey Report',
    origin_provider: 'State Highway Safety & Maintenance Authority',
    document_name: 'SIMULATED-DOC-HWY-03-DRONE.pdf',
    page_reference: 'Section 2.1, Page 2',
    verification_status: 'Verified Inspection',
    relationship_finding: 'Sub-millimeter drone imagery identifies 4.8m elastomer tear along Span S-12',
    exact_excerpt: 'Sub-millimeter drone aerial imagery revealed continuous debonding of vulcanized joint gland over 4.8 meters.',
  },
];

export const DEMO_FINDINGS = [
  {
    id: 'DEMO-FND-001',
    asset_id: 'DEMO-BRG-001',
    title: 'Severe Underwater Pier Scour and Foundation Exposure at Pier P-04',
    plain_explanation: 'Strong tidal water currents have washed away 4.2 meters of riverbed sediment around the main foundation pier, exposing the supporting bedrock.',
    technical_explanation: 'Bed level recession of -4.2m relative to as-built datum exceeds critical threshold z_c defined in IRC:78-2014. Vortex shedding causes progressive sediment transport.',
    severity: 'Critical',
    affected_component: 'Pier P-04 Foundation Pile Cap',
    supporting_evidence: 'SIMULATED-DOC-BRG-01-SCOUR.pdf (Page 4) & multibeam sonar bathymetry',
    recommended_intervention: 'Deploy emergency rip-rap rock armor cage (grade 200-400kg boulders) and install underwater acoustic transponder monitors.',
    resolution_status: 'Under Investigation',
    date_identified: '2024-03-12',
  },
  {
    id: 'DEMO-FND-002',
    asset_id: 'DEMO-WTP-002',
    title: 'Nominal Operating Condition Across Rapid Gravity Sand Filters',
    plain_explanation: 'All filtration beds and backwash pumping arrays are operating at optimal purification performance.',
    technical_explanation: 'Head loss across media beds remains below 1.2m, and effluent turbidity meets IS 10500 standards (< 0.5 NTU).',
    severity: 'Low',
    affected_component: 'Filter Bed Media and Backwash Siphon',
    supporting_evidence: 'SIMULATED-DOC-WTP-02-SCADA.pdf (Page 2)',
    recommended_intervention: 'Continue scheduled quarterly media depth survey.',
    resolution_status: 'Resolved',
    date_identified: '2024-05-18',
  },
  {
    id: 'DEMO-FND-003',
    asset_id: 'DEMO-HWY-003',
    title: 'Thermal Expansion Joint Sealant Debonding on Span S-12',
    plain_explanation: 'The rubber seal between concrete road slabs on Span S-12 has torn along a 4.8-meter strip, letting rainwater seep toward supporting concrete beams.',
    technical_explanation: 'Elastomeric gland adhesive failure under cyclic thermal expansion (diurnal delta 23°C) permits water seepage to pier cap 12 bearing shelf.',
    severity: 'Medium',
    affected_component: 'Modular Expansion Joint J-08',
    supporting_evidence: 'SIMULATED-DOC-HWY-03-DRONE.pdf (Page 2) drone photogrammetry',
    recommended_intervention: 'Replace neoprene seal strip and apply elastomeric primer under lane closure.',
    resolution_status: 'Open',
    date_identified: '2023-09-04',
  },
];

