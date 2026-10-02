import argparse
import json
import os
import sys
import time
from pathlib import Path
import sqlite3
import torch
from torchvision import transforms
from PIL import Image
import numpy as np

# Set project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

def load_patchcore_model(checkpoint_path: Path):
    from anomalib.models import Patchcore
    try:
        model = Patchcore.load_from_checkpoint(str(checkpoint_path), weights_only=False)
    except Exception:
        import torch
        import anomalib
        torch.serialization.add_safe_globals([anomalib.data.dataclasses.torch.TorchData])
        model = Patchcore.load_from_checkpoint(str(checkpoint_path))
    model.eval()
    return model

def run_inference(product_name: str, image_path: str, db_path: str = None):
    start_time = time.time()
    
    # 1. Resolve paths
    models_dir = PROJECT_ROOT / "models" / "product_models" / product_name / "v1"
    ckpt_path = models_dir / "model.ckpt"
    thresh_path = models_dir / "threshold.json"
    
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found for {product_name} at {ckpt_path}")
    if not thresh_path.exists():
        raise FileNotFoundError(f"Threshold file not found for {product_name} at {thresh_path}")
        
    with open(thresh_path, "r") as f:
        threshold_data = json.load(f)
    threshold = float(threshold_data.get("threshold", 40.0))
    
    # 2. Preprocess image
    pil_img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = pil_img.size
    
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    input_tensor = transform(pil_img).unsqueeze(0)
    
    # 3. Predict with PatchCore
    model = load_patchcore_model(ckpt_path)
    with torch.no_grad():
        output = model.model(input_tensor)
        
    if hasattr(output, "pred_score"):
        raw_score = float(output.pred_score.item() if hasattr(output.pred_score, "item") else output.pred_score)
        anomaly_map = output.anomaly_map.squeeze().cpu().numpy() if hasattr(output, "anomaly_map") and output.anomaly_map is not None else None
    elif isinstance(output, tuple):
        anomaly_map = output[0].squeeze().cpu().numpy() if len(output) > 0 else None
        raw_score = float(output[1].item() if hasattr(output[1], "item") else output[1])
    else:
        raw_score = 0.0
        anomaly_map = None

    # 4. PASS/FAIL decision based on calibrated threshold
    is_defect = bool(raw_score >= threshold)
    decision = "FAIL" if is_defect else "PASS"
    
    # Calculate confidence / distance from threshold
    diff = abs(raw_score - threshold)
    confidence = min(0.99, max(0.60, 0.5 + (diff / (threshold * 1.5))))
    
    # 5. Generate Heatmap & Overlay
    results_dir = PROJECT_ROOT / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    
    filename_base = f"{product_name}_{int(time.time() * 1000)}"
    heatmap_rel_path = f"/results/{filename_base}_heatmap.png"
    overlay_rel_path = f"/results/{filename_base}_overlay.png"
    
    if anomaly_map is not None:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        
        # Normalize anomaly map between 0 and 1
        a_min, a_max = anomaly_map.min(), anomaly_map.max()
        norm_map = (anomaly_map - a_min) / (a_max - a_min + 1e-8)
        
        # Save Heatmap
        plt.figure(figsize=(4, 4), dpi=150)
        plt.imshow(norm_map, cmap="jet")
        plt.axis("off")
        plt.tight_layout(pad=0)
        plt.savefig(PROJECT_ROOT / f"results/{filename_base}_heatmap.png", bbox_inches="tight", pad_inches=0)
        plt.close()
        
        # Save Overlay with original image
        resized_orig = pil_img.resize((224, 224))
        plt.figure(figsize=(4, 4), dpi=150)
        plt.imshow(resized_orig)
        plt.imshow(norm_map, cmap="jet", alpha=0.45)
        plt.axis("off")
        plt.tight_layout(pad=0)
        plt.savefig(PROJECT_ROOT / f"results/{filename_base}_overlay.png", bbox_inches="tight", pad_inches=0)
        plt.close()
    else:
        heatmap_rel_path = None
        overlay_rel_path = None

    processing_time_ms = round((time.time() - start_time) * 1000, 2)
    
    # 6. Database record persistence
    if db_path is None:
        db_path = str(PROJECT_ROOT / "backend" / "database" / "visionqc.db")
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Ensure inspections table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        product_name TEXT,
        image_path TEXT,
        heatmap_path TEXT,
        overlay_path TEXT,
        anomaly_score REAL,
        threshold_used REAL,
        is_defect INTEGER,
        decision TEXT,
        confidence REAL,
        processing_time_ms REAL,
        model_version TEXT DEFAULT 'v1',
        operator_feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    cursor.execute("""
    INSERT INTO inspections (
        product_name, image_path, heatmap_path, overlay_path,
        anomaly_score, threshold_used, is_defect, decision,
        confidence, processing_time_ms, model_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        product_name, str(image_path), heatmap_rel_path, overlay_rel_path,
        round(raw_score, 4), round(threshold, 4), 1 if is_defect else 0, decision,
        round(confidence, 4), processing_time_ms, "v1"
    ))
    inspection_id = cursor.lastrowid
    conn.commit()
    conn.close()

    result = {
        "success": True,
        "inspection_id": inspection_id,
        "product_name": product_name,
        "anomaly_score": round(raw_score, 4),
        "threshold": round(threshold, 4),
        "decision": decision,
        "is_defect": is_defect,
        "confidence": round(confidence, 4),
        "heatmap_url": heatmap_rel_path,
        "overlay_url": overlay_rel_path,
        "image_url": f"/uploads/{Path(image_path).name}" if Path(image_path).parent.name == "uploads" else str(image_path),
        "processing_time_ms": processing_time_ms,
        "model_version": "v1"
    }
    
    print(json.dumps(result))
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--product_name", type=str, required=True)
    parser.add_argument("--image_path", type=str, required=True)
    parser.add_argument("--db_path", type=str, default=None)
    args = parser.parse_args()
    
    run_inference(args.product_name, args.image_path, args.db_path)
