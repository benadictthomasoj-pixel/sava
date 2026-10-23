import os
import re
from typing import List, Dict, Any, Tuple, Optional
import logging
from sqlalchemy.orm import Session
import httpx

from app import config
from app.models import Asset, parse_flagged_reasons
from app.schemas import EvidenceItem, CopilotAskResponse
from app.document_store import evidence_store, DocumentEvidenceChunk
from app.multilingual import (
    detect_language,
    get_language_name,
    normalize_multilingual_query,
    extract_all_candidate_asset_ids,
    get_localized_headings,
    LANG_EN,
    LANG_TA,
    LANG_HI,
    LANG_TE,
    LANG_ML,
    LANG_KN,
)

logger = logging.getLogger("aayam.copilot")


def redact_sensitive_str(val: Any) -> Any:
    """
    Redact sensitive query parameters such as key, api_key, token from URL strings,
    HTTP error messages, or exception traces so secrets are never logged.
    """
    if val is None:
        return val
    if isinstance(val, (str, httpx.URL)):
        s = str(val)
        # Redact query parameters: ?key=..., &key=..., ?api_key=..., &token=...
        s = re.sub(
            r"([?&](?:key|api_key|token|auth|secret|access_token)=)[^&\s\"'\'>)]+",
            r"\g<1>[REDACTED]",
            s,
            flags=re.IGNORECASE,
        )
        # Redact textual key assignments like 'api_key: XYZ' or 'API key XYZ'
        s = re.sub(
            r"((?:api[_\s-]?key|secret|token)[\s:=]+)[A-Za-z0-9_\-\.]{10,}",
            r"\g<1>[REDACTED]",
            s,
            flags=re.IGNORECASE,
        )
        # Redact Bearer tokens in headers/strings
        s = re.sub(
            r"(Bearer\s+)[A-Za-z0-9_\-\.]{10,}",
            r"\g<1>[REDACTED]",
            s,
            flags=re.IGNORECASE,
        )
        # Redact x-goog-api-key header and sensitive parameters in strings/traces
        s = re.sub(
            r"(x-goog-api-key['\":\s=]+)[A-Za-z0-9_\-\.]{6,}",
            r"\g<1>[REDACTED]",
            s,
            flags=re.IGNORECASE,
        )
        # Explicitly redact any active configured secret keys if present in text
        for env_k in ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]:
            active_k = os.getenv(env_k)
            if active_k and len(active_k) > 6 and active_k in s:
                s = s.replace(active_k, "[REDACTED]")
        return s
    return val


class SensitiveParamFilter(logging.Filter):
    """
    Global logging filter that sanitizes log records from any backend logger or HTTP client,
    redacting sensitive query parameters like 'key' before messages are formatted or printed.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_str(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(redact_sensitive_str(a) for a in record.args)
            elif isinstance(record.args, dict):
                record.args = {k: redact_sensitive_str(v) for k, v in record.args.items()}
        return True


def wrap_handler_formatter(h: logging.Handler):
    """Ensures formatted message emitted by any handler is scrubbed of sensitive query params."""
    fmt = h.formatter or logging.Formatter()
    if getattr(fmt, "_redact_wrapped", False):
        return
    orig_format = fmt.format
    def safe_format(record: logging.LogRecord) -> str:
        return redact_sensitive_str(orig_format(record))
    fmt.format = safe_format
    fmt._redact_wrapped = True
    h.formatter = fmt


def install_sensitive_param_filters():
    """
    Installs the SensitiveParamFilter and formatter wrapping on all active loggers,
    handlers, and HTTP clients, ensuring API keys and sensitive query parameters
    are never printed in HTTP logs.
    """
    sensitive_filter = SensitiveParamFilter()
    root_logger = logging.getLogger()
    root_logger.addFilter(sensitive_filter)
    for h in root_logger.handlers:
        h.addFilter(sensitive_filter)
        wrap_handler_formatter(h)

    for logger_name in ["httpx", "httpcore", "aayam.copilot", "aayam.api", "uvicorn", "uvicorn.access", "uvicorn.error"]:
        lg = logging.getLogger(logger_name)
        lg.addFilter(sensitive_filter)
        for h in lg.handlers:
            h.addFilter(sensitive_filter)
            wrap_handler_formatter(h)

    # Suppress verbose httpx/httpcore request tracing at INFO level so URLs are not spammed
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# Initialize filters immediately on module load
install_sensitive_param_filters()

# Common conversational stopwords
STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "for", "on", "with", "at",
    "by", "from", "is", "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "do", "does", "did", "why", "what", "which", "who", "whom",
    "where", "when", "how", "show", "me", "tell", "give", "list", "about",
    "any", "all", "please", "can", "could", "would", "should", "does", "it"
}


def extract_keywords(text: str) -> List[str]:
    """Tokenize query and remove standard stopwords while preserving domain terms."""
    clean_text = re.sub(r"[^\w\s-]", " ", text.lower())
    tokens = clean_text.split()
    return [t for t in tokens if len(t) > 2 and t not in STOPWORDS]


def score_asset_relevance(
    asset: Asset,
    question: str,
    keywords: List[str],
    candidate_asset_id: Optional[str] = None,
    candidate_asset_ids: Optional[List[str]] = None,
) -> Tuple[int, List[str]]:
    """
    Computes a relevance score between an asset and the user's query.
    Supports direct ID, name, category, location, and normalized multilingual entity triggers.
    """
    q_lower = question.lower()
    score = 0
    match_reasons = []

    # 1. Direct ID match or Multilingual Entity resolution
    all_candidate_ids = set()
    if candidate_asset_id:
        all_candidate_ids.add(candidate_asset_id)
    if candidate_asset_ids:
        all_candidate_ids.update(candidate_asset_ids)

    if asset.id.lower() in q_lower:
        score += 100
        match_reasons.append(f"Direct ID match ({asset.id})")
    elif asset.id in all_candidate_ids:
        score += 85
        match_reasons.append(f"Multilingual entity match ({asset.id})")

    # 2. Asset Name keywords
    name_lower = asset.name.lower()
    for kw in keywords:
        if kw in name_lower:
            score += 35
            match_reasons.append(f"Name matched '{kw}'")

    # 3. Category match
    cat_lower = asset.category.lower()
    for kw in keywords:
        if kw in cat_lower or (kw == "culvert" and "highway" in cat_lower):
            score += 25
            match_reasons.append(f"Category matched '{kw}'")

    # 4. Location match (district, state)
    dist_lower = asset.district.lower()
    state_lower = asset.state.lower()
    for kw in keywords:
        if kw in dist_lower or kw in state_lower:
            score += 20
            match_reasons.append(f"Location matched '{kw}'")

    # 5. Flagged triggers & engineering context matches
    flagged_lower = (asset.flagged_reasons or "").lower()
    desc_lower = (asset.description or "").lower()
    domain_triggers = ["scour", "vibration", "monsoon", "silt", "crack", "bearing", "leak", "flood", "joint", "sludge"]
    
    for dt in domain_triggers:
        if dt in q_lower or dt in keywords:
            if dt in flagged_lower:
                score += 30
                match_reasons.append(f"Flag trigger match '{dt}'")
            elif dt in desc_lower:
                score += 15
                match_reasons.append(f"Context match '{dt}'")

    # 6. Status queries
    if any(term in q_lower or term in keywords for term in ["critical", "flagged", "urgent", "danger", "worst", "risk"]):
        if asset.status == "Critical Attention" or asset.risk_level == "Critical":
            score += 20
            match_reasons.append("High risk status alignment")
    if any(term in q_lower or term in keywords for term in ["inspection", "audit", "overdue", "due"]):
        if asset.status == "Requires Inspection" or "overdue" in flagged_lower:
            score += 20
            match_reasons.append("Inspection requirement alignment")

    return score, match_reasons


async def generate_llm_synthesis(
    question: str,
    context_text: str,
    citations_list: List[str],
    lang_code: str = LANG_EN,
) -> Tuple[Optional[str], str]:
    """
    Invokes external LLM (Gemini, OpenAI, Anthropic, or Test Mock Provider)
    using environment variable configuration.
    Returns (generated_answer_or_none, provider_identifier).
    """
    # If not explicitly disabled for testing and no active keys are present in environment,
    # refresh from backend/.env so live changes are picked up
    if os.getenv("AAYAM_DISABLE_LLM") != "true":
        curr_g = os.getenv("GEMINI_API_KEY")
        curr_o = os.getenv("OPENAI_API_KEY")
        curr_a = os.getenv("ANTHROPIC_API_KEY")
        if not curr_g and not curr_o and not curr_a:
            from pathlib import Path
            from dotenv import load_dotenv
            bdir = Path(__file__).resolve().parent.parent
            env_f = bdir / ".env"
            if env_f.exists():
                load_dotenv(env_f, override=True)

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and (gemini_key.startswith("your_") or not gemini_key.strip()):
        gemini_key = None
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and (openai_key.startswith("your_") or not openai_key.strip()):
        openai_key = None
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and (anthropic_key.startswith("your_") or not anthropic_key.strip()):
        anthropic_key = None

    mock_test_mode = (
        os.getenv("LLM_PROVIDER") == "test_mock" or
        os.getenv("AAYAM_TEST_LLM_PROVIDER") == "true"
    )

    if mock_test_mode:
        synthesis = _synthesize_mock_llm_answer(question, context_text, citations_list, lang_code=lang_code)
        return synthesis, "llm_grounded_rag (Test LLM Provider)"

    localized_h = get_localized_headings(lang_code)
    system_instruction = (
        "You are AAYAM Infrastructure Decision Copilot — an evidence-grounded engineering intelligence assistant "
        "for India's public infrastructure. Your mission is to provide rigorous technical analysis based SOLELY on "
        "the supplied context records.\n\n"
        "STRICT GROUNDING RULES:\n"
        "1. Answer ONLY using the empirical facts, sensor measurements, and engineering audit excerpts supplied below.\n"
        "2. Cite supporting sources inline using exact tags like [Ref 1], [Ref 2] whenever making a factual statement.\n"
        "3. Preserve all numerical quantities, units, and engineering tolerances with 100% precision (e.g. 7.82 mm/s RMS, "
        "142% torque spike, 2.4m scour hole depth, 48mm expansion joint gap, 68% hydraulic blockage).\n"
        "4. Structure your response with markdown:\n"
        "   - An executive synthesis with inline citations\n"
        f"   - **{localized_h['findings']}** with bullet points and citations\n"
        f"   - **{localized_h['interventions']}** with prioritized actionable steps\n"
        "5. If evidence is missing, conflicting, or incomplete, state this clearly. Never fabricate data, dates, or records."
    )

    if lang_code != LANG_EN:
        lang_name = get_language_name(lang_code)
        system_instruction += (
            f"\n\nCRITICAL MULTILINGUAL INSTRUCTION:\n"
            f"The user inquiry was submitted in {lang_name} (language code: '{lang_code}').\n"
            f"You MUST generate your entire response in natural, fluent, grammatically correct {lang_name}.\n"
            f"STRICT INVARIANT RULES IN LOCALIZED OUTPUT:\n"
            f"1. Keep all citation tags verbatim: [Ref 1], [Ref 2], etc.\n"
            f"2. Keep all registered Asset IDs verbatim: e.g. ASSET-BRG-001, ASSET-WTP-002, ASSET-HWY-003.\n"
            f"3. Keep all numbers, engineering units, and tolerances verbatim: e.g. 2.4m, 48mm, 7.82 mm/s RMS, 142%, 68%, 2023-11-14.\n"
            f"4. Keep document file names and official agency names verbatim (e.g. Mandovi_Bridge_Pier_Scour_Audit_2023.pdf, Goa PWD).\n"
            f"5. Clearly distinguish documented facts from recommendations.\n"
            f"6. Do not claim any risk score or retrieval score is a calibrated probability."
        )

    user_prompt = (
        f"VERIFIED EVIDENCE CONTEXT:\n{context_text}\n\n"
        f"AVAILABLE CITATIONS:\n" + "\n".join(citations_list) + "\n\n"
        f"USER INQUIRY: {question}\n\n"
        "Please provide an evidence-grounded response adhering to the strict grounding rules:"
    )

    # 1. Google Gemini Provider
    if gemini_key:
        configured_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
        working_primary = "gemini-3.5-flash-lite"

        # Prioritize the verified working model (gemini-3.5-flash-lite) as primary.
        # If gemini-flash-latest or deprecated 1.5/2.5 models are in environment,
        # use gemini-3.5-flash-lite first to avoid 429 quota exhaustion or 404,
        # while preserving the existing fallback behavior.
        if not configured_model or configured_model in ["gemini-flash-latest", "gemini-1.5-flash", "gemini-2.5-flash"]:
            primary_model = working_primary
        else:
            primary_model = configured_model

        models_to_try = [primary_model]
        # Preserve fallback cascade across supported Gemini models
        for fallback_m in [working_primary, "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.8-flash"]:
            clean_fb = fallback_m.replace("models/", "")
            if clean_fb not in [m.replace("models/", "") for m in models_to_try]:
                models_to_try.append(fallback_m)

        for model in models_to_try:
            clean_model = model.replace("models/", "")
            # Pass key in x-goog-api-key header and omit from URL query string
            # to prevent API key exposure in HTTP access/proxy logs
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent"
            headers = {
                "x-goog-api-key": gemini_key,
                "Content-Type": "application/json",
            }
            payload = {
                "system_instruction": {"parts": [{"text": system_instruction}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1000}
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    res = await client.post(url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                return parts[0]["text"].strip(), f"llm_grounded_rag (Google Gemini - {clean_model})"
                    elif res.status_code in [404, 429, 500, 502, 503, 504] and model != models_to_try[-1]:
                        # HTTP 429 indicates rate limiting/quota exhaustion, not invalid credentials
                        logger.warning(f"Gemini model {clean_model} returned HTTP {res.status_code}, attempting fallback model...")
                        continue
                    else:
                        logger.warning(f"Gemini API returned HTTP {res.status_code}: {redact_sensitive_str(res.text[:200])}")
            except Exception as e:
                # Sensitive query parameters (key=...) are redacted from exception strings and log messages
                logger.warning(f"Gemini LLM call failed or timed out: {redact_sensitive_str(str(e))}")

    # 2. OpenAI Provider
    if openai_key:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 1000
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"]["content"].strip(), f"llm_grounded_rag (OpenAI - {model})"
                else:
                    logger.warning(f"OpenAI API returned HTTP {res.status_code}: {redact_sensitive_str(res.text[:200])}")
        except Exception as e:
            logger.warning(f"OpenAI LLM call failed or timed out: {redact_sensitive_str(str(e))}")

    # 3. Anthropic Provider
    if anthropic_key:
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "system": system_instruction,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": 1000,
            "temperature": 0.2
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("content", [])
                    if content and "text" in content[0]:
                        return content[0]["text"].strip(), f"llm_grounded_rag (Anthropic - {model})"
                else:
                    logger.warning(f"Anthropic API returned HTTP {res.status_code}: {redact_sensitive_str(res.text[:200])}")
        except Exception as e:
            logger.warning(f"Anthropic LLM call failed or timed out: {redact_sensitive_str(str(e))}")

    # 4. Deterministic Test Mock Provider (for verification suites without active billable keys)
    if mock_test_mode:
        synthesis = _synthesize_mock_llm_answer(question, context_text, citations_list, lang_code=lang_code)
        return synthesis, "llm_grounded_rag (Test LLM Provider)"

    return None, "retrieval_only_fallback"


def _synthesize_mock_llm_answer(
    question: str,
    context_text: str,
    citations_list: List[str],
    lang_code: str = LANG_EN,
) -> str:
    """
    Generates a deterministic, grounded answer adhering to the exact LLM prompt instructions
    for testing environments and offline evaluation, formatted in the requested language.
    """
    # Extract primary refs
    first_ref = citations_list[0].split()[0] if citations_list else "[Ref 1]"
    second_ref = citations_list[1].split()[0] if len(citations_list) > 1 else first_ref

    q_lower = question.lower()
    is_mandovi = any(w in q_lower for w in ["mandovi", "scour", "மண்டோவி", "ஆபத்து", "பாலம்", "मंडोवी", "पुल"]) or "ASSET-BRG-001" in context_text
    is_chambal = any(w in q_lower for w in ["chambal", "vibration", "pump", "சம்பல்", "அதிர்வு", "चंबल"]) or "ASSET-WTP-002" in context_text
    is_culvert = any(w in q_lower for w in ["culvert", "western ghats", "silt", "இடுக்கி", "பள்ளம்"]) or "ASSET-HWY-003" in context_text

    if lang_code == LANG_TA:
        lines = [
            "### ஆதார அடிப்படையிலான தொழில்நுட்பத் தொகுப்பு",
            f"AAYAM உள்கட்டமைப்பு புலனாய்வு களஞ்சியத்தில் உள்ள சரிபார்க்கப்பட்ட பதிவுகள் மற்றும் சான்றளிக்கப்பட்ட பொறியியல் தணிக்கைகளின் அடிப்படையில், *\"{question}\"* என்ற விசாரணைக்கான தொழில்நுட்பப் பகுப்பாய்வு கீழே ஆதாரக் குறிப்புகளுடன் தொகுக்கப்பட்டுள்ளது.\n",
            "#### கண்டறியப்பட்ட அனுபவ சான்றுகள்",
        ]
        if is_mandovi and is_chambal:
            lines.append(f"- **மண்டோவி பாலம் (ASSET-BRG-001):** தூண் 4 கான்கிரீட் அடித்தளத்திற்கு கீழே **2.4 மீட்டர்** ஆழத்தில் நீரடி அரிப்புக் குழி கண்டறியப்பட்டது; விரிவாக்க இணைப்பு இடைவெளி **48 மி.மீ (48mm)** ஆகப் பதிவாகியுள்ளது {first_ref}.")
            lines.append(f"- **சம்பல் சுத்திகரிப்பு ஆலை (ASSET-WTP-002):** பம்ப் மோட்டார் #3 பேரிங் ஹவுசிங்கில் ரேடியல் அதிர்வு வேகம் **7.82 mm/s RMS** ஆகப் பதிவாகியுள்ளது மற்றும் கிளாரிஃபையர் சுழல்விசை **142%** வரை உயர்ந்தது {second_ref}.")
            lines.append("\n#### பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்")
            lines.append(f"- **மண்டோவி பாலம்:** தூண் 4 அடித்தளத்தைச் சுற்றி அவசர ரிப்-ராப் பாறை குவியல் (rip-rap boulder dumping) பணிகளை மேற்கொள்ள வேண்டும் {first_ref}.")
            lines.append(f"- **சம்பல் ஆலை:** பம்ப் #3 இம்பெல்லரைத் தனிமைப்படுத்தி டைனமிக் ரோட்டார் பேலன்சிங் மேற்கொள்ள வேண்டும் {second_ref}.")
        elif is_mandovi:
            lines.append(f"- **நீரடி தூண் அடித்தள அரிப்பு (Sub-surface Pier Scour):** தூண் 4 கான்கிரீட் அடித்தளத்திற்கு கீழே **2.4 மீட்டர்** ஆழத்தில் நீரடி அரிப்புக் குழி ஏற்பட்டிருப்பது உயர் தெளிவுத்திறன் கொண்ட மல்டி-பீம் பாத்திமெட்ரி சோனார் ஆய்வில் கண்டறியப்பட்டது. இது அனுமதிக்கப்பட்ட வடிவமைப்பு வரம்பை விட **65 செ.மீ (65 cm)** அதிகமாகும் {first_ref}.")
            lines.append(f"- **கட்டமைப்பு இடப்பெயர்ச்சி (Superstructure Displacement):** சேதமற்ற ஆய்வில் (NDT), விரிவாக்க இணைப்பு இடைவெளி வடிவமைப்பு வரம்பான 25 மி.மீ-ஐ தாண்டி **48 மி.மீ (48mm)** ஆகப் பதிவாகியுள்ளது; மேலும் தூண் 5 கேப் பீம் அருகே உள்ள டெண்டன் நங்கூரத்தில் மைக்ரோ விரிசல்கள் மீயொலி குறைபாடு கண்டறிதல் மூலம் உறுதியானது {second_ref}.")
            lines.append("\n#### பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்")
            lines.append(f"- **உடனடி தலையீடு (Immediate Remediation):** ஆற்றுப்படுகை பாத்திமெட்ரியை நிலைப்படுத்தவும், நீரடி அரிப்பைத் தடுக்கவும் தூண் 4 அடித்தளத்தைச் சுற்றி அவசர ரிப்-ராப் பாறை குவியல் (rip-rap boulder dumping) பணிகளை மேற்கொள்ள வேண்டும் {second_ref}.")
            lines.append("- **தொடர் கண்காணிப்பு (Continuous Surveillance):** தூண் 5 நங்கூரத்தில் தொடர்ச்சியான ஒலி டைவர் கண்காணிப்பு (acoustic diver monitoring) மற்றும் ஆப்டிகல் விலகல் சென்சார்களை உடனடியாகப் பொருத்த வேண்டும்.")
        elif is_chambal:
            lines.append(f"- **மோட்டார் அதிர்வு வேகம்:** ஹை-லிப்ட் பம்ப் மோட்டார் #3 பேரிங் ஹவுசிங்கில் ரேடியல் அதிர்வு வேகம் **7.82 mm/s RMS** ஆகப் பதிவாகியுள்ளது. இது ISO 10816-3 வரம்பான **4.5 mm/s** ஐ விட அதிகமாகும் {first_ref}.")
            lines.append(f"- **சுழல்விசை முரண்பாடு:** தெளிவுபடுத்தி கசடு சுரண்டி இயக்க சுழல்விசை மோட்டார் மின்னோட்டத்தில் **142%** வரை உயர்ந்தது {second_ref}.")
            lines.append("\n#### பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்")
            lines.append(f"- **இயந்திரப் பராமரிப்பு:** பம்ப் #3 இம்பெல்லரைத் தனிமைப்படுத்தி துல்லியமான டைனமிக் பேலன்சிங் செய்ய வேண்டும் {first_ref}.")
            lines.append(f"- **வடிகட்டி பராமரிப்பு:** அதிவேக மணல் வடிகட்டி முனைகளை உயர் அழுத்த நீர் கொண்டு சுத்தப்படுத்த வேண்டும் {second_ref}.")
        else:
            lines.append(f"- **சரிபார்க்கப்பட்ட சான்றுகள்:** சூழல் பதிவுகள் சான்றளிக்கப்பட்ட நகராட்சி நெறிமுறைகளின் கீழ் செயலில் உள்ள கண்காணிப்பை உறுதிப்படுத்துகின்றன {first_ref}.")
            lines.append(f"- **டெலிமெட்ரி அவதானிப்புகள்:** கவனிக்கப்பட்ட அனைத்து அளவுருக்களும் அட்டவணைப்படுத்தப்பட்ட தரவுத்தள பதிவுகளுடன் ஒத்துப்போகின்றன {second_ref}.")
            lines.append("\n#### பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்")
            lines.append(f"- நிலையான ஆய்வுகள் மற்றும் அவ்வப்போது பொறியியல் மறுசான்றிதழைத் தொடரவும் {first_ref}.")
        return "\n".join(lines)

    elif lang_code == LANG_HI:
        lines = [
            "### साक्ष्य-आधारित तकनीकी विश्लेषण",
            f"AAYAM अवसंरचना भंडार के प्रमाणित इंजीनियरिंग ऑडिट के आधार पर, *\"{question}\"* की तकनीकी जांच नीचे प्रत्यक्ष साक्ष्य के साथ प्रस्तुत है।\n",
            "#### अवलोकित अनुभवजन्य निष्कर्ष",
        ]
        if is_mandovi and is_chambal:
            lines.append(f"- **मांडवी पुल (ASSET-BRG-001):** पियर 4 की नींव के नीचे **2.4 मीटर** गहरा कटाव गड्ढा पाया गया; एक्सपेंशन जॉइंट अंतर **48 मिमी (48mm)** दर्ज किया गया {first_ref}।")
            lines.append(f"- **चंबल जल उपचार संयंत्र (ASSET-WTP-002):** पंप मोटर #3 पर कंपन वेग **7.82 mm/s RMS** और क्लेरिफायर टॉर्क **142%** दर्ज किया गया {second_ref}।")
            lines.append("\n#### अनुशंसित इंजीनियरिंग हस्तक्षेप")
            lines.append(f"- **मांडवी पुल:** पियर 4 के चारों ओर आपातकालीन बोल्डर डंपिंग (rip-rap boulder dumping) करें {first_ref}।")
            lines.append(f"- **चंबल संयंत्र:** पंप #3 इम्पेलर को अलग करके सटीक डायनेमिक रोटर संतुलन करें {second_ref}।")
        elif is_mandovi:
            lines.append(f"- **स्तंभ तल कटाव (Sub-surface Pier Scour):** मल्टी-बीम बाथिमेट्री सोनार सर्वेक्षण में पियर 4 की नींव के नीचे **2.4 मीटर** गहरा कटाव गड्ढा पाया गया, जो स्वीकार्य सीमा से **65 सेमी (65 cm)** अधिक है {first_ref}।")
            lines.append(f"- **அधिरचना विस्थापन:** परीक्षण में एक्सपेंशन जॉइंट का अंतर **48 मिमी (48mm)** दर्ज किया गया (डिजाइन सीमा 25 मिमी से अधिक) और पियर 5 कैप बीम के पास सूक्ष्म दरारें पाई गईं {second_ref}।")
            lines.append("\n#### अनुशंसित इंजीनियरिंग हस्तक्षेप")
            lines.append(f"- **तत्काल समाधान:** पियर 4 की नींव के चारों ओर आपातकालीन बोल्डर डंपिंग (rip-rap boulder dumping) तैनात करें {second_ref}।")
            lines.append("- **निरंतर निगरानी:** पियर 5 एंकरेज पर निरंतर ध्वनिक डाइवर निगरानी स्थापित करें।")
        elif is_chambal:
            lines.append(f"- **मोटर कंपन वेग:** हाई-लिफ्ट पंप मोटर #3 बियरिंग पर रेडियल कंपन वेग **7.82 mm/s RMS** दर्ज किया गया, जो ISO 10816-3 सीमा **4.5 mm/s** से अधिक है {first_ref}।")
            lines.append(f"- **टॉर्क स्पाइक्स:** क्लेरिफायर स्लज स्क्रैपर का ड्राइव टॉर्क मोटर करंट के **142%** तक पहुंच गया {second_ref}।")
            lines.append("\n#### अनुशंसित इंजीनियरिंग हस्तक्षेप")
            lines.append(f"- **यांत्रिक ओवरहाल:** पंप #3 इम्पेलर को अलग करके सटीक डायनेमिक रोटर संतुलन करें {first_ref}।")
        else:
            lines.append(f"- **सत्यापित साक्ष्य:** प्रासंगिक इंजीनियरिंग रिकॉर्ड सक्रिय निगरानी की पुष्टि करते हैं {first_ref}।")
            lines.append("\n#### अनुशंसित इंजीनियरिंग हस्तक्षेप")
            lines.append(f"- मानक गैर-विनाशकारी निगरानी जारी रखें {first_ref}।")
        return "\n".join(lines)

    # Default English output
    lines = [
        "### Grounded Technical Synthesis",
        f"Based on verified technical records and certified engineering audits in the AAYAM intelligence repository, "
        f"the analysis for inquiry *\"{question}\"* is summarized below with direct evidence attribution.\n",
        "#### Observed Empirical Findings"
    ]

    if is_mandovi and is_chambal:
        lines.append(f"- **Mandovi River Estuary Bridge (ASSET-BRG-001):** Multi-beam bathymetry survey revealed a scour hole depth of **2.4 meters** beneath Pier 4 concrete footing and expansion joint gap of **48mm** {first_ref}.")
        lines.append(f"- **Chambal Water Treatment Plant (ASSET-WTP-002):** Tri-axial accelerometer recorded **7.82 mm/s RMS** radial vibration velocity and clarifier drive torque spikes reached **142%** {second_ref}.")
        lines.append("\n#### Recommended Engineering Interventions")
        lines.append(f"- **Mandovi Bridge:** Deploy emergency rip-rap boulder dumping around Pier 4 footing to arrest hydrodynamic scouring {first_ref}.")
        lines.append(f"- **Chambal WTP:** Isolate and overhaul Pump #3 impeller with dynamic rotor balancing {second_ref}.")
    elif is_mandovi:
        lines.append(f"- **Sub-surface Pier Scour:** High-resolution multi-beam bathymetry survey revealed a scour hole depth of **2.4 meters** beneath the concrete footing of Pier 4, exceeding permissible baseline tolerance by **65 cm** {first_ref}.")
        lines.append(f"- **Superstructure Displacement:** Non-destructive testing recorded expansion joint gap of **48mm** (exceeding 25mm design limit) and ultrasonic flaw detection detected micro-fractures in tendon anchorage near Pier 5 cap beam {second_ref}.")
        lines.append("\n#### Recommended Engineering Interventions")
        lines.append(f"- **Immediate Remediation:** Deploy emergency rip-rap boulder dumping around Pier 4 footing to arrest hydrodynamic scouring and stabilize riverbed bathymetry {second_ref}.")
        lines.append(f"- **Surveillance:** Implement continuous acoustic diver monitoring and optical deflection sensors on Pier 5 anchorage.")
    elif is_chambal:
        lines.append(f"- **Motor Vibration Velocity:** Tri-axial accelerometer readings at High-Lift Pump Motor #3 bearing housing recorded **7.82 mm/s RMS** radial vibration velocity, exceeding the ISO 10816-3 peak alert threshold of **4.5 mm/s** {first_ref}.")
        lines.append(f"- **Spectral Anomaly:** Spectral peak at 2x running speed (59.6 Hz) confirms impeller vane pass defect and angular discharge misalignment {first_ref}.")
        lines.append(f"- **Clarifier Torque Spikes:** Drive torque spikes reached **142%** of maximum rated motor current during bottom sludge scraper sweeps due to mechanical friction in the central turn-table bearing {second_ref}.")
        lines.append(f"- **Sensor Calibration Bias:** Manual grab sample turbidity verified at 14.2 NTU versus SCADA optical reading of 4.1 NTU (10.1 NTU discrepancy from probe bio-fouling).")
        lines.append("\n#### Recommended Engineering Interventions")
        lines.append(f"- **Mechanical Overhaul:** Isolate and overhaul Pump #3 impeller with precision dynamic rotor balancing {first_ref}.")
        lines.append(f"- **Filtration Maintenance:** Execute high-pressure water jetting of rapid gravity sand filter underdrain nozzles and replace clarifier turn-table lip seal {second_ref}.")
        lines.append(f"- **Instrumentation:** Perform ultrasonic cleaning and recalibration of raw water intake optical turbidity probes.")
    elif is_culvert:
        lines.append(f"- **Hydraulic Blockage:** Physical sounding measured **68% cross-sectional hydraulic blockage** in the 2.5m x 2.0m RCC box barrel caused by granite scree and sediment {first_ref}.")
        lines.append(f"- **Discharge Reduction:** Hydraulic capacity reduced from 18.5 m3/sec design to 5.2 m3/sec, posing road overtopping danger above 65 mm/hr rainfall {first_ref}.")
        lines.append(f"- **Slope Creep:** Uphill inclinometer detected **12mm creep displacement over 60 days**, causing an 8mm diagonal shear fissure on the left-bank wingwall {second_ref}.")
        lines.append("\n#### Recommended Engineering Interventions")
        lines.append(f"- **Emergency Desilting:** Urgent mechanical clearance of box barrel prior to monsoon onset {first_ref}.")
        lines.append(f"- **Slope Stabilization:** Install wire-mesh gabion retaining crates uphill and inject epoxy-grout into wingwall shear cracks {second_ref}.")
    else:
        lines.append(f"- **Verified Status:** Context records confirm active monitoring under verified municipal protocols {first_ref}.")
        lines.append(f"- **Telemetry Observations:** All observed parameters adhere to indexed database entries {second_ref}.")
        lines.append("\n#### Recommended Engineering Interventions")
        lines.append(f"- Continue standard non-destructive surveillance and periodic engineering recertification {first_ref}.")

    return "\n".join(lines)


async def query_copilot_evidence_async(
    db: Session,
    question: str,
    asset_id_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> CopilotAskResponse:
    """
    Asynchronous Evidence-Grounded RAG Pipeline.
    1. Retrieves structured telemetry from SQLite and unstructured passages from DocumentStore.
    2. Builds unique deduplicated citations with page/section provenance.
    3. Invokes configured LLM (Gemini, OpenAI, Anthropic, or Test Provider).
    4. Automatically falls back to deterministic retrieval-only synthesis on missing credentials or provider failure.
    """
    clean_q = question.strip()
    expanded_kw, candidate_aid, lang_code = normalize_multilingual_query(clean_q)
    candidate_asset_ids = extract_all_candidate_asset_ids(clean_q)
    keywords = extract_keywords(clean_q)
    combined_keywords = sorted(list(set(keywords + expanded_kw)))

    # 1. Search structured SQLite Asset records
    query = db.query(Asset)
    if asset_id_filter:
        query = query.filter(Asset.id == asset_id_filter)
    if category_filter:
        query = query.filter(Asset.category == category_filter)

    all_assets = query.all()
    scored_assets = []
    for asset in all_assets:
        score, reasons = score_asset_relevance(
            asset,
            clean_q,
            combined_keywords,
            candidate_asset_id=candidate_aid,
            candidate_asset_ids=candidate_asset_ids,
        )
        if score > 0:
            scored_assets.append((score, asset, reasons))

    scored_assets.sort(key=lambda x: (x[0], x[1].risk_score), reverse=True)

    # 2. Search unstructured Document Evidence chunks (PDF & TXT)
    # Fix 3: Resolve all confidently identified assets independently for comparative queries
    if asset_id_filter:
        target_asset_ids = [asset_id_filter]
    else:
        target_asset_ids = []
        top_score = scored_assets[0][0] if scored_assets else 0
        for s_score, s_asset, _ in scored_assets:
            if s_score >= max(20, top_score * 0.5):
                if s_asset.id not in target_asset_ids:
                    target_asset_ids.append(s_asset.id)
            if len(target_asset_ids) >= 2:
                break
        if not target_asset_ids and candidate_aid:
            target_asset_ids = [candidate_aid]

    doc_evidence_chunks: List[DocumentEvidenceChunk] = []
    per_asset_limit = 2 if len(target_asset_ids) > 1 else 3
    for aid in target_asset_ids:
        chunks = evidence_store.search_evidence(
            clean_q,
            target_asset_id=aid,
            top_k=per_asset_limit,
            min_score=25.0,
            expanded_terms=expanded_kw,
        )
        doc_evidence_chunks.extend(chunks)

    # 3. Handle Zero Matches: When neither database nor document store have relevant evidence
    top_score = scored_assets[0][0] if scored_assets else 0
    if (not scored_assets or top_score < 20) and not doc_evidence_chunks:
        available_categories = sorted(list(set(a.category for a in db.query(Asset.category).distinct().all())))
        if lang_code == LANG_TA:
            answer_text = (
                f"'{clean_q}' உடன் பொருந்தும் உள்கட்டமைப்பு பதிவுகள் அல்லது பொறியியல் ஆவணங்கள் எதுவும் AAYAM பதிவேட்டில் கிடைக்கவில்லை.\n\n"
                f"AAYAM புலனாய்வு அடுக்கு தற்போது பின்வரும் பிரிவுகளில் உள்ள சான்றளிக்கப்பட்ட மாதிரி சொத்துக்களைக் கண்காணிக்கிறது: **{', '.join(available_categories)}**.\n\n"
                "தயவுசெய்து சொத்து ஐடி (எ.கா. `ASSET-BRG-001`, `ASSET-WTP-002`, `ASSET-HWY-003`), மாவட்டம் அல்லது கட்டமைப்புப் பெயரைச் சரிபார்க்கவும்."
            )
            obs_facts = [
                "குறிப்பிடப்பட்ட தேடல் சொற்களுடன் எந்த சொத்து பதிவுகளோ அல்லது ஆவணப் பகுதிகளோ பொருந்தவில்லை.",
                f"செயலில் உள்ள பதிவேடு {db.query(Asset).count()} சரிபார்க்கப்பட்ட மாதிரி சொத்துக்களைக் கண்காணிக்கிறது.",
            ]
            recs = [
                "குறிப்பிட்ட சொத்து பெயர்களைப் பயன்படுத்தித் தேடவும் (எ.கா., 'Mandovi River Estuary Bridge', 'Chambal Water Treatment Plant').",
                "பதிவுசெய்யப்பட்ட சொத்து ஐடி மூலம் தேட முயற்சிக்கவும் (எ.கா., 'ASSET-BRG-001', 'ASSET-WTP-002').",
                "சொத்து வரம்பு கீழிறங்கு பட்டியலில் இருந்து குறிப்பிட்ட சொத்தைத் தேர்ந்தெடுக்கவும்.",
            ]
            limitations_note = "வெளிப்படையான தரவுத்தள அடிப்படையிலான தேடல்: எந்தவொரு கற்பனைத் தகவலும் உருவாக்கப்படவில்லை. 0 பொருந்தும் பதிவுகள் மட்டுமே கிடைத்தன."
        elif lang_code == LANG_HI:
            answer_text = (
                f"'{clean_q}' से मेल खाने वाले कोई भी अवसंरचना रिकॉर्ड या इंजीनियरिंग दस्तावेज़ AAYAM रजिस्ट्री में नहीं मिले।\n\n"
                f"वर्तमान में प्रमाणित श्रेणियां: **{', '.join(available_categories)}**।\n\n"
                "कृपया संपत्ति आईडी (उदा. `ASSET-BRG-001`, `ASSET-WTP-002`), जिला या संरचनात्मक नाम सत्यापित करें।"
            )
            obs_facts = [
                "निर्दिष्ट खोज शब्दों से कोई रिकॉर्ड या उद्धरण मेल नहीं खाता।",
                f"सक्रिय रजिस्ट्री {db.query(Asset).count()} सत्यापित संपत्तियों की निगरानी करती है।",
            ]
            recs = [
                "विशिष्ट संपत्ति नाम से खोजें (उदा. 'Mandovi River Estuary Bridge', 'Chambal Water Treatment Plant').",
                "पंजीकृत आईडी से खोजें (उदा. 'ASSET-BRG-001', 'ASSET-WTP-002').",
                "ड्रॉपडाउन से एक विशिष्ट संपत्ति चुनें।",
            ]
            limitations_note = "पारदर्शी डेटाबेस-आधारित खोज: कोई कृत्रिम जानकारी नहीं बनाई गई। 0 मेल खाते रिकॉर्ड मिले।"
        else:
            answer_text = (
                f"No infrastructure records or engineering documents matching '{clean_q}' were found in the AAYAM registry.\n\n"
                f"The intelligence layer currently indexes certified assets across categories: **{', '.join(available_categories)}**.\n\n"
                "Please verify the asset ID (e.g. `ASSET-BRG-001`, `ASSET-WTP-002`, `ASSET-HWY-003`), district, or structural component name."
            )
            obs_facts = [
                "Zero asset records or document excerpts matched the specified search terms.",
                f"Active registry monitors {db.query(Asset).count()} verified sample assets with indexed audit reports.",
            ]
            recs = [
                "Search using specific asset names (e.g., 'Mandovi River Estuary Bridge', 'Chambal Water Treatment Plant', 'Western Ghats Culvert').",
                "Try searching by registered ID (e.g., 'ASSET-BRG-001', 'ASSET-WTP-002', 'ASSET-HWY-003').",
                "Select a specific infrastructure asset from the Scope dropdown.",
            ]
            limitations_note = (
                "Transparent database-grounded search: No generative hallucination. "
                "Evidence search returned 0 matching records across SQLite entities and indexed documents."
            )

        return CopilotAskResponse(
            question=clean_q,
            matched_assets_count=0,
            answer=answer_text,
            observed_facts=obs_facts,
            recommendations=recs,
            evidence=[],
            citations=[],
            evidence_sufficiency="insufficient",
            confidence_level="Low",
            limitations_note=limitations_note,
            pipeline_type="retrieval_only_fallback",
        )

    # 4. Compile relevant evidence items and deduplicated citations
    evidence_items: List[EvidenceItem] = []
    citations: List[str] = []
    observed_facts: List[str] = []
    recommendations: List[str] = []

    # Map to deduplicate source citations
    citation_source_to_ref: Dict[str, str] = {}
    citation_index = 1

    # Filter top matched assets
    matched_assets = [item[1] for item in scored_assets if item[0] >= max(20, top_score * 0.5)][:2]

    for asset in matched_assets:
        asset_score = next((item[0] for item in scored_assets if item[1].id == asset.id), 100.0)
        source_key = f"sqlite:{asset.id}"
        if source_key not in citation_source_to_ref:
            ref_label = f"Ref {citation_index}"
            citation_index += 1
            citation_source_to_ref[source_key] = ref_label
            citations.append(f"[{ref_label}] SQLite Asset Registry: {asset.id} ({asset.name})")
        else:
            ref_label = citation_source_to_ref[source_key]

        asset_flags = parse_flagged_reasons(asset.flagged_reasons)

        observed_facts.append(
            f"[{ref_label} - {asset.id}] {asset.name} ({asset.category}) in {asset.district}, {asset.state} "
            f"is classified as '{asset.status}' with AI Risk Score {asset.risk_score}/100 and Health Index {asset.health_index}%."
        )

        if asset_flags:
            observed_facts.append(f"[{ref_label}] Active registered anomalies: {'; '.join(asset_flags)}.")

        if asset.last_inspection_date:
            observed_facts.append(f"[{ref_label}] Certified field audit on record: {asset.last_inspection_date}.")

        # Check for indexed document chunks belonging to this asset (Fix 3: Evidence gap reporting)
        asset_doc_chunks = [c for c in doc_evidence_chunks if c.asset_id == asset.id]
        if not asset_doc_chunks:
            observed_facts.append(
                f"[{ref_label} - {asset.id}] Evidence Gap: No indexed engineering audit documents found for {asset.name}; grounded in telemetry and field inspection records."
            )

        # Fix 2: Grounded recommendations derived strictly from recorded field inspections and document audit excerpts
        # (Replaces static status template that leaked mechanical/pump recommendations into bridges)
        asset_recs: List[str] = []

        # 1. Ground from recorded field inspection recommendations
        if hasattr(asset, "inspections") and asset.inspections:
            for ins in asset.inspections:
                if ins.recommended_action and ins.recommended_action.strip():
                    action_clean = ins.recommended_action.strip()
                    # Validate category compatibility: do not assign pump/clarifier maintenance to bridges
                    if asset.category == "Bridge" and any(w in action_clean.lower() for w in ["pump", "clarifier", "impeller", "wtp", "sluice"]):
                        continue
                    if asset.category != "Bridge" and any(w in action_clean.lower() for w in ["scour cavity", "rip-rap", "boulder dumping", "pier footing"]):
                        continue
                    rec_formatted = f"[{asset.id}] {action_clean}"
                    if rec_formatted not in asset_recs:
                        asset_recs.append(rec_formatted)
                    if len(asset_recs) >= 2:
                        break

        # 2. Ground from retrieved document audit chunks belonging to this asset
        for doc_chunk in asset_doc_chunks:
            if doc_chunk.excerpt:
                rec_match = re.search(r"(?:Recommendation|RECOMMENDED INTERVENTIONS?):\s*(.+)", doc_chunk.excerpt, re.IGNORECASE)
                if rec_match:
                    raw_rec = rec_match.group(1).strip()
                    first_instruction = raw_rec.split("\n")[0].strip()
                    first_instruction = re.sub(r"^\d+\.\s*", "", first_instruction)
                    if first_instruction:
                        rec_formatted = f"[{asset.id}] Document Recommendation: {first_instruction}"
                        if rec_formatted not in asset_recs:
                            asset_recs.append(rec_formatted)
                        if len(asset_recs) >= 2:
                            break

        for r in asset_recs:
            if r not in recommendations:
                recommendations.append(r)

        evidence_items.append(
            EvidenceItem(
                asset_id=asset.id,
                asset_name=asset.name,
                category=asset.category,
                district=asset.district,
                state=asset.state,
                source=asset.data_source,
                evidence_type="asset_telemetry_record",
                description=(
                    f"Status: {asset.status} | Risk Score: {asset.risk_score}/100 | "
                    f"Health Index: {asset.health_index}% | Last Audit: {asset.last_inspection_date or 'N/A'} | "
                    f"Flags: {'; '.join(asset_flags) if asset_flags else 'None'}"
                ),
                risk_score=asset.risk_score,
                status=asset.status,
                last_inspection_date=asset.last_inspection_date,
                citation_label=ref_label,
                confidence_score=round(float(asset_score), 1),
                relevance_score=round(float(asset_score), 1),
                filename=None,
                source_file=f"sqlite:{asset.id}",
                file_type="SQLITE",
                chunk_id=f"sqlite-{asset.id}",
            )
        )

    # Report explicit evidence gaps for any identified candidate asset IDs not found in registry/documents
    for cid in (candidate_asset_ids or []):
        if not any(a.id == cid for a in matched_assets):
            cid_chunks = [c for c in doc_evidence_chunks if c.asset_id == cid]
            if not cid_chunks:
                observed_facts.append(
                    f"[Ref Evidence Gap - {cid}] Evidence Gap: No indexed engineering audit documents or registered records found for {cid}."
                )

    # Add unstructured document evidence chunks (PDF & TXT) with deduplicated source citations
    for doc_chunk in doc_evidence_chunks:
        # Build unique citation key based on document, page, and section
        sec_str = f" - {doc_chunk.section_title}" if doc_chunk.section_title and doc_chunk.section_title != "Overview" else ""
        page_str = f", Page {doc_chunk.page_number}" if doc_chunk.page_number else ""
        source_key = f"doc:{doc_chunk.document_name}:{doc_chunk.page_number or 1}:{doc_chunk.section_title or ''}"

        if source_key not in citation_source_to_ref:
            ref_label = f"Ref {citation_index}"
            citation_index += 1
            citation_source_to_ref[source_key] = ref_label
            doc_citation_desc = (
                f"[{ref_label}] {doc_chunk.document_name} ({doc_chunk.file_type}){page_str}{sec_str} "
                f"by {doc_chunk.source_agency} ({doc_chunk.timestamp or 'Date unrecorded'})"
            )
            citations.append(doc_citation_desc)
        else:
            ref_label = citation_source_to_ref[source_key]

        observed_facts.append(
            f"[{ref_label}] Document Audit Excerpt: \"{doc_chunk.excerpt[:240]}...\""
        )

        evidence_items.append(
            EvidenceItem(
                asset_id=doc_chunk.asset_id,
                asset_name=None,
                category=None,
                district=None,
                state=None,
                source=doc_chunk.source_agency,
                evidence_type="document_audit_passage",
                description=f"Section: {doc_chunk.section_title or 'General'} | File: {doc_chunk.document_name} ({doc_chunk.file_type})",
                document_name=doc_chunk.document_name,
                page_number=doc_chunk.page_number,
                section_title=doc_chunk.section_title,
                timestamp=doc_chunk.timestamp,
                excerpt=doc_chunk.excerpt,
                citation_label=ref_label,
                confidence_score=round(doc_chunk.relevance_score, 1),
                relevance_score=round(doc_chunk.relevance_score, 1),
                filename=doc_chunk.source_file,
                source_file=doc_chunk.source_file,
                file_type=doc_chunk.file_type,
                chunk_id=doc_chunk.chunk_id,
            )
        )

    # 5. Build Context for LLM Grounded Generation
    context_lines = []
    for item in evidence_items:
        if item.evidence_type == "asset_telemetry_record":
            context_lines.append(
                f"- [{item.citation_label}] Asset: {item.asset_name} ({item.asset_id}) | "
                f"Status: {item.status} | Risk Score: {item.risk_score}/100 | Last Audit: {item.last_inspection_date} | "
                f"{item.description}"
            )
        else:
            context_lines.append(
                f"- [{item.citation_label}] Document: {item.document_name} ({item.page_number or 'Sec'}) | "
                f"Source: {item.source} | Excerpt: \"{item.excerpt}\""
            )
    context_text = "\n".join(context_lines)

    # 6. Execute LLM Synthesis or Fallback
    llm_answer, pipeline_type = await generate_llm_synthesis(clean_q, context_text, citations, lang_code=lang_code)

    # Build final response text
    if llm_answer:
        full_answer = llm_answer
        limitations_note = (
            f"Grounded response generated via {pipeline_type} using verified SQLite records and indexed engineering audit documents. "
            "All claims are attributed to retrieved evidence."
        )
    else:
        # Structured deterministic fallback answer
        answer_parts = []
        if matched_assets:
            primary = matched_assets[0]
            primary_flags = parse_flagged_reasons(primary.flagged_reasons)
            if lang_code == LANG_TA:
                answer_parts.append(
                    f"**{primary.name} ({primary.id})** [Ref 1] சரிபார்க்கப்பட்ட பதிவுகளின்படி, இந்த உள்கட்டமைப்பு "
                    f"**'{primary.status}'** நிலையில் உள்ளது. இதன் AI ஆபத்து மதிப்பீடு **{primary.risk_score}/100** மற்றும் கட்டமைப்பு நலக் குறியீடு **{primary.health_index}%** ஆகும்."
                )
                if primary_flags:
                    answer_parts.append(
                        f"**கண்டறியப்பட்ட கட்டமைப்பு குறைபாடுகள் [Ref 1]:**\n" + "\n".join(f"- {flag}" for flag in primary_flags)
                    )
            elif lang_code == LANG_HI:
                answer_parts.append(
                    f"**{primary.name} ({primary.id})** [Ref 1] के सत्यापित रिकॉर्ड के अनुसार, यह संरचना "
                    f"**'{primary.status}'** स्थिति में है, जिसका AI जोखिम स्कोर **{primary.risk_score}/100** और स्वास्थ्य सूचकांक **{primary.health_index}%** है।"
                )
                if primary_flags:
                    answer_parts.append(
                        f"**पहचानी गई संरचनात्मक कमियां [Ref 1]:**\n" + "\n".join(f"- {flag}" for flag in primary_flags)
                    )
            else:
                answer_parts.append(
                    f"Based on verified records for **{primary.name} ({primary.id})** [Ref 1], the facility is in "
                    f"**'{primary.status}'** status with an AI Risk Score of **{primary.risk_score}/100** and Structural Health Index of **{primary.health_index}%**."
                )
                if primary_flags:
                    answer_parts.append(
                        f"**Observed Vulnerabilities [Ref 1]:**\n" + "\n".join(f"- {flag}" for flag in primary_flags)
                    )

        if doc_evidence_chunks:
            top_doc = doc_evidence_chunks[0]
            ref_tag = citation_source_to_ref.get(f"doc:{top_doc.document_name}:{top_doc.page_number or 1}:{top_doc.section_title or ''}", "2")
            if lang_code == LANG_TA:
                doc_page_str = f"பக்கம் {top_doc.page_number}, " if top_doc.page_number else ""
                answer_parts.append(
                    f"**ஆதார தணிக்கை ஆவணச் சான்றுகள் [Ref {ref_tag}]:**\n"
                    f"*{top_doc.source_agency}* வழங்கிய {doc_page_str}*{top_doc.document_name}* அறிக்கையின்படி ({top_doc.timestamp or 'சமீபத்திய'}):\n"
                    f"> \"{top_doc.excerpt[:320]}...\""
                )
            elif lang_code == LANG_HI:
                doc_page_str = f"पृष्ठ {top_doc.page_number}, " if top_doc.page_number else ""
                answer_parts.append(
                    f"**सहायक ऑडिट दस्तावेज़ साक्ष्य [Ref {ref_tag}]:**\n"
                    f"*{top_doc.source_agency}* द्वारा जारी {doc_page_str}*{top_doc.document_name}* के अनुसार ({top_doc.timestamp or 'नवीनतम'}):\n"
                    f"> \"{top_doc.excerpt[:320]}...\""
                )
            else:
                doc_page_str = f"page {top_doc.page_number} of " if top_doc.page_number else ""
                answer_parts.append(
                    f"**Supporting Audit Document Evidence [Ref {ref_tag}]:**\n"
                    f"According to {doc_page_str}*{top_doc.document_name}* issued by *{top_doc.source_agency}* ({top_doc.timestamp or 'recent'}):\n"
                    f"> \"{top_doc.excerpt[:320]}...\""
                )

        full_answer = "\n\n".join(answer_parts)
        pipeline_type = "retrieval_only_fallback"
        is_disabled = (os.getenv("AAYAM_DISABLE_LLM") == "true")
        has_key = False
        if not is_disabled:
            for k in [os.getenv("GEMINI_API_KEY"), os.getenv("OPENAI_API_KEY"), os.getenv("ANTHROPIC_API_KEY")]:
                if k and k.strip() and not k.strip().startswith("your_"):
                    has_key = True
                    break
        if has_key:
            limitations_note = "LLM provider call timed out or returned an error. Safely fell back to deterministic technical evidence synthesis."
        else:
            limitations_note = "Retrieval-only fallback active: No external LLM API key configured (GEMINI_API_KEY or OPENAI_API_KEY). Answer grounded via verified SQLite records and indexed audit documents."

    return CopilotAskResponse(
        question=clean_q,
        matched_assets_count=len(matched_assets),
        answer=full_answer,
        observed_facts=observed_facts,
        recommendations=recommendations,
        evidence=evidence_items,
        citations=citations,
        evidence_sufficiency="sufficient" if (matched_assets or doc_evidence_chunks) else "partial",
        confidence_level="High" if (matched_assets and doc_evidence_chunks) else "Moderate",
        limitations_note=limitations_note,
        pipeline_type=pipeline_type,
    )


def query_copilot_evidence(
    db: Session,
    question: str,
    asset_id_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> CopilotAskResponse:
    """
    Synchronous wrapper for query_copilot_evidence_async for compatibility with synchronous callers.
    """
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # In a running event loop (e.g. inside FastAPI), run in a separate thread or use nest_asyncio
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    query_copilot_evidence_async(db, question, asset_id_filter, category_filter)
                )
                return future.result()
        else:
            return loop.run_until_complete(
                query_copilot_evidence_async(db, question, asset_id_filter, category_filter)
            )
    except RuntimeError:
        return asyncio.run(
            query_copilot_evidence_async(db, question, asset_id_filter, category_filter)
        )
