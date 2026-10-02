import sqlite3
from pathlib import Path
from backend.app.config import DATABASE_PATH

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn

def init_db():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        model_status TEXT NOT NULL DEFAULT 'NOT_READY',
        active_version TEXT DEFAULT 'v1',
        model_path TEXT,
        threshold REAL DEFAULT 0.5,
        reference_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        image_path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        validation_status TEXT DEFAULT 'VALID',
        width INTEGER,
        height INTEGER,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS model_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        version TEXT NOT NULL,
        model_path TEXT NOT NULL,
        threshold REAL NOT NULL,
        reference_count INTEGER NOT NULL,
        validation_metrics TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        product_id INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        heatmap_path TEXT,
        overlay_path TEXT,
        anomaly_score REAL NOT NULL,
        threshold REAL NOT NULL,
        decision TEXT NOT NULL,
        processing_time_ms REAL NOT NULL,
        model_version TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id TEXT NOT NULL,
        label TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_jobs (
        id TEXT PRIMARY KEY,
        product_id INTEGER NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS threshold_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        previous_threshold REAL NOT NULL,
        new_threshold REAL NOT NULL,
        changed_by TEXT DEFAULT 'supervisor',
        reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS drift_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        metric_name TEXT NOT NULL,
        observed_value REAL NOT NULL,
        baseline_value REAL NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()
