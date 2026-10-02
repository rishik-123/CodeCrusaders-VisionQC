import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
UPLOADS_DIR = BASE_DIR / "uploads"
RESULTS_DIR = BASE_DIR / "results"
MODELS_DIR = BASE_DIR / "models"
DATASETS_DIR = BASE_DIR / "datasets"

# Ensure runtime directories exist
(UPLOADS_DIR / "reference").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "inspections").mkdir(parents=True, exist_ok=True)
(RESULTS_DIR / "heatmaps").mkdir(parents=True, exist_ok=True)
(MODELS_DIR / "product_models").mkdir(parents=True, exist_ok=True)

DATABASE_PATH = BACKEND_DIR / "visionqc.db"

class Settings(BaseModel):
    app_name: str = "VisionQC Visual Inspection System"
    app_version: str = "1.0.0"
    database_url: str = f"sqlite:///{DATABASE_PATH}"
    database_file: Path = DATABASE_PATH
    cors_origins: list = ["*"]
    min_reference_images: int = 20
    max_reference_images: int = 100
    default_backbone: str = "wide_resnet50_2"

settings = Settings()
