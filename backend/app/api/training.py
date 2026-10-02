from typing import List
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.training import (
    TrainingTriggerRequest,
    TrainingJobResponse,
    ModelVersionResponse,
    SetActiveVersionRequest
)
from backend.app.database.repositories import (
    ProductRepository,
    TrainingJobRepository,
    ModelVersionRepository
)
from backend.app.services.training_service import training_service_layer
from backend.app.ml.model_manager import model_manager

router = APIRouter(prefix="/api/products", tags=["Training & Versioning"])

@router.post("/{product_id}/train", response_model=TrainingJobResponse, status_code=status.HTTP_202_ACCEPTED, summary="Trigger PatchCore model training")
def train_product(product_id: int, payload: TrainingTriggerRequest = TrainingTriggerRequest()):
    return training_service_layer.start_training(
        product_id=product_id,
        version=payload.version or "v1",
        backbone=payload.backbone or "wide_resnet50_2"
    )

@router.get("/{product_id}/model-status", summary="Check current model training status")
def get_model_status(product_id: int):
    product = ProductRepository.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    job = TrainingJobRepository.get_latest_by_product(product_id)

    return {
        "product_id": product_id,
        "product_name": product["name"],
        "model_status": product["model_status"],
        "active_version": product["active_version"],
        "active_threshold": product["threshold"],
        "reference_count": product["reference_count"],
        "latest_job": job
    }

@router.get("/{product_id}/versions", response_model=List[ModelVersionResponse], summary="List all trained model versions for product")
def list_model_versions(product_id: int):
    product = ProductRepository.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    return ModelVersionRepository.list_by_product(product_id)

@router.post("/{product_id}/active-version", summary="Switch or rollback active model version")
def set_active_version(product_id: int, payload: SetActiveVersionRequest):
    product = ProductRepository.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    res = ModelVersionRepository.set_active(product_id=product_id, version=payload.version)
    if not res:
        raise HTTPException(status_code=404, detail=f"Version '{payload.version}' not found for product {product_id}.")

    model_manager.invalidate(product_id)

    return {
        "product_id": product_id,
        "active_version": payload.version,
        "model_path": res["model_path"],
        "threshold": res["threshold"],
        "message": f"Successfully activated version '{payload.version}' for product '{product['name']}'."
    }
