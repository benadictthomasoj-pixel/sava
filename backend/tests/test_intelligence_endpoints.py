"""
Tests for AAYAM Complete Infrastructure Intelligence Rebuild endpoints:
- Global Search (/api/search)
- Visual Media Serving & Listing (/api/media, /api/assets/{id}/images)
- Evidence Catalog & Provenance (/api/evidence, /api/assets/{id}/sources)
- Structured Findings & Recommendations (/api/assets/{id}/findings)
- Complete Infrastructure Intelligence Profile (/api/assets/{id}/intelligence)
- Intelligence Report Generation (/api/assets/{id}/report)
"""

import pytest
from fastapi.testclient import TestClient


def test_global_search(client: TestClient):
    """Verifies that global search returns matching assets, findings, and document passages."""
    resp = client.get("/api/search?q=Mandovi")
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "Mandovi"
    assert data["total_matches"] >= 1
    assert len(data["assets"]) >= 1
    assert data["assets"][0]["id"] == "ASSET-BRG-001"
    assert "Bridge" in data["assets"][0]["category"]


def test_global_search_findings(client: TestClient):
    """Verifies searching for engineering defect terms like 'scour' finds findings."""
    resp = client.get("/api/search?q=scour")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_matches"] >= 1
    assert len(data["findings"]) >= 1
    assert any("scour" in f["title"].lower() or "scour" in f["subtitle"].lower() for f in data["findings"])


def test_media_file_serving(client: TestClient):
    """Verifies safe static serving of generated visual media SVG files."""
    resp = client.get("/api/media/mandovi_bridge_overview.svg")
    assert resp.status_code == 200
    assert "image/svg+xml" in resp.headers.get("content-type", "")
    assert "<svg" in resp.text


def test_media_path_traversal_guard(client: TestClient):
    """Verifies that malicious path traversal attempts on media endpoint are rejected."""
    resp = client.get("/api/media/../../etc/passwd")
    assert resp.status_code in [400, 404]


def test_asset_media_listing(client: TestClient):
    """Verifies listing media records associated with an infrastructure asset."""
    resp = client.get("/api/assets/ASSET-BRG-001/images")
    assert resp.status_code == 200
    media_list = resp.json()
    assert len(media_list) >= 2
    assert any(m["category"] == "Visible Damage" for m in media_list)
    assert any("mandovi" in m["file_name"] for m in media_list)


def test_evidence_catalog(client: TestClient):
    """Verifies cataloging of indexed engineering audit documents."""
    resp = client.get("/api/evidence")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_documents"] >= 3
    assert data["total_indexed_chunks"] >= 5
    assert len(data["documents"]) >= 3


def test_asset_evidence_sources(client: TestClient):
    """Verifies retrieving traceable evidence sources for an asset."""
    resp = client.get("/api/assets/ASSET-BRG-001/sources")
    assert resp.status_code == 200
    sources = resp.json()
    assert len(sources) >= 1
    assert any("Goa PWD" in s["provider"] or "Sonar" in s["title"] for s in sources)


def test_asset_findings(client: TestClient):
    """Verifies retrieving structured engineering findings with plain/technical explanations."""
    resp = client.get("/api/assets/ASSET-BRG-001/findings")
    assert resp.status_code == 200
    findings = resp.json()
    assert len(findings) >= 1
    assert any(f["severity"] == "Critical" for f in findings)
    assert any("Pier 4" in f["affected_component"] for f in findings)
    assert all("plain_explanation" in f and "technical_explanation" in f for f in findings)


def test_asset_complete_intelligence_profile(client: TestClient):
    """Verifies the complete unified infrastructure intelligence profile endpoint."""
    resp = client.get("/api/assets/ASSET-BRG-001/intelligence")
    assert resp.status_code == 200
    data = resp.json()
    
    # Asset Identity
    assert data["asset"]["id"] == "ASSET-BRG-001"
    assert data["asset"]["name"] == "Mandovi River Estuary Bridge - Pier 4 & 5"
    assert "ownership_authority" in data["asset"]
    
    # Completeness
    assert 0 <= data["completeness"]["percentage"] <= 100
    assert data["completeness"]["has_inspections"] is True
    assert data["completeness"]["has_media"] is True
    assert data["completeness"]["has_sources"] is True
    assert data["completeness"]["has_findings"] is True
    
    # Heartbeat
    assert data["heartbeat"]["risk_score"] > 0
    assert len(data["heartbeat"]["contributing_factors"]) >= 4
    
    # Linked collections
    assert len(data["findings"]) >= 1
    assert len(data["sources"]) >= 1
    assert len(data["media"]) >= 1
    assert len(data["timeline"]) >= 2
    assert len(data["inspections"]) >= 1


def test_asset_report_generation(client: TestClient):
    """Verifies the structured audit report generation endpoint."""
    resp = client.get("/api/assets/ASSET-BRG-001/report")
    assert resp.status_code == 200
    report = resp.json()
    assert report["asset_id"] == "ASSET-BRG-001"
    assert report["report_id"].startswith("REP-ASSET-BRG-001")
    assert len(report["sections"]) >= 5
    assert report["critical_findings_count"] >= 1
