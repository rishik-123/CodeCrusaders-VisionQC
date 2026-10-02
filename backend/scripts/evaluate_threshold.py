import os
import sys
import json
import argparse
from pathlib import Path
import pandas as pd
import numpy as np

# Add parent directory to sys.path
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

from backend.app.ml.threshold import compute_binary_metrics

def evaluate_threshold_tuning(
    product_name: str = "bottle",
    new_threshold: float = None,
    predictions_csv: Path = None
):
    if predictions_csv is None:
        predictions_csv = base_dir / "results" / f"visionqc_{product_name}" / "validation_predictions.csv"
        if not predictions_csv.exists():
            predictions_csv = base_dir / "results" / f"visionqc_{product_name}" / "predictions.csv"

    if not predictions_csv.exists():
        raise FileNotFoundError(f"Predictions file not found at {predictions_csv}. Run validation or test first.")

    df = pd.read_csv(predictions_csv)
    labels = df["ground_truth" if "ground_truth" in df.columns else "ground_truth_label"].tolist()
    scores = df["anomaly_score"].tolist()

    if new_threshold is None:
        print(f"Loaded {len(scores)} evaluation samples.")
        print(f"Anomaly Score Range: Min={min(scores):.5f}, Max={max(scores):.5f}, Mean={np.mean(scores):.5f}")
        return

    metrics = compute_binary_metrics(labels=labels, scores=scores, threshold=new_threshold)
    print("=" * 65)
    print(f"THRESHOLD TUNING SIMULATION FOR: {product_name}")
    print(f"Evaluated Threshold: {new_threshold:.5f}")
    print("=" * 65)
    print(f"Accuracy               : {metrics['accuracy']*100:.2f}%")
    print(f"Precision              : {metrics['precision']*100:.2f}%")
    print(f"Recall (Catch Rate)    : {metrics['recall']*100:.2f}%")
    print(f"F1 Score               : {metrics['f1']:.4f}")
    print(f"False Alarm Rate (FPR) : {metrics['fpr']*100:.2f}%")
    print(f"Defect Escape Rate (FNR): {metrics['fnr']*100:.2f}%")
    print("-" * 65)
    print(f"Confusion Matrix       : TP={metrics['tp']}, TN={metrics['tn']}, FP={metrics['fp']}, FN={metrics['fn']}")
    print("=" * 65)
    return metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate threshold impact on historical validation/test predictions")
    parser.add_argument("--product", type=str, default="bottle")
    parser.add_argument("--threshold", type=float, default=None, help="Candidate threshold to evaluate")
    parser.add_argument("--csv", type=str, default=None, help="Path to predictions.csv")
    args = parser.parse_args()

    evaluate_threshold_tuning(product_name=args.product, new_threshold=args.threshold, predictions_csv=args.csv)
