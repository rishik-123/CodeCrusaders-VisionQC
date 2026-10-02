import os
import sys
import json
from pathlib import Path
from datetime import datetime
import numpy as np
import pandas as pd
from PIL import Image

base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

from backend.app.ml.patchcore_model import PatchcoreInferenceWrapper
from backend.app.ml.threshold import evaluate_threshold_candidates
from backend.app.database.database import init_db, get_db_connection
from backend.app.database.repositories import ProductRepository

PRODUCTS = [
    "bottle", "cable", "capsule", "carpet", "grid",
    "hazelnut", "leather", "metal_nut", "pill", "screw",
    "tile", "toothbrush", "transistor", "wood", "zipper"
]

def calibrate_all():
    init_db()
    print("=" * 95)
    print("CALIBRATING OPTIMAL THRESHOLDS ACROSS ALL 15 VISIONQC PRODUCTS")
    print("=" * 95)

    summary_rows = []

    for product_name in PRODUCTS:
        model_dir = base_dir / "models" / "product_models" / product_name / "v1"
        ckpt_path = model_dir / "model.ckpt"
        if not ckpt_path.exists():
            print(f"[{product_name}] Checkpoint not found at {ckpt_path}. Skipping.")
            continue

        # Locate good and defective images
        p_dir = base_dir / "datasets" / product_name / "test"
        if not p_dir.exists():
            p_dir = base_dir / "datasets" / f"visionqc_{product_name}" / "validation"
            good_files = sorted(list((p_dir / "good").glob("*.png")) + list((p_dir / "good").glob("*.jpg")))
            def_files = sorted(list((p_dir / "defective").glob("*.png")) + list((p_dir / "defective").glob("*.jpg")))
        else:
            good_files = sorted(list((p_dir / "good").glob("*.png")) + list((p_dir / "good").glob("*.jpg")))
            def_files = []
            for sub in p_dir.glob("*"):
                if sub.is_dir() and sub.name != "good":
                    def_files.extend(list(sub.glob("*.png")) + list(sub.glob("*.jpg")))
            def_files = sorted(def_files)

        print(f"\nEvaluating '{product_name}' (Good: {len(good_files)}, Defective: {len(def_files)})...")

        wrapper = PatchcoreInferenceWrapper(checkpoint_path=str(ckpt_path))

        labels = []
        scores = []
        records = []

        for f in good_files:
            with Image.open(f) as img:
                score, _, infer_ms = wrapper.infer(img)
            labels.append(0)
            scores.append(score)
            records.append({
                "filename": f.name,
                "category": "good",
                "ground_truth": 0,
                "anomaly_score": score,
                "inference_time_ms": infer_ms
            })

        for f in def_files:
            with Image.open(f) as img:
                score, _, infer_ms = wrapper.infer(img)
            labels.append(1)
            scores.append(score)
            records.append({
                "filename": f.name,
                "category": "defective",
                "ground_truth": 1,
                "anomaly_score": score,
                "inference_time_ms": infer_ms
            })

        eval_result = evaluate_threshold_candidates(labels=labels, scores=scores, num_thresholds=200)
        best_thresh = eval_result["best_threshold"]
        best_metrics = eval_result["best_metrics"]

        good_scores = [s for l, s in zip(labels, scores) if l == 0]
        def_scores = [s for l, s in zip(labels, scores) if l == 1]

        # 1. Update threshold.json
        threshold_data = {
            "product": product_name,
            "threshold": round(float(best_thresh), 4),
            "selection_method": "max_f1_balanced_accuracy_midpoint",
            "validation_metrics": {
                "f1": round(float(best_metrics["f1"]), 4),
                "precision": round(float(best_metrics["precision"]), 4),
                "recall": round(float(best_metrics["recall"]), 4),
                "accuracy": round(float(best_metrics["accuracy"]), 4),
                "specificity": round(float(best_metrics.get("specificity", 1.0)), 4),
                "image_auroc": round(float(best_metrics.get("image_auroc", 0.0)), 4),
                "tp": best_metrics["tp"],
                "tn": best_metrics["tn"],
                "fp": best_metrics["fp"],
                "fn": best_metrics["fn"]
            },
            "score_range": {
                "min": min(scores),
                "max": max(scores),
                "good_min": min(good_scores) if good_scores else 0.0,
                "good_max": max(good_scores) if good_scores else 0.0,
                "defect_min": min(def_scores) if def_scores else 0.0,
                "defect_max": max(def_scores) if def_scores else 0.0
            },
            "sample_counts": {
                "validation_good": len(good_files),
                "validation_defective": len(def_files)
            },
            "created_at": datetime.utcnow().isoformat()
        }

        with open(model_dir / "threshold.json", "w") as f:
            json.dump(threshold_data, f, indent=2)

        # 2. Update metadata.json
        meta_file = model_dir / "metadata.json"
        if meta_file.exists():
            with open(meta_file, "r") as f:
                meta = json.load(f)
        else:
            meta = {
                "product": product_name,
                "model_type": "PatchCore",
                "backbone": "wide_resnet50_2",
                "model_version": "v1",
                "checkpoint_path": str(ckpt_path)
            }
        meta["threshold"] = round(float(best_thresh), 4)
        meta["updated_at"] = datetime.utcnow().isoformat()
        with open(meta_file, "w") as f:
            json.dump(meta, f, indent=2)

        # 3. Update SQLite Database
        prod = ProductRepository.get_by_name(product_name)
        if not prod:
            prod = ProductRepository.create(
                name=product_name,
                description=f"Industrial visual inspection model for {product_name}"
            )
        prod_id = prod["id"]

        ProductRepository.update_status(
            product_id=prod_id,
            status="READY",
            model_path=str(ckpt_path),
            threshold=round(float(best_thresh), 4),
            active_version="v1"
        )

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE products SET threshold = ? WHERE id = ?", (round(float(best_thresh), 4), prod_id))
            cursor.execute("""
                INSERT OR REPLACE INTO model_versions 
                (product_id, version, model_path, threshold, reference_count, validation_metrics, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, (
                prod_id,
                "v1",
                str(ckpt_path),
                round(float(best_thresh), 4),
                len(good_files),
                json.dumps(threshold_data["validation_metrics"]),
                datetime.utcnow().isoformat()
            ))
            conn.commit()

        # 4. Save results CSV
        res_dir = base_dir / "results" / f"visionqc_{product_name}"
        res_dir.mkdir(parents=True, exist_ok=True)
        with open(res_dir / "validation_metrics.json", "w") as f:
            json.dump(threshold_data, f, indent=2)

        df = pd.DataFrame(records)
        df["predicted"] = (df["anomaly_score"] >= best_thresh).astype(int)
        df["decision"] = df["predicted"].apply(lambda p: "FAIL" if p == 1 else "PASS")
        df.to_csv(res_dir / "validation_predictions.csv", index=False)

        summary_rows.append({
            "Product": product_name,
            "Good Range": f"{min(good_scores):.1f} - {max(good_scores):.1f}",
            "Defect Range": f"{min(def_scores):.1f} - {max(def_scores):.1f}",
            "Calibrated Threshold": f"{best_thresh:.2f}",
            "Accuracy": f"{best_metrics['accuracy']*100:.1f}%",
            "F1": f"{best_metrics['f1']:.3f}",
            "AUROC": f"{best_metrics.get('image_auroc', 0.0):.3f}",
            "TP/TN/FP/FN": f"{best_metrics['tp']}/{best_metrics['tn']}/{best_metrics['fp']}/{best_metrics['fn']}"
        })

    print("\n" + "=" * 105)
    print("CALIBRATION COMPLETE: SUMMARY OF ALL PRODUCTS")
    print("=" * 105)
    sum_df = pd.DataFrame(summary_rows)
    print(sum_df.to_string(index=False))

if __name__ == "__main__":
    calibrate_all()
