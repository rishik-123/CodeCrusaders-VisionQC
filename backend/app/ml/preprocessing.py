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
    Applies adaptive luminance equalization (CLAHE) and perimeter finger/skin suppression.
    Allows users to hold products in their hands with light reflections without false alarms.
    """
    try:
        import cv2
        np_img = np.array(img.convert("RGB"))
        h, w = np_img.shape[:2]

        # 1. Lighting Equalization (CLAHE in LAB color space)
        lab = cv2.cvtColor(np_img, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_eq = clahe.apply(l)
        lab_eq = cv2.merge((l_eq, a, b))
        norm_rgb = cv2.cvtColor(lab_eq, cv2.COLOR_LAB2RGB)

        # 2. Hand & Finger Suppression: detect skin tones at outer perimeter
        hsv = cv2.cvtColor(norm_rgb, cv2.COLOR_RGB2HSV)
        lower_skin = np.array([0, 18, 45], dtype=np.uint8)
        upper_skin = np.array([28, 255, 255], dtype=np.uint8)
        skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)

        edge_mask = np.zeros((h, w), dtype=np.uint8)
        margin = int(min(h, w) * 0.22)
        edge_mask[:margin, :] = 255
        edge_mask[-margin:, :] = 255
        edge_mask[:, :margin] = 255
        edge_mask[:, -margin:] = 255

        finger_mask = cv2.bitwise_and(skin_mask, edge_mask)
        finger_mask = cv2.GaussianBlur(finger_mask, (21, 21), 0)

        mean_val = np.mean(norm_rgb, axis=(0, 1))
        weight = (finger_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
        cleaned = (norm_rgb * (1.0 - weight) + mean_val * weight).astype(np.uint8)

        return Image.fromarray(cleaned)
    except Exception:
        return img

def preprocess_image_for_inference(img: Image.Image, handheld_filter: bool = True) -> Tuple[torch.Tensor, Image.Image]:
    """
    Transforms PIL image into PyTorch tensor formatted for PatchCore (1, 3, 256, 256).
    Applies handheld lighting and finger tolerance filter.
    Returns (tensor, rgb_pil_image).
    """
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    proc_img = filter_handheld_artifacts(img) if handheld_filter else img
    tensor = INFERENCE_TRANSFORM(proc_img).unsqueeze(0)
    return tensor, proc_img
