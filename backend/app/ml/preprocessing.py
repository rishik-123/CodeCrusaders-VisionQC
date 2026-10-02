import io
import os
from typing import Tuple, Union, Optional
from PIL import Image
import torch
import torchvision.transforms as T
import numpy as np

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

# Standard PatchCore preprocessing pipeline matching full frame
INFERENCE_TRANSFORM = T.Compose([
    T.Resize((256, 256), interpolation=T.InterpolationMode.BICUBIC),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def validate_image_bytes(image_bytes: bytes, filename: str = "upload.png") -> Image.Image:
    """
    Validates uploaded image bytes for security, format, readability and dimensions.
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Uploaded image file is empty.")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB.")

    ext = os.path.splitext(filename)[1].lower()
    if ext and ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file extension '{ext}'. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image format: {e}")

    # Re-open after verify
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    width, height = img.size
    if width < 32 or height < 32:
        raise ValueError(f"Image dimensions too small ({width}x{height}). Minimum required is 32x32.")
    if width > 6000 or height > 6000:
        raise ValueError(f"Image dimensions too large ({width}x{height}). Maximum allowed is 6000x6000.")

    return img

def validate_image_file(file_path: Union[str, os.PathLike]) -> Image.Image:
    """
    Validates an existing image file on disk.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Image file not found: {file_path}")
    
    with open(file_path, "rb") as f:
        data = f.read()
    return validate_image_bytes(data, filename=str(file_path))

def filter_handheld_artifacts(img: Image.Image) -> Image.Image:
    """
    Optional filter for handheld images: softens finger skin regions near borders
    without altering product interior colors or cutting non-circular products.
    """
    try:
        import cv2
        np_img = np.array(img.convert("RGB"))
        h, w = np_img.shape[:2]

        # Dual-Space Skin & Hand Detection (YCrCb + HSV)
        ycrcb = cv2.cvtColor(np_img, cv2.COLOR_RGB2YCrCb)
        skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77], dtype=np.uint8), np.array([255, 173, 127], dtype=np.uint8))

        hsv = cv2.cvtColor(np_img, cv2.COLOR_RGB2HSV)
        skin_hsv = cv2.inRange(hsv, np.array([0, 20, 50], dtype=np.uint8), np.array([25, 255, 255], dtype=np.uint8))
        skin_mask = cv2.bitwise_or(skin_ycrcb, skin_hsv)

        # Only mask skin that touches the outer 15% borders of the frame (fingers holding the product)
        border_mask = np.ones((h, w), dtype=np.uint8) * 255
        margin_y, margin_x = int(h * 0.15), int(w * 0.15)
        border_mask[margin_y:h-margin_y, margin_x:w-margin_x] = 0
        finger_mask = cv2.bitwise_and(skin_mask, border_mask)

        if np.count_nonzero(finger_mask) > 50:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
            finger_mask = cv2.dilate(finger_mask, kernel, iterations=2)
            # Inpaint finger regions with border color
            inpainted = cv2.inpaint(np_img, finger_mask, 5, cv2.INPAINT_TELEA)
            return Image.fromarray(inpainted)

        return img
    except Exception:
        return img

def preprocess_image_for_inference(img: Image.Image, handheld_filter: bool = False) -> Tuple[torch.Tensor, Image.Image]:
    """
    Transforms PIL image into PyTorch tensor formatted for PatchCore (1, 3, 256, 256).
    Returns (tensor, rgb_pil_image).
    """
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    proc_img = filter_handheld_artifacts(img) if handheld_filter else img
    tensor = INFERENCE_TRANSFORM(proc_img).unsqueeze(0)
    return tensor, proc_img

