from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="bottle")
    description: Optional[str] = Field(None, max_length=500, example="Standard glass beverage bottle inspection")

class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_status: str
    active_version: str
    model_path: Optional[str] = None
    threshold: float
    reference_count: int
    created_at: str
    updated_at: str

class ProductSettingsUpdate(BaseModel):
    threshold: float = Field(..., ge=0.0, le=100.0, description="New classification anomaly score threshold")
    reason: Optional[str] = Field(None, description="Reason or supervisor notes for adjusting the threshold")

class ProductSettingsResponse(BaseModel):
    product_id: int
    current_threshold: float
    previous_threshold: float
    message: str
    safety_guidance: str

class ReferenceImageResponse(BaseModel):
    id: int
    product_id: int
    filename: str
    image_path: str
    checksum: str
    validation_status: str
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: str
