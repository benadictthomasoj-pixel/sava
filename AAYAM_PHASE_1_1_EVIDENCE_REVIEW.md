# AAYAM Phase 1.1 — Multilingual Evidence Integrity Review Report

**Date of Audit**: 2026-10-23  
**Auditor**: Senior Full-Stack Engineer & AI/RAG Systems Auditor  
**Scope**: Code and evidence integrity verification for Phase 1 Multilingual Copilot updates.  
**Inspected Assets & Files**:
- `backend/app/multilingual.py`
- `backend/app/copilot_service.py`
- `backend/app/document_store.py`
- `backend/tests/test_multilingual_copilot.py`
- `backend/data/evidence/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`
- SQLite Asset Registry Database (`backend/aayam.db`)
- `frontend/src/pages/CopilotPlaceholder.jsx`

---

## Executive Summary

This independent integrity audit investigated every claim, citation, measurement, retrieval score, normalization rule, and isolation boundary resulting from the Phase 1 Multilingual Copilot implementation.

All primary engineering metrics cited in the Tamil Copilot response (**2.4 m scour depth**, **65 cm baseline exceedance**, **48 mm expansion-joint gap**, and **tendon micro-fractures**) were **100% verified** against the original certified PDF document (`Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`, Pages 1 & 2). 

However, two important systemic risks were discovered in the existing retrieval logic:
1. **Target Asset Scoping False-Positive Leak (Check 6 - FAIL)**: When `target_asset_id` is passed, `document_store.py` assigns a +35.0 score bonus and sets `has_explicit_target=True`. Because `min_score` is 25.0, document chunks of that asset will be returned on completely unrelated queries (e.g. asking about weather with an asset selected in the scope dropdown), even when `matched_tokens == 0`.
2. **Metadata vs. Document Recommendation Divergence (Check 3 - DISCREPANCY)**: The structured API response field `response.recommendations` uses a static category-agnostic template based solely on `asset.status` (emitting a pump-maintenance message for a bridge), whereas the synthesized text (`### பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்`) accurately extracted the true engineering actions from the PDF.

A total of **69 backend tests** and **173 frontend tests** were executed and confirmed **100% passing**.

---

## Detailed Audit Findings by Check

### Check 1 — Claim-by-Claim Citation Provenance
- **Status**: **PASS**
- **Location**: `backend/data/evidence/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf` (Pages 1 & 2), SQLite Asset `ASSET-BRG-001`.
- **Evidence**:
  - **Claim 1**: *High-resolution multi-beam bathymetry survey revealed sub-surface scour hole depth of 2.4 meters beneath Pier 4 concrete footing.*
    - **Source**: `Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`, Page 1, lines 6–8: `"High resolution multi-beam bathymetry survey revealed sub-surface scour hole depth of 2.4 meters beneath the concrete footing of Pier 4"`.
    - **Citation Tag**: `[Ref 2]` correctly points to Page 1.
  - **Claim 2**: *Scour depth exceeds permissible baseline tolerance by 65 cm.*
    - **Source**: `Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`, Page 1, line 9: `"Scour depth exceeds permissible baseline tolerance by 65 cm."`.
    - **Citation Tag**: `[Ref 2]` correctly points to Page 1.
  - **Claim 3**: *Expansion joint gap measured at 48mm exceeding 25mm design limit.*
    - **Source**: `Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`, Page 2, line 3: `"Expansion joint gap measured at 48mm exceeding 25mm design limit"`.
    - **Citation Tag**: `[Ref 3]` correctly points to Page 2.
  - **Claim 4**: *Ultrasonic flaw detection indicates micro-fractures in tendon anchorage near Pier 5 cap beam.*
    - **Source**: `Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`, Page 2, line 4: `"Ultrasonic flaw detection indicates micro-fractures in tendon anchorage near Pier 5 cap beam"`.
    - **Citation Tag**: `[Ref 3]` correctly points to Page 2.
  - **Claim 5**: *SQLite Telemetry Record (Status: Requires Inspection, AI Risk Score: 53.3/100, Health Index: 33.6%).*
    - **Source**: SQLite Asset row `ASSET-BRG-001`.
    - **Citation Tag**: `[Ref 1]` correctly points to SQLite Asset Registry.
- **Discrepancy / Risk**: None. Every factual statement in the Tamil response is grounded in empirical source files.
- **Recommended Action**: None required; citation provenance is verified.

---

### Check 2 — Numerical Metric & Invariant Verification
- **Status**: **PASS**
- **Location**: `backend/data/evidence/Mandovi_Bridge_Pier_Scour_Audit_2023.pdf` (Pages 1 & 2).
- **Evidence**:
  - `2.4 meters` / `2.4 மீ`: Verified on Page 1.
  - `65 cm` / `65 செ.மீ`: Verified on Page 1.
  - `48mm` / `48 மிமீ`: Verified on Page 2.
  - `25mm` / `25 மிமீ`: Verified on Page 2.
  - `Pier 4 & Pier 5` / `தூண் 4 மற்றும் 5`: Verified on Pages 1 and 2.
  - Tendon micro-fractures: Verified on Page 2.
- **Discrepancy / Risk**: None. The prompt engineering instructions (`STRICT INVARIANT RULES IN LOCALIZED OUTPUT`) successfully prevented the LLM from hallucinating or altering numerical units, tolerances, or pier numbers.
- **Recommended Action**: Retain invariant instructions in `copilot_service.py`.

---

### Check 3 — Recommended Actions Grounding & Distinction
- **Status**: **PASS (Answer Text)** / **FAIL (Structured Metadata Array)**
- **Location**: 
  - Synthesized text: `Mandovi_Bridge_Pier_Scour_Audit_2023.pdf`, Page 2.
  - Metadata array: `backend/app/copilot_service.py:lines 685–700`.
- **Evidence**:
  - **Documented Recommendations in Source**: Page 2 of the PDF contains:
    `"Recommendation: Emergency rip-rap boulder dumping and diver acoustic monitoring required."`
  - **In the Synthesized Tamil Text**: The Tamil response under `### பரிந்துரைக்கப்படும் பொறியியல் நடவடிக்கைகள்` cited `[Ref 3]` and correctly listed:
    1. *அவசரகால ரிப்-ராப் பவுல்டர் கொட்டுதல் (Emergency rip-rap boulder dumping)*
    2. *டைவர் ஒலியியல் கண்காணிப்பு (Diver acoustic monitoring)*
  - **In the API Response Field `response.recommendations`**:
    `["[ASSET-BRG-001] Priority: Schedule mechanical overhaul and silt descaling prior to heavy monsoon/stress cycles."]`
- **Discrepancy / Risk**:
  `response.recommendations` in the JSON response payload is generated by a hardcoded status heuristic in `copilot_service.py` lines 685–700. For any asset with `status == "Requires Inspection"`, it appends pump/silt descaling guidance regardless of whether the asset is a Bridge, Water Treatment Plant, or Highway.
- **Recommended Fix (Do Not Apply Yet)**:
  Make `response.recommendations` category-aware or extract recommendations from the actual inspection/document records rather than using a blanket status template.

---

### Check 4 — Tamil Normalization & Anti-Hallucination Integrity
- **Status**: **PASS**
- **Location**: `backend/app/multilingual.py:lines 180–230`.
- **Evidence**:
  - Evaluated query: `"இன்று சென்னையில் மழை பெய்யுமா?"` ("Will it rain in Chennai today?")
    - Script detected: `ta` (Tamil).
    - `candidate_asset_id`: `None`.
    - `expanded_keywords`: `[]`.
    - API Result: `matched_assets_count: 0`, `evidence: []`, `citations: []`.
    - Localized honest fallback returned:
      `"'இன்று சென்னையில் மழை பெய்யுமா?' உடன் பொருந்தும் உள்கட்டமைப்பு பதிவுகள் அல்லது பொறியியல் ஆவணங்கள் எதுவும் AAYAM பதிவேட்டில் கிடைக்கவில்லை."`
  - Evaluated query: `"காவேரி ஆற்றின் அணைக்கட்டு நிலை என்ன?"` ("What is the status of the Cauvery dam?")
    - `candidate_asset_id`: `None`.
    - `expanded_keywords`: `[]`.
    - API Result: `matched_assets_count: 0`, `evidence: []`. Honest fallback returned.
- **Discrepancy / Risk**: None. Removing generic words (`"நிலை"`, `"பாதுகாப்பு"`, `"விளக்கவும்"`) in Phase 1 successfully eliminated false-positive keyword triggers.
- **Recommended Action**: Keep domain keyword ontology restricted to specific engineering and hazard terminology.

---

### Check 5 — Edge Case Evaluation: Ambiguity, Unsupported Terms, and Multi-Asset Queries
- **Status**: **PASS (with documented multi-asset limitation)**
- **Location**: `backend/app/multilingual.py`, `backend/app/copilot_service.py`.
- **Evidence**:
  - **Edge Case 5A: Ambiguous generic query without asset name**
    - Query: `"பாலத்தின் பாதுகாப்பு மற்றும் ஆய்வு நிலை என்ன?"` ("What is the safety and inspection status of the bridge?")
    - Normalization: `expanded_keywords = ['audit', 'bridge']`, `candidate_asset_id = None`.
    - Result: `matched_assets_count = 2` (`ASSET-BRG-001` Mandovi Bridge and `TEST-ASSET-002` Test Bridge).
    - Retrieval: Accurately scoped to registered bridge assets without cross-category contamination.
  - **Edge Case 5B: Nonsense query**
    - Query: `"abcdef xyz 123"`
    - Normalization: `lang = en`, `candidate_asset_id = None`, `expanded_keywords = []`.
    - Result: `matched_assets_count = 0`, honest fallback returned.
  - **Edge Case 5C: Multiple assets in one query**
    - Query: `"மண்டோவி பாலம் மற்றும் சம்பல் ஆலை இரண்டையும் ஒப்பிடுக."` ("Compare Mandovi Bridge and Chambal Plant.")
    - Normalization: `candidate_asset_id = ASSET-BRG-001` (first matched entity), `expanded_keywords` contains both Mandovi and Chambal terms (`['bridge', 'chambal', 'clarifier', 'mandovi', 'pump', 'scour', 'vibration', 'wtp']`).
    - SQLite Scorer: Correctly identified both `ASSET-BRG-001` and `ASSET-WTP-002` as top matched assets.
    - Document Store: Because `search_evidence` was called with `target_asset_id = primary_asset.id` (`ASSET-BRG-001`), only Mandovi documents were fetched from the document store. Chambal documents were omitted.
- **Discrepancy / Risk**:
  In multi-asset queries, while SQLite telemetry includes both assets, document chunk retrieval is restricted to the single primary asset (`scored_assets[0]`).
- **Recommended Fix (Do Not Apply Yet)**:
  In `copilot_service.py`, allow `search_evidence` to retrieve chunks for all top-matched assets (`[a.id for a in matched_assets]`) when multiple entities are referenced in the query.

---

### Check 6 — Scoping Bonus vs. Topical Relevance
- **Status**: **FAIL**
- **Location**: `backend/app/document_store.py:lines 242–243, 270–271`.
- **Evidence**:
  - When `target_asset_id` is supplied (either via the UI asset dropdown or resolved from the query), `document_store.py` executes:
    ```python
    if target_asset_id and chunk.asset_id == target_asset_id:
        score += 35.0
    ```
  - The retention check in line 271:
    ```python
    has_explicit_target = bool(target_asset_id and chunk.asset_id == target_asset_id)
    if score >= min_score and (matched_tokens >= 1 or (chunk.asset_id and chunk.asset_id.lower() in clean_q) or has_explicit_target):
        ...
    ```
  - **Demonstrated Defect**: When querying with `target_asset_id="ASSET-BRG-001"` and an off-topic question like `"வானிலை எப்படி உள்ளது?"` ("How is the weather?"):
    - `matched_tokens = 0`
    - `score = 35.0` (which exceeds `min_score = 25.0`)
    - `has_explicit_target = True`
    - Result: Both chunks of `Mandovi_Bridge_Pier_Scour_Audit_2023.pdf` are returned with score 35.0 despite **zero topical relevance** to the query.
- **Discrepancy / Risk**:
  If a user filters by an asset in the Copilot UI dropdown and asks a question about an unindexed topic (or an off-topic question), the system retrieves the asset's audit document anyway and presents it as supporting evidence.
- **Recommended Fix (Do Not Apply Yet)**:
  Require at least one topical token match or domain keyword match even when `target_asset_id` matches:
  ```python
  # Require substantive relevance overlap in addition to asset scoping:
  if score >= min_score and (matched_tokens >= 1 or domain_matched):
      ...
  ```
  or increase `min_score` to `45.0` so that an asset bonus alone (35.0) cannot qualify a chunk without at least one token/keyword match.

---

### Check 7 — Response Contract, Frontend Provenance & Score Integrity
- **Status**: **PASS**
- **Location**: `backend/app/schemas.py`, `backend/app/copilot_service.py`, `frontend/src/pages/CopilotPlaceholder.jsx`.
- **Evidence**:
  - **Confidence Scores**: Retrieval scores are formatted on an additive points scale (`265.0 pts`, `270.0 pts`, `260.0 pts`) and are explicitly documented as heuristic relevance points rather than calibrated probabilities.
  - **Inline Citations**: Markdown links and `[Ref 1]`, `[Ref 2]`, `[Ref 3]` tags open the Evidence Viewer modal to the exact page and source file.
  - **Asset IDs**: Formatted in standard canonical format (`ASSET-BRG-001`).
  - **Frontend Rendering**: `CopilotPlaceholder.jsx` correctly presents the grounded answer, observed facts, and evidence chunks without truncating or mutating technical parameters.
- **Discrepancy / Risk**: None.
- **Recommended Action**: None required.

---

### Check 8 — Non-Regression Verification: English, Auth/RBAC, and Demo Isolation
- **Status**: **PASS**
- **Location**: Full test suite across backend and frontend.
- **Evidence**:
  - **Backend Suite**:
    ```bash
    backend/venv/bin/pytest backend/tests/ -v
    ======================== 69 passed, 1 warning in 53.26s ========================
    ```
    - `test_multilingual_copilot.py`: 8 passed
    - `test_auth_foundation.py`: 12 passed
    - `test_backend_api.py`: 24 passed
    - `test_evidence_viewer.py`: 9 passed
    - `test_rag_pipeline.py`: 12 passed
    - `test_rbac_endpoints.py`: 4 passed
  - **Frontend Suite**:
    ```bash
    npm test -- --run
    Test Files  10 passed (10)
    Tests       173 passed (173)
    Duration    1.88s
    ```
    - Demo Mode isolation tests: 100% passed with zero network requests and persistent demo banners.
    - RBAC and Auth tests: 100% passed.
    - Translations across 6 locales: 100% passed.
  - **Production Build**:
    ```bash
    npm run build
    ✓ built in 476ms with 0 errors
    ```
- **Discrepancy / Risk**: None.
- **Recommended Action**: Maintain regression test suites.

---

## Summary of Findings & Scorecard

| Check # | Requirement | Status | Key Evidence / Risk |
| :---: | :--- | :---: | :--- |
| **1** | Claim-by-Claim Citation Provenance | **PASS** | Every claim in Tamil response traced to PDF Pages 1 & 2. |
| **2** | Numerical Invariant Integrity | **PASS** | 2.4m scour, 65cm exceedance, 48mm gap, tendon flaw verified. |
| **3** | Grounded Engineering Recommendations | **PASS** (Answer)<br>**FAIL** (Metadata) | Answer text matches PDF; metadata array uses generic pump template. |
| **4** | Tamil Normalization & Anti-Hallucination | **PASS** | Non-infrastructure queries return honest fallbacks with 0 evidence. |
| **5** | Edge Cases (Ambiguity, Multi-Asset) | **PASS** | Ambiguous bridges resolved; multi-asset scopes docs to primary asset. |
| **6** | Scoping Bonus vs. Topical Relevance | **FAIL** | Asset bonus (+35 pts) leaks documents on irrelevant queries with scope. |
| **7** | Response Contract & Score Semantics | **PASS** | Points scale (>25 pts) and inline citations function correctly. |
| **8** | Non-Regression (English, RBAC, Demo) | **PASS** | 69 backend tests and 173 frontend tests passed (100%). |

---

*Phase 1.1 Review complete. No application code or database records were modified during this review. Awaiting review before proceeding.*
