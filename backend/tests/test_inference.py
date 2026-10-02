import os
import pytest
import numpy as np
from PIL import Image
from backend.app.ml.preprocessing import validate_image_bytes, preprocess_image_for_inference
from backend.app.ml.heatmap import generate_anomaly_heatmap_and_overlay
from backend.app.ml.threshold import evaluate_threshold_candidates, compute_binary_metrics

def test_image_preprocessing():
    # Create valid synthetic RGB image
    img = Image.new("RGB", (300, 300), color=(128, 128, 128))
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()

    validated_img = validate_image_bytes(data, filename="sample.png")
    assert validated_img.size == (300, 300)

    tensor, pil_out = preprocess_image_for_inference(validated_img)
    assert tensor.shape == (1, 3, 256, 256)

def test_heatmap_generation():
    img = Image.new("RGB", (200, 200), color=(200, 200, 200))
    amap = np.random.rand(28, 28).astype(np.float32)

    heatmap_rgb, overlay_rgb = generate_anomaly_heatmap_and_overlay(amap, img)
    assert heatmap_rgb.shape == (200, 200, 3)
    assert overlay_rgb.shape == (200, 200, 3)

def test_threshold_metrics():
    labels = [0, 0, 0, 0, 1, 1, 1, 1]
    scores = [0.1, 0.2, 0.25, 0.3, 0.6, 0.7, 0.85, 0.9]

    res = evaluate_threshold_candidates(labels, scores, num_thresholds=20)
    assert "best_threshold" in res
    assert 0.3 <= res["best_threshold"] <= 0.6
    assert res["best_metrics"]["f1"] == 1.0

    metrics = compute_binary_metrics(labels, scores, threshold=0.5)
    assert metrics["accuracy"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["f1"] == 1.0
