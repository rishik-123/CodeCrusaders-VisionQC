from typing import Dict, Any, List, Optional
from backend.app.database.repositories import AnalyticsRepository, ProductRepository

class AnalyticsService:
    @staticmethod
    def get_today_summary(product_id: Optional[int] = None) -> Dict[str, Any]:
        return AnalyticsRepository.get_today_dashboard(product_id=product_id)

    @staticmethod
    def get_trend_history(product_id: Optional[int] = None, days: int = 7) -> List[Dict[str, Any]]:
        return AnalyticsRepository.get_trends(product_id=product_id, days=days)

    @staticmethod
    def get_quality_insights(product_id: Optional[int] = None) -> Dict[str, Any]:
        insights = AnalyticsRepository.get_anomaly_insights(product_id=product_id)
        
        # Drift assessment
        drift_status = "NORMAL"
        drift_warnings = []

        if insights["total_inspections"] >= 10:
            if insights["disagreement_rate_percent"] > 15.0:
                drift_status = "WARNING_HIGH_DISAGREEMENT"
                drift_warnings.append(
                    f"High supervisor disagreement rate ({insights['disagreement_rate_percent']}%). Consider re-tuning the threshold."
                )

            if insights["mean_anomaly_score"] > 0.65:
                drift_status = "WARNING_HIGH_ANOMALY_DRIFT"
                drift_warnings.append(
                    "Average anomaly score is unusually elevated. Check physical camera alignment, lighting, or product surface changes."
                )

        insights["drift_status"] = drift_status
        insights["drift_warnings"] = drift_warnings
        return insights

analytics_service_layer = AnalyticsService()
