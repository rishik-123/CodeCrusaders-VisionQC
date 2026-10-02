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

def prepare_fewshot_dataset(product_name: str, max_refs: int = 25):
    """
    Prepares standard VisionQC few-shot training dataset with 25 reference images.
    """
    prod_dir = base_dir / "datasets" / product_name
    if not prod_dir.exists():
        prod_dir = base_dir / "datasets" / f"visionqc_{product_name}"
        if not prod_dir.exists():
            return None, None

    # Find source good images
    src_good_dir = None
    if (prod_dir / "reference").exists():
        src_good_dir = prod_dir / "reference"
    elif (prod_dir / "train" / "good").exists():
        src_good_dir = prod_dir / "train" / "good"

    if not src_good_dir:
        return None, None

    all_good_files = sorted([f for f in src_good_dir.glob("*") if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg"]])
    if not all_good_files:
        return None, None

    # Create temporary few-shot workspace
    temp_dir = base_dir / "datasets" / f"_temp_fewshot_{product_name}"
    temp_ref_dir = temp_dir / "reference"
    temp_ref_dir.mkdir(parents=True, exist_ok=True)

    # Pick up to 25 reference images
    selected_refs = all_good_files[:max_refs]
    for idx, f in enumerate(selected_refs):
        shutil.copy2(f, temp_ref_dir / f"ref_{idx:03d}{f.suffix}")

    return temp_dir, prod_dir

def train_single_product(product_name: str, device: str = "auto"):
    print("\n" + "=" * 75)
    print(f"TRAINING VISIONQC FEW-SHOT MODEL: PRODUCT '{product_name.upper()}'")
    print("=" * 75)

    temp_dir, original_prod_dir = prepare_fewshot_dataset(product_name, max_refs=25)
    if not temp_dir:
        print(f"[SKIP] No reference images found for '{product_name}'")
        return None

    output_dir = base_dir / "models" / "product_models" / product_name / "v1"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Setup Folder DataModule with 25 reference images
        datamodule = Folder(
            name=product_name,
            root=temp_dir,
            normal_dir="reference",
            train_batch_size=8,
            eval_batch_size=8,
            num_workers=0
        )

        # 2. PatchCore Model with few-shot coreset
        model = Patchcore(
            backbone="wide_resnet50_2",
            pre_trained=True,
            coreset_sampling_ratio=0.02
        )

        # 3. Engine Fit
        t0 = time.time()
        engine = Engine(
            default_root_dir=output_dir,
            accelerator=device if device != "auto" else ("cuda" if torch.cuda.is_available() else "cpu"),
            devices=1,
            max_epochs=1,
            limit_val_batches=0,
            num_sanity_val_steps=0
        )

        print(f"Constructing PatchCore memory bank from 25 reference images for {product_name}...")
        engine.fit(model=model, datamodule=datamodule)
        train_duration = round(time.time() - t0, 2)
        print(f"Training completed in {train_duration}s.")

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

        # 5. Metadata and threshold
        threshold = 40.0
        thresh_data = {
            "product": product_name,
            "threshold": threshold,
            "model_version": "v1",
            "training_duration_seconds": train_duration,
            "reference_count": 25,
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
            "reference_count": 25,
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

        print(f"[SUCCESS] Product '{product_name}' trained and ready in DB (ID: {prod_id})!")
        return prod_id

    finally:
        # Clean up temporary reference dir
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

def train_all():
    init_db()
    print("=" * 80)
    print(f"VISIONQC RAPID FEW-SHOT TRAINING: {len(ALL_PRODUCTS)} PRODUCTS")
    print("=" * 80)
    t_start = time.time()
    success = []
    
    for prod in ALL_PRODUCTS:
        try:
            pid = train_single_product(prod)
            if pid is not None:
                success.append(prod)
        except Exception as e:
            print(f"[ERROR] Failed training for {prod}: {e}")

    total_time = round(time.time() - t_start, 2)
    print("\n" + "=" * 80)
    print(f"BATCH TRAINING FINISHED IN {total_time}s")
    print(f"Successfully Trained: {len(success)} / {len(ALL_PRODUCTS)} Products")
    print(f"Products Ready: {', '.join(success)}")
    print("=" * 80)

if __name__ == "__main__":
    train_all()
