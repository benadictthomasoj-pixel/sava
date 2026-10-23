import pytest
from pathlib import Path
import sys
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.document_store import evidence_store

client = TestClient(app)


def test_get_txt_document_content():
    """
    Verifies that the backend can retrieve and serve an existing TXT evidence document
    with accurate metadata, single page representation, and raw text content.
    """
    response = client.get("/api/copilot/documents/Chambal_WTP_Pump_Vibration_Report_2024.txt")
    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "Chambal_WTP_Pump_Vibration_Report_2024.txt"
    assert data["file_type"] == "TXT"
    assert data["total_pages"] == 1
    assert data["status"] == "available"
    assert "7.82 mm/s" in data["content"] or "vibration" in data["content"].lower()
    assert len(data["pages"]) == 1
    assert data["pages"][0]["page_number"] == 1


def test_get_pdf_document_content():
    """
    Verifies that the backend can retrieve and parse an existing PDF evidence document
    (Mandovi Bridge Pier Scour Audit), extracting individual pages and metadata.
    """
    response = client.get("/api/copilot/documents/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf")
    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "Mandovi_Bridge_Pier_Scour_Audit_2023.pdf"
    assert data["file_type"] == "PDF"
    assert data["total_pages"] >= 1
    assert data["status"] == "available"
    assert "Mandovi" in data["document_name"]
    assert "2.4" in data["content"] or "scour" in data["content"].lower()
    assert len(data["pages"]) >= 1


def test_get_document_by_human_readable_name():
    """
    Verifies that documents can also be resolved cleanly by their document title / stem,
    handling spaces and case insensitivity.
    """
    response = client.get("/api/copilot/documents/Western Ghats Culvert Hydrology 2024")
    assert response.status_code == 200
    data = response.json()

    assert "Western_Ghats" in data["filename"]
    assert data["status"] == "available"
    assert "68%" in data["content"] or "culvert" in data["content"].lower()


def test_missing_or_unavailable_document_returns_404():
    """
    Verifies that non-existent or deleted evidence documents return HTTP 404
    with an honest, non-fabricated error explanation.
    """
    response = client.get("/api/copilot/documents/nonexistent_audit_report_2025.pdf")
    assert response.status_code == 404
    data = response.json()
    assert "was not found in the verified evidence archive" in data["detail"]


def test_path_traversal_attack_safely_blocked():
    """
    Security check: Verifies that attempts to traverse directories (e.g. '../app/config.py')
    are safely rejected and do not leak internal codebase or configuration files.
    """
    response = client.get("/api/copilot/documents/../app/config.py")
    assert response.status_code == 404 or response.status_code == 400


def test_copilot_ask_exposes_evidence_metadata_and_source_file():
    """
    Verifies that the existing RAG pipeline (/api/copilot/ask) returns enriched
    EvidenceItems containing source_file, file_type, and chunk_id for evidence inspection.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"}
    )
    assert response.status_code == 200
    data = response.json()

    assert len(data["evidence"]) >= 1
    # Check that at least one document evidence item has source_file and file_type populated
    doc_items = [ev for ev in data["evidence"] if ev["evidence_type"] == "document_audit_passage"]
    assert len(doc_items) >= 1
    primary_doc = doc_items[0]
    assert primary_doc["source_file"] is not None
    assert primary_doc["file_type"] in ["PDF", "TXT"]
    assert primary_doc["document_name"] is not None
    assert primary_doc["citation_label"] is not None


def test_empty_inquiry_returns_zero_evidence_without_fabrication():
    """
    Verifies that when an inquiry has no matches, no synthetic evidence items or
    fabricated citations are returned.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What is the nuclear reactor core temperature in Chennai?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matched_assets_count"] == 0
    assert len(data["evidence"]) == 0
    assert len(data["citations"]) == 0
    assert data["evidence_sufficiency"] == "insufficient"


def test_retrieval_scoring_points_scale_and_evidence_fields():
    """
    Verifies that evidence items returned by /api/copilot/ask include relevance_score
    and confidence_score reflecting the true uncalibrated point scale (e.g. 25.0+ pts),
    rather than an erroneous division by 100 resulting in pseudo-percentages.
    """
    response = client.post(
        "/api/copilot/ask",
        json={"question": "What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["evidence"]) > 0

    for ev in data["evidence"]:
        # Both fields should be present for API consumers
        assert "relevance_score" in ev
        assert "confidence_score" in ev
        assert ev["relevance_score"] is not None
        assert ev["confidence_score"] is not None

        # Verify typical score scale: lexical point scale >= 25.0
        score = ev["relevance_score"]
        assert score >= 25.0, f"Expected points-based relevance score >= 25.0, got {score}"
        # Ensure it was not divided by 100 (which previously resulted in 2.7)
        assert score > 10.0


def test_document_store_scoring_zero_typical_and_edge_cases():
    """
    Directly tests DocumentStore.search_evidence score calculations:
    - Zero score when query tokens do not match any documents
    - Typical score when matching keywords and domain terms
    - High/Maximum scores when query has high keyword density + domain terms
    - Out-of-range / empty query handling
    """
    from app.document_store import evidence_store

    # 1. Zero / empty query -> returns empty list (0 matches)
    empty_results = evidence_store.search_evidence("", min_score=25.0)
    assert len(empty_results) == 0

    # 2. Out-of-range / non-matching query -> returns 0 matches
    unmatched_results = evidence_store.search_evidence("xyznonexistenttoken1234567890", min_score=25.0)
    assert len(unmatched_results) == 0

    # 3. Typical query matching document chunks -> score >= 25.0
    typical_results = evidence_store.search_evidence("Mandovi bridge pier scour audit", min_score=25.0)
    assert len(typical_results) > 0
    top_score = typical_results[0].relevance_score
    assert top_score >= 50.0  # Typical match reaches 50+ to 270+

    # 4. High match query with domain terms + document name + specific terms
    high_results = evidence_store.search_evidence("Mandovi Pier 4 sonar scour bathymetric depth 2.4m superstructure expansion joint", min_score=25.0)
    assert len(high_results) > 0
    max_score = high_results[0].relevance_score
    assert max_score >= 100.0  # High keyword density scores well over 100 pts

