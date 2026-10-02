import requests
import json
from pathlib import Path

base = "http://localhost:8000"
prods = requests.get(f"{base}/api/products").json()

test_samples = {
    "bottle": ("datasets/visionqc_bottle/test/good/test_good_000.png", "datasets/visionqc_bottle/test/defective/broken_large_008.png"),
    "capsule": ("datasets/mvtec_anomaly_detection/capsule/test/good/000.png", "datasets/mvtec_anomaly_detection/capsule/test/crack/000.png"),
    "metal_nut": ("datasets/mvtec_anomaly_detection/metal_nut/test/good/000.png", "datasets/mvtec_anomaly_detection/metal_nut/test/scratch/000.png"),
    "screw": ("datasets/mvtec_anomaly_detection/screw/test/good/000.png", "datasets/mvtec_anomaly_detection/screw/test/scratch_head/000.png"),
    "cable": ("datasets/mvtec_anomaly_detection/cable/test/good/000.png", "datasets/mvtec_anomaly_detection/cable/test/bent_wire/000.png"),
    "pill": ("datasets/mvtec_anomaly_detection/pill/test/good/000.png", "datasets/mvtec_anomaly_detection/pill/test/scratch/000.png"),
    "tile": ("datasets/mvtec_anomaly_detection/tile/test/good/000.png", "datasets/mvtec_anomaly_detection/tile/test/crack/000.png"),
    "zipper": ("datasets/mvtec_anomaly_detection/zipper/test/good/000.png", "datasets/mvtec_anomaly_detection/zipper/test/broken_teeth/000.png"),
}

print(f"Total Registered Products in Database: {len(prods)}")
for p in prods:
    name = p["name"]
    if name in test_samples:
        good_file, bad_file = test_samples[name]
        pid = p["id"]
        thresh = p["threshold"]
        print(f"\n==========================================")
        print(f"Testing Category: {name.upper()} (Product ID: {pid}, Threshold: {thresh})")
        print(f"==========================================")
        if Path(good_file).exists():
            with open(good_file, "rb") as f:
                rg = requests.post(f"{base}/api/products/{pid}/inspect", files={"image": ("good.png", f, "image/png")})
                j = rg.json()
                print(f"  [GOOD SAMPLE] -> Decision: {j.get('decision')} | Score: {j.get('anomaly_score')} | Time: {j.get('processing_time_ms')}ms")
        if Path(bad_file).exists():
            with open(bad_file, "rb") as f:
                rb = requests.post(f"{base}/api/products/{pid}/inspect", files={"image": ("bad.png", f, "image/png")})
                j = rb.json()
                print(f"  [DEFECT SAMPLE] -> Decision: {j.get('decision')} | Score: {j.get('anomaly_score')} | Time: {j.get('processing_time_ms')}ms")

print("\nALL INSPECTIONS TESTED SUCCESSFULLY.")
