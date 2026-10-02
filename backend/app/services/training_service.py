import os
import sys
import uuid
import threading
import traceback
from pathlib import Path
from typing import Dict, Any
from fastapi import HTTPException

from backend.app.config import BASE_DIR, MODELS_DIR, DATASETS_DIR
from backend.app.database.repositories import (
    ProductRepository,
    ReferenceRepository,
    TrainingJobRepository,
    ModelVersionRepository
)
from backend.app.ml.model_manager import model_manager
from backend.scripts.train_visionqc import train_visionqc
from backend.scripts.validate_visionqc import validate_visionqc

def _async_train_worker(job_id: str, product_id: int, product_name: str, version: str, backbone: str):
    """
    Background worker that runs PatchCore training, validation, threshold selection,
    and updates database records upon completion.
    """
    try:
        # 1. Update status
        ProductRepository.update_status(product_id, status="TRAINING")

        # 2. Check reference directory
        # Use uploaded references or dataset directory
        product_ref_dir = BASE_DIR / "uploads" / "reference" / str(product_id)
        if not product_ref_dir.exists() or len(list(product_ref_dir.glob("*.png")) + list(product_ref_dir.glob("*.jpg"))) < 20:
            product_ref_dir = DATASETS_DIR / f"visionqc_{product_name}" / "reference"

        out_dir = MODELS_DIR / "product_models" / product_name / version

        # 3. Train PatchCore
        metadata = train_visionqc(
            product_name=product_name,
            reference_dir=product_ref_dir,
            output_dir=out_dir,
            version=version,
            backbone=backbone
        )

        # 4. Run validation and determine optimal threshold
        val_dir = DATASETS_DIR / f"visionqc_{product_name}" / "validation"
        thresh_info = None
        if val_dir.exists():
            thresh_info = validate_visionqc(
                product_name=product_name,
                model_dir=out_dir,
                val_dir=val_dir
            )
            threshold = float(thresh_info["threshold"])
            val_metrics = thresh_info.get("validation_metrics", {})
        else:
            threshold = 0.5
            val_metrics = {}

        model_ckpt = str((out_dir / "model.ckpt").resolve())
        ref_count = metadata.get("reference_count", 25)

        # 5. Record version and activate
        ModelVersionRepository.create(
            product_id=product_id,
            version=version,
            model_path=model_ckpt,
            threshold=threshold,
            reference_count=ref_count,
            validation_metrics=val_metrics,
            is_active=True
        )

        ProductRepository.update_status(
            product_id=product_id,
            status="READY",
            model_path=model_ckpt,
            threshold=threshold,
            active_version=version
        )

        TrainingJobRepository.update_status(job_id=job_id, status="COMPLETED")
        model_manager.invalidate(product_id)
        print(f"[SUCCESS] Training job {job_id} for product '{product_name}' completed.")

    except Exception as e:
        err = f"{str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] Training job {job_id} failed: {err}")
        ProductRepository.update_status(product_id, status="FAILED")
        TrainingJobRepository.update_status(job_id=job_id, status="FAILED", error_message=str(e))

class TrainingService:
    @staticmethod
    def start_training(product_id: int, version: str = "v1", backbone: str = "wide_resnet50_2") -> Dict[str, Any]:
        product = ProductRepository.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

        # Check references count
        uploaded_cnt = ReferenceRepository.count_by_product(product_id)
        fs_ref_dir = DATASETS_DIR / f"visionqc_{product['name']}" / "reference"
        fs_cnt = len(list(fs_ref_dir.glob("*.png")) + list(fs_ref_dir.glob("*.jpg"))) if fs_ref_dir.exists() else 0

        total_refs = max(uploaded_cnt, fs_cnt)
        if total_refs < 20:
            raise HTTPException(
                status_code=400,
                detail=f"At least 20 reference images are required to train PatchCore. Current count: {total_refs}"
            )

        job_id = f"job_{uuid.uuid4().hex[:10]}"
        TrainingJobRepository.create(job_id=job_id, product_id=product_id, version=version)

        # Launch non-blocking background thread
        thread = threading.Thread(
            target=_async_train_worker,
            args=(job_id, product_id, product["name"], version, backbone),
            daemon=True
        )
        thread.start()

        return {
            "job_id": job_id,
            "product_id": product_id,
            "version": version,
            "status": "TRAINING",
            "message": "PatchCore training job initiated in background. Poll /api/products/{id}/model-status for progress."
        }

training_service_layer = TrainingService()
