import os
import sys
import json
import argparse
from pathlib import Path

# Add parent directory to sys.path
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

from backend.app.ml.inference import inference_service

def inspect_single_image(
    product_name: str = "bottle",
    image_path: str = None,
    threshold_override: float = None,
    version: str = "v1"
):
    if image_path is None:
        raise ValueError("Image path is required (--image path/to/image.png)")

    img_file = Path(image_path).resolve()
    if not img_file.exists():
        raise FileNotFoundError(f"Image not found at {img_file}")

    model_dir = base_dir / "models" / "product_models" / product_name / version
    ckpt_file = model_dir / "model.ckpt"
    thresh_file = model_dir / "threshold.json"

    if not ckpt_file.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {ckpt_file}. Train the product model first.")

    if threshold_override is not None:
        threshold = threshold_override
    elif thresh_file.exists():
        with open(thresh_file, "r") as f:
            t_data = json.load(f)
        threshold = float(t_data["threshold"])
    else:
        threshold = 0.5  # fallback default
        print(f"Warning: threshold.json not found in {model_dir}. Using fallback threshold: {threshold}")

    print("=" * 65)
    print("VISIONQC IMAGE INSPECTION")
    print("=" * 65)

    result = inference_service.inspect(
        product_id=1,
        model_path=str(ckpt_file),
        threshold=threshold,
        image_input=img_file
    )

    print(f"Product         : {product_name}")
    print(f"Model Version   : {version}")
    print(f"Input Image     : {img_file.name}")
    print(f"Anomaly Score   : {result['anomaly_score']:.5f}")
    print(f"Threshold       : {result['threshold']:.5f}")
    print(f"Decision        : [{'PASS' if result['decision'] == 'PASS' else 'FAIL'}]")
    print(f"Processing Time : {result['processing_time_ms']} ms")
    print(f"Heatmap Path    : {result['heatmap_path']}")
    print(f"Overlay Path    : {result['overlay_path']}")
    print("=" * 65)

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionQC Command-Line Inspection Tool")
    parser.add_argument("--product", type=str, default="bottle", help="Product name")
    parser.add_argument("--image", type=str, required=True, help="Path to image file")
    parser.add_argument("--threshold", type=float, default=None, help="Optional threshold override")
    parser.add_argument("--version", type=str, default="v1", help="Model version")
    args = parser.parse_args()

    inspect_single_image(
        product_name=args.product,
        image_path=args.image,
        threshold_override=args.threshold,
        version=args.version
    )
