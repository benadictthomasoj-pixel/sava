# AAYAM Phase 1.2 — Evidence Retrieval and Recommendation Integrity Fix Report

**Project:** AAYAM — AI-Powered Public Infrastructure Intelligence Layer  
**Phase:** 1.2 — Evidence Retrieval & Recommendation Integrity  
**Date:** October 23, 2026  
**Status:** Complete & Fully Verified  

---

## Executive Summary

Phase 1.2 resolved the three architectural findings identified in `AAYAM_PHASE_1_1_EVIDENCE_REVIEW.md` regarding retrieval leakage, ungrounded maintenance recommendations, and multi-asset query handling. All fixes were strictly implemented within backend evidence scoring and copilot query routing without modifying database schemas, authentication, RBAC, live database records, or frontend localization.

All test suites and production builds pass with 100% success:
- **Phase 1.2 Targeted Regression Suite:** 16 passed, 0 failed (100%)
- **Complete Backend Test Suite:** 77 passed, 0 failed (100%)
- **Complete Frontend Test Suite:** 173 passed, 0 failed (100%)
- **Frontend Production Build:** Clean build in 472ms via Vite v8.3.4

---

## Detailed Implementation of Fixes

### Fix 1 — Block Irrelevant Evidence from Asset-Scoping Bonuses
- **Problem Addressed:** Queries containing an explicit asset ID or entity trigger (e.g., `"What is the weather around ASSET-BRG-001?"`) previously received a +35 point asset bonus in `document_store.py`. Because the document chunks themselves contained `"Asset ID: ASSET-BRG-001"`, the asset ID was treated as a topical token match, falsely crossing `min_score` and returning the underwater scour report for a weather question.
- **Implementation in `backend/app/document_store.py`:**
  1. **Topical Token Sanitization:** Alphanumeric asset identifiers (`r"^(?:asset|test|mvp)-[a-z0-9-]+$"`) are stripped from `topical_tokens`, ensuring the asset ID string does not double as a topical subject match.
  2. **Mandatory Topical Pre-Qualification:** A document chunk must satisfy `has_topical_relevance = (matched_tokens >= 1) or domain_matched` before it can qualify for retrieval.
  3. **Conditional Ranking Bonus:** The `target_asset_id` match is preserved as a ranking signal (+35.0 points) **strictly after** topical relevance is established.
  4. **Honest Fallback:** If zero topical tokens match, the document chunk receives 0.0 points and is rejected, returning the existing honest no-evidence fallback.

### Fix 2 — Make Structured Recommendations Consistent with Evidence
- **Problem Addressed:** Previously, `copilot_service.py` injected category-agnostic fallback maintenance recommendations (e.g., pump descaling, silt clearance) based on generic asset status strings. This resulted in bridges (e.g., Mandovi River Estuary Bridge) receiving mechanical pump maintenance instructions.
- **Implementation in `backend/app/copilot_service.py`:**
  1. **Removed Category-Agnostic Status Template:** Replaced the static status-based recommendation generator with grounded evidence extraction.
  2. **Category-Aware Inspection Grounding:** Recommendations from recorded field inspections (`asset.inspections`) are validated against the asset category (e.g., bridge assets reject mechanical pump/clarifier/sluice actions; non-bridge assets reject underwater scour/rip-rap/pier actions).
  3. **Document Audit Grounding:** Concrete engineering recommendations are extracted directly from retrieved document passages matching `r"(?:Recommendation|RECOMMENDED INTERVENTIONS?):\s*(.+)"`.
  4. **Strict Grounding Contract:** If neither inspection records nor retrieved document chunks contain validated recommendations, `response.recommendations` returns an empty list (`[]`) rather than fabricated instructions.
  5. **Narrative Consistency:** Deterministic synthesis ensures that narrative answers, structured recommendations, and citations align without contradiction.

### Fix 3 — Retrieve Evidence for Multiple Explicitly Identified Assets
- **Problem Addressed:** Comparative queries (e.g., comparing Mandovi Bridge and Chambal WTP in Tamil) previously extracted only the first matched asset, dropping the second asset or suffering cross-asset document leakage.
- **Implementation in `backend/app/multilingual.py` & `backend/app/copilot_service.py`:**
  1. **Multi-Asset Extraction (`extract_all_candidate_asset_ids`):** Added regex and Indic entity resolution capable of identifying multiple asset candidates across Tamil, Hindi, Telugu, Malayalam, Kannada, and direct asset ID strings (`\b(?:ASSET|TEST|MVP)-[A-Z0-9]+-\d+\b`).
  2. **Multi-Asset Scoring (`score_asset_relevance`):** Updated scoring to accept `candidate_asset_ids: Optional[List[str]] = None`, awarding high-confidence alignment (+85 points) to all matched entities in comparative inquiries.
  3. **Independent Per-Asset Evidence Retrieval:** Up to 2 target assets are resolved and queried independently against `evidence_store.search_evidence` with bounded limits (`per_asset_limit = 2`).
  4. **Strict Asset Attribution:** Each retrieved document chunk remains strictly bound to its verified `asset_id` and source metadata.
  5. **Explicit Evidence Gap Reporting:** If an identified asset has zero indexed engineering audit documents (e.g., `ASSET-CNL-004` or unregistered candidate IDs), `observed_facts` explicitly records `"[Ref Evidence Gap - {asset_id}] Evidence Gap: No indexed engineering audit documents found for {asset_name}; grounded in telemetry and field inspection records."` rather than filling the gap with records from another asset.

---

## Regression Matrix

| Finding / Requirement | Source / Risk | Test Identifier | Verification Result |
| :--- | :--- | :--- | :--- |
| **Fix 1.1** Weather question with bridge asset ID must not retrieve scour audit | Finding 1: Asset-scoping bonus qualification without topical match | `test_fix1_weather_query_with_explicit_asset_id_does_not_retrieve_scour_audit` | **PASSED** (0 document chunks returned; honest fallback returned) |
| **Fix 1.2** Relevant Tamil bridge-scour query with asset ID retrieves correct evidence | Requirement: Preserve valid Tamil retrieval and asset ranking | `test_fix1_relevant_tamil_bridge_scour_with_asset_id_retrieves_correct_evidence` | **PASSED** (Mandovi scour audit retrieved with correct asset ID) |
| **Fix 1.3** Zero topical match returns 0 document evidence even with target asset match | Requirement: Pure asset match cannot bypass topical requirement | `test_fix1_no_topical_match_returns_zero_document_evidence_even_with_target_asset` | **PASSED** (Direct `search_evidence` returns `[]`) |
| **Fix 1.4** English and Indic retrieval continue working | Baseline preservation | `test_english_queries_continue_to_function_identically` | **PASSED** (Full parity with existing English pipeline) |
| **Fix 2.1** Bridge response cannot receive irrelevant pump maintenance recommendations | Finding 2: Bridge receiving pump/silt recommendations | `test_fix2_bridge_response_cannot_receive_pump_maintenance_recommendations` | **PASSED** (Zero mechanical/pump recommendations in bridge response) |
| **Fix 2.2** Water treatment asset receives grounded recommendations | Requirement: Category-aligned grounded recommendations | `test_fix2_water_treatment_asset_receives_grounded_pump_recommendation` | **PASSED** (Vibration isolation & dynamic balancing recommendations present) |
| **Fix 2.3** Unsupported evidence produces no fabricated recommendations | Requirement: Fallback to empty list when ungrounded | `test_fix2_narrative_and_structured_recommendations_consistency` | **PASSED** (`recommendations == []` when no evidence exists) |
| **Fix 2.4** Narrative answers and citations do not contradict | Requirement: Cross-field consistency | `test_fix2_narrative_and_structured_recommendations_consistency` | **PASSED** (Facts, citations, and recommendations aligned) |
| **Fix 3.1** Multi-asset comparison retrieves evidence for both assets | Finding 3: Second asset dropped in comparative query | `test_fix3_tamil_comparison_retrieves_both_assets_independently` | **PASSED** (Both Mandovi and Chambal retrieved in single query) |
| **Fix 3.2** Correct asset IDs and document boundaries on returned evidence | Requirement: Document provenance strictly preserved | `test_fix3_tamil_comparison_retrieves_both_assets_independently` | **PASSED** (Mandovi chunks bound to `ASSET-BRG-001`, Chambal to `ASSET-WTP-002`) |
| **Fix 3.3** Missing document for one asset reports evidence gap not filled by other | Requirement: No evidence substitution across assets | `test_fix3_missing_document_for_one_asset_reports_evidence_gap_not_filled_by_other` | **PASSED** (Evidence Gap reported for asset without documents; no contamination) |
| **Fix 3.4** Existing cross-asset contamination prevention continues to pass | Baseline preservation | `test_cross_asset_contamination_prevented_in_tamil_query` & `test_7_no_cross_asset_evidence_contamination` | **PASSED** (Zero cross-asset leakage) |

---

## Exact Changed Files

1. **`backend/app/document_store.py`**:
   - Filtered alphanumeric asset identifiers from `topical_tokens` (`r"^(?:asset|test|mvp)-[a-z0-9-]+$"`).
   - Enforced `has_topical_relevance = (matched_tokens >= 1) or domain_matched` as a mandatory pre-condition before scoring or applying asset bonuses.
   - Preserved `target_asset_id` match as a post-qualification ranking bonus (+35.0 points).

2. **`backend/app/multilingual.py`**:
   - Added `extract_all_candidate_asset_ids(query: str) -> List[str]` to identify all explicit asset identifiers and Indic script entity mentions in comparative questions.
   - Updated `normalize_multilingual_query` to collect entity keywords across all recognized assets while preserving existing function signatures.

3. **`backend/app/copilot_service.py`**:
   - Updated `score_asset_relevance()` to accept `candidate_asset_ids` and evaluate multi-asset alignment.
   - Refactored `query_copilot_evidence_async()`:
     - Multi-asset resolution for up to 2 distinct target assets with independent document retrieval.
     - Removed category-agnostic status recommendation generator.
     - Implemented category-validated inspection grounding and document passage recommendation parsing.
     - Added explicit evidence gap reporting in `observed_facts` when an asset lacks indexed engineering documents.
     - Updated deterministic mock LLM synthesis for comparative Tamil queries.

4. **`backend/tests/test_multilingual_copilot.py`**:
   - Added 8 targeted regression tests for Fix 1, Fix 2, and Fix 3.
   - Verified that all 16 tests in the module pass.

---

## Safety and Scope Compliance

- **Authentication & RBAC:** No modifications made to auth, JWT, or role enforcement.
- **Database Schema & Data:** Zero schema migrations, table alters, or live DB record modifications performed.
- **Demo Mode Isolation:** Demo mode remains completely offline and client-side isolated.
- **Probability Scores:** Retrieval scores remain heuristic ranking points (0–100 scale), never calibrated probability percentages.
- **Integrity:** Zero fabricated citations or hallucinated engineering instructions.

---

## Verification Summary

| Suite / Build Step | Total Tests | Passed | Failed | Execution Time |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1.2 Targeted Tests** (`test_multilingual_copilot.py`) | 16 | 16 | 0 | 37.31s |
| **Complete Backend Suite** (`backend/tests/`) | 77 | 77 | 0 | 75.36s |
| **Complete Frontend Suite** (`npm test -- --run`) | 173 | 173 | 0 | 1.86s |
| **Frontend Production Build** (`npm run build`) | N/A | **Clean Build** | 0 errors | 472ms |

AAYAM Phase 1.2 is complete and ready for review.
