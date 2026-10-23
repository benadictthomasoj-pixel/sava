# AAYAM Project Audit Report

**Date:** October 15, 2026  
**Scope:** Full-stack inspection of React Frontend, FastAPI Backend, SQLite Database, Document Ingestion, Hybrid Retrieval Engine, LLM Configuration, Citations, and AI Decision Copilot.  
**Test Suite Status:** 8 of 8 automated tests passing (`pytest tests/test_rag_pipeline.py`).

---

## 1. What is Already Implemented and Working

### A. Frontend (React 18 + Vite + Tailwind CSS)
- **Dashboard Overview (`/`)**: Operational KPI cards (Total Assets: 8, Critical: 3, High Risk: 2, Average Health: 42.6%), category risk distribution charts, and flagged asset priority queue.
- **Asset Registry (`/assets`)**: Searchable, filterable table of synthetic infrastructure assets with risk status badges, location tags, and drill-down links.
- **Geospatial Map (`/map`)**: OpenStreetMap tile integration without watermarks, dynamically color-coded SVG risk pins (Red $\ge 70$, Amber $\ge 40$, Green $< 40$), interactive popups with navigation to Registry and Digital Heartbeat, camera auto-fitting, and risk-tier filter pills.
- **Digital Heartbeat (`/heartbeat`)**: Factor-level risk breakdown, structural health index gauge, data confidence indicator, inspection history, and closed-loop verification modals.
- **Copilot Interface (`/copilot`)**: Interactive sample prompt cards, asset scope filter, markdown-aware synthesis renderer with inline citation badges (`[Ref 1]`, `[Ref 2]`), empirical facts vs. engineering recommendations grid, and evidence drawer.

### B. Backend (FastAPI + SQLAlchemy + SQLite)
- **Asset CRUD & Telemetry Endpoints**: Full suite of REST endpoints (`/api/assets`, `/api/assets/{id}`, `/api/assets/summary/stats`).
- **Digital Heartbeat Engine** (`backend/app/heartbeat_engine.py`): Explainable 4-factor risk calculation (Structural Degradation 35%, Environmental Exposure 25%, Inspection Recency 25%, Operational Strain 15%) returning reproducible scores and confidence percentages.
- **Inspection Lifecycle & Closed-Loop Verification** (`backend/app/main.py`): `POST /api/assets/{id}/inspections`, `PATCH /api/inspections/{id}`, and `POST /api/inspections/{id}/verify` with risk mitigation recalculation.
- **Document Ingestion** (`backend/app/document_store.py`): Multi-page PDF extraction using `pypdf` (`Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`) and structured technical reports (`Chambal_WTP`, `Western_Ghats_Culvert`, `Mithi_River_Sluice_Gate`).

---

## 2. What is Partially Implemented

- **External LLM Provider Activation**:
  - The multi-provider bridge in `backend/app/copilot_service.py` supports Google Gemini, OpenAI, Anthropic, and an automated deterministic test provider.
  - However, in the active environment, no real external API key is populated in `backend/.env`. The backend therefore operates in **deterministic retrieval-only fallback mode**.
- **Vector Database**:
  - The prototype uses token and keyword-based hybrid matching across SQLite entities and parsed document chunks. High-dimensional vector embeddings (e.g., ChromaDB, FAISS, pgvector) are not currently installed or configured.

---

## 3. What Was Missing or Broken (and Current Diagnosis)

| Issue | Diagnosis & Root Cause | Responsible File & Function | Current Status |
|:---|:---|:---|:---:|
| **1. Irrelevant Query False Matches** | Earlier, queries with zero asset overlap (e.g., *"What is the nuclear reactor core temperature in Chennai?"*) matched single incidental words like `"temperature"` with score 10.0, returning bridge documents. | `backend/app/document_store.py`: `DocumentStore.search_evidence` | **Fixed in code:** Added `min_score = 25.0` threshold and strict token overlap requirements. |
| **2. Cross-Asset Evidence Contamination** | Unassigned regional policy memos (`needs_review=True`) were being attached to specific asset queries because the code only skipped chunks where `chunk.asset_id != target_aid` if `chunk.asset_id` was non-null. | `backend/app/document_store.py`: `DocumentStore.search_evidence` | **Fixed in code:** Excluded unassigned memos unless explicitly querying policy or catchment directives. |
| **3. Duplicate Citations in List** | Chunks from different sections of the same document generated duplicate citation strings in the response citations list. | `backend/app/copilot_service.py`: `query_copilot_evidence_async` | **Fixed in code:** Unique source key mapping (`doc:name:page:section`) eliminates duplicate entries. |
| **4. Disconnected Async LLM Caller** | `generate_llm_synthesis` was declared `async def`, while `ask_copilot` in `main.py` was synchronous, leaving the LLM call uninvoked. | `backend/app/main.py`: `ask_copilot` | **Fixed in code:** Made endpoint `async def` and awaited `query_copilot_evidence_async`. |
| **5. Live Daemon Stale Cache** | The background task running `uvicorn` (`task-346`) was started prior to recent code changes and needs a restart to pick up the updated citation deduplication on port 8000. | Background daemon process `task-346` | **Pending Restart** |

---

## 4. Why the Copilot Currently Uses `retrieval_only_fallback`

When an inquiry is submitted to `POST /api/copilot/ask`:
1. `generate_llm_synthesis` inspects the environment for `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY`.
2. Inspecting `backend/.env` reveals only the standard configuration:
   ```properties
   APP_NAME=AAYAM Infrastructure Intelligence API
   ENV=development
   PORT=8000
   HOST=0.0.0.0
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   DATABASE_URL=sqlite:///./aayam_infra.db
   ```
3. Because no external API key is present in `backend/.env`, the function safely returns `None`.
4. The pipeline catches this and falls back to deterministic technical evidence synthesis:
   - Sets `pipeline_type = "retrieval_only_fallback"`.
   - Populates `limitations_note = "Retrieval-only fallback active: No external LLM API key configured (GEMINI_API_KEY or OPENAI_API_KEY)..."`.
   - Produces a grounded answer from verified SQLite and document records without failing.

---

## 5. Whether an LLM Provider is Configured

- **In Code:** **Yes.** Handlers for Google Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-5-haiku-20241022`), and an offline test provider are fully coded with 15-second timeouts and automatic fallback.
- **In Environment:** **No.** Neither `GEMINI_API_KEY` nor `OPENAI_API_KEY` is currently defined in `backend/.env` or system shell environment variables.

---

## 6. Files and Functions Responsible for Each Module

| Subsystem | File Path | Key Functions / Entities |
|:---|:---|:---|
| **RAG Ingestion** | `backend/app/document_store.py` | `DocumentStore._load_documents()`, `_ingest_pdf()`, `_ingest_txt()`, `search_evidence()` |
| **Copilot & LLM Engine** | `backend/app/copilot_service.py` | `generate_llm_synthesis()`, `query_copilot_evidence_async()`, `score_asset_relevance()`, `extract_keywords()` |
| **API Endpoints** | `backend/app/main.py` | `ask_copilot()`, `get_asset_heartbeat()`, `record_inspection()`, `verify_inspection()` |
| **Data Models & Schemas** | `backend/app/models.py`<br>`backend/app/schemas.py` | `Asset`, `Inspection`, `CopilotAskRequest`, `CopilotAskResponse`, `EvidenceItem` |
| **Frontend UI** | `frontend/src/pages/CopilotPlaceholder.jsx` | `MarkdownAnswer`, `renderInlineContent`, `handleAsk`, `handleSampleClick` |
| **Automated Tests** | `backend/tests/test_rag_pipeline.py` | 8 test functions covering known findings, no-evidence handling, error failover, deduplication, and cross-asset isolation. |

---

## 7. Actual Test Results

Executed with `./backend/venv/bin/pytest backend/tests/test_rag_pipeline.py -v`:

```text
============================= test session starts ==============================
platform darwin -- Python 3.14.6, pytest-9.1.1, pluggy-1.6.0
rootdir: /Users/vasanthkumarsv/Desktop/AAYAM PROJECT/backend
collected 8 items

tests/test_rag_pipeline.py::test_1_chambal_wtp_known_finding PASSED      [ 12%]
tests/test_rag_pipeline.py::test_2_mandovi_bridge_findings PASSED        [ 25%]
tests/test_rag_pipeline.py::test_3_no_supporting_evidence_honest_handling PASSED [ 37%]
tests/test_rag_pipeline.py::test_4_missing_llm_credentials_fallback PASSED [ 50%]
tests/test_rag_pipeline.py::test_5_llm_provider_error_and_timeout_failover PASSED [ 62%]
tests/test_rag_pipeline.py::test_6_citation_deduplication_and_section_accuracy PASSED [ 75%]
tests/test_rag_pipeline.py::test_7_no_cross_asset_evidence_contamination PASSED [ 87%]
tests/test_rag_pipeline.py::test_8_grounded_llm_synthesis_activation PASSED [100%]

======================== 8 passed in 0.45s =========================
```

---

## 8. Exact Next Steps to Complete Milestone 2

1. **Restart the Backend Daemon**:
   - Restart the Uvicorn process so the live HTTP endpoint (`http://127.0.0.1:8000/api/copilot/ask`) immediately serves the latest async changes and citation deduplication.
2. **Add an External LLM Key to `backend/.env`**:
   - Provide either a Google Gemini key (`GEMINI_API_KEY=...`) or OpenAI key (`OPENAI_API_KEY=...`) to transition from `retrieval_only_fallback` to live `llm_grounded_rag`.
3. **Verify in Browser**:
   - Submit sample prompts in the Copilot UI (`http://127.0.0.1:5173/copilot`) and verify the active pipeline badge switches to `llm_grounded_rag (Google Gemini)` or `llm_grounded_rag (OpenAI)`.
