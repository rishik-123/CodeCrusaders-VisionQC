# VisionQC: AI/ML Visual Quality Inspection Backend

> **An industrial-grade, few-shot visual quality inspection system powered by PatchCore anomaly detection, PyTorch, and FastAPI.**

VisionQC enables small manufacturers to inspect product parts and detect defects using **only 20–30 normal reference images**, eliminating the need for expensive machine vision integrators or large labeled defect datasets.

---

## 🚀 Key Features

* **Few-Shot Normality Learning**: Learns normal product appearance from 20–30 good reference images using PatchCore's memory bank coreset subsampling.
* **Production REST API**: Built on FastAPI with async SQLite storage, background training dispatchers, and automated lifecycle handling.
* **Multi-Input Support**: Inspects images uploaded from **smartphones**, **computer webcams**, **HTTP API clients (cURL/Postman)**, or **file storage**.
* **Visual Anomaly Localization**: Generates pixel-accurate anomaly heatmaps and blended overlays highlighting defective areas.
* **Supervisor Threshold Tuning**: Live threshold adjustments with safety impact guidance and rollback support.
* **Inspection History & Analytics**: Logged inspections, pass/fail statistics, daily trends, rejection rates, supervisor feedback, and drift monitoring.
* **Multi-Product & Versioning**: Independent model per product with full version history (`v1`, `v2`, ...) and one-click active version rollback.

---

## 🛠️ Architecture & Tech Stack

```
Techforge_VisionQC/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entrypoint & static mounting
│   │   ├── config.py            # Global paths, settings, CORS & thresholds
│   │   ├── api/                 # REST API Routers
│   │   │   ├── products.py      # Product CRUD, reference uploads, threshold settings
│   │   │   ├── training.py      # Background training triggers, status, versioning
│   │   │   ├── inspections.py   # Multipart image inspection, history, feedback
│   │   │   ├── dashboard.py     # Today summary & daily rejection trends
│   │   │   └── insights.py      # Anomaly score distribution & drift detection
│   │   ├── ml/                  # Machine Learning Engine
│   │   │   ├── patchcore_model.py # In-memory PatchCore wrapper
│   │   │   ├── model_manager.py # Thread-safe multi-product model cache
│   │   │   ├── preprocessing.py # Image validation, dimension checks, tensor transforms
│   │   │   ├── heatmap.py       # Anomaly heatmap and blended overlay generation
│   │   │   └── threshold.py     # Threshold optimization & classification metrics
│   │   ├── database/            # SQLite Storage Layer
│   │   │   ├── database.py      # Schema migration and connection pool
│   │   │   └── repositories.py  # Repository pattern DAL
│   │   └── services/            # Business Logic Layer
│   │       ├── inspection_service.py
│   │       ├── training_service.py
│   │       ├── feedback_service.py
│   │       └── analytics_service.py
│   ├── scripts/                 # CLI & Pipeline Utilities
│   │   ├── setup_visionqc_dataset.py # Custom 25-image split setup
│   │   ├── verify_dataset.py         # SHA256 integrity & duplicate checker
│   │   ├── train_visionqc.py         # 25-reference PatchCore training pipeline
│   │   ├── validate_visionqc.py      # Validation & threshold search
│   │   ├── test_visionqc.py          # Final 40-image benchmark test
│   │   ├── evaluate_threshold.py     # Threshold tuning simulation tool
│   │   ├── inspect_image.py          # Single image CLI inspector
│   │   └── webcam_inspection.py      # Real-time webcam inspection tool
│   └── tests/                   # Automated Pytest Suite
│       ├── test_database.py
│       ├── test_inference.py
│       ├── test_api_e2e.py
│       └── test_real_world.py
├── datasets/
│   ├── bottle/                  # Raw MVTec AD dataset
│   └── visionqc_bottle/         # Clean VisionQC custom split
├── models/
│   └── product_models/          # Trained product weights & metadata
├── uploads/                     # Uploaded reference & inspection images
└── results/
    ├── heatmaps/                # Generated inspection heatmaps & overlays
    └── visionqc_bottle/         # Final benchmark metrics & predictions
```

---

## ⚡ Quick Start & Reproduction

### 1. Environment Setup
```powershell
# Activate existing virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Dataset Verification & 25-Image Experiment
```powershell
# 1. Prepare custom dataset splits (25 reference, 20 val good, 20 val defective, 20 test good, 20 test defective)
python backend/scripts/setup_visionqc_dataset.py

# 2. Rigorously verify dataset integrity (0% duplicate/overlap check)
python backend/scripts/verify_dataset.py

# 3. Train PatchCore using ONLY the 25 reference images
python backend/scripts/train_visionqc.py --product bottle

# 4. Run validation & freeze optimal threshold
python backend/scripts/validate_visionqc.py --product bottle

# 5. Run final 40-image test benchmark
python backend/scripts/test_visionqc.py --product bottle
```

---

## 🖥️ Running the VisionQC Server

Start the production FastAPI server:
```powershell
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

* **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 📡 API Reference & Example Requests

### 1. Perform Image Inspection (`POST /api/products/{id}/inspect`)
Accepts an image file from a mobile phone, webcam snapshot, or file upload:

```bash
curl -X POST "http://localhost:8000/api/products/1/inspect" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@datasets/visionqc_bottle/test/defective/broken_large_007.png"
```

**Response (`200 OK`)**:
```json
{
  "inspection_id": "insp_9a410f8d1c02",
  "product_id": 1,
  "decision": "FAIL",
  "anomaly_score": 405.12,
  "threshold": 381.07,
  "heatmap_url": "/results/heatmaps/insp_9a410f8d1c02_heatmap.png",
  "overlay_url": "/results/heatmaps/insp_9a410f8d1c02_overlay.png",
  "processing_time_ms": 142.35,
  "model_version": "v1",
  "created_at": "2026-10-02T08:15:30.123456",
  "feedback_label": null,
  "feedback_notes": null
}
```

---

### 2. Submit Supervisor Feedback (`POST /api/inspections/{id}/feedback`)
```bash
curl -X POST "http://localhost:8000/api/inspections/insp_9a410f8d1c02/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "CONFIRMED_DEFECT",
    "notes": "Large crack visible on the bottle lip"
  }'
```

---

### 3. Query Inspection History (`GET /api/inspections`)
```bash
curl "http://localhost:8000/api/inspections?product_id=1&decision=FAIL&limit=20"
```

---

### 4. Today's Dashboard & Rejection Rate (`GET /api/dashboard/today`)
```bash
curl "http://localhost:8000/api/dashboard/today?product_id=1"
```

**Response**:
```json
{
  "date": "2026-10-02",
  "product_id": 1,
  "total_inspections": 45,
  "pass_count": 25,
  "fail_count": 20,
  "rejection_rate_percent": 44.44,
  "avg_anomaly_score": 398.24,
  "avg_processing_time_ms": 138.4
}
```

---

### 5. Adjust Threshold (`PATCH /api/products/{id}/settings`)
```bash
curl -X PATCH "http://localhost:8000/api/products/1/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "threshold": 395.5,
    "reason": "Fine-tuning defect sensitivity for new batch"
  }'
```

---

## 📷 Interactive Utilities

### Single Image CLI Inspection
```powershell
python backend/scripts/inspect_image.py --product bottle --image "datasets/visionqc_bottle/test/defective/broken_large_007.png"
```

### Real-Time Webcam Inspection
```powershell
python backend/scripts/webcam_inspection.py --product bottle
```
* Press **`SPACE`** to inspect the live camera frame.
* Press **`Q`** to exit.

### Mobile Phone Inspection Guide
1. Find your machine's local LAN IP:
   ```powershell
   ipconfig
   ```
   *(e.g., `192.168.1.45`)*
2. Start the backend bound to `0.0.0.0`:
   ```powershell
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
   ```
3. From your mobile phone connected to the same Wi-Fi network, upload a photo to:
   ```
   POST http://192.168.1.45:8000/api/products/1/inspect
   ```

---

## 🧪 Automated Testing

Run the complete test suite:
```powershell
pytest backend/tests -v
```
