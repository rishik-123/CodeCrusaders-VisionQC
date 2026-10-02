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
                if isinstance(out, (tuple, list)):
                    first, second = out[0], out[1] if len(out) > 1 else None
                    if first is not None and (first.ndim == 0 or first.numel() == 1):
                        score = float(first.cpu().item())
                        amap = second.squeeze().cpu().numpy() if isinstance(second, torch.Tensor) else np.zeros((256, 256), dtype=np.float32)
                    else:
                        score = float(second.cpu().item()) if second is not None else 0.0
                        amap = first.squeeze().cpu().numpy() if isinstance(first, torch.Tensor) else np.zeros((256, 256), dtype=np.float32)
                else:
                    score = float(out.cpu().item()) if hasattr(out, "cpu") else 0.0
                    amap = np.zeros((256, 256), dtype=np.float32)
            else:
                output = self.model(tensor)
                if hasattr(output, "pred_score"):
                    score = float(output.pred_score.cpu().item())
                elif isinstance(output, dict) and "pred_score" in output:
                    score = float(output["pred_score"].cpu().item())
                else:
                    score = float(output[0].cpu().item()) if hasattr(output, "__getitem__") else 0.0

                if hasattr(output, "anomaly_map"):
                    amap = output.anomaly_map.squeeze().cpu().numpy()
                elif isinstance(output, dict) and "anomaly_map" in output:
                    amap = output["anomaly_map"].squeeze().cpu().numpy()
                else:
                    amap = np.zeros((256, 256), dtype=np.float32)

        infer_time_ms = round((time.time() - t0) * 1000, 2)
        return score, amap, infer_time_ms
