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
    Isolates the circular bottle or bottle cap, masking out all hands, fingers,
    and external background clutter outside the circular product area.
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

        # 2. Dual-Space Skin & Hand Detection (YCrCb + HSV)
        ycrcb = cv2.cvtColor(norm_rgb, cv2.COLOR_RGB2YCrCb)
        skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77], dtype=np.uint8), np.array([255, 173, 127], dtype=np.uint8))

        hsv = cv2.cvtColor(norm_rgb, cv2.COLOR_RGB2HSV)
        skin_hsv = cv2.inRange(hsv, np.array([0, 15, 40], dtype=np.uint8), np.array([28, 255, 255], dtype=np.uint8))
        skin_mask = cv2.bitwise_or(skin_ycrcb, skin_hsv)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        skin_mask = cv2.dilate(skin_mask, kernel, iterations=2)

        # 3. Circular Bottle/Cap Region of Interest (Mask outer circle)
        center_x, center_y = w // 2, h // 2
        radius = int(min(h, w) * 0.44)
        circle_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(circle_mask, (center_x, center_y), radius, 255, -1)

        # Valid product area is inside the circular zone AND not skin/hand
        product_mask = cv2.bitwise_and(circle_mask, cv2.bitwise_not(skin_mask))
        product_mask = cv2.GaussianBlur(product_mask, (11, 11), 0)

        # 4. Fill all non-product areas with neutral studio background (245, 245, 245)
        clean_bg = np.full_like(norm_rgb, 245)
        weight = (product_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
        isolated = (norm_rgb * weight + clean_bg * (1.0 - weight)).astype(np.uint8)

        return Image.fromarray(isolated)
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
