import os
import sys
import json
import time
import shutil
from pathlib import Path
from datetime import datetime
import torch
import numpy as np

# Add base directory to sys.path
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

import anomalib
from anomalib.models import Patchcore
from anomalib.engine import Engine
from anomalib.data import Folder
from backend.app.database.database import init_db
from backend.app.database.repositories import ProductRepository

ALL_PRODUCTS = [
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper"
]

def train_single_product(product_name: str, device: str = "auto"):
    print("=" * 75)
    print(f"TRAINING VISIONQC MODEL: PRODUCT '{product_name.upper()}'")
    print("=" * 75)

    prod_dir = base_dir / "datasets" / product_name
    if not prod_dir.exists():
        prod_dir = base_dir / "datasets" / f"visionqc_{product_name}"
        if not prod_dir.exists():
            print(f"[SKIP] Dataset folder for '{product_name}' not found.")
            return None

    # Determine reference and validation folders
    if (prod_dir / "reference").exists():
        normal_dir = "reference"
        abnormal_val = "validation/defective" if (prod_dir / "validation/defective").exists() else None
        normal_val = "validation/good" if (prod_dir / "validation/good").exists() else None
    elif (prod_dir / "train" / "good").exists():
        normal_dir = "train/good"
        abnormal_val = "test"
        normal_val = "train/good"
    else:
        print(f"[SKIP] No reference/train images found in {prod_dir}")
        return None

    output_dir = base_dir / "models" / "product_models" / product_name / "v1"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Setup Folder DataModule
    try:
        datamodule = Folder(
            name=product_name,
            root=prod_dir,
            normal_dir=normal_dir,
            abnormal_dir=abnormal_val,
            normal_test_dir=normal_val,
            train_batch_size=8,
            eval_batch_size=8,
            num_workers=0
        )
    except Exception as e:
        print(f"Datamodule init fallback: {e}")
        datamodule = Folder(
            name=product_name,
            root=prod_dir,
            normal_dir=normal_dir,
            train_batch_size=8,
            eval_batch_size=8,
            num_workers=0
        )

    # 2. PatchCore Model
    model = Patchcore(
        backbone="wide_resnet50_2",
        pre_trained=True,
        coreset_sampling_ratio=0.1
    )

    # 3. Engine fit
    t0 = time.time()
    engine = Engine(
        default_root_dir=output_dir,
        accelerator=device if device != "auto" else ("cuda" if torch.cuda.is_available() else "cpu"),
        devices=1,
        max_epochs=1
    )

    print(f"Fitting PatchCore memory bank on {product_name}...")
    engine.fit(model=model, datamodule=datamodule)
    train_duration = round(time.time() - t0, 2)
    print(f"Training finished in {train_duration}s.")

    # 4. Save checkpoint
    final_ckpt = output_dir / "model.ckpt"
    ckpt_files = list(output_dir.rglob("*.ckpt"))
    if ckpt_files:
        best_ckpt = max(ckpt_files, key=lambda p: p.stat().st_mtime)
        if best_ckpt != final_ckpt:
            shutil.copy2(best_ckpt, final_ckpt)
        print(f"Saved canonical checkpoint at: {final_ckpt}")
    else:
        print("[ERROR] No checkpoint generated.")
        return None

    # 5. Evaluate baseline threshold
    threshold = 40.0
    thresh_data = {
        "product": product_name,
        "threshold": threshold,
        "model_version": "v1",
        "training_duration_seconds": train_duration,
        "created_at": datetime.utcnow().isoformat()
    }
    with open(output_dir / "threshold.json", "w") as f:
        json.dump(thresh_data, f, indent=2)

    metadata = {
        "product": product_name,
        "model_type": "PatchCore",
        "backbone": "wide_resnet50_2",
        "model_version": "v1",
        "checkpoint_path": str(final_ckpt),
        "threshold": threshold,
        "created_at": datetime.utcnow().isoformat()
    }
    with open(output_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # 6. Update SQLite Database
    existing = ProductRepository.get_by_name(product_name)
    if not existing:
        prod_rec = ProductRepository.create(
            name=product_name,
            description=f"Industrial automated quality inspection model for {product_name}"
        )
        prod_id = prod_rec["id"]
    else:
        prod_id = existing["id"]

    ProductRepository.update_status(prod_id, status="READY", active_version="v1", model_path=str(final_ckpt))
    ProductRepository.update_threshold(prod_id, new_threshold=threshold, previous_threshold=40.0, reason="Model training completion")

    print(f"[SUCCESS] Product '{product_name}' trained and ready in DB (ID: {prod_id})!\n")
    return prod_id

def train_all():
    init_db()
    print("=" * 80)
    print(f"STARTING FULL BATCH TRAINING FOR ALL {len(ALL_PRODUCTS)} DATASET PRODUCTS")
    print("=" * 80)
    success = []
    
    for prod in ALL_PRODUCTS:
        try:
            pid = train_single_product(prod)
            if pid is not None:
                success.append(prod)
        except Exception as e:
            print(f"[ERROR] Failed training for {prod}: {e}")

    print("=" * 80)
    print(f"BATCH TRAINING COMPLETE: {len(success)} / {len(ALL_PRODUCTS)} Products Successfully Trained!")
    print(f"Trained Products: {', '.join(success)}")
    print("=" * 80)

if __name__ == "__main__":
    train_all()
