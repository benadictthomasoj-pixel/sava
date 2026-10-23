"""
AAYAM Infrastructure Intelligence — Phase 1: Multilingual AI Decision Copilot Regression Tests

Validates:
1. Indic query normalization for Tamil, Hindi, and supported languages.
2. Evidence retrieval matching English engineering documents from Indic queries.
3. Cross-asset contamination prevention during multilingual queries.
4. Honest fallback responses for unindexed queries in Tamil without fabrication.
5. Localized prompt instructions and synthesis preserving numerical invariants and citations.
6. Existing English RAG behavior preservation.
"""

import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.multilingual import detect_language, normalize_multilingual_query, LANG_TA, LANG_HI, LANG_EN

client = TestClient(app)


def test_script_detection_and_query_normalization():
    """Validates language detection and canonical keyword extraction from Indic scripts."""
    # Tamil sample query
    tamil_q = "மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்."
    lang_ta = detect_language(tamil_q)
    assert lang_ta == LANG_TA

    expanded_kw, candidate_aid, detected = normalize_multilingual_query(tamil_q)
    assert detected == LANG_TA
    assert candidate_aid == "ASSET-BRG-001"
    assert "mandovi" in expanded_kw
    assert "bridge" in expanded_kw
    assert "risk" in expanded_kw

    # Hindi sample query
    hindi_q = "मंडोवी पुल के खंभा 4 की कटाव स्थिति क्या है?"
    lang_hi = detect_language(hindi_q)
    assert lang_hi == LANG_HI

    h_kw, h_aid, h_lang = normalize_multilingual_query(hindi_q)
    assert h_lang == LANG_HI
    assert h_aid == "ASSET-BRG-001"
    assert "mandovi" in h_kw
    assert "bridge" in h_kw

    # English query
    en_q = "What is the structural risk status of Mandovi Bridge?"
    lang_en = detect_language(en_q)
    assert lang_en == LANG_EN


def test_tamil_sample_question_retrieves_mandovi_evidence():
    """
    Test the exact user sample question:
    'மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்.'
    Verifies that the multilingual normalizer identifies Mandovi Bridge (ASSET-BRG-001)
    and retrieves the certified underwater sonar audit document without requiring explicit asset_id in query parameters.
    """
    tamil_prompt = "மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்."
    response = client.post(
        "/api/copilot/ask",
        json={"question": tamil_prompt}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] >= 1
    assert data["evidence_sufficiency"] == "sufficient"
    assert len(data["evidence"]) >= 1

    # Check that citations include Mandovi Bridge
    mandovi_citations = [c for c in data["citations"] if "Mandovi" in c or "ASSET-BRG-001" in c]
    assert len(mandovi_citations) >= 1

    # Check evidence items
    asset_ids = [e["asset_id"] for e in data["evidence"] if e["asset_id"]]
    assert "ASSET-BRG-001" in asset_ids

    # Check that retrieval scores are on points scale (> 25 pts)
    for ev in data["evidence"]:
        assert ev["confidence_score"] > 25.0


def test_tamil_sample_question_with_explicit_asset_scope():
    """
    Verifies that when a Tamil question is asked with an explicit asset_id scope,
    the scope is strictly honored and evidence is grounded in that asset.
    """
    tamil_prompt = "மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்."
    response = client.post(
        "/api/copilot/ask",
        json={"question": tamil_prompt, "asset_id": "ASSET-BRG-001"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] >= 1
    assert any(e["asset_id"] == "ASSET-BRG-001" for e in data["evidence"])


def test_tamil_free_form_unsupported_query_returns_honest_fallback():
    """
    Verifies that an inquiry in Tamil for which no infrastructure evidence exists
    (e.g., Chennai nuclear reactor) returns an honest zero-matches fallback in Tamil
    without fabricating records.
    """
    tamil_q = "சென்னையில் உள்ள அணு உலை வெப்பநிலை மற்றும் கதிர்வீச்சு நிலை என்ன?"
    response = client.post(
        "/api/copilot/ask",
        json={"question": tamil_q}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] == 0
    assert data["evidence_sufficiency"] == "insufficient"
    assert len(data["evidence"]) == 0
    assert len(data["citations"]) == 0
    # Must contain honest Tamil fallback text
    assert "AAYAM பதிவேட்டில் கிடைக்கவில்லை" in data["answer"]


def test_cross_asset_contamination_prevented_in_tamil_query():
    """
    Verifies that querying about Mandovi in Tamil does NOT return Chambal WTP,
    Mithi River, or Western Ghats Culvert documents.
    """
    tamil_prompt = "மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்."
    response = client.post(
        "/api/copilot/ask",
        json={"question": tamil_prompt, "asset_id": "ASSET-BRG-001"}
    )
    assert response.status_code == 200
    data = response.json()

    for ev in data["evidence"]:
        if ev["asset_id"]:
            assert ev["asset_id"] == "ASSET-BRG-001"
        if ev["document_name"]:
            assert "Chambal" not in ev["document_name"]
            assert "Mithi" not in ev["document_name"]
            assert "Western Ghats" not in ev["document_name"]


def test_mock_llm_synthesis_generates_tamil_response():
    """
    Verifies that when LLM generation is active (using test_mock provider),
    the generated answer is in Tamil with localized section headings,
    inline citations [Ref 1], and preserved technical numbers (2.4, 48mm).
    """
    os.environ["LLM_PROVIDER"] = "test_mock"
    tamil_prompt = "மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்."

    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": tamil_prompt}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["pipeline_type"].startswith("llm_grounded_rag")
        answer = data["answer"]

        # Localized headings must be present
        assert "கண்டறியப்பட்ட அனுபவ சான்றுகள்" in answer
        assert "பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்" in answer

        # Technical invariants must be preserved
        assert "2.4" in answer
        assert "48" in answer
        assert "[Ref" in answer
    finally:
        os.environ.pop("LLM_PROVIDER", None)


def test_mock_llm_synthesis_generates_hindi_response():
    """Verifies that queries in Hindi generate Hindi answers with localized headings."""
    os.environ["LLM_PROVIDER"] = "test_mock"
    hindi_prompt = "मंडोवी पुल के खंभा 4 की कटाव स्थिति क्या है?"

    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": hindi_prompt}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["pipeline_type"].startswith("llm_grounded_rag")
        answer = data["answer"]

        # Hindi localized headings
        assert "अवलोकित अनुभवजन्य निष्कर्ष" in answer
        assert "अनुशंसित इंजीनियरिंग हस्तक्षेप" in answer
        assert "2.4" in answer
        assert "[Ref" in answer
    finally:
        os.environ.pop("LLM_PROVIDER", None)


def test_english_queries_continue_to_function_identically():
    """Regression test: Confirms English questions continue to produce exact English synthesis."""
    os.environ["LLM_PROVIDER"] = "test_mock"
    en_prompt = "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"

    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": en_prompt}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["pipeline_type"].startswith("llm_grounded_rag")
        answer = data["answer"]

        # Standard English headings
        assert "Observed Empirical Findings" in answer
        assert "Recommended Engineering Interventions" in answer
        assert "2.4 meters" in answer
        assert "48mm" in answer
        assert "[Ref" in answer
    finally:
        os.environ.pop("LLM_PROVIDER", None)


# ==============================================================================
# Phase 1.2 Targeted Regression Tests
# ==============================================================================

def test_fix1_weather_query_with_explicit_asset_id_does_not_retrieve_scour_audit():
    """
    Fix 1 Regression Test:
    A weather question with an explicit bridge asset ID must NOT retrieve the scour audit document.
    Enforces that target_asset_id scoping cannot bypass genuine topical relevance.
    """
    # Test via direct document store
    from app.document_store import evidence_store
    doc_chunks = evidence_store.search_evidence(
        "What is the weather today?",
        target_asset_id="ASSET-BRG-001",
    )
    assert len(doc_chunks) == 0, f"Expected 0 chunks for weather query, got {len(doc_chunks)}"

    # Test via API endpoint
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What is the weather around ASSET-BRG-001?", "asset_id": "ASSET-BRG-001"}
    )
    assert response.status_code == 200
    data = response.json()
    # No document audit passage evidence should be returned for weather
    doc_evidence = [e for e in data["evidence"] if e["evidence_type"] == "document_audit_passage"]
    assert len(doc_evidence) == 0, "Scour audit document was improperly retrieved for weather question!"


def test_fix1_relevant_tamil_bridge_scour_with_asset_id_retrieves_correct_evidence():
    """
    Fix 1 Regression Test:
    A relevant Tamil bridge-scour question with asset ID must retrieve genuine scour audit evidence.
    """
    tamil_q = "மண்டோவி பாலத்தின் ஆபத்து நிலை என்ன? கிடைக்கும் ஆய்வு ஆதாரங்கள் மற்றும் பரிந்துரைக்கப்படும் நடவடிக்கைகளை விளக்கவும்."
    response = client.post(
        "/api/copilot/ask",
        json={"question": tamil_q, "asset_id": "ASSET-BRG-001"}
    )
    assert response.status_code == 200
    data = response.json()
    doc_evidence = [e for e in data["evidence"] if e["evidence_type"] == "document_audit_passage"]
    assert len(doc_evidence) >= 1
    assert all(e["asset_id"] == "ASSET-BRG-001" for e in doc_evidence)
    assert any("Mandovi" in (e["document_name"] or "") for e in doc_evidence)


def test_fix1_no_topical_match_returns_zero_document_evidence_even_with_target_asset():
    """
    Fix 1 Regression Test:
    A query with no topical match must not return evidence just because the target asset matches.
    """
    from app.document_store import evidence_store
    unrelated_queries = [
        "cafeteria lunch menu schedule",
        "வானிலை எப்படி உள்ளது?",
        "what is the accounting payroll policy?",
    ]
    for q in unrelated_queries:
        chunks = evidence_store.search_evidence(q, target_asset_id="ASSET-BRG-001")
        assert len(chunks) == 0, f"Query '{q}' returned {len(chunks)} chunks despite having 0 topical relevance!"


def test_fix2_bridge_response_cannot_receive_pump_maintenance_recommendations():
    """
    Fix 2 Regression Test:
    A bridge response cannot receive irrelevant pump-maintenance or silt descaling recommendations.
    Recommendations must be grounded in bridge inspections and bridge audit documents.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"}
    )
    assert response.status_code == 200
    data = response.json()
    recs = data["recommendations"]
    assert len(recs) >= 1
    for rec in recs:
        rec_lower = rec.lower()
        assert "pump" not in rec_lower, f"Bridge recommendation contained pump instruction: {rec}"
        assert "clarifier" not in rec_lower, f"Bridge recommendation contained clarifier instruction: {rec}"
        assert "impeller" not in rec_lower, f"Bridge recommendation contained impeller instruction: {rec}"
    # Must contain grounded bridge recommendation
    assert any("rip-rap" in r.lower() or "sonar" in r.lower() or "boulder" in r.lower() for r in recs)


def test_fix2_water_treatment_asset_receives_grounded_pump_recommendation():
    """
    Fix 2 Regression Test:
    A water treatment plant receives pump and clarifier recommendations only because its evidence supports it.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "Summarize pump motor vibration RMS velocity and clarifier torque anomalies for Chambal Unit 3."}
    )
    assert response.status_code == 200
    data = response.json()
    recs = data["recommendations"]
    assert len(recs) >= 1
    for rec in recs:
        rec_lower = rec.lower()
        assert "rip-rap" not in rec_lower, f"WTP recommendation contained bridge rip-rap instruction: {rec}"
        assert "pier footing" not in rec_lower, f"WTP recommendation contained bridge pier instruction: {rec}"
    # Must contain grounded pump/clarifier instruction
    assert any("pump" in r.lower() or "clarifier" in r.lower() or "impeller" in r.lower() for r in recs)


def test_fix2_narrative_and_structured_recommendations_consistency():
    """
    Fix 2 Regression Test:
    Narrative answers, structured recommendations, and citations do not contradict one another.
    """
    os.environ["LLM_PROVIDER"] = "test_mock"
    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"}
        )
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        recs = data["recommendations"]

        # Both answer and recommendations should mention emergency rip-rap boulder dumping
        assert "rip-rap" in answer.lower()
        assert any("rip-rap" in r.lower() for r in recs)
    finally:
        os.environ.pop("LLM_PROVIDER", None)


def test_fix3_tamil_comparison_retrieves_both_assets_independently():
    """
    Fix 3 Regression Test:
    A Tamil comparison between Mandovi Bridge and Chambal WTP retrieves relevant evidence for both
    with correct asset IDs and zero cross-asset contamination.
    """
    tamil_compare_q = "மண்டோவி பாலம் மற்றும் சம்பல் ஆலை இரண்டையும் ஒப்பிடுக."
    response = client.post(
        "/api/copilot/ask",
        json={"question": tamil_compare_q}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] >= 2
    ev_asset_ids = {e["asset_id"] for e in data["evidence"] if e["asset_id"]}
    assert "ASSET-BRG-001" in ev_asset_ids
    assert "ASSET-WTP-002" in ev_asset_ids

    # Verify document chunks for both assets
    doc_chunks = [e for e in data["evidence"] if e["evidence_type"] == "document_audit_passage"]
    mandovi_docs = [d for d in doc_chunks if d["asset_id"] == "ASSET-BRG-001"]
    chambal_docs = [d for d in doc_chunks if d["asset_id"] == "ASSET-WTP-002"]

    assert len(mandovi_docs) >= 1, "Mandovi Bridge document chunks missing in comparison!"
    assert len(chambal_docs) >= 1, "Chambal WTP document chunks missing in comparison!"

    # Verify zero cross-contamination
    for d in mandovi_docs:
        assert "Chambal" not in (d["document_name"] or "")
        assert "WTP" not in (d["document_name"] or "")
    for d in chambal_docs:
        assert "Mandovi" not in (d["document_name"] or "")
        assert "Bridge" not in (d["document_name"] or "")


def test_fix3_missing_document_for_one_asset_reports_evidence_gap_not_filled_by_other():
    """
    Fix 3 Regression Test:
    When comparing an asset with indexed documents (Mandovi) with an asset lacking documents (TEST-ASSET-002 or ASSET-CNL-004),
    the missing document for the second asset is reported as an evidence gap and is NOT filled with Mandovi documents.
    """
    # 1. Comparison with an unregistered asset ID (TEST-ASSET-002)
    response = client.post(
        "/api/copilot/ask",
        json={"question": "Compare Mandovi Bridge ASSET-BRG-001 and Test Bridge TEST-ASSET-002."}
    )
    assert response.status_code == 200
    data = response.json()

    doc_chunks = [e for e in data["evidence"] if e["evidence_type"] == "document_audit_passage"]
    test_bridge_docs = [d for d in doc_chunks if d["asset_id"] == "TEST-ASSET-002"]
    assert len(test_bridge_docs) == 0, "TEST-ASSET-002 should have 0 document chunks!"

    evidence_gap_facts = [f for f in data["observed_facts"] if "TEST-ASSET-002" in f and "Evidence Gap" in f]
    assert len(evidence_gap_facts) >= 1, "Evidence gap was not reported in observed facts for TEST-ASSET-002!"

    # 2. Comparison with a registered asset with no indexed engineering documents (ASSET-CNL-004)
    response2 = client.post(
        "/api/copilot/ask",
        json={"question": "Compare Mandovi Bridge ASSET-BRG-001 and Krishna Canal Gate ASSET-CNL-004."}
    )
    assert response2.status_code == 200
    data2 = response2.json()

    doc_chunks2 = [e for e in data2["evidence"] if e["evidence_type"] == "document_audit_passage"]
    cnl_docs = [d for d in doc_chunks2 if d["asset_id"] == "ASSET-CNL-004"]
    assert len(cnl_docs) == 0, "ASSET-CNL-004 should have 0 document chunks!"

    mandovi_docs = [d for d in doc_chunks2 if d["asset_id"] == "ASSET-BRG-001"]
    assert len(mandovi_docs) >= 1, "Mandovi should have its own document chunks!"
    for d in mandovi_docs:
        assert d["asset_id"] == "ASSET-BRG-001"
        assert "ASSET-CNL-004" not in d["excerpt"]

    cnl_gap_facts = [f for f in data2["observed_facts"] if "ASSET-CNL-004" in f and "Evidence Gap" in f]
    assert len(cnl_gap_facts) >= 1, "Evidence gap for ASSET-CNL-004 was not reported in observed facts!"

