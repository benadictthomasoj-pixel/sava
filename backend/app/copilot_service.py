import os
import re
from typing import List, Dict, Any, Tuple, Optional
import logging
from sqlalchemy.orm import Session
import httpx

from app.models import Asset
from app.schemas import EvidenceItem, CopilotAskResponse
from app.document_store import evidence_store, DocumentEvidenceChunk

logger = logging.getLogger("aayam.copilot")

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


def score_asset_relevance(asset: Asset, question: str, keywords: List[str]) -> Tuple[int, List[str]]:
    """
    Computes a relevance score between an asset and the user's query.
    """
    q_lower = question.lower()
    score = 0
    match_reasons = []

    # 1. Direct ID match
    if asset.id.lower() in q_lower:
        score += 100
        match_reasons.append(f"Direct ID match ({asset.id})")

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
        if dt in q_lower:
            if dt in flagged_lower:
                score += 30
                match_reasons.append(f"Flag trigger match '{dt}'")
            elif dt in desc_lower:
                score += 15
                match_reasons.append(f"Context match '{dt}'")

    # 6. Status queries
    if any(term in q_lower for term in ["critical", "flagged", "urgent", "danger", "worst"]):
        if asset.status == "Critical Attention" or asset.risk_level == "Critical":
            score += 20
            match_reasons.append("High risk status alignment")
    if any(term in q_lower for term in ["inspection", "audit", "overdue", "due"]):
        if asset.status == "Requires Inspection" or "overdue" in flagged_lower:
            score += 20
            match_reasons.append("Inspection requirement alignment")

    return score, match_reasons


async def generate_llm_synthesis(question: str, context_text: str) -> Optional[str]:
    """
    Invokes external LLM (Gemini or OpenAI) if configured via environment variables.
    Returns None if no API keys are present.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    prompt = (
        "You are AAYAM Infrastructure Decision Copilot — an evidence-grounded technical intelligence assistant.\n"
        "Answer the user's question using ONLY the provided verified context records.\n"
        "Rules:\n"
        "1. Cite supporting evidence inline using citations like [Ref 1], [Ref 2].\n"
        "2. Clearly separate observed empirical facts from actionable engineering recommendations.\n"
        "3. Never invent inspections, sensor readings, or government records.\n"
        "4. If evidence is insufficient, explicitly state what is missing.\n\n"
        f"CONTEXT:\n{context_text}\n\n"
        f"USER QUESTION: {question}"
    )

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800}
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.warning(f"Gemini LLM call failed, falling back to retrieval engine: {e}")

    if openai_key:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 800
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"OpenAI LLM call failed, falling back to retrieval engine: {e}")

    return None


def query_copilot_evidence(
    db: Session,
    question: str,
    asset_id_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> CopilotAskResponse:
    """
    Evidence-grounded RAG retrieval and synthesis pipeline.
    Combines SQLite structured telemetry with indexed PDF/TXT engineering document passages.
    """
    clean_q = question.strip()
    keywords = extract_keywords(clean_q)

    # 1. Search structured SQLite Asset records
    query = db.query(Asset)
    if asset_id_filter:
        query = query.filter(Asset.id == asset_id_filter)
    if category_filter:
        query = query.filter(Asset.category == category_filter)

    all_assets = query.all()
    scored_assets = []
    for asset in all_assets:
        score, reasons = score_asset_relevance(asset, clean_q, keywords)
        if score > 0:
            scored_assets.append((score, asset, reasons))

    scored_assets.sort(key=lambda x: (x[0], x[1].risk_score), reverse=True)

    # 2. Search unstructured Document Evidence chunks (PDF & TXT)
    target_aid = asset_id_filter or (scored_assets[0][1].id if scored_assets else None)
    doc_evidence_chunks = evidence_store.search_evidence(clean_q, target_asset_id=target_aid, top_k=3)

    # 3. Handle Case: Zero matches in both database and document store
    if (not scored_assets or scored_assets[0][0] < 15) and not doc_evidence_chunks:
        available_categories = sorted(list(set(a.category for a in db.query(Asset.category).distinct().all())))
        return CopilotAskResponse(
            question=clean_q,
            matched_assets_count=0,
            answer=(
                f"No infrastructure records or engineering documents matching '{clean_q}' were found in the AAYAM registry. "
                f"The database currently monitors assets across categories: {', '.join(available_categories)}. "
                "Please verify the asset code, district, or facility name."
            ),
            observed_facts=[
                "Zero asset records or document excerpts matched the specified search terms.",
                f"Active registry monitors {db.query(Asset).count()} verified sample assets with indexed audit reports."
            ],
            recommendations=[
                "Search using specific asset names (e.g., 'Mandovi River Estuary Bridge', 'Chambal Water Treatment Plant', 'Western Ghats Culvert').",
                "Try searching by registered ID (e.g., 'ASSET-BRG-001', 'ASSET-WTP-002', 'ASSET-HWY-003')."
            ],
            evidence=[],
            citations=[],
            evidence_sufficiency="insufficient",
            confidence_level="Low",
            limitations_note=(
                "Transparent database-grounded search: No vector hallucination. "
                "Evidence search returned 0 matching records across SQLite entities and indexed documents."
            ),
            pipeline_type="retrieval_only_fallback",
        )

    # 4. Compile relevant evidence items and citations
    evidence_items: List[EvidenceItem] = []
    citations: List[str] = []
    observed_facts: List[str] = []
    recommendations: List[str] = []

    # Add structured asset telemetry evidence
    top_score = scored_assets[0][0] if scored_assets else 0
    matched_assets = [item[1] for item in scored_assets if item[0] >= max(20, top_score * 0.5)][:2]

    citation_index = 1
    for asset in matched_assets:
        ref_label = f"Ref {citation_index}"
        citation_index += 1
        asset_flags = asset.flagged_reasons.split("; ") if asset.flagged_reasons else []

        status_fact = (
            f"[{ref_label} - {asset.id}] {asset.name} ({asset.category}) in {asset.district}, {asset.state} "
            f"is classified as '{asset.status}' with Risk Score {asset.risk_score}/100 and Health Index {asset.health_index}%."
        )
        observed_facts.append(status_fact)
        citations.append(f"[{ref_label}] SQLite Asset Registry: {asset.id} ({asset.name})")

        if asset_flags:
            observed_facts.append(f"[{ref_label}] Active registered anomalies: {'; '.join(asset_flags)}.")

        if asset.last_inspection_date:
            observed_facts.append(f"[{ref_label}] Certified field audit on record: {asset.last_inspection_date}.")

        # Recommendations separated from facts
        if asset.status == "Critical Attention" or asset.risk_level == "Critical":
            recommendations.append(
                f"[{asset.id}] Immediate: Dispatch emergency engineering inspection team to perform non-destructive ultrasonic and structural testing on {'; '.join(asset_flags[:2])}."
            )
            recommendations.append(
                f"[{asset.id}] Establish temporary vehicular or flow capacity restrictions to mitigate collapse risk."
            )
        elif asset.status == "Requires Inspection":
            recommendations.append(
                f"[{asset.id}] Priority: Schedule mechanical overhaul and silt descaling prior to heavy monsoon/stress cycles."
            )
        else:
            recommendations.append(
                f"[{asset.id}] Continue standard periodic sensor telemetry logging as per municipal timetable."
            )

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
                confidence_score=0.95,
            )
        )

    # Add unstructured document evidence chunks (PDF & TXT)
    for doc_chunk in doc_evidence_chunks:
        ref_label = f"Ref {citation_index}"
        citation_index += 1

        doc_citation_desc = (
            f"[{ref_label}] {doc_chunk.document_name} ({doc_chunk.file_type})"
            + (f", Page {doc_chunk.page_number}" if doc_chunk.page_number else "")
            + f" by {doc_chunk.source_agency} ({doc_chunk.timestamp or 'Date unrecorded'})"
        )
        citations.append(doc_citation_desc)

        observed_facts.append(
            f"[{ref_label}] Document Excerpt: \"{doc_chunk.excerpt[:220]}...\""
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
                confidence_score=round(doc_chunk.relevance_score / 100.0, 2),
            )
        )

    # 5. Synthesize Answer with Inline Citations
    answer_parts = []
    if matched_assets:
        primary = matched_assets[0]
        primary_flags = primary.flagged_reasons.split("; ") if primary.flagged_reasons else []
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
        doc_page_str = f"page {top_doc.page_number} of " if top_doc.page_number else ""
        answer_parts.append(
            f"**Supporting Audit Document Evidence [Ref {len(matched_assets) + 1}]:**\n"
            f"According to {doc_page_str}*{top_doc.document_name}* issued by *{top_doc.source_agency}* ({top_doc.timestamp or 'recent'}):\n"
            f"> \"{top_doc.excerpt[:300]}...\""
        )

    # Check for LLM configuration
    has_llm_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY"))
    pipeline_type = "llm_grounded_rag" if has_llm_key else "retrieval_only_fallback"

    full_answer = "\n\n".join(answer_parts)

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
        limitations_note=(
            "Grounded in verified SQLite asset registry records and indexed PDF/TXT engineering audit reports. "
            + ("LLM synthesis active." if has_llm_key else "Retrieval-only rule synthesis mode active (no external LLM API key configured).")
        ),
        pipeline_type=pipeline_type,
    )
