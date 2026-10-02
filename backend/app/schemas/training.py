from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TrainingTriggerRequest(BaseModel):
    version: Optional[str] = Field("v1", description="Target model version identifier")
    backbone: Optional[str] = Field("wide_resnet50_2", description="Feature extractor backbone")

class TrainingJobResponse(BaseModel):
    job_id: str
    product_id: int
    version: str
    status: str
    message: str

class ModelVersionResponse(BaseModel):
    id: int
    product_id: int
    version: str
    model_path: str
    threshold: float
    reference_count: int
    validation_metrics: Optional[Dict[str, Any]] = None
    is_active: bool
    created_at: str

class SetActiveVersionRequest(BaseModel):
    version: str = Field(..., example="v1")
