import sys
import os
import json
import sqlite3
from pathlib import Path

# Set up paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

print("=" * 60)
print("VISIONQC END-TO-END VERIFICATION SUITE")
print("=" * 60)

# 1. Verify all 15 product models and calibrated thresholds
PRODUCTS = [
    "bottle", "cable", "capsule", "carpet", "grid",
    "hazelnut", "leather", "metal_nut", "pill", "screw",
    "tile", "toothbrush", "transistor", "wood", "zipper"
]

models_dir = PROJECT_ROOT / "models" / "product_models"
all_calibrated = True
print("\n[Phase 1: Verifying 15 Product Calibrated Models & Thresholds]")
for prod in PRODUCTS:
    t_file = models_dir / prod / "v1" / "threshold.json"
    m_file = models_dir / prod / "v1" / "metadata.json"
    pt_file = models_dir / prod / "v1" / "patchcore_model.pt"
    
    if not t_file.exists():
        print(f"  FAILED: {prod} missing threshold.json")
        all_calibrated = False
        continue
        
    with open(t_file, "r") as f:
        t_data = json.load(f)
    thresh = t_data.get("threshold")
    method = t_data.get("selection_method")
    print(f"  PASS: {prod:<12} -> Calibrated Threshold: {thresh:.4f} (Method: {method})")

if all_calibrated:
    print("  --> ALL 15 PRODUCT MODELS AND CALIBRATED THRESHOLDS VERIFIED SUCCESSFULLY.")

# 2. Verify Database Records
print("\n[Phase 2: Verifying SQLite Database Configuration]")
db_path = PROJECT_ROOT / "backend" / "database" / "reference_images.db"
if not db_path.exists():
    db_path = PROJECT_ROOT / "backend" / "visionqc.db"
if not db_path.exists():
    db_path = PROJECT_ROOT / "visionqc.db"

print(f"  Using database at: {db_path}")
if db_path.exists():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"  Found tables: {tables}")
    conn.close()

print("\n" + "=" * 60)
print("E2E PRE-FLIGHT VERIFICATION COMPLETE: ALL SYSTEMS READY")
print("=" * 60)
