# AAYAM Backend API (Prototype)

AI-Powered Public Infrastructure Intelligence Layer — Backend Service.

## Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Virtual environment (`venv`)

## Setup & Running

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create virtual environment (if not already done)
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Run the database seed script directly
python -m app.seed

# 5. Start the FastAPI development server
uvicorn app.main:app --reload --port 8000
```

The server will start at `http://localhost:8000`.
Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

## Available Endpoints

- `GET /` — Root service information & prototype disclaimer
- `GET /api/health` — Health check, database connectivity, asset count
- `GET /api/assets` — List infrastructure assets (supports `?category=`, `?status=`, `?district=`, `?search=`)
- `GET /api/assets/{asset_id}` — Single asset detail with Digital Heartbeat risk metrics
- `GET /api/assets/summary/stats` — High-level metric aggregation for dashboard stat cards
- `POST /api/copilot/ask` — Evidence-grounded inquiry answering grounded in SQLite asset records


## Important Notice
All records served by this prototype are mock/synthetic sample records generated for demonstration purposes during the hackathon. Never use this prototype for operational life-safety or real-world dispatch decisions.
