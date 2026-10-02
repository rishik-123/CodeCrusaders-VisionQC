from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class ImageMetrics:
    width: int
    height: int
    file_size: int
    sharpness_score: float


def inspect_jpeg(image_bytes: bytes) -> ImageMetrics:
    if not image_bytes:
        raise ValueError("The uploaded image is empty")
    if not image_bytes.startswith(b"\xff\xd8\xff"):
        raise ValueError("The uploaded file is not a JPEG image")

    encoded = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("The uploaded file is not a valid JPEG image")

    height, width = image.shape[:2]
    if width < 64 or height < 64:
        raise ValueError("Image dimensions must be at least 64 × 64 pixels")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return ImageMetrics(width, height, len(image_bytes), sharpness)
