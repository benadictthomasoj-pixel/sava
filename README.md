<<<<<<< HEAD
# AAYAM — AI-Powered Public Infrastructure Intelligence Layer

> **India's Public Infrastructure Intelligence Layer**
> Complete Hackathon Implementation: Geospatial Map, Evidence-Grounded RAG, Digital Heartbeat & Closed-Loop Inspection Workflow.

AAYAM connects public infrastructure records and empowers engineers, municipal administrators, and audit teams to understand **which assets require attention**, **why they are flagged**, and **what should be investigated next**.

---

## ⚠️ Important Prototype Disclaimer
All infrastructure records bundled in this project are **synthetic mock sample records** generated explicitly for local prototype testing and hackathon evaluation. They do **not** represent verified live government data or real-time IoT field sensors. Never rely on this prototype for operational life-safety or real-world emergency dispatch decisions.

---

## Implemented Milestones

- ✅ **Milestone 1 — Geospatial Map**: Clean OpenStreetMap integration requiring zero API keys, custom risk-colored HTML pins (Red: Critical, Amber: Inspection Due, Green: Operational), dynamic popups with dual-action navigation, bounds auto-recenter, and search/status filters.
- ✅ **Milestone 2 — Evidence-Grounded RAG Pipeline**: Ingestion of PDF and TXT audit documents (`pypdf`), hybrid entity & document retrieval, inline citations (`[Ref 1]`, `[Ref 2]`), strict separation of empirical facts from recommendations, and automatic fallback when LLM API keys are unconfigured.
- ✅ **Milestone 3 — Explainable Digital Heartbeat**: Dynamic multi-factor risk model (Structural 35%, Environmental 25%, Compliance 25%, Operational 15%), structural health index, data confidence scoring, and factor-level contributions.
- ✅ **Milestone 4 — Closed-Loop Workflow**: Detect &rarr; Understand &rarr; Prioritise &rarr; Intervene &rarr; Verify &rarr; Learn. SQLite `inspections` table, interactive field recording form, status progression (`Pending`, `In Progress`, `Completed`, `Verified`), outcome verification with certified notes, and live risk recalculation upon mitigation.
- ✅ **Milestone 5 — Presentation Deliverables**: Presentation-ready PowerPoint slide (`architecture/AAYAM_Technical_Architecture.pptx`), scalable vector diagram (`architecture/AAYAM_Technical_Architecture.svg`), and documentation with a 1-minute pitch script and 5 judge Q&As (`architecture/TECHNICAL_ARCHITECTURE.md`).

---

## Directory Structure

```
AAYAM PROJECT/
├── architecture/
│   ├── AAYAM_Technical_Architecture.pptx   # 16:9 PowerPoint presentation slide
│   ├── AAYAM_Technical_Architecture.svg    # Scalable vector architecture diagram
│   └── TECHNICAL_ARCHITECTURE.md          # Layer breakdown, 1-min script & judge Q&A
│
├── backend/
│   ├── app/
│   │   ├── config.py             # App configuration & environment loader
│   │   ├── database.py           # SQLite engine, sessionmaker, & Base
│   │   ├── models.py             # SQLAlchemy models (Asset & Inspection)
│   │   ├── schemas.py            # Pydantic v2 schemas for all endpoints
│   │   ├── heartbeat_engine.py   # Explainable 4-factor risk calculation engine
│   │   ├── document_store.py     # Ingestion of PDF (pypdf) & TXT audit documents
│   │   ├── copilot_service.py    # Hybrid RAG retrieval & LLM synthesis bridge
│   │   ├── seed_data.py          # Sample infrastructure records with disclaimers
│   │   ├── seed.py               # Database initialization & inspection events seeder
│   │   └── main.py               # FastAPI application with all REST endpoints
│   ├── data/
│   │   └── evidence/             # Real PDF & TXT audit reports for RAG
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/           # UI components (Sidebar, Header, StatCard, StatusBadge)
│   │   ├── pages/                # 5 full application views
│   │   │   ├── DashboardOverview.jsx
│   │   │   ├── AssetRegistry.jsx
│   │   │   ├── MapViewPlaceholder.jsx         # Fixed OpenStreetMap GIS Map
│   │   │   ├── DigitalHeartbeatPlaceholder.jsx # Heartbeat telemetry & Closed-Loop
│   │   │   └── CopilotPlaceholder.jsx         # Grounded RAG Copilot interface
│   │   ├── services/
│   │   │   └── api.js            # REST API client with error handling
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## Quick Start Guide

### 1. Start Backend API (FastAPI)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`

### 2. Start Frontend UI (React + Vite)
```bash
cd frontend
npm run dev
```
- Dashboard UI: `http://localhost:5173`

---

## Complete API Surface

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check verifying SQLite connectivity & asset count |
| `GET` | `/api/assets` | Filterable list of all public infrastructure assets |
| `GET` | `/api/assets/{asset_id}` | Detailed asset telemetry and risk scores |
| `GET` | `/api/assets/summary/stats` | High-level KPI aggregations for dashboard cards |
| `POST` | `/api/copilot/ask` | Evidence-grounded hybrid RAG inquiry with citations |
| `GET` | `/api/assets/{asset_id}/heartbeat` | Live 4-factor risk breakdown and health index |
| `GET` | `/api/assets/{asset_id}/inspections` | Inspection and intervention records for an asset |
| `POST` | `/api/assets/{asset_id}/inspections` | Record new field inspection and recommended action |
| `PATCH` | `/api/inspections/{id}` | Update action status or recorded repair |
| `POST` | `/api/inspections/{id}/verify` | Certify outcome of intervention and recalculate risk |
| `GET` | `/api/assets/{asset_id}/timeline` | Unified chronological lifecycle timeline |
=======
# AAYAM
AAYAM is an AI-powered public infrastructure intelligence platform that connects asset records, maintenance history, geospatial context, and evidence-backed risk insights.


# AAYAM — India’s Public Infrastructure Intelligence Layer

**Team:** TATTVA  
**Tagline:** Seeing Infrastructure Beyond the Surface.

## Overview

AAYAM is a proposed AI-powered decision-support platform designed to connect fragmented public infrastructure information and turn it into explainable, asset-level intelligence.

Its central concept, the **Digital Heartbeat**, provides an evidence-linked view of an asset's condition, maintenance history, potential risk indicators, and available data confidence.

AAYAM aims to help authorised officials understand which assets may require attention, why they are flagged, and what should be investigated next.

## Problem

Infrastructure records can be distributed across asset registries, inspection reports, maintenance systems, geospatial platforms, and other sources. Understanding an asset's overall condition may require connecting information across these sources.

## Proposed Solution

AAYAM brings together four capabilities:

1. **Asset Intelligence** — structured digital profiles for public assets.
2. **Risk Intelligence** — identification of potential warning signs from available evidence.
3. **Memory Intelligence** — searchable asset histories and institutional records.
4. **Decision Intelligence** — evidence-backed explanations and suggested next steps for human review.

## Core Workflow

**Detect → Understand → Prioritise → Intervene → Verify → Learn**

## Key Innovation: Digital Heartbeat

Each asset receives an interpretable status supported by available evidence, contributing factors, historical trends, and data-quality indicators. AAYAM is designed to explain risk indicators rather than present unexplained scores.

## Proposed Technology Stack

- Frontend: React and Tailwind CSS
- Geospatial visualisation: Leaflet and OpenStreetMap
- Backend: Node.js
- Database: PostgreSQL/PostGIS or MongoDB, to be finalised
- AI: evidence retrieval, document understanding, and explainable analysis
- Data exchange: APIs and GeoJSON where appropriate

## Initial Scope

The planned demonstrator will focus on a limited geographic area and selected public asset categories, such as government schools, primary healthcare facilities, and water infrastructure.

## Current Status

Concept and solution-design stage. Implementation, dataset validation, and testing will determine the final capabilities.

## Responsible Use

AAYAM is intended to support—not replace—authorised human decision-making. Risk indicators must be traceable to source evidence. Missing or outdated information must be disclosed, and integrations must respect data permissions and security requirements.

## Team

**TATTVA** — creators of AAYAM.

## Roadmap

- [ ] Validate available public datasets
- [ ] Define the common asset data model
- [ ] Build the asset registry and map
- [ ] Implement the Digital Heartbeat
- [ ] Add evidence-linked risk explanations
- [ ] Develop the decision-support interface
- [ ] Test against verified source records
- [ ] Evaluate a controlled pilot, subject to permissions

## Disclaimer

AAYAM is a proposed project. Features, partnerships, deployment status, and impact claims will be updated as they are implemented and verified.
>>>>>>> 3beb2040fd068ce2931d1c7778f57fc744833b19
