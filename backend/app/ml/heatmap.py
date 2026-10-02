import os
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional
from pathlib import Path

def generate_anomaly_heatmap_and_overlay(
    anomaly_map: np.ndarray,
    original_image: Image.Image,
    output_heatmap_path: Optional[Path] = None,
    output_overlay_path: Optional[Path] = None,
    alpha: float = 0.45,
    colormap: int = cv2.COLORMAP_JET
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Takes an anomaly map (2D numpy array) from PatchCore and the original PIL image.
    Generates:
    1. Normalized RGB Heatmap
    2. Blended Overlay of original image + heatmap
    Saves them to disk if output paths are provided.
    """
    # Ensure anomaly map is 2D numpy float array
    if isinstance(anomaly_map, np.ndarray):
        arr = anomaly_map.squeeze()
    else:
        arr = np.array(anomaly_map).squeeze()

    orig_w, orig_h = original_image.size
    orig_np = np.array(original_image)
    if orig_np.ndim == 2:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_GRAY2RGB)
    elif orig_np.shape[2] == 4:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_RGBA2RGB)

    # Normalize anomaly map to 0 - 255
    min_val = arr.min()
    max_val = arr.max()
    if max_val > min_val:
        norm_map = ((arr - min_val) / (max_val - min_val) * 255.0).astype(np.uint8)
    else:
        norm_map = np.zeros(arr.shape, dtype=np.uint8)

    # Resize normalized anomaly map to match original image dimensions
    heatmap_resized = cv2.resize(norm_map, (orig_w, orig_h), interpolation=cv2.INTER_CUBIC)

    # Apply colormap to generate color heatmap (BGR -> RGB)
    colored_heatmap_bgr = cv2.applyColorMap(heatmap_resized, colormap)
    heatmap_rgb = cv2.cvtColor(colored_heatmap_bgr, cv2.COLOR_BGR2RGB)

    # Blend original image and heatmap for overlay
    overlay_rgb = cv2.addWeighted(orig_np, 1.0 - alpha, heatmap_rgb, alpha, 0)

    # Save to disk if requested
    if output_heatmap_path:
        output_heatmap_path = Path(output_heatmap_path)
        output_heatmap_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(heatmap_rgb).save(output_heatmap_path)

    if output_overlay_path:
        output_overlay_path = Path(output_overlay_path)
        output_overlay_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(overlay_rgb).save(output_overlay_path)

    return heatmap_rgb, overlay_rgb
