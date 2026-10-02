import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.metrics import precision_recall_fscore_support, accuracy_score, confusion_matrix, roc_auc_score

def evaluate_threshold_candidates(
    labels: List[int],
    scores: List[float],
    num_thresholds: int = 100
) -> Dict[str, Any]:
    """
    Evaluates candidate thresholds from min(scores) to max(scores) on validation set.
    Returns the best threshold maximizing F1 score (prioritizing defect recall on ties),
    along with full metrics curve.
    """
    labels_arr = np.array(labels)
    scores_arr = np.array(scores)

    if len(np.unique(labels_arr)) < 2:
        raise ValueError("Evaluation requires both normal (0) and defective (1) samples.")

    min_s = float(scores_arr.min())
    max_s = float(scores_arr.max())
    step = (max_s - min_s) / max(num_thresholds, 10)
    candidate_thresholds = np.linspace(min_s, max_s, num_thresholds)

    best_thresh = float(candidate_thresholds[0])
    best_f1 = -1.0
    best_metrics = {}

    candidates_history = []

    for th in candidate_thresholds:
        preds = (scores_arr >= th).astype(int)
        acc = float(accuracy_score(labels_arr, preds))
        p, r, f1, _ = precision_recall_fscore_support(labels_arr, preds, average="binary", zero_division=0)
        
        cm = confusion_matrix(labels_arr, preds, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

        metrics = {
            "threshold": float(th),
            "f1": float(f1),
            "precision": float(p),
            "recall": float(r),
            "accuracy": float(acc),
            "fpr": fpr,
            "fnr": fnr,
            "specificity": specificity,
            "tp": int(tp),
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn)
        }
        candidates_history.append(metrics)

        # Criteria: maximize F1, then higher recall (lower defect escapes), then higher precision
        if (f1 > best_f1) or (abs(f1 - best_f1) < 1e-4 and r > best_metrics.get("recall", 0)):
            best_f1 = f1
            best_thresh = float(th)
            best_metrics = metrics

    # Image AUROC
    try:
        auroc = float(roc_auc_score(labels_arr, scores_arr))
    except Exception:
        auroc = 0.0
    best_metrics["image_auroc"] = auroc

    return {
        "best_threshold": best_thresh,
        "best_metrics": best_metrics,
        "all_candidates": candidates_history,
        "score_range": {"min": min_s, "max": max_s}
    }

def compute_binary_metrics(
    labels: List[int],
    scores: List[float],
    threshold: float
) -> Dict[str, Any]:
    """
    Computes complete classification metrics for a frozen threshold.
    """
    labels_arr = np.array(labels)
    scores_arr = np.array(scores)
    preds = (scores_arr >= threshold).astype(int)

    acc = float(accuracy_score(labels_arr, preds))
    p, r, f1, _ = precision_recall_fscore_support(labels_arr, preds, average="binary", zero_division=0)
    cm = confusion_matrix(labels_arr, preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    try:
        auroc = float(roc_auc_score(labels_arr, scores_arr))
    except Exception:
        auroc = 0.0

    return {
        "threshold": float(threshold),
        "accuracy": acc,
        "precision": float(p),
        "recall": float(r),
        "f1": float(f1),
        "specificity": specificity,
        "fpr": fpr,
        "fnr": fnr,
        "tp": int(tp),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "image_auroc": auroc,
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp)
        }
    }
