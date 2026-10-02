from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class InspectionResponse(BaseModel):
    inspection_id: str
    product_id: int
    decision: str = Field(..., example="PASS")
    anomaly_score: float = Field(..., example=0.31245)
    threshold: float = Field(..., example=0.52000)
    heatmap_url: Optional[str] = None
    overlay_url: Optional[str] = None
    processing_time_ms: float = Field(..., example=185.2)
    model_version: Optional[str] = "v1"
    created_at: str
    feedback_label: Optional[str] = None
    feedback_notes: Optional[str] = None

class InspectionHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    inspections: List[InspectionResponse]

class FeedbackCreate(BaseModel):
    label: str = Field(..., pattern="^(CONFIRMED_DEFECT|ACTUALLY_GOOD)$", example="CONFIRMED_DEFECT")
    notes: Optional[str] = Field(None, max_length=500, example="Crack visible on neck of the bottle")

class FeedbackResponse(BaseModel):
    id: int
    inspection_id: str
    label: str
    notes: Optional[str] = None
    created_at: str
