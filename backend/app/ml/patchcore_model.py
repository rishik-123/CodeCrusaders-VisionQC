import os
import time
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import torch
import numpy as np
from PIL import Image

from anomalib.models import Patchcore
from backend.app.ml.preprocessing import preprocess_image_for_inference

class PatchcoreInferenceWrapper:
    """
    Production wrapper for Anomalib PatchCore model inference.
    Loads and caches checkpoint in memory, handles image preprocessing,
    and extracts anomaly scores and anomaly heatmaps.
    """
    def __init__(self, checkpoint_path: str, device: Optional[str] = None):
        self.checkpoint_path = str(Path(checkpoint_path).resolve())
        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(f"Checkpoint not found at: {self.checkpoint_path}")

        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        print(f"Loading Patchcore weights from {self.checkpoint_path} to {self.device}...")
        try:
            self.model = Patchcore.load_from_checkpoint(self.checkpoint_path, weights_only=False)
        except TypeError:
            self.model = Patchcore.load_from_checkpoint(self.checkpoint_path)
        self.model.to(self.device)
        self.model.eval()
        print("Patchcore model loaded successfully into memory.")

    def infer(self, pil_image: Image.Image) -> Tuple[float, np.ndarray, float]:
        """
        Runs inference on a PIL image.
        Returns:
            (anomaly_score: float, anomaly_map: np.ndarray, inference_time_ms: float)
        """
        t0 = time.time()
        tensor, _ = preprocess_image_for_inference(pil_image)
        tensor = tensor.to(self.device)

        with torch.no_grad():
            if hasattr(self.model, "model"):
                out = self.model.model(tensor)
            else:
                out = self.model(tensor)

            # 1. Extract Anomaly Score
            score = 0.0
            if hasattr(out, "pred_score") and out.pred_score is not None:
                score = float(out.pred_score.cpu().item())
            elif isinstance(out, dict) and "pred_score" in out:
                score = float(out["pred_score"].cpu().item())
            elif isinstance(out, (tuple, list)):
                for item in out:
                    if isinstance(item, torch.Tensor) and (item.ndim == 0 or item.numel() == 1):
                        score = float(item.cpu().item())
                        break
                else:
                    if len(out) > 0 and isinstance(out[0], torch.Tensor):
                        score = float(out[0].max().cpu().item())
            elif hasattr(out, "cpu") and hasattr(out, "item"):
                score = float(out.cpu().item())

            # 2. Extract Anomaly Map
            amap = np.zeros((256, 256), dtype=np.float32)
            if hasattr(out, "anomaly_map") and out.anomaly_map is not None:
                raw_amap = out.anomaly_map
                if isinstance(raw_amap, torch.Tensor):
                    amap = raw_amap.squeeze().cpu().numpy()
            elif isinstance(out, dict) and "anomaly_map" in out:
                raw_amap = out["anomaly_map"]
                if isinstance(raw_amap, torch.Tensor):
                    amap = raw_amap.squeeze().cpu().numpy()
            elif isinstance(out, (tuple, list)):
                for item in out:
                    if isinstance(item, torch.Tensor) and item.ndim in (3, 4):
                        amap = item.squeeze().cpu().numpy()
                        break

        infer_time_ms = round((time.time() - t0) * 1000, 2)
        return float(score), amap, infer_time_ms

