import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
import pandas as pd
from tqdm import tqdm
from PIL import Image

# Add parent directory to sys.path
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

from backend.app.ml.patchcore_model import PatchcoreInferenceWrapper
from backend.app.ml.threshold import compute_binary_metrics
from backend.app.ml.heatmap import generate_anomaly_heatmap_and_overlay

def test_visionqc(
    product_name: str = "bottle",
    model_dir: Path = None,
    test_dir: Path = None,
    output_dir: Path = None
):
    if model_dir is None:
        model_dir = base_dir / "models" / "product_models" / product_name / "v1"
    else:
        model_dir = Path(model_dir).resolve()

    if test_dir is None:
        test_dir = base_dir / "datasets" / f"visionqc_{product_name}" / "test"
    else:
        test_dir = Path(test_dir).resolve()

    if output_dir is None:
        output_dir = base_dir / "results" / f"visionqc_{product_name}"
    else:
        output_dir = Path(output_dir).resolve()

    output_dir.mkdir(parents=True, exist_ok=True)
    heatmaps_dir = output_dir / "test_heatmaps"
    heatmaps_dir.mkdir(parents=True, exist_ok=True)

    ckpt_path = model_dir / "model.ckpt"
    threshold_file = model_dir / "threshold.json"

    if not ckpt_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at: {ckpt_path}")
    if not threshold_file.exists():
        raise FileNotFoundError(f"Frozen threshold file not found at: {threshold_file}. Run validation first.")

    with open(threshold_file, "r") as f:
        thresh_info = json.load(f)
    frozen_threshold = float(thresh_info["threshold"])

    print("=" * 70)
    print(f"VISIONQC FINAL TEST EVALUATION: {product_name}")
    print("=" * 70)
    print(f"Model Checkpoint   : {ckpt_path}")
    print(f"Frozen Threshold   : {frozen_threshold:.5f} (Derived strictly from validation set)")
    print(f"Test Dataset Path  : {test_dir}")

    # Load model
    wrapper = PatchcoreInferenceWrapper(checkpoint_path=str(ckpt_path))

    good_dir = test_dir / "good"
    def_dir = test_dir / "defective"

    good_files = sorted(list(good_dir.glob("*.png")) + list(good_dir.glob("*.jpg")))
    def_files = sorted(list(def_dir.glob("*.png")) + list(def_dir.glob("*.jpg")))

    print(f"Evaluating {len(good_files)} good test images, {len(def_files)} defective test images (Total: {len(good_files) + len(def_files)})...")

    records = []
    labels = []
    scores = []

    # 1. Good test images (label 0)
    print("Processing unseen normal test images...")
    for f in tqdm(good_files):
        with Image.open(f) as img:
            score, amap, infer_ms = wrapper.infer(img)
            heatmap_path = heatmaps_dir / f"{f.stem}_heatmap.png"
            overlay_path = heatmaps_dir / f"{f.stem}_overlay.png"
            generate_anomaly_heatmap_and_overlay(amap, img, heatmap_path, overlay_path)

        labels.append(0)
        scores.append(score)
        pred = 1 if score >= frozen_threshold else 0
        records.append({
            "filename": f.name,
            "ground_truth_category": "good",
            "ground_truth_label": 0,
            "anomaly_score": round(score, 5),
            "threshold": round(frozen_threshold, 5),
            "predicted_label": pred,
            "decision": "FAIL" if pred == 1 else "PASS",
            "is_correct": pred == 0,
            "inference_time_ms": infer_ms,
            "heatmap_path": str(heatmap_path.relative_to(base_dir)),
            "overlay_path": str(overlay_path.relative_to(base_dir))
        })

    # 2. Defective test images (label 1)
    print("Processing unseen defective test images...")
    for f in tqdm(def_files):
        with Image.open(f) as img:
            score, amap, infer_ms = wrapper.infer(img)
            heatmap_path = heatmaps_dir / f"{f.stem}_heatmap.png"
            overlay_path = heatmaps_dir / f"{f.stem}_overlay.png"
            generate_anomaly_heatmap_and_overlay(amap, img, heatmap_path, overlay_path)

        labels.append(1)
        scores.append(score)
        pred = 1 if score >= frozen_threshold else 0
        records.append({
            "filename": f.name,
            "ground_truth_category": "defective",
            "ground_truth_label": 1,
            "anomaly_score": round(score, 5),
            "threshold": round(frozen_threshold, 5),
            "predicted_label": pred,
            "decision": "FAIL" if pred == 1 else "PASS",
            "is_correct": pred == 1,
            "inference_time_ms": infer_ms,
            "heatmap_path": str(heatmap_path.relative_to(base_dir)),
            "overlay_path": str(overlay_path.relative_to(base_dir))
        })

    # 3. Compute final metrics
    metrics = compute_binary_metrics(labels=labels, scores=scores, threshold=frozen_threshold)
    
    final_results = {
        "product": product_name,
        "evaluation_timestamp": datetime.utcnow().isoformat(),
        "model_checkpoint": str(ckpt_path.relative_to(base_dir)),
        "frozen_threshold": round(frozen_threshold, 5),
        "test_counts": {
            "good_samples": len(good_files),
            "defective_samples": len(def_files),
            "total_samples": len(good_files) + len(def_files)
        },
        "metrics": {
            "accuracy": round(metrics["accuracy"], 4),
            "precision": round(metrics["precision"], 4),
            "recall": round(metrics["recall"], 4),
            "f1_score": round(metrics["f1"], 4),
            "specificity": round(metrics["specificity"], 4),
            "false_positive_rate": round(metrics["fpr"], 4),
            "false_negative_rate": round(metrics["fnr"], 4),
            "image_auroc": round(metrics["image_auroc"], 4)
        },
        "confusion_matrix": metrics["confusion_matrix"]
    }

    # Save outputs
    with open(output_dir / "final_metrics.json", "w") as f:
        json.dump(final_results, f, indent=2)

    with open(output_dir / "confusion_matrix.json", "w") as f:
        json.dump(metrics["confusion_matrix"], f, indent=2)

    df = pd.DataFrame(records)
    df.to_csv(output_dir / "predictions.csv", index=False)

    print("\n" + "=" * 70)
    print("FINAL TEST BENCHMARK RESULTS")
    print("=" * 70)
    print(f"Accuracy               : {metrics['accuracy']*100:.2f}%")
    print(f"Precision              : {metrics['precision']*100:.2f}%")
    print(f"Recall (Defect Catch)  : {metrics['recall']*100:.2f}%")
    print(f"F1 Score               : {metrics['f1']:.4f}")
    print(f"Specificity            : {metrics['specificity']*100:.2f}%")
    print(f"False Positive Rate    : {metrics['fpr']*100:.2f}%")
    print(f"False Negative Rate    : {metrics['fnr']*100:.2f}%")
    print(f"Image AUROC            : {metrics['image_auroc']:.4f}")
    print("-" * 70)
    print(f"Confusion Matrix       : TP={metrics['tp']} (Caught Defects), TN={metrics['tn']} (Normal Passes)")
    print(f"                         FP={metrics['fp']} (False Rejections), FN={metrics['fn']} (Missed Defects)")
    print("=" * 70)
    print(f"Artifacts saved to: {output_dir}")

    return final_results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionQC Final Test Pipeline")
    parser.add_argument("--product", type=str, default="bottle")
    parser.add_argument("--model-dir", type=str, default=None)
    parser.add_argument("--test-dir", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    args = parser.parse_args()

    test_visionqc(product_name=args.product, model_dir=args.model_dir, test_dir=args.test_dir, output_dir=args.output_dir)
