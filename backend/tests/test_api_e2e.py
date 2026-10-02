import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from backend.app.main import app
from backend.app.database.database import init_db
from backend.app.database.repositories import ProductRepository

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_api_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_product_crud_and_settings():
    import uuid
    pname = f"test_vial_{uuid.uuid4().hex[:6]}"
    # 1. Create product
    res = client.post("/api/products", json={"name": pname, "description": "Pharmaceutical vial"})
    assert res.status_code == 201
    prod = res.json()
    prod_id = prod["id"]
    assert prod["name"] == pname

    # 2. Get product
    res = client.get(f"/api/products/{prod_id}")
    assert res.status_code == 200

    # 3. Patch settings (Threshold tuning)
    res = client.patch(f"/api/products/{prod_id}/settings", json={"threshold": 0.62, "reason": "Tuning defect sensitivity"})
    assert res.status_code == 200
    assert res.json()["current_threshold"] == 0.62

def test_reference_upload():
    import uuid
    pname = f"test_box_{uuid.uuid4().hex[:6]}"
    # Create test product
    res = client.post("/api/products", json={"name": pname})
    prod_id = res.json()["id"]

    # Generate synthetic images
    files = []
    for i in range(3):
        img = Image.new("RGB", (64, 64), color=(i * 40, 100, 150))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        files.append(("files", (f"ref_{i}.png", buf.getvalue(), "image/png")))

    res = client.post(f"/api/products/{prod_id}/references", files=files)
    assert res.status_code == 200
    assert res.json()["uploaded_count"] == 3

def test_dashboard_and_insights_apis():
    res = client.get("/api/dashboard/today")
    assert res.status_code == 200
    assert "total_inspections" in res.json()

    res = client.get("/api/dashboard/trends?days=7")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    res = client.get("/api/insights/anomalies")
    assert res.status_code == 200
    assert "score_distribution" in res.json()
