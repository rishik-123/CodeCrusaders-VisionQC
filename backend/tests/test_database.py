import pytest
from backend.app.database.database import init_db
from backend.app.database.repositories import (
    ProductRepository,
    ReferenceRepository,
    InspectionRepository,
    FeedbackRepository,
    AnalyticsRepository
)

def test_database_lifecycle():
    init_db()
    import uuid
    pname = f"test_can_{uuid.uuid4().hex[:6]}"
    
    # 1. Product creation
    p = ProductRepository.create(name=pname, description="Aluminum beverage can")
    assert p["id"] is not None
    assert p["name"] == pname
    assert p["model_status"] == "NOT_READY"

    # 2. Reference addition
    chk = f"chk_{uuid.uuid4().hex[:12]}"
    ref = ReferenceRepository.add(
        product_id=p["id"],
        filename="can_001.png",
        image_path="uploads/reference/can_001.png",
        checksum=chk,
        width=512,
        height=512
    )
    assert ref["id"] is not None
    assert ReferenceRepository.count_by_product(p["id"]) == 1

    # Check duplicate prevention
    assert ReferenceRepository.exists_by_checksum(p["id"], chk) is True

    # 3. Log Inspection
    insp_id = f"test_insp_{uuid.uuid4().hex[:6]}"
    insp = InspectionRepository.log(
        inspection_id=insp_id,
        product_id=p["id"],
        image_path="uploads/inspections/test.png",
        heatmap_path="results/heatmaps/test_heatmap.png",
        overlay_path="results/heatmaps/test_overlay.png",
        anomaly_score=0.25,
        threshold=0.5,
        decision="PASS",
        processing_time_ms=120.5
    )
    assert insp["id"] == insp_id
    assert insp["decision"] == "PASS"

    # 4. Supervisor Feedback
    fb = FeedbackRepository.add(inspection_id=insp_id, label="ACTUALLY_GOOD", notes="Verified clean surface")
    assert fb["id"] is not None
    assert fb["label"] == "ACTUALLY_GOOD"

    # 5. Analytics
    today = AnalyticsRepository.get_today_dashboard(product_id=p["id"])
    assert today["total_inspections"] >= 1
    assert today["pass_count"] >= 1
