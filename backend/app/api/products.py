import os
import hashlib
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from PIL import Image

from backend.app.config import BASE_DIR, UPLOADS_DIR, settings
from backend.app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductSettingsUpdate,
    ProductSettingsResponse,
    ReferenceImageResponse
)
from backend.app.database.repositories import ProductRepository, ReferenceRepository

router = APIRouter(prefix="/api/products", tags=["Products"])

def get_hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Create a new product")
def create_product(payload: ProductCreate):
    existing = ProductRepository.get_by_name(payload.name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with name '{payload.name}' already exists.")
    return ProductRepository.create(name=payload.name, description=payload.description)

@router.get("", response_model=List[ProductResponse], summary="List all products")
def list_products():
    return ProductRepository.list_all()

@router.get("/{product_id}", response_model=ProductResponse, summary="Get product details")
def get_product(product_id: int):
    p = ProductRepository.get_by_id(product_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    return p

@router.post("/{product_id}/references", summary="Upload good reference images for product onboarding")
async def upload_references(product_id: int, files: List[UploadFile] = File(...)):
    product = ProductRepository.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    prod_ref_dir = UPLOADS_DIR / "reference" / str(product_id)
    prod_ref_dir.mkdir(parents=True, exist_ok=True)

    uploaded_records = []
    skipped_duplicates = 0

    for file in files:
        data = await file.read()
        if not data:
            continue

        chk = get_hash_bytes(data)
        if ReferenceRepository.exists_by_checksum(product_id, chk):
            skipped_duplicates += 1
            continue

        # Validate image integrity
        try:
            from io import BytesIO
            with Image.open(BytesIO(data)) as img:
                w, h = img.size
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file '{file.filename}': {str(e)}")

        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".png"
        if not ext:
            ext = ".png"
        saved_name = f"ref_{chk[:12]}{ext}"
        saved_path = prod_ref_dir / saved_name

        with open(saved_path, "wb") as f:
            f.write(data)

        rec = ReferenceRepository.add(
            product_id=product_id,
            filename=file.filename or saved_name,
            image_path=str(saved_path).replace("\\", "/"),
            checksum=chk,
            width=w,
            height=h
        )
        uploaded_records.append(rec)

    # Update product reference count and status
    total_refs = ReferenceRepository.count_by_product(product_id)
    status_label = "COLLECTING_REFERENCES" if total_refs < settings.min_reference_images else product["model_status"]
    ProductRepository.update_status(product_id, status=status_label)
    ProductRepository.increment_reference_count(product_id, count=0)  # updates updated_at

    return {
        "product_id": product_id,
        "uploaded_count": len(uploaded_records),
        "skipped_duplicates": skipped_duplicates,
        "total_references": total_refs,
        "minimum_required": settings.min_reference_images,
        "is_ready_for_training": total_refs >= settings.min_reference_images
    }

@router.get("/{product_id}/references", response_model=List[ReferenceImageResponse], summary="List uploaded reference images")
def list_reference_images(product_id: int):
    product = ProductRepository.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    return ReferenceRepository.list_by_product(product_id)

@router.get("/{product_id}/settings", summary="Get product inspection settings")
def get_product_settings(product_id: int):
    p = ProductRepository.get_by_id(product_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    return {
        "product_id": p["id"],
        "product_name": p["name"],
        "active_threshold": p["threshold"],
        "active_version": p["active_version"],
        "model_status": p["model_status"]
    }

@router.patch("/{product_id}/settings", response_model=ProductSettingsResponse, summary="Supervisor threshold adjustment")
def update_product_settings(product_id: int, payload: ProductSettingsUpdate):
    p = ProductRepository.get_by_id(product_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    prev = p["threshold"]
    new_th = payload.threshold

    ProductRepository.update_threshold(
        product_id=product_id,
        new_threshold=new_th,
        previous_threshold=prev,
        reason=payload.reason
    )

    safety = (
        "Lower threshold -> more strict defect catching (may increase false alarms)."
        if new_th < prev else
        "Higher threshold -> more lenient inspection (may risk defect escapes)."
    )

    return {
        "product_id": product_id,
        "current_threshold": new_th,
        "previous_threshold": prev,
        "message": f"Threshold updated successfully from {prev:.4f} to {new_th:.4f}.",
        "safety_guidance": safety
    }
