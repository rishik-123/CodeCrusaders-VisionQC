import os
import sys
import json
import time
import shutil
import argparse
from pathlib import Path
from datetime import datetime
import torch
import anomalib
from anomalib.models import Patchcore
from anomalib.engine import Engine
from anomalib.data import Folder

def train_visionqc(
    product_name: str = "bottle",
    reference_dir: Path = None,
    output_dir: Path = None,
    version: str = "v1",
    backbone: str = "wide_resnet50_2",
    device: str = "auto"
):
    base_dir = Path(__file__).resolve().parent.parent.parent

    if reference_dir is None:
        reference_dir = base_dir / "datasets" / f"visionqc_{product_name}" / "reference"
    else:
        reference_dir = Path(reference_dir).resolve()

    if output_dir is None:
        output_dir = base_dir / "models" / "product_models" / product_name / version
    else:
        output_dir = Path(output_dir).resolve()

    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(f"VISIONQC TRAINING EXPERIMENT: PRODUCT '{product_name}' (Version: {version})")
    print("=" * 70)
    print(f"Reference Image Directory : {reference_dir}")
    print(f"Model Output Directory    : {output_dir}")
    print(f"Backbone Architecture     : {backbone}")
    print(f"Anomalib Version          : {anomalib.__version__}")
    print(f"PyTorch Version           : {torch.__version__}")
    print(f"Device                    : {device}")

    # 1. Verify Reference Images
    ref_files = sorted([f for f in reference_dir.glob("*") if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg"]])
    ref_count = len(ref_files)
    print(f"Found {ref_count} reference images.")

    if ref_count < 20:
        raise ValueError(f"Insufficient reference images! Minimum required is 20, found {ref_count}")

    # 2. Save Reference Manifest
    manifest = {
        "product": product_name,
        "version": version,
        "reference_count": ref_count,
        "reference_images": [f.name for f in ref_files],
        "created_at": datetime.utcnow().isoformat()
    }
    with open(output_dir / "reference_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Saved reference manifest to {output_dir / 'reference_manifest.json'}")

    # 3. Setup Dataset DataModule using Folder datamodule
    dataset_root = reference_dir.parent
    rel_normal_dir = reference_dir.name

    print("\nConfiguring Anomalib Folder DataModule...")
    datamodule = Folder(
        name=product_name,
        root=dataset_root,
        normal_dir=rel_normal_dir,
        normal_test_dir=rel_normal_dir,
        train_batch_size=8,
        eval_batch_size=8,
        num_workers=0
    )

    # 4. Initialize PatchCore Model
    print("Initializing PatchCore model...")
    model = Patchcore(
        backbone=backbone,
        pre_trained=True,
        coreset_sampling_ratio=0.1
    )

    # 5. Initialize Engine and Train
    print("\nStarting Training / Memory Bank Construction (Engine.fit)...")
    start_time = time.time()

    engine = Engine(
        default_root_dir=output_dir,
        accelerator=device,
        devices=1,
        max_epochs=1,
        limit_val_batches=0,
        num_sanity_val_steps=0
    )

    engine.fit(model=model, datamodule=datamodule)
    training_duration_s = round(time.time() - start_time, 2)
    print(f"\nTraining completed in {training_duration_s} seconds.")

    # 6. Locate and save the checkpoint to canonical location
    # Anomalib saves weights in lightning/model.ckpt or similar
    ckpt_files = list(output_dir.rglob("*.ckpt"))
    final_ckpt = output_dir / "model.ckpt"

    if ckpt_files:
        # Pick the most recently created or direct model.ckpt
        best_ckpt = max(ckpt_files, key=lambda p: p.stat().st_mtime)
        if best_ckpt != final_ckpt:
            shutil.copy2(best_ckpt, final_ckpt)
        print(f"Canonical model checkpoint saved at: {final_ckpt}")
    else:
        raise RuntimeError("Training finished but no .ckpt file was produced!")

    # 7. Save Model Metadata
    metadata = {
        "product": product_name,
        "model_type": "PatchCore",
        "anomalib_version": anomalib.__version__,
        "pytorch_version": torch.__version__,
        "backbone": backbone,
        "coreset_sampling_ratio": 0.1,
        "reference_count": ref_count,
        "model_version": version,
        "training_duration_seconds": training_duration_s,
        "created_at": datetime.utcnow().isoformat(),
        "image_preprocessing": {
            "resize": [256, 256],
            "center_crop": [224, 224],
            "normalization": "imagenet"
        },
        "feature_extractor": f"timm/{backbone}",
        "checkpoint_path": str(final_ckpt.relative_to(base_dir) if final_ckpt.is_relative_to(base_dir) else final_ckpt)
    }

    with open(output_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to {output_dir / 'metadata.json'}")

    print("=" * 70)
    print(f"TRAINING SUCCESSFUL: {product_name} ({version})")
    print("=" * 70)
    return metadata

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionQC PatchCore Training Pipeline")
    parser.add_argument("--product", type=str, default="bottle", help="Product name")
    parser.add_argument("--reference-dir", type=str, default=None, help="Path to reference good images")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory for model and metadata")
    parser.add_argument("--version", type=str, default="v1", help="Model version tag")
    parser.add_argument("--backbone", type=str, default="wide_resnet50_2", help="Feature extractor backbone")
    args = parser.parse_args()

    train_visionqc(
        product_name=args.product,
        reference_dir=args.reference_dir,
        output_dir=args.output_dir,
        version=args.version,
        backbone=args.backbone
    )
