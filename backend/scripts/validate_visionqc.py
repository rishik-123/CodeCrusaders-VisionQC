import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
import pandas as pd
from tqdm import tqdm

# Add parent directory to sys.path
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

from backend.app.ml.patchcore_model import PatchcoreInferenceWrapper
from backend.app.ml.threshold import evaluate_threshold_candidates
from PIL import Image

def validate_visionqc(
    product_name: str = "bottle",
    model_dir: Path = None,
    val_dir: Path = None
):
    if model_dir is None:
        model_dir = base_dir / "models" / "product_models" / product_name / "v1"
    else:
        model_dir = Path(model_dir).resolve()

    if val_dir is None:
        val_dir = base_dir / "datasets" / f"visionqc_{product_name}" / "validation"
    else:
        val_dir = Path(val_dir).resolve()

    ckpt_path = model_dir / "model.ckpt"
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {ckpt_path}")

    print("=" * 70)
    print(f"VISIONQC VALIDATION & THRESHOLD SELECTION: {product_name}")
    print("=" * 70)
    print(f"Model Checkpoint : {ckpt_path}")
    print(f"Validation Folder: {val_dir}")

    # Load model
    wrapper = PatchcoreInferenceWrapper(checkpoint_path=str(ckpt_path))

    good_dir = val_dir / "good"
    def_dir = val_dir / "defective"

    good_files = sorted(list(good_dir.glob("*.png")) + list(good_dir.glob("*.jpg")))
    def_files = sorted(list(def_dir.glob("*.png")) + list(def_dir.glob("*.jpg")))

    print(f"\nFound {len(good_files)} good validation images, {len(def_files)} defective validation images.")

    records = []
    labels = []
    scores = []

    # 1. Run on good images (label=0)
    print("Evaluating good validation images...")
    for f in tqdm(good_files):
        with Image.open(f) as img:
            score, amap, infer_ms = wrapper.infer(img)
        labels.append(0)
        scores.append(score)
        records.append({
            "filename": f.name,
            "category": "good",
            "ground_truth": 0,
            "anomaly_score": score,
            "inference_time_ms": infer_ms
        })

    # 2. Run on defective images (label=1)
    print("Evaluating defective validation images...")
    for f in tqdm(def_files):
        with Image.open(f) as img:
            score, amap, infer_ms = wrapper.infer(img)
        labels.append(1)
        scores.append(score)
        records.append({
            "filename": f.name,
            "category": "defective",
            "ground_truth": 1,
            "anomaly_score": score,
            "inference_time_ms": infer_ms
        })

    # 3. Candidate threshold evaluation
    print("\nCalculating candidate thresholds & ROC metrics...")
    eval_result = evaluate_threshold_candidates(labels=labels, scores=scores, num_thresholds=100)
    best_thresh = eval_result["best_threshold"]
    best_metrics = eval_result["best_metrics"]

    print("\n" + "=" * 70)
    print("OPTIMAL VALIDATION THRESHOLD DETERMINED")
    print("=" * 70)
    print(f"Selected Threshold : {best_thresh:.5f}")
    print(f"Validation F1      : {best_metrics['f1']:.4f}")
    print(f"Validation Precision: {best_metrics['precision']:.4f}")
    print(f"Validation Recall  : {best_metrics['recall']:.4f}")
    print(f"Validation Accuracy: {best_metrics['accuracy']:.4f}")
    print(f"Image AUROC        : {best_metrics.get('image_auroc', 0.0):.4f}")
    print(f"Confusion Matrix   : TP={best_metrics['tp']}, TN={best_metrics['tn']}, FP={best_metrics['fp']}, FN={best_metrics['fn']}")

    # 4. Save frozen threshold.json
    threshold_data = {
        "product": product_name,
        "threshold": round(float(best_thresh), 5),
        "selection_method": "max_f1_with_recall_priority",
        "validation_metrics": {
            "f1": round(float(best_metrics["f1"]), 4),
            "precision": round(float(best_metrics["precision"]), 4),
            "recall": round(float(best_metrics["recall"]), 4),
            "accuracy": round(float(best_metrics["accuracy"]), 4),
            "image_auroc": round(float(best_metrics.get("image_auroc", 0.0)), 4),
            "tp": best_metrics["tp"],
            "tn": best_metrics["tn"],
            "fp": best_metrics["fp"],
            "fn": best_metrics["fn"]
        },
        "score_range": eval_result["score_range"],
        "sample_counts": {
            "validation_good": len(good_files),
            "validation_defective": len(def_files)
        },
        "created_at": datetime.utcnow().isoformat()
    }

    threshold_file = model_dir / "threshold.json"
    with open(threshold_file, "w") as f:
        json.dump(threshold_data, f, indent=2)
    print(f"\nSaved frozen threshold configuration to: {threshold_file}")

    # Save validation records
    results_dir = base_dir / "results" / f"visionqc_{product_name}"
    results_dir.mkdir(parents=True, exist_ok=True)
    
    with open(results_dir / "validation_metrics.json", "w") as f:
        json.dump(threshold_data, f, indent=2)

    df = pd.DataFrame(records)
    df["predicted"] = (df["anomaly_score"] >= best_thresh).astype(int)
    df["decision"] = df["predicted"].apply(lambda p: "FAIL" if p == 1 else "PASS")
    df.to_csv(results_dir / "validation_predictions.csv", index=False)
    print(f"Saved validation predictions to: {results_dir / 'validation_predictions.csv'}")

    return threshold_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionQC Validation & Threshold Selection")
    parser.add_argument("--product", type=str, default="bottle")
    parser.add_argument("--model-dir", type=str, default=None)
    parser.add_argument("--val-dir", type=str, default=None)
    args = parser.parse_args()

    validate_visionqc(product_name=args.product, model_dir=args.model_dir, val_dir=args.val_dir)
