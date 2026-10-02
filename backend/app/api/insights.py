from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.analytics_service import analytics_service_layer

router = APIRouter(prefix="/api/insights", tags=["Insights & Monitoring"])

@router.get("/anomalies", summary="Get anomaly score distribution, drift assessment, and supervisor disagreement metrics")
def get_anomaly_insights(product_id: Optional[int] = Query(None, description="Filter by product ID")):
    return analytics_service_layer.get_quality_insights(product_id=product_id)
