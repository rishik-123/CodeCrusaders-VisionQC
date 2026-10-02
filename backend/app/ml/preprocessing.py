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

def preprocess_image_for_inference(img: Image.Image) -> Tuple[torch.Tensor, Image.Image]:
    """
    Transforms PIL image into PyTorch tensor formatted for PatchCore (1, 3, 224, 224).
    Returns (tensor, rgb_pil_image).
    """
    if img.mode != "RGB":
        img = img.convert("RGB")
    tensor = INFERENCE_TRANSFORM(img).unsqueeze(0)
    return tensor, img
