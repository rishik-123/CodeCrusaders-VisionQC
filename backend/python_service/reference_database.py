import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from image_processor import inspect_jpeg


SERVICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SERVICE_DIR.parent
DATABASE_PATH = BACKEND_DIR / "database" / "reference_images.db"
STORAGE_ROOT = BACKEND_DIR / "storage" / "reference_images"
TOTAL_IMAGES = 20


@contextmanager
def connect():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS reference_sessions (
                id TEXT PRIMARY KEY,
                product_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                total_images INTEGER NOT NULL DEFAULT 20 CHECK(total_images = 20),
                captured_images INTEGER NOT NULL DEFAULT 0 CHECK(captured_images BETWEEN 0 AND 20),
                status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
                    CHECK(status IN ('IN_PROGRESS', 'COMPLETE', 'CANCELLED')),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS reference_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                image_number INTEGER NOT NULL CHECK(image_number BETWEEN 1 AND 20),
                image_path TEXT NOT NULL,
                image_filename TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                file_size INTEGER NOT NULL,
                sharpness_score REAL NOT NULL,
                captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES reference_sessions(id),
                UNIQUE(session_id, image_number)
            );

            CREATE INDEX IF NOT EXISTS idx_reference_sessions_product
                ON reference_sessions(product_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_reference_images_session
                ON reference_images(session_id, image_number);
            """
        )


def _image_dict(row):
    return dict(row) if row else None


def get_session(session_id: str):
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM reference_sessions WHERE id = ?", (session_id,)
        ).fetchone()
        if not row:
            return None
        session = dict(row)
        session["images"] = [
            dict(image)
            for image in connection.execute(
                "SELECT * FROM reference_images WHERE session_id = ? ORDER BY image_number",
                (session_id,),
            ).fetchall()
        ]
        return session


def list_product_sessions(product_id: int):
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT s.*, COUNT(i.id) AS image_count
            FROM reference_sessions s
            LEFT JOIN reference_images i ON i.session_id = s.id
            WHERE s.product_id = ?
            GROUP BY s.id
            ORDER BY s.created_at DESC
            """,
            (product_id,),
        ).fetchall()
        return [
            {**dict(row), "captured_images": row["image_count"]}
            for row in rows
        ]


def create_session(session_id: str, product_id: int, user_id: int):
    parsed_id = str(uuid.UUID(session_id))
    if product_id <= 0 or user_id <= 0:
        raise ValueError("Product and user IDs must be positive integers")
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO reference_sessions(id, product_id, user_id, total_images)
            VALUES (?, ?, ?, ?)
            """,
            (parsed_id, product_id, user_id, TOTAL_IMAGES),
        )
    return get_session(parsed_id)


def save_image(session_id: str, product_id: int, image_number: int, image_bytes: bytes):
    if image_number < 1 or image_number > TOTAL_IMAGES:
        raise ValueError("Image number must be between 1 and 20")
    metrics = inspect_jpeg(image_bytes)
    with connect() as connection:
        session = connection.execute(
            "SELECT * FROM reference_sessions WHERE id = ?", (session_id,)
        ).fetchone()
        if not session:
            raise LookupError("Reference session not found")
        if session["status"] != "IN_PROGRESS":
            raise PermissionError("This reference session is not in progress")
        if session["product_id"] != product_id:
            raise PermissionError("Product does not match this reference session")
        if connection.execute(
            "SELECT 1 FROM reference_images WHERE session_id = ? AND image_number = ?",
            (session_id, image_number),
        ).fetchone():
            raise FileExistsError("This image number has already been saved")

        directory = STORAGE_ROOT / f"product_{product_id}" / f"session_{session_id}"
        directory.mkdir(parents=True, exist_ok=True)
        filename = f"image_{image_number:02d}.jpg"
        target = directory / filename
        temporary = directory / f".{filename}.{uuid.uuid4().hex}.tmp"
        relative_path = target.relative_to(BACKEND_DIR).as_posix()
        now = datetime.now(timezone.utc).isoformat()
        target_created = False

        try:
            with temporary.open("xb") as image_file:
                image_file.write(image_bytes)
                image_file.flush()
                os.fsync(image_file.fileno())
            # Never replace an earlier capture, even if a stale file exists.
            if target.exists():
                raise FileExistsError("The image file already exists")
            os.link(temporary, target)
            target_created = True
            temporary.unlink()
            cursor = connection.execute(
                """
                INSERT INTO reference_images(
                    session_id, product_id, image_number, image_path,
                    image_filename, width, height, file_size, sharpness_score, captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id, product_id, image_number, relative_path, filename,
                    metrics.width, metrics.height, metrics.file_size,
                    metrics.sharpness_score, now,
                ),
            )
            connection.execute(
                "UPDATE reference_sessions SET captured_images = captured_images + 1 WHERE id = ?",
                (session_id,),
            )
            row = connection.execute(
                "SELECT * FROM reference_images WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            connection.commit()
            return dict(row)
        except Exception:
            connection.rollback()
            temporary.unlink(missing_ok=True)
            # Remove the file unless the metadata transaction committed successfully.
            if target_created and target.exists() and not connection.execute(
                "SELECT 1 FROM reference_images WHERE session_id = ? AND image_number = ?",
                (session_id, image_number),
            ).fetchone():
                target.unlink(missing_ok=True)
            raise


def complete_session(session_id: str):
    with connect() as connection:
        session = connection.execute(
            "SELECT total_images, status FROM reference_sessions WHERE id = ?", (session_id,)
        ).fetchone()
        if not session:
            return None
        count = connection.execute(
            "SELECT COUNT(*) FROM reference_images WHERE session_id = ?", (session_id,)
        ).fetchone()[0]
        if session["status"] != "IN_PROGRESS" or count != TOTAL_IMAGES:
            raise ValueError("A session can only be completed after all 20 images are saved")
        connection.execute(
            "UPDATE reference_sessions SET status = 'COMPLETE', captured_images = ?, completed_at = ? WHERE id = ?",
            (count, datetime.now(timezone.utc).isoformat(), session_id),
        )
    return get_session(session_id)


def cancel_session(session_id: str):
    with connect() as connection:
        result = connection.execute(
            "UPDATE reference_sessions SET status = 'CANCELLED' WHERE id = ? AND status = 'IN_PROGRESS'",
            (session_id,),
        )
        if result.rowcount == 0:
            existing = connection.execute(
                "SELECT * FROM reference_sessions WHERE id = ?", (session_id,)
            ).fetchone()
            return dict(existing) if existing else None
    return get_session(session_id)


def get_image_file(session_id: str, image_id: int):
    with connect() as connection:
        row = connection.execute(
            "SELECT image_path FROM reference_images WHERE id = ? AND session_id = ?",
            (image_id, session_id),
        ).fetchone()
    if not row:
        return None
    path = (BACKEND_DIR / row["image_path"]).resolve()
    if STORAGE_ROOT.resolve() not in path.parents or not path.is_file():
        return None
    return path


initialize_database()
