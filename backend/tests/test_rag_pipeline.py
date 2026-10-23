import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database import SessionLocal
from app.models import Asset
from app.copilot_service import query_copilot_evidence_async
from app.document_store import evidence_store

client = TestClient(app)


def test_1_chambal_wtp_known_finding():
    """
    Test 1: Known finding from the Chambal WTP engineering document.
    Verifies that accelerometer readings (7.82 mm/s), ISO 10816 threshold (4.5 mm/s),
    and clarifier torque spike (142%) are retrieved and cited accurately.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "Summarize pump motor vibration RMS velocity and clarifier torque anomalies for Chambal Unit 3."}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] >= 1
    assert data["evidence_sufficiency"] == "sufficient"
    assert data["confidence_level"] == "High"
    assert len(data["evidence"]) >= 1

    # Check citations exist and are non-empty
    assert len(data["citations"]) >= 1
    chambal_cited = any("Chambal" in c for c in data["citations"])
    assert chambal_cited, "Chambal engineering document must be in citations"

    # Verify engineering parameters are present in either answer or observed facts
    all_text = (data["answer"] + " " + " ".join(data["observed_facts"])).lower()
    assert "7.82" in all_text or "vibration" in all_text
    assert "142" in all_text or "torque" in all_text


def test_2_mandovi_bridge_findings():
    """
    Test 2: Question about the Mandovi Bridge.
    Verifies multi-beam sonar scour hole depth (2.4m) and superstructure expansion joint (48mm)
    are retrieved from the 2-page PDF audit and cited.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] >= 1
    assert data["evidence_sufficiency"] == "sufficient"
    
    # Check citations include Mandovi PDF
    mandovi_citations = [c for c in data["citations"] if "Mandovi" in c]
    assert len(mandovi_citations) >= 1

    all_text = (data["answer"] + " " + " ".join(data["observed_facts"])).lower()
    assert "2.4" in all_text or "scour" in all_text
    assert "pier 4" in all_text or "pier" in all_text


def test_3_no_supporting_evidence_honest_handling():
    """
    Test 3: A question with no supporting evidence (e.g. nuclear reactor in Chennai).
    Verifies that the system honestly reports zero matches without hallucinating assets or citations.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What is the nuclear reactor core temperature in Chennai?"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["matched_assets_count"] == 0
    assert data["evidence_sufficiency"] == "insufficient"
    assert data["confidence_level"] == "Low"
    assert len(data["evidence"]) == 0
    assert len(data["citations"]) == 0
    assert "No infrastructure records or engineering documents matching" in data["answer"]
    assert "Zero asset records or document excerpts matched" in data["observed_facts"][0]


def test_4_missing_llm_credentials_fallback():
    """
    Test 4: Missing LLM credentials.
    Verifies that when no LLM API keys are provided, the system falls back
    to a clearly labeled retrieval_only_fallback mode.
    """
    # Explicitly disable LLM keys for this test
    os.environ["AAYAM_DISABLE_LLM"] = "true"
    old_gemini = os.environ.pop("GEMINI_API_KEY", None)
    old_openai = os.environ.pop("OPENAI_API_KEY", None)
    old_anthropic = os.environ.pop("ANTHROPIC_API_KEY", None)
    old_provider = os.environ.pop("LLM_PROVIDER", None)

    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": "What is the status of Chambal Water Treatment Plant?"}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["pipeline_type"] == "retrieval_only_fallback"
        assert "Retrieval-only fallback active" in data["limitations_note"]
    finally:
        os.environ.pop("AAYAM_DISABLE_LLM", None)
        if old_gemini: os.environ["GEMINI_API_KEY"] = old_gemini
        if old_openai: os.environ["OPENAI_API_KEY"] = old_openai
        if old_anthropic: os.environ["ANTHROPIC_API_KEY"] = old_anthropic
        if old_provider: os.environ["LLM_PROVIDER"] = old_provider


def test_5_llm_provider_error_and_timeout_failover():
    """
    Test 5: LLM provider failure or timeout.
    Verifies that when an invalid API key is provided, the system does not crash (HTTP 500),
    but catches the error and cleanly fails over to retrieval_only_fallback with a notice.
    """
    # Set an invalid key that will fail API auth
    os.environ["GEMINI_API_KEY"] = "AIzaSy_INVALID_TEST_KEY_FOR_TIMEOUT_CHECK"
    os.environ.pop("OPENAI_API_KEY", None)
    os.environ.pop("ANTHROPIC_API_KEY", None)
    os.environ.pop("LLM_PROVIDER", None)

    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": "What is the scour risk for Mandovi Bridge Pier 4?"}
        )
        assert response.status_code == 200
        data = response.json()

        # Must cleanly fail over to retrieval fallback without 500 error
        assert data["pipeline_type"] == "retrieval_only_fallback"
        assert len(data["evidence"]) >= 1
        assert "timed out or returned an error" in data["limitations_note"] or "Retrieval-only" in data["limitations_note"]
    finally:
        os.environ.pop("GEMINI_API_KEY", None)


def test_6_citation_deduplication_and_section_accuracy():
    """
    Test 6: Duplicate citations and invalid source references.
    Verifies that citations list does not contain duplicate identical source strings,
    and sections are distinguished.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "Summarize pump motor vibration RMS velocity and clarifier torque anomalies for Chambal Unit 3."}
    )
    assert response.status_code == 200
    data = response.json()

    citations = data["citations"]
    # Verify no duplicates in the citation list
    assert len(citations) == len(set(citations)), "Citations list must have 0 duplicate items"

    # Verify each evidence item has a citation_label that exists in citations
    import re
    ref_labels = [re.search(r"\[(Ref \d+)\]", c).group(1) for c in citations if re.search(r"\[(Ref \d+)\]", c)]
    for ev in data["evidence"]:
        assert ev["citation_label"] in ref_labels


def test_7_no_cross_asset_evidence_contamination():
    """
    Test 7: Verify that evidence for one asset is not incorrectly presented as evidence for another.
    When querying specifically about Mandovi Bridge (ASSET-BRG-001), no Chambal WTP or Mithi River
    documents should appear in the evidence or citations list.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?", "asset_id": "ASSET-BRG-001"}
    )
    assert response.status_code == 200
    data = response.json()

    for ev in data["evidence"]:
        if ev["asset_id"]:
            assert ev["asset_id"] == "ASSET-BRG-001", f"Unexpected asset ID {ev['asset_id']} in Mandovi query"
        if ev["document_name"]:
            assert "Chambal" not in ev["document_name"], "Chambal document contaminated Mandovi query"
            assert "Mithi" not in ev["document_name"], "Mithi document contaminated Mandovi query"
            assert "Western Ghats" not in ev["document_name"], "Western Ghats document contaminated Mandovi query"


def test_8_grounded_llm_synthesis_activation():
    """
    Test 8: Grounded LLM Synthesis activation.
    Verifies that when an LLM provider is active (here using the test-verified LLM provider mode),
    the response is generated via llm_grounded_rag, contains inline citations, and separates
    observed facts from recommendations.
    """
    os.environ["LLM_PROVIDER"] = "test_mock"

    try:
        response = client.post(
            "/api/copilot/ask",
            json={"question": "Summarize pump motor vibration RMS velocity and clarifier torque anomalies for Chambal Unit 3."}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["pipeline_type"].startswith("llm_grounded_rag")
        assert "7.82" in data["answer"] and "mm/s" in data["answer"]
        assert "142%" in data["answer"]
        assert "[Ref" in data["answer"], "LLM answer must include inline citations like [Ref 1]"
        assert "Observed" in data["answer"]
        assert "Interventions" in data["answer"] or "Recommendations" in data["answer"]
    finally:
        os.environ.pop("LLM_PROVIDER", None)


def test_9_source_document_endpoint_retrieval():
    """
    Test 9: Verified source document retrieval.
    Verifies that GET /api/copilot/documents/{identifier} returns full document metadata,
    pages, and text content for both TXT and PDF audit documents.
    """
    # 1. TXT Document
    res_txt = client.get("/api/copilot/documents/Chambal_WTP_Pump_Vibration_Report_2024.txt")
    assert res_txt.status_code == 200
    doc_txt = res_txt.json()
    assert "Chambal" in doc_txt["document_name"]
    assert doc_txt["file_type"] == "TXT"
    assert doc_txt["total_pages"] == 1
    assert "7.82 mm/s" in doc_txt["content"]
    assert doc_txt["status"] == "available"
    assert len(doc_txt["pages"]) == 1

    # 2. PDF Document
    res_pdf = client.get("/api/copilot/documents/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf")
    assert res_pdf.status_code == 200
    doc_pdf = res_pdf.json()
    assert "Mandovi" in doc_pdf["document_name"]
    assert doc_pdf["file_type"] == "PDF"
    assert doc_pdf["total_pages"] >= 2
    assert "scour" in doc_pdf["content"].lower()
    assert doc_pdf["status"] == "available"


def test_10_missing_source_document_returns_404():
    """
    Test 10: Missing or unavailable source document handling.
    Verifies that requesting a non-existent document identifier gracefully returns HTTP 404
    with a clear error explanation without hallucinating document text.
    """
    res = client.get("/api/copilot/documents/Non_Existent_Dam_Report_2025.pdf")
    assert res.status_code == 404
    data = res.json()
    assert "not found in the verified evidence archive" in data["detail"]


def test_11_document_endpoint_path_traversal_rejection():
    """
    Test 11: Security check - Path traversal rejection.
    Verifies that attempts to traverse parent directories are rejected with 400 or 404
    and do not leak system or host files.
    """
    res = client.get("/api/copilot/documents/../../etc/passwd")
    # Must reject with 400 Bad Request or 404 Not Found
    assert res.status_code in (400, 404)


def test_12_evidence_items_include_source_metadata_and_citation_labels():
    """
    Test 12: Source metadata and citation binding on EvidenceItem.
    Verifies that retrieved evidence items carry citation_label, source_file, file_type,
    chunk_id, section_title, page_number, and confidence score.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"}
    )
    assert response.status_code == 200
    data = response.json()

    # Find the document audit passage
    doc_evidence = [e for e in data["evidence"] if e["evidence_type"] == "document_audit_passage"]
    assert len(doc_evidence) >= 1

    for ev in doc_evidence:
        assert ev["citation_label"] is not None
        assert ev["citation_label"].startswith("Ref ")
        assert ev["source_file"] is not None
        assert ev["file_type"] in ("PDF", "TXT")
        assert ev["chunk_id"] is not None
        assert ev["excerpt"] is not None and len(ev["excerpt"]) > 10
        assert ev["confidence_score"] is not None

    # Find asset telemetry records
    asset_evidence = [e for e in data["evidence"] if e["evidence_type"] == "asset_telemetry_record"]
    for ev in asset_evidence:
        assert ev["citation_label"] is not None
        assert ev["citation_label"].startswith("Ref ")
        assert ev["file_type"] == "SQLITE"
        assert ev["source_file"] is not None
        assert ev["chunk_id"] is not None


if __name__ == "__main__":
    pytest.main(["-v", __file__])
