import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the backend
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file if it exists
load_dotenv(BASE_DIR / ".env")

APP_NAME = os.getenv("APP_NAME", "AAYAM Infrastructure Intelligence API")
ENV = os.getenv("ENV", "development")
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Comma-separated CORS origins
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

# Default SQLite database path
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/aayam_infra.db")
