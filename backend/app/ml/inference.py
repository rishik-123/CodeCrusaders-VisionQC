import os
import time
import uuid
from pathlib import Path
from typing import Union, Dict, Any, Optional
from PIL import Image

from backend.app.ml.preprocessing import validate_image_bytes, validate_image_file
from backend.app.ml.heatmap import generate_anomaly_heatmap_and_overlay
from backend.app.ml.model_manager import model_manager

class VisionQCInferenceService:
    """
    Production end-to-end inference service for VisionQC.
    Handles image validation, PatchCore memory bank scoring,
    decision classification against threshold, and heatmap visualization.
    """
    def __init__(self, heatmaps_dir: Optional[Path] = None):
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.heatmaps_dir = heatmaps_dir or (base_dir / "results" / "heatmaps")
        self.heatmaps_dir.mkdir(parents=True, exist_ok=True)

    def inspect(
        self,
        product_id: int,
        model_path: str,
        threshold: float,
        image_input: Union[bytes, str, Path, Image.Image],
        inspection_id: Optional[str] = None,
        save_visualizations: bool = True
    ) -> Dict[str, Any]:
        start_total = time.time()
        insp_id = inspection_id or f"insp_{uuid.uuid4().hex[:12]}"

        # 1. Image validation and loading
        t_pre_start = time.time()
        if isinstance(image_input, bytes):
            pil_image = validate_image_bytes(image_input)
        elif isinstance(image_input, (str, Path)):
            pil_image = validate_image_file(image_input)
        elif isinstance(image_input, Image.Image):
            pil_image = image_input.convert("RGB") if image_input.mode != "RGB" else image_input
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")
        prep_time_ms = round((time.time() - t_pre_start) * 1000, 2)

        # 2. PatchCore Inference
        model_wrapper = model_manager.get_model(product_id, model_path)
        anomaly_score, anomaly_map, infer_time_ms = model_wrapper.infer(pil_image)

        # 3. Decision classification
        # In anomaly detection: score >= threshold means anomalous (FAIL)
        decision = "FAIL" if anomaly_score >= threshold else "PASS"

        # 4. Generate Heatmap & Overlay
        t_viz_start = time.time()
        heatmap_rel_path = None
        overlay_rel_path = None

        if save_visualizations:
            heatmap_file = self.heatmaps_dir / f"{insp_id}_heatmap.png"
            overlay_file = self.heatmaps_dir / f"{insp_id}_overlay.png"
            generate_anomaly_heatmap_and_overlay(
                anomaly_map=anomaly_map,
                original_image=pil_image,
                output_heatmap_path=heatmap_file,
                output_overlay_path=overlay_file
            )
            heatmap_rel_path = str(heatmap_file).replace("\\", "/")
            overlay_rel_path = str(overlay_file).replace("\\", "/")

        viz_time_ms = round((time.time() - t_viz_start) * 1000, 2)
        total_time_ms = round((time.time() - start_total) * 1000, 2)

        return {
            "inspection_id": insp_id,
            "product_id": product_id,
            "decision": decision,
            "anomaly_score": round(float(anomaly_score), 5),
            "threshold": round(float(threshold), 5),
            "heatmap_path": heatmap_rel_path,
            "overlay_path": overlay_rel_path,
            "processing_time_ms": total_time_ms,
            "timing_breakdown": {
                "preprocessing_ms": prep_time_ms,
                "inference_ms": infer_time_ms,
                "visualization_ms": viz_time_ms,
                "total_ms": total_time_ms
            }
        }

inference_service = VisionQCInferenceService()
