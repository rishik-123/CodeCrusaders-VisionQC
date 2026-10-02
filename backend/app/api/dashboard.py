from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query
from backend.app.services.analytics_service import analytics_service_layer

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/today", summary="Get today's real-time inspection statistics and rejection rate")
def get_today_dashboard(product_id: Optional[int] = Query(None, description="Filter by product ID")):
    return analytics_service_layer.get_today_summary(product_id=product_id)

@router.get("/trends", summary="Get daily inspection trends and rejection rate history")
def get_dashboard_trends(
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    days: int = Query(7, ge=1, le=90, description="Number of past days to return")
):
    return analytics_service_layer.get_trend_history(product_id=product_id, days=days)
