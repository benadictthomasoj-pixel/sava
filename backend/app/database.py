from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

import sqlite3

# For SQLite, check_same_thread=False is needed for multi-threaded FastAPI handlers
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    """
    Enforces SQLite foreign key constraints for all SQLite connections.
    SQLite has foreign-key constraints disabled by default unless PRAGMA foreign_keys=ON is executed per connection.
    """
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema_compatibility(target_engine=None):
    """
    Ensures existing SQLite databases have all required tables and columns without resetting data.
    Safely creates the 'users' table if missing, and preserves existing assets, inspections, and evidence.
    """
    from sqlalchemy import text
    eng = target_engine or engine
    try:
        # Non-destructively creates any newly defined tables (users, asset_media, evidence_sources, asset_findings)
        Base.metadata.create_all(bind=eng)
        with eng.connect() as conn:
            tables = [r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()]
            if "assets" in tables:
                asset_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(assets)")).fetchall()]
                if "ownership_authority" not in asset_cols:
                    conn.execute(text("ALTER TABLE assets ADD COLUMN ownership_authority VARCHAR(200) DEFAULT 'State Public Works Department (PWD)'"))
                    conn.commit()
            if "inspections" in tables:
                cols = [r[1] for r in conn.execute(text("PRAGMA table_info(inspections)")).fetchall()]
                if "verification_outcome" not in cols:
                    conn.execute(text("ALTER TABLE inspections ADD COLUMN verification_outcome VARCHAR(50)"))
                    conn.commit()
    except Exception as e:
        # Pass gracefully if not SQLite or during unit test setup
        pass



def get_db():
    """FastAPI dependency for yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
