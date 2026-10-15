import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel

logger = logging.getLogger("aayam.documents")

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


class DocumentEvidenceChunk(BaseModel):
    chunk_id: str
    document_name: str
    file_type: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    asset_id: Optional[str] = None
    asset_name_hint: Optional[str] = None
    timestamp: Optional[str] = None
    source_agency: str
    excerpt: str
    needs_review: bool = False
    review_reason: Optional[str] = None
    relevance_score: float = 0.0


class DocumentStore:
    """
    Ingests, parses, validates, and indexes engineering evidence documents
    (PDF and TXT) linking them reliably to verified assets in SQLite.
    """

    def __init__(self, evidence_dir: Optional[Path] = None):
        self.evidence_dir = evidence_dir or (Path(__file__).resolve().parent.parent / "data" / "evidence")
        self.chunks: List[DocumentEvidenceChunk] = []
        self._load_documents()

    def _load_documents(self):
        self.chunks = []
        if not self.evidence_dir.exists():
            logger.warning(f"Evidence directory {self.evidence_dir} does not exist. Creating it.")
            self.evidence_dir.mkdir(parents=True, exist_ok=True)
            return

        for filepath in self.evidence_dir.iterdir():
            if filepath.suffix.lower() == ".pdf":
                self._ingest_pdf(filepath)
            elif filepath.suffix.lower() in [".txt", ".md"]:
                self._ingest_txt(filepath)

        logger.info(f"Loaded and indexed {len(self.chunks)} evidence chunks from {self.evidence_dir}.")

    def _extract_asset_id(self, text: str) -> Optional[str]:
        """Finds primary key pattern like ASSET-BRG-001 in text."""
        match = re.search(r"\b(ASSET-[A-Z]{3}-\d{3})\b", text)
        if match:
            return match.group(1)
        return None

    def _extract_date(self, text: str) -> Optional[str]:
        """Finds date in YYYY-MM-DD or standard format."""
        match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
        if match:
            return match.group(1)
        return None

    def _ingest_pdf(self, filepath: Path):
        if not PYPDF_AVAILABLE:
            logger.warning("pypdf is not available. Skipping PDF ingestion.")
            return

        try:
            reader = pypdf.PdfReader(str(filepath))
            doc_name = filepath.stem.replace("_", " ")

            for page_idx, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                if not text.strip():
                    continue

                asset_id = self._extract_asset_id(text)
                timestamp = self._extract_date(text)

                needs_review = asset_id is None
                review_reason = "Uncertain asset relationship: No validated asset primary key found in document." if needs_review else None

                source = "Certified Structural Audit Bureau"
                if "PWD" in text:
                    source = "Public Works Dept (PWD) Engineering Wing"
                elif "RUIDP" in text:
                    source = "Urban Infrastructure Development Project (RUIDP)"

                # Split text into paragraphs
                paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
                if not paragraphs:
                    paragraphs = [text.strip()]

                for p_idx, para in enumerate(paragraphs, start=1):
                    chunk = DocumentEvidenceChunk(
                        chunk_id=f"{filepath.stem}-p{page_idx}-c{p_idx}",
                        document_name=doc_name,
                        file_type="PDF",
                        page_number=page_idx,
                        section_title=f"Page {page_idx}",
                        asset_id=asset_id,
                        timestamp=timestamp,
                        source_agency=source,
                        excerpt=para,
                        needs_review=needs_review,
                        review_reason=review_reason,
                    )
                    self.chunks.append(chunk)
        except Exception as e:
            logger.error(f"Error parsing PDF {filepath}: {e}")

    def _ingest_txt(self, filepath: Path):
        try:
            content = filepath.read_text(encoding="utf-8")
            doc_name = filepath.stem.replace("_", " ")

            asset_id = self._extract_asset_id(content)
            timestamp = self._extract_date(content)

            # Check for review flags
            needs_review = asset_id is None or "FLAGGED_FOR_REVIEW" in content or asset_id == "UNASSIGNED"
            review_reason = (
                "Uncertain asset relationship: General regional memo without specific individual asset binding."
                if needs_review
                else None
            )

            # Extract source agency
            source = "Government Public Works Directorate"
            source_match = re.search(r"Author / Source:\s*(.+)", content)
            if source_match:
                source = source_match.group(1).strip()

            doc_name_match = re.search(r"Document Name:\s*(.+)", content)
            if doc_name_match:
                doc_name = doc_name_match.group(1).strip()

            # Split by SECTION headers or double newlines
            sections = re.split(r"(SECTION\s+\d+:?[^\n]*)", content)
            
            if len(sections) > 1:
                current_title = "Overview"
                for part in sections:
                    if part.startswith("SECTION"):
                        current_title = part.strip()
                    elif len(part.strip()) > 40:
                        chunk = DocumentEvidenceChunk(
                            chunk_id=f"{filepath.stem}-sec{len(self.chunks)+1}",
                            document_name=doc_name,
                            file_type="TXT",
                            page_number=1,
                            section_title=current_title,
                            asset_id=None if needs_review else asset_id,
                            timestamp=timestamp,
                            source_agency=source,
                            excerpt=part.strip()[:600],
                            needs_review=needs_review,
                            review_reason=review_reason,
                        )
                        self.chunks.append(chunk)
            else:
                chunk = DocumentEvidenceChunk(
                    chunk_id=f"{filepath.stem}-all",
                    document_name=doc_name,
                    file_type="TXT",
                    page_number=1,
                    section_title="Full Document",
                    asset_id=None if needs_review else asset_id,
                    timestamp=timestamp,
                    source_agency=source,
                    excerpt=content.strip()[:600],
                    needs_review=needs_review,
                    review_reason=review_reason,
                )
                self.chunks.append(chunk)
        except Exception as e:
            logger.error(f"Error parsing TXT document {filepath}: {e}")

    def search_evidence(self, query: str, target_asset_id: Optional[str] = None, top_k: int = 4) -> List[DocumentEvidenceChunk]:
        """
        Retrieves evidence chunks relevant to query and target asset.
        """
        q_tokens = set(re.sub(r"[^\w\s]", "", query.lower()).split())
        scored: List[Tuple[float, DocumentEvidenceChunk]] = []

        for chunk in self.chunks:
            # Skip unverified chunks if a specific asset was targeted
            if target_asset_id and chunk.asset_id and chunk.asset_id != target_asset_id:
                continue

            score = 0.0
            excerpt_lower = chunk.excerpt.lower()
            doc_lower = chunk.document_name.lower()

            # Direct asset ID match
            if chunk.asset_id and chunk.asset_id.lower() in query.lower():
                score += 40.0

            # Target asset ID match
            if target_asset_id and chunk.asset_id == target_asset_id:
                score += 30.0

            # Token overlap in excerpt and document name
            for token in q_tokens:
                if len(token) <= 2:
                    continue
                if token in doc_lower:
                    score += 15.0
                if token in excerpt_lower:
                    score += 10.0

            # Important technical indicators
            domain_terms = ["scour", "vibration", "monsoon", "silt", "bearing", "fissure", "seizure", "turbidity", "cavitation", "audit"]
            for term in domain_terms:
                if term in query.lower() and term in excerpt_lower:
                    score += 20.0

            if score > 0:
                # Copy chunk with calculated score
                chunk_copy = chunk.model_copy()
                chunk_copy.relevance_score = score
                scored.append((score, chunk_copy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]


# Global singleton instance
evidence_store = DocumentStore()
