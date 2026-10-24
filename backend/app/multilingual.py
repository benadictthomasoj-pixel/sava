"""
AAYAM Infrastructure Intelligence — Multilingual Intelligence & Indic Script Normalizer

Provides zero-dependency script detection, domain entity resolution, and localized
prompt construction for English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు),
Malayalam (മലയാളം), and Kannada (ಕನ್ನಡ).
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple

# Supported Language Codes
LANG_EN = "en"
LANG_TA = "ta"
LANG_HI = "hi"
LANG_TE = "te"
LANG_ML = "ml"
LANG_KN = "kn"

LANGUAGE_NAMES: Dict[str, str] = {
    LANG_EN: "English",
    LANG_TA: "Tamil (தமிழ்)",
    LANG_HI: "Hindi (हिन्दी)",
    LANG_TE: "Telugu (తెలుగు)",
    LANG_ML: "Malayalam (മലയാളം)",
    LANG_KN: "Kannada (ಕನ್ನಡ)",
}

# Unicode Ranges for Indian Scripts
SCRIPT_RANGES = {
    LANG_TA: (0x0B80, 0x0BFF),  # Tamil
    LANG_HI: (0x0900, 0x097F),  # Devanagari (Hindi)
    LANG_TE: (0x0C00, 0x0C7F),  # Telugu
    LANG_ML: (0x0D00, 0x0D7F),  # Malayalam
    LANG_KN: (0x0C80, 0x0CFF),  # Kannada
}


def detect_language(text: str) -> str:
    """
    Detects whether the input text is written in Tamil, Hindi, Telugu, Malayalam,
    Kannada, or English based on Unicode character distribution.
    """
    if not text or not text.strip():
        return LANG_EN

    counts = {lang: 0 for lang in SCRIPT_RANGES}
    for char in text:
        cp = ord(char)
        for lang, (start, end) in SCRIPT_RANGES.items():
            if start <= cp <= end:
                counts[lang] += 1
                break

    best_lang, max_count = max(counts.items(), key=lambda x: x[1])
    if max_count >= 2:
        return best_lang

    return LANG_EN


def get_language_name(lang_code: str) -> str:
    """Returns the human-readable language name for prompt construction."""
    return LANGUAGE_NAMES.get(lang_code, "English")


# ==============================================================================
# MULTILINGUAL DOMAIN ENTITY & VOCABULARY MAPPINGS
# Maps Indic script variants to English canonical keywords and candidate asset IDs.
# ==============================================================================

MULTILINGUAL_ENTITY_MAP: Dict[str, Dict[str, Any]] = {
    # Mandovi River Bridge (ASSET-BRG-001 / DEMO-BRG-001)
    "mandovi": {
        "asset_id": "ASSET-BRG-001",
        "demo_id": "DEMO-BRG-001",
        "canonical_keywords": ["mandovi", "bridge", "pier", "scour", "sonar", "bathymetry"],
        "terms": [
            # Tamil
            "மண்டோவி", "மாண்டோவி", "மண்டோவியின்", "மண்டோவி பாலம்",
            # Hindi
            "मंडोवी", "मांडवी", "मांडोवी", "मंडोवी पुल",
            # Telugu
            "మండోవి", "మాండోవి", "మండోవి వంతెన",
            # Malayalam
            "മാണ്ഡോവി", "മണ്ഡോവി", "മാണ്ഡോവി പാലം",
            # Kannada
            "ಮಾಂಡೋವಿ", "ಮಂಡೋವಿ", "ಮಾಂಡೋವಿ ಸೇತುವೆ",
        ],
    },
    # Chambal WTP (ASSET-WTP-002 / DEMO-WTP-002)
    "chambal": {
        "asset_id": "ASSET-WTP-002",
        "demo_id": "DEMO-WTP-002",
        "canonical_keywords": ["chambal", "wtp", "water", "pump", "vibration", "clarifier", "torque"],
        "terms": [
            # Tamil
            "சம்பல்", "சாம்பல்", "சம்பல் ஆலை", "சம்பல் சுத்திகரிப்பு",
            # Hindi
            "चंबल", "चम्बल", "चंबल संयंत्र", "चंबल जल",
            # Telugu
            "చంబల్", "చంబల్ ప్లాంట్",
            # Malayalam
            "ചമ്പൽ", "ചമ്പൽ പ്ലാന്റ്",
            # Kannada
            "ಚಂಬಲ್", "ಚಂಬಲ್ ಘಟಕ",
        ],
    },
    # Western Ghats Culvert / Idukki (ASSET-HWY-003)
    "culvert": {
        "asset_id": "ASSET-HWY-003",
        "demo_id": "DEMO-HWY-003",
        "canonical_keywords": ["culvert", "western ghats", "idukki", "silt", "landslide", "blockage"],
        "terms": [
            # Tamil
            "மேற்கு தொடர்ச்சி", "இடுக்கி", "கல்வெர்ட்", "சிறுபாலம்", "வண்டல்",
            # Hindi
            "पश्चिमी घाट", "इडुक्की", "पुलिया", "गाद", "भूस्खलन",
            # Telugu
            "పశ్చిమ కనుమలు", "ఇడుక్కి", "చిన్నవంతెన", "సిల్ట్",
            # Malayalam
            "പശ്ചിമഘട്ടം", "ഇടുക്കി", "കൽവർട്ട്", "ചളി", "ഉരുൾപൊട്ടൽ",
            # Kannada
            "ಪಶ್ಚಿಮ ಘಟ್ಟ", "ಇಡುಕ್ಕಿ", "ಕಿರುಸೇತುವೆ", "ಹೂಳು",
        ],
    },
    # Krishna Canal Lock Gate (ASSET-CNL-004)
    "canal": {
        "asset_id": "ASSET-CNL-004",
        "demo_id": None,
        "canonical_keywords": ["krishna", "canal", "guntur", "sluice", "lock gate"],
        "terms": [
            "கிருஷ்ணா", "குண்டூர்", "கால்வாய்", "மதகு",
            "कृष्णा", "गुंटूर", "नहर", "जलद्वार",
            "కృష్ణా", "గుంటూరు", "కాలువ", "లాక్ గేట్",
            "കൃഷ്ണ", "ഗുണ്ടൂർ", "കനാൽ",
            "ಕೃಷ್ಣಾ", "ಗುಂಟೂರು", "ಕಾಲುವೆ",
        ],
    },
    # Okhla Substation Transformer (ASSET-PWR-005)
    "substation": {
        "asset_id": "ASSET-PWR-005",
        "demo_id": None,
        "canonical_keywords": ["okhla", "substation", "transformer", "delhi"],
        "terms": [
            "ஓக்லா", "டெல்லி", "மின்நிலையம்", "மின்மாற்றி",
            "ओखला", "दिल्ली", "सबस्टेशन", "ट्रांसफॉर्मर",
            "ఓఖ్లా", "ఢిల్లీ", "సబ్‌స్టేషన్",
            "ഓഖ്ല", "ഡൽഹി", "സബ്സ്റ്റേഷൻ",
            "ಓಖ್ಲಾ", "ದೆಹಲಿ", "ಸಬ್‌ಸ್ಟೇಷನ್",
        ],
    },
    # Mithi River Drainage Flap Gate (ASSET-DRN-006)
    "drainage": {
        "asset_id": "ASSET-DRN-006",
        "demo_id": None,
        "canonical_keywords": ["mithi", "mumbai", "drainage", "flap gate", "seizure"],
        "terms": [
            "மித்தி", "மும்பை", "வடிகால்", "மதகு கதவு",
            "मिठी", "मीठी", "मुंबई", "जल निकासी",
            "మిథి", "ముంబై", "డ్రైనేజీ",
            "മിഥി", "മുംബൈ", "ഡ്രെയിനേജ്",
            "ಮಿಥಿ", "ಮುಂಬೈ", "ಚರಂಡಿ",
        ],
    },
    # Kazhakootam Skyway Corridor (DEMO-HWY-003)
    "kazhakootam": {
        "asset_id": None,
        "demo_id": "DEMO-HWY-003",
        "canonical_keywords": ["kazhakootam", "skyway", "highway", "bearing", "joint"],
        "terms": [
            "கழக்கூட்டம்", "ஸ்கைவே", "நெடுஞ்சாலை",
            "कझाकूट्टम", "स्काईवे", "राजमार्ग",
            "కజకూట్టం", "స్కైవే", "హైవే",
            "കഴക്കൂട്ടം", "സ്കൈവേ", "ഹൈവേ",
            "ಕಝಕೂಟ್ಟಂ", "ಸ್ಕೈವೇ", "ಹೆದ್ದಾರಿ",
        ],
    },
}

# General Engineering Terminology Mapping across Indic Languages
INDIC_DOMAIN_KEYWORDS = {
    # Bridge & Components
    "bridge": ["பாலம்", "பாலத்தின்", "பியர்", "தூண்", "அடித்தளம்", "पुल", "पुलिया", "पियर", "खंभा", "नींव", "వంతెన", "పియర్", "పునాది", "പാലം", "തൂൺ", "അടിത്തറ", "ಸೇತುವೆ", "ಪಿಯರ್", "ಅಡಿಪಾಯ"],
    # Scour & Bathymetry
    "scour": ["அரிப்பு", "மண்ணரிப்பு", "குழி", "சோனார்", "ஆழம்", "कटाव", "कटॉव", "सोनार", "गड्ढा", "నీటికోత", "కోత", "మണ്ണൊലിപ്പ്", "അരിപ്പ്", "കൊರೆತ", "ಸವೆತ"],
    # Vibration & Dynamics
    "vibration": ["அதிர்வு", "அதிர்வுகள்", "சுழல்விசை", "வேகம்", "மோட்டார்", "பம்ப்", "कंपन", "टॉर्क", "गति", "मोटर", "पंप", "కంపనం", "టార్క్", "వేగం", "పంప్", "കമ്പനം", "ടോർക്ക്", "വേഗത", "പമ്പ്", "ಕಂಪನ", "ಟಾರ್ಕ್", "ವೇಗ", "ಪಂಪ್"],
    # Risk & Status (strictly danger/criticality terms)
    "risk": ["ஆபத்து", "ஆபத்தான", "தீவிரம்", "அபாயம்", "ஆபத்துக்கள்", "जोखिम", "खतरा", "गंभीर", "ప్రమాదం", "తీవ్రత", "അപകടം", "തീവ്രത", "ಅಪಾಯ", "ತೀವ್ರತೆ"],
    # Inspection & Evidence
    "audit": ["ஆய்வு", "ஆய்வுகள்", "தணிக்கை", "அறிக்கை", "ஆதாரம்", "சான்று", "சான்றுகள்", "निरीक्षण", "ऑडिट", "रिपोर्ट", "सबूत", "साक्ष्य", "तथ्य", "తనిఖీ", "ఆడిట్", "నివేదిక", "సాక్ష్యం", "పరిశోధന", "ഓഡിറ്റ്", "റിപ്പോർട്ട്", "തെളിവ്", "പರಿಶೀಲನೆ", "ಆಡಿಟ್", "ವರದಿ", "ಸಾಕ್ಷಿ"],
    # Interventions & Actions (actionable engineering mitigation terms)
    "action": ["நடவடிக்கை", "நடவடிக்கைகள்", "பரிந்துரை", "பரிந்துரைகள்", "நிவாரணம்", "பழுதுபார்ப்பு", "कार्रवाई", "उपाय", "सिफारिश", "सुझाव", "मरम्मत", "చర్య", "చర్యలు", "సిఫార్సు", "మరమ్మత్తు", "നടപടി", "നടപടികൾ", "ശുപാർശ", "അറ്റകുറ്റപ്പണി", "ಕ್ರಮ", "ಕ್ರಮಗಳು", "ಶಿಫಾರಸು", "ದುರಸ್ತಿ"],
    # Crack & Joint
    "crack": ["விரிசல்", "பிளவு", "இணைப்பு", "இடைவெளி", "குறைபாடு", "दरार", "जोड़", "फाल्ट", "खराबी", "పగులు", "కీలు", "లోపం", "വിള്ളൽ", "ജോയിന്റ്", "തകരാറ്", "ಬಿರುಕು", "ಕೀಲು", "ದೋಷ"],
}


def extract_all_candidate_asset_ids(query: str) -> List[str]:
    """
    Identifies all unique registered infrastructure asset IDs referenced in the query,
    supporting Indic names, transliterations, and explicit alphanumeric codes.
    """
    q_lower = query.lower()
    found_ids: List[str] = []

    # Check for direct asset ID patterns (e.g., ASSET-BRG-001, ASSET-WTP-002, TEST-ASSET-002, etc.)
    for raw_id in re.findall(r"\b(?:ASSET|TEST|MVP)-[A-Z0-9]+-\d+\b", query, flags=re.IGNORECASE):
        upper_id = raw_id.upper()
        if upper_id not in found_ids:
            found_ids.append(upper_id)

    # Check for entity names across supported Indic scripts
    for key, entity_data in MULTILINGUAL_ENTITY_MAP.items():
        for term in entity_data["terms"]:
            if term.lower() in q_lower:
                aid = entity_data["asset_id"]
                if aid not in found_ids:
                    found_ids.append(aid)
                break

    return found_ids


def normalize_multilingual_query(query: str) -> Tuple[List[str], Optional[str], str]:
    """
    Normalizes a user query by detecting its Indic language, matching domain concepts,
    and returning:
      - expanded_keywords: List of English canonical keywords to aid SQL and document retrieval
      - candidate_asset_id: Primary entity identified in the text (first match)
      - lang_code: The detected language code ('en', 'ta', 'hi', 'te', 'ml', 'kn')
    """
    lang_code = detect_language(query)
    q_lower = query.lower()
    expanded_keywords: Set[str] = set()

    all_candidate_ids = extract_all_candidate_asset_ids(query)
    candidate_asset_id: Optional[str] = all_candidate_ids[0] if all_candidate_ids else None

    # Collect canonical keywords for all detected entities
    for key, entity_data in MULTILINGUAL_ENTITY_MAP.items():
        for term in entity_data["terms"]:
            if term.lower() in q_lower:
                expanded_keywords.update(entity_data["canonical_keywords"])
                break

    # Check general domain terms
    for canonical_en, indic_variants in INDIC_DOMAIN_KEYWORDS.items():
        for iv in indic_variants:
            if iv.lower() in q_lower:
                expanded_keywords.add(canonical_en)
                break

    return sorted(list(expanded_keywords)), candidate_asset_id, lang_code


def get_localized_headings(lang_code: str) -> Dict[str, str]:
    """Returns localized Markdown section headers for the given language code."""
    headings = {
        LANG_EN: {
            "title": "Grounded Technical Synthesis",
            "findings": "Observed Empirical Findings",
            "interventions": "Recommended Engineering Interventions",
        },
        LANG_TA: {
            "title": "ஆதார அடிப்படையிலான தொழில்நுட்பத் தொகுப்பு",
            "findings": "கண்டறியப்பட்ட அனுபவ சான்றுகள்",
            "interventions": "பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்",
        },
        LANG_HI: {
            "title": "साक्ष्य-आधारित तकनीकी विश्लेषण",
            "findings": "अवलोकित अनुभवजन्य निष्कर्ष",
            "interventions": "अनुशंसित इंजीनियरिंग हस्तक्षेप",
        },
        LANG_TE: {
            "title": "ఆధారిత సాంకేతిక విశ్లేషణ",
            "findings": "గమనించిన అనుభవపూర్వక పరిశీలనలు",
            "interventions": "సిఫార్సు చేయబడిన ఇంజనీరింగ్ చర్యలు",
        },
        LANG_ML: {
            "title": "തെളിവ് അടിസ്ഥാനമാക്കിയുള്ള സാങ്കേതിക വിലയിരുത്തൽ",
            "findings": "കണ്ടെത്തിയ പ്രായോഗിക തെളിവുകൾ",
            "interventions": "ശുപാർശ ചെയ്യുന്ന എഞ്ചിനീയറിംഗ് നടപടികൾ",
        },
        LANG_KN: {
            "title": "ಸಾಕ್ಷ್ಯಾಧಾರಿತ ತಾಂತ್ರಿಕ ವಿಶ್ಲೇಷಣೆ",
            "findings": "ಗಮನಿಸಿದ ಪ್ರಾಯೋಗಿಕ ಅಂಶಗಳು",
            "interventions": "ಶಿಫಾರಸು ಮಾಡಲಾದ ಎಂಜಿನಿಯರಿಂಗ್ ಕ್ರಮಗಳು",
        },
    }
    return headings.get(lang_code, headings[LANG_EN])
