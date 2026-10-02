import hmac
import os
import sqlite3
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse

import reference_database as database


BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
SERVICE_SECRET = os.getenv("PYTHON_SERVICE_SECRET", "")
MAX_IMAGE_BYTES = 10 * 1024 * 1024

app = FastAPI(title="VisionQC Internal Reference Image Service", docs_url=None, redoc_url=None, openapi_url=None)


def verify_service_secret(x_service_secret: str | None):
    if not SERVICE_SECRET or not x_service_secret or not hmac.compare_digest(
        SERVICE_SECRET, x_service_secret
    ):
        raise HTTPException(status_code=401, detail="Internal service authentication failed")


def parse_uuid(value: str):
    try:
        return str(UUID(value))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=404, detail="Reference session not found")


def map_error(error: Exception):
    if isinstance(error, LookupError):
        raise HTTPException(status_code=404, detail=str(error))
    if isinstance(error, FileExistsError):
        raise HTTPException(status_code=409, detail=str(error))
    if isinstance(error, PermissionError):
        raise HTTPException(status_code=409, detail=str(error))
    if isinstance(error, sqlite3.IntegrityError):
        raise HTTPException(status_code=409, detail="This image number has already been saved")
    if isinstance(error, ValueError):
        raise HTTPException(status_code=400, detail=str(error))
    raise HTTPException(status_code=500, detail="Unable to process reference image")


@app.get("/health")
def health():
    return {"success": True, "service": "reference-images"}


@app.post("/internal/reference-sessions")
def create_session(payload: dict, x_service_secret: str | None = Header(default=None)):
    verify_service_secret(x_service_secret)
    try:
        session = database.create_session(
            str(payload.get("session_id", "")),
            int(payload.get("product_id", 0)),
            int(payload.get("user_id", 0)),
        )
        return {"success": True, "session": session}
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail="Invalid session information") from error
    except Exception as error:
        if "UNIQUE constraint failed" in str(error):
            raise HTTPException(status_code=409, detail="Session already exists") from error
        raise HTTPException(status_code=500, detail="Unable to create reference session") from error


@app.post("/internal/reference-sessions/{session_id}/images")
def upload_image(
    session_id: str,
    product_id: int = Form(...),
    image_number: int = Form(...),
    image: UploadFile = File(...),
    x_service_secret: str | None = Header(default=None),
):
    verify_service_secret(x_service_secret)
    session_id = parse_uuid(session_id)
    if image.content_type != "image/jpeg":
        raise HTTPException(status_code=415, detail="Only JPEG images are accepted")
    try:
        image_bytes = image.file.read(MAX_IMAGE_BYTES + 1)
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")
        metadata = database.save_image(session_id, product_id, image_number, image_bytes)
        session = database.get_session(session_id)
        return {"success": True, "image": metadata, "captured_images": session["captured_images"]}
    except HTTPException:
        raise
    except Exception as error:
        map_error(error)
    finally:
        image.file.close()


@app.get("/internal/reference-sessions/{session_id}")
def get_session(session_id: str, x_service_secret: str | None = Header(default=None)):
    verify_service_secret(x_service_secret)
    session = database.get_session(parse_uuid(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Reference session not found")
    return {"success": True, "session": session}


@app.get("/internal/reference-sessions")
def list_product_sessions(product_id: int, x_service_secret: str | None = Header(default=None)):
    verify_service_secret(x_service_secret)
    if product_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    return {"success": True, "sessions": database.list_product_sessions(product_id)}


@app.post("/internal/reference-sessions/{session_id}/complete")
def complete_session(session_id: str, x_service_secret: str | None = Header(default=None)):
    verify_service_secret(x_service_secret)
    try:
        session = database.complete_session(parse_uuid(session_id))
        if not session:
            raise HTTPException(status_code=404, detail="Reference session not found")
        return {"success": True, "session": session}
    except HTTPException:
        raise
    except Exception as error:
        map_error(error)


@app.post("/internal/reference-sessions/{session_id}/cancel")
def cancel_session(session_id: str, x_service_secret: str | None = Header(default=None)):
    verify_service_secret(x_service_secret)
    session = database.cancel_session(parse_uuid(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Reference session not found")
    return {"success": True, "session": session}


@app.get("/internal/reference-sessions/{session_id}/images/{image_id}/file")
def get_image(session_id: str, image_id: int, x_service_secret: str | None = Header(default=None)):
    verify_service_secret(x_service_secret)
    session_id = parse_uuid(session_id)
    path = database.get_image_file(session_id, image_id)
    if not path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/jpeg")
