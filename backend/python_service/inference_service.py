import datetime
import io
import json
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Dict, Any, Tuple

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

# Set optimal PyTorch threads for CPU inference
torch.set_num_threads(4)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = PROJECT_ROOT / "backend" / "database" / "visionqc.db"
RESULTS_DIR = PROJECT_ROOT / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

_MODEL_CACHE: Dict[str, Any] = {}
_THRESHOLD_CACHE: Dict[str, float] = {}
_LOCK = threading.Lock()

_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.CenterCrop((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

ALL_PRODUCTS = [
    "bottle", "cable", "capsule", "carpet", "grid",
    "hazelnut", "leather", "metal_nut", "pill", "screw",
    "tile", "toothbrush", "transistor", "wood", "zipper"
]


def load_single_product_model(product_name: str) -> Tuple[Any, float]:
    clean_name = product_name.strip().lower().replace(" ", "_").replace("-", "_")
    
    with _LOCK:
        if clean_name in _MODEL_CACHE and clean_name in _THRESHOLD_CACHE:
            return _MODEL_CACHE[clean_name], _THRESHOLD_CACHE[clean_name]
            
    model_dir = PROJECT_ROOT / "models" / "product_models" / clean_name / "v1"
    ckpt_path = model_dir / "model.ckpt"
    thresh_path = model_dir / "threshold.json"
    
    if not ckpt_path.exists():
        model_dir = PROJECT_ROOT / "models" / "product_models" / "bottle" / "v1"
        ckpt_path = model_dir / "model.ckpt"
        thresh_path = model_dir / "threshold.json"
        
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found for {clean_name}")
        
    threshold = 40.0
    if thresh_path.exists():
        try:
            with open(thresh_path, "r", encoding="utf-8") as f:
                t_data = json.load(f)
                threshold = float(t_data.get("threshold", 40.0))
        except Exception:
            threshold = 40.0
            
    from anomalib.models import Patchcore
    try:
        model = Patchcore.load_from_checkpoint(str(ckpt_path), weights_only=False)
    except Exception:
        import anomalib
        torch.serialization.add_safe_globals([anomalib.data.dataclasses.torch.TorchData])
        model = Patchcore.load_from_checkpoint(str(ckpt_path))
        
    model.eval()
    
    with _LOCK:
        _MODEL_CACHE[clean_name] = model
        _THRESHOLD_CACHE[clean_name] = threshold
    
    return model, threshold


def _preload_all_models():
    """Background worker to warm all models in RAM at start."""
    for p in ALL_PRODUCTS:
        try:
            load_single_product_model(p)
        except Exception:
            pass


# Pre-warm bottle immediately and preload rest in background thread
try:
    load_single_product_model("bottle")
except Exception:
    pass

_prewarm_thread = threading.Thread(target=_preload_all_models, daemon=True)
_prewarm_thread.start()


def get_product_model_and_threshold(product_name: str) -> Tuple[Any, float]:
    clean_name = product_name.strip().lower().replace(" ", "_").replace("-", "_")
    if clean_name in _MODEL_CACHE and clean_name in _THRESHOLD_CACHE:
        return _MODEL_CACHE[clean_name], _THRESHOLD_CACHE[clean_name]
    return load_single_product_model(clean_name)


def run_fast_inspection(product_name: str, product_id: int, image_bytes: bytes, filename: str = "sample.png") -> Dict[str, Any]:
    t_start = time.time()
    
    # 1. Load Model & Threshold (cached in RAM)
    model, threshold = get_product_model_and_threshold(product_name)
    
    # 2. Decode Image
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # 3. Transform Tensor & Run Inference with torch.inference_mode()
    input_tensor = _TRANSFORM(pil_img).unsqueeze(0)
    with torch.inference_mode():
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
        
    # 4. PASS/FAIL Decision
    is_defect = bool(raw_score >= threshold)
    decision = "FAIL" if is_defect else "PASS"
    diff = abs(raw_score - threshold)
    confidence = min(0.99, max(0.60, 0.5 + (diff / (threshold * 1.5))))
    
    # 5. Fast In-Memory OpenCV Heatmap & Overlay Generation (< 10ms)
    ts = int(time.time() * 1000)
    iso_utc_now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    base_name = f"{product_name}_{ts}"
    heatmap_rel_path = f"/results/{base_name}_heatmap.png"
    overlay_rel_path = f"/results/{base_name}_overlay.png"
    
    if anomaly_map is not None:
        a_min, a_max = float(anomaly_map.min()), float(anomaly_map.max())
        norm_map = ((anomaly_map - a_min) / (a_max - a_min + 1e-8) * 255.0).astype(np.uint8)
        
        # Color mapped anomaly representation
        heatmap_color = cv2.applyColorMap(norm_map, cv2.COLORMAP_JET)
        heatmap_file = RESULTS_DIR / f"{base_name}_heatmap.png"
        cv2.imwrite(str(heatmap_file), heatmap_color)
        
        # Overlay on original image
        orig_np = np.array(pil_img)
        orig_bgr = cv2.cvtColor(orig_np, cv2.COLOR_RGB2BGR)
        orig_resized = cv2.resize(orig_bgr, (norm_map.shape[1], norm_map.shape[0]))
        
        overlay = cv2.addWeighted(orig_resized, 0.55, heatmap_color, 0.45, 0)
        overlay_file = RESULTS_DIR / f"{base_name}_overlay.png"
        cv2.imwrite(str(overlay_file), overlay)
    else:
        heatmap_rel_path = None
        overlay_rel_path = None
        
    processing_time_ms = round((time.time() - t_start) * 1000, 2)
    
    # 6. Persist to SQLite database with explicit ISO UTC timestamp
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
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
        product_id, product_name, image_path, heatmap_path, overlay_path,
        anomaly_score, threshold_used, is_defect, decision, confidence,
        processing_time_ms, model_version, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        product_id, product_name, filename, heatmap_rel_path, overlay_rel_path,
        round(raw_score, 4), round(threshold, 4), 1 if is_defect else 0, decision,
        round(confidence, 4), processing_time_ms, "v1", iso_utc_now
    ))
    conn.commit()
    inspection_id = cursor.lastrowid
    conn.close()
    
    return {
        "success": True,
        "product_id": product_id,
        "product_name": product_name,
        "inspection_id": inspection_id,
        "anomaly_score": round(raw_score, 4),
        "score": round(raw_score, 4),
        "threshold": round(threshold, 4),
        "threshold_used": round(threshold, 4),
        "is_defect": is_defect,
        "decision": decision,
        "confidence": round(confidence, 4),
        "heatmap_url": heatmap_rel_path,
        "overlay_url": overlay_rel_path,
        "processing_time_ms": processing_time_ms,
        "created_at": iso_utc_now,
        "timestamp": ts,
    }

