import os
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.database import init_db
from backend.app.database.repositories import ProductRepository

client = TestClient(app)

def test_real_world_phone_inspection_flow():
    """
    Phase 19: End-to-end real world inspection test on an unseen smartphone photo.
    """
    init_db()

    base_dir = Path(__file__).resolve().parent.parent.parent
    sample_img_path = base_dir / "datasets" / "real_world_samples" / "real_bottle_phone_01.jpg"
    model_ckpt = base_dir / "models" / "product_models" / "bottle" / "v1" / "model.ckpt"
    thresh_file = base_dir / "models" / "product_models" / "bottle" / "v1" / "threshold.json"

    assert sample_img_path.exists(), f"Sample image missing at {sample_img_path}"
    assert model_ckpt.exists(), f"Model checkpoint missing at {model_ckpt}"

    # Ensure product 'bottle' exists and is marked READY
    prod = ProductRepository.get_by_name("bottle")
    if not prod:
        prod = ProductRepository.create(name="bottle", description="Industrial Glass Bottle Inspection")

    import json
    threshold = 0.5
    if thresh_file.exists():
        with open(thresh_file, "r") as f:
            threshold = float(json.load(f)["threshold"])

    ProductRepository.update_status(
        product_id=prod["id"],
        status="READY",
        model_path=str(model_ckpt),
        threshold=threshold,
        active_version="v1"
    )

    # 1. Send multipart POST request simulating smartphone camera upload
    with open(sample_img_path, "rb") as f:
        response = client.post(
            f"/api/products/{prod['id']}/inspect",
            files={"image": ("phone_bottle_photo.jpg", f, "image/jpeg")}
        )

    assert response.status_code == 200, f"Inspection failed: {response.text}"
    data = response.json()

    print("\n" + "=" * 60)
    print("REAL WORLD PHONE INSPECTION RESULT:")
    print("=" * 60)
    print(f"Inspection ID   : {data['inspection_id']}")
    print(f"Decision        : {data['decision']}")
    print(f"Anomaly Score   : {data['anomaly_score']}")
    print(f"Threshold       : {data['threshold']}")
    print(f"Processing Time : {data['processing_time_ms']} ms")
    print(f"Heatmap URL     : {data['heatmap_url']}")
    print(f"Overlay URL     : {data['overlay_url']}")
    print("=" * 60)

    assert data["inspection_id"].startswith("insp_")
    assert data["decision"] in ("PASS", "FAIL")
    assert isinstance(data["anomaly_score"], float)
    assert data["processing_time_ms"] > 0

    insp_id = data["inspection_id"]

    # 2. Submit supervisor feedback
    fb_res = client.post(
        f"/api/inspections/{insp_id}/feedback",
        json={"label": "CONFIRMED_DEFECT" if data["decision"] == "FAIL" else "ACTUALLY_GOOD", "notes": "Real-world smartphone capture verified"}
    )
    assert fb_res.status_code == 201

    # 3. Verify inspection in history
    hist_res = client.get(f"/api/inspections?product_id={prod['id']}&limit=10")
    assert hist_res.status_code == 200
    assert hist_res.json()["total"] >= 1

    # 4. Verify dashboard stats updated
    dash_res = client.get(f"/api/dashboard/today?product_id={prod['id']}")
    assert dash_res.status_code == 200
    assert dash_res.json()["total_inspections"] >= 1

if __name__ == "__main__":
    test_real_world_phone_inspection_flow()
