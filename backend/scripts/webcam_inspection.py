import os
import sys
import json
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

# Add parent directory to sys.path
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir))

from backend.app.ml.inference import inference_service

def run_webcam_inspection(
    product_name: str = "bottle",
    camera_index: int = 0,
    threshold_override: float = None,
    version: str = "v1"
):
    model_dir = base_dir / "models" / "product_models" / product_name / version
    ckpt_file = model_dir / "model.ckpt"
    thresh_file = model_dir / "threshold.json"

    if not ckpt_file.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {ckpt_file}. Train product first.")

    if threshold_override is not None:
        threshold = threshold_override
    elif thresh_file.exists():
        with open(thresh_file, "r") as f:
            t_data = json.load(f)
        threshold = float(t_data["threshold"])
    else:
        threshold = 0.5

    print("=" * 70)
    print(f"VISIONQC WEBCAM INSPECTION UTILITY: {product_name}")
    print(f"Threshold: {threshold:.5f}")
    print("Controls: [SPACE] = Inspect current frame | [Q] = Quit")
    print("=" * 70)

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[ERROR] Could not access webcam at index {camera_index}.")
        print("If no physical camera is attached, use 'python backend/scripts/inspect_image.py --image <file>' to inspect images.")
        return

    last_result = None
    use_roi = True

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to grab webcam frame.")
            break

        h, w = frame.shape[:2]
        display_frame = frame.copy()

        # Define Central Inspection Region of Interest (ROI)
        roi_size = min(h, w) * 2 // 3
        x1 = (w - roi_size) // 2
        y1 = (h - roi_size) // 2
        x2 = x1 + roi_size
        y2 = y1 + roi_size

        # Draw Industrial Circular Cap Inspection Reticle
        if use_roi:
            cx, cy = w // 2, h // 2
            r = int(roi_size * 0.44)
            c_reticle = (0, 220, 255)
            # Center target circle
            cv2.circle(display_frame, (cx, cy), r, c_reticle, 2)
            # Alignment ticks (top, bottom, left, right)
            tick = 12
            cv2.line(display_frame, (cx, cy - r - tick), (cx, cy - r + tick), c_reticle, 2)
            cv2.line(display_frame, (cx, cy + r - tick), (cx, cy + r + tick), c_reticle, 2)
            cv2.line(display_frame, (cx - r - tick, cy), (cx - r + tick, cy), c_reticle, 2)
            cv2.line(display_frame, (cx + r - tick, cy), (cx + r + tick, cy), c_reticle, 2)
            cv2.putText(display_frame, "CIRCULAR CAP ZONE", (cx - 75, cy - r - 16), cv2.FONT_HERSHEY_SIMPLEX, 0.48, c_reticle, 1)

        # Header HUD
        status_text = f"VisionQC | Thresh: {threshold:.1f} | [SPACE]=Inspect | [R]=ROI Mode | [+/-]=Thresh | [Q]=Quit"
        cv2.rectangle(display_frame, (0, 0), (w, 36), (25, 25, 25), -1)
        cv2.putText(display_frame, status_text, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (240, 240, 240), 1)

        # Footer HUD with Result
        if last_result:
            decision = last_result["decision"]
            color = (0, 210, 0) if decision == "PASS" else (0, 0, 230)
            score_text = f"DECISION: [{decision}] | Score: {last_result['anomaly_score']:.2f} (Thresh: {last_result['threshold']:.1f}) | {last_result['processing_time_ms']}ms"
            cv2.rectangle(display_frame, (0, h - 45), (w, h), (15, 15, 15), -1)
            cv2.putText(display_frame, score_text, (12, h - 16), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

        cv2.imshow("VisionQC Live Inspection Stream", display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:  # 'q' or ESC
            break
        elif key == ord('r') or key == ord('R'):
            use_roi = not use_roi
            print(f"Inspection ROI Mode: {'ENABLED (Focus on Target Zone)' if use_roi else 'DISABLED (Full Frame)'}")
        elif key in (ord('+'), ord('=')):
            threshold += 2.0
            print(f"Threshold adjusted to: {threshold:.1f}")
        elif key in (ord('-'), ord('_')):
            threshold = max(5.0, threshold - 2.0)
            print(f"Threshold adjusted to: {threshold:.1f}")
        elif key == 32:  # SPACE bar: trigger inspection
            print("\nTriggering inspection on current frame...")
            inspect_target = frame[y1:y2, x1:x2] if use_roi else frame
            rgb_frame = cv2.cvtColor(inspect_target, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_frame)

            result = inference_service.inspect(
                product_id=1,
                model_path=str(ckpt_file),
                threshold=threshold,
                image_input=pil_img
            )
            last_result = result

            print(f"-> Result: [{result['decision']}] | Score: {result['anomaly_score']:.2f} / {threshold:.2f} | Time: {result['processing_time_ms']}ms")

            if result.get("overlay_path") and os.path.exists(result["overlay_path"]):
                overlay_img = cv2.imread(result["overlay_path"])
                cv2.imshow("VisionQC Anomaly Heatmap Overlay", overlay_img)

    cap.release()
    cv2.destroyAllWindows()
    print("\nWebcam session ended.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionQC Interactive Webcam Inspection")
    parser.add_argument("--product", type=str, default="bottle")
    parser.add_argument("--camera", type=int, default=0, help="Webcam index (default: 0)")
    parser.add_argument("--threshold", type=float, default=None)
    parser.add_argument("--version", type=str, default="v1")
    args = parser.parse_args()

    run_webcam_inspection(
        product_name=args.product,
        camera_index=args.camera,
        threshold_override=args.threshold,
        version=args.version
    )
