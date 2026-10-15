# AAYAM Frontend (React + Vite + Tailwind CSS)

Public Infrastructure Intelligence Layer — Interactive Web Dashboard.

## Features
- **AAYAM Branding & Modern Dark Theme** (high-contrast navy/slate UI with cyan & risk-coded telemetry accents)
- **Sidebar Navigation** with live system status badge
- **Dashboard Overview** with high-level KPI cards, network health score, and flagged asset investigation table
- **Asset Registry** with live search, category & status dropdown filters, and detailed side-drawer telemetry inspector
- **Geospatial Map (Leaflet)** with interactive status pins plotted from database coordinates
- **Digital Heartbeat Diagnostic View** explaining multidimensional risk scores (Structural, Environmental, Audit Recency, Data Confidence)
- **AI Decision Copilot (Roadmap Preview)** with grounded prototype inquiries
- **Responsive Error, Loading, and Empty States**

## Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+

## Running Locally

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`.
By default, the Vite proxy forwards `/api` requests to the FastAPI backend at `http://127.0.0.1:8000`.

## Production Build

```bash
npm run build
npm run preview
```
