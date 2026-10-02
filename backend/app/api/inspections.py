from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, status
from backend.app.schemas.inspection import (
    InspectionResponse,
    InspectionHistoryResponse,
    FeedbackCreate,
    FeedbackResponse
)
from backend.app.services.inspection_service import inspection_service_layer
from backend.app.services.feedback_service import feedback_service_layer
from backend.app.database.repositories import InspectionRepository

router = APIRouter(tags=["Inspections"])

@router.post("/api/products/{product_id}/inspect", response_model=InspectionResponse, summary="Perform real-time visual inspection on an image")
async def inspect_product_image(product_id: int, image: UploadFile = File(...)):
    """
    Accepts an uploaded product image (from mobile camera, webcam frame, or API client).
    Runs PatchCore memory bank anomaly inference, applies supervisor threshold,
    generates anomaly heatmap & overlay, and records inspection to database.
    """
    return inspection_service_layer.process_inspection(product_id=product_id, image_file=image)

@router.get("/api/inspections", response_model=InspectionHistoryResponse, summary="Retrieve inspection history with filters")
def get_inspection_history(
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    decision: Optional[str] = Query(None, pattern="^(PASS|FAIL)$", description="Filter by PASS/FAIL decision"),
    date_from: Optional[str] = Query(None, description="Filter from ISO timestamp (e.g. 2026-10-01)"),
    date_to: Optional[str] = Query(None, description="Filter to ISO timestamp"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    items, total = InspectionRepository.list_inspections(
        product_id=product_id,
        decision=decision,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset
    )

    formatted = []
    for r in items:
        from pathlib import Path
        h_url = f"/results/heatmaps/{Path(r['heatmap_path']).name}" if r.get("heatmap_path") else None
        o_url = f"/results/heatmaps/{Path(r['overlay_path']).name}" if r.get("overlay_path") else None
        formatted.append(
            InspectionResponse(
                inspection_id=r["id"],
                product_id=r["product_id"],
                decision=r["decision"],
                anomaly_score=r["anomaly_score"],
                threshold=r["threshold"],
                heatmap_url=h_url,
                overlay_url=o_url,
                processing_time_ms=r["processing_time_ms"],
                model_version=r.get("model_version", "v1"),
                created_at=r["created_at"],
                feedback_label=r.get("feedback_label"),
                feedback_notes=r.get("feedback_notes")
            )
        )

    return InspectionHistoryResponse(
        total=total,
        limit=limit,
        offset=offset,
        inspections=formatted
    )

@router.get("/api/inspections/{inspection_id}", response_model=InspectionResponse, summary="Get full details for a single inspection")
def get_single_inspection(inspection_id: str):
    r = InspectionRepository.get_by_id(inspection_id)
    if not r:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")

    from pathlib import Path
    h_url = f"/results/heatmaps/{Path(r['heatmap_path']).name}" if r.get("heatmap_path") else None
    o_url = f"/results/heatmaps/{Path(r['overlay_path']).name}" if r.get("overlay_path") else None

    return InspectionResponse(
        inspection_id=r["id"],
        product_id=r["product_id"],
        decision=r["decision"],
        anomaly_score=r["anomaly_score"],
        threshold=r["threshold"],
        heatmap_url=h_url,
        overlay_url=o_url,
        processing_time_ms=r["processing_time_ms"],
        model_version=r.get("model_version", "v1"),
        created_at=r["created_at"],
        feedback_label=r.get("feedback_label"),
        feedback_notes=r.get("feedback_notes")
    )

@router.post("/api/inspections/{inspection_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit supervisor feedback for an inspection")
def submit_inspection_feedback(inspection_id: str, payload: FeedbackCreate):
    return feedback_service_layer.submit_feedback(
        inspection_id=inspection_id,
        label=payload.label,
        notes=payload.notes
    )
