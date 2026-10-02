import os
import uuid
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import UploadFile, HTTPException

from backend.app.config import UPLOADS_DIR, RESULTS_DIR
from backend.app.database.repositories import ProductRepository, InspectionRepository
from backend.app.ml.inference import inference_service

class InspectionService:
    @staticmethod
    def process_inspection(product_id: int, image_file: UploadFile) -> Dict[str, Any]:
        product = ProductRepository.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")

        if product["model_status"] != "READY" or not product["model_path"]:
            raise HTTPException(
                status_code=409,
                detail=f"Product model is not ready for inspection (Status: {product['model_status']}). Train the model first."
            )

        model_path = product["model_path"]
        if not os.path.exists(model_path):
            raise HTTPException(status_code=500, detail=f"Model weights checkpoint not found on server at {model_path}")

        threshold = product["threshold"]
        inspection_id = f"insp_{uuid.uuid4().hex[:12]}"

        # Read image bytes
        image_bytes = image_file.file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Save uploaded image to uploads/inspections/
        ext = os.path.splitext(image_file.filename)[1].lower() if image_file.filename else ".png"
        if not ext:
            ext = ".png"
        saved_img_path = UPLOADS_DIR / "inspections" / f"{inspection_id}{ext}"
        with open(saved_img_path, "wb") as f:
            f.write(image_bytes)

        # Run inference pipeline
        try:
            res = inference_service.inspect(
                product_id=product_id,
                model_path=model_path,
                threshold=threshold,
                image_input=image_bytes,
                inspection_id=inspection_id,
                save_visualizations=True
            )
        except ValueError as ve:
            if saved_img_path.exists():
                saved_img_path.unlink()
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

        # Log inspection in database
        saved_record = InspectionRepository.log(
            inspection_id=inspection_id,
            product_id=product_id,
            image_path=str(saved_img_path).replace("\\", "/"),
            heatmap_path=res.get("heatmap_path"),
            overlay_path=res.get("overlay_path"),
            anomaly_score=res["anomaly_score"],
            threshold=res["threshold"],
            decision=res["decision"],
            processing_time_ms=res["processing_time_ms"],
            model_version=product.get("active_version", "v1")
        )

        return {
            "inspection_id": inspection_id,
            "product_id": product_id,
            "decision": res["decision"],
            "anomaly_score": res["anomaly_score"],
            "threshold": res["threshold"],
            "heatmap_url": f"/results/heatmaps/{Path(res['heatmap_path']).name}" if res.get("heatmap_path") else None,
            "overlay_url": f"/results/heatmaps/{Path(res['overlay_path']).name}" if res.get("overlay_path") else None,
            "processing_time_ms": res["processing_time_ms"],
            "model_version": product.get("active_version", "v1"),
            "created_at": saved_record["created_at"],
            "feedback_label": None,
            "feedback_notes": None
        }

inspection_service_layer = InspectionService()
