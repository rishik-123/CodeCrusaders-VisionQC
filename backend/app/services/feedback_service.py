from typing import Dict, Any, Optional
from fastapi import HTTPException
from backend.app.database.repositories import InspectionRepository, FeedbackRepository

class FeedbackService:
    @staticmethod
    def submit_feedback(inspection_id: str, label: str, notes: Optional[str] = None) -> Dict[str, Any]:
        inspection = InspectionRepository.get_by_id(inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail=f"Inspection with ID '{inspection_id}' not found.")

        if label not in ("CONFIRMED_DEFECT", "ACTUALLY_GOOD"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid label '{label}'. Must be either 'CONFIRMED_DEFECT' or 'ACTUALLY_GOOD'."
            )

        fb = FeedbackRepository.add(inspection_id=inspection_id, label=label, notes=notes)
        return fb

feedback_service_layer = FeedbackService()
