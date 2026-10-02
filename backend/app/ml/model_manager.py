import os
from typing import Dict, Optional
from pathlib import Path
import threading
from backend.app.ml.patchcore_model import PatchcoreInferenceWrapper

class ModelManager:
    """
    Thread-safe registry and cache for active product PatchCore models.
    Prevents redundant model re-loading on each inspection request.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
                cls._instance._models: Dict[int, PatchcoreInferenceWrapper] = {}
                cls._instance._paths: Dict[int, str] = {}
            return cls._instance

    def get_model(self, product_id: int, model_path: str) -> PatchcoreInferenceWrapper:
        with self._lock:
            norm_path = str(Path(model_path).resolve())
            if product_id in self._models and self._paths.get(product_id) == norm_path:
                return self._models[product_id]

            # Load new model instance
            wrapper = PatchcoreInferenceWrapper(checkpoint_path=norm_path)
            self._models[product_id] = wrapper
            self._paths[product_id] = norm_path
            return wrapper

    def invalidate(self, product_id: int):
        with self._lock:
            if product_id in self._models:
                del self._models[product_id]
            if product_id in self._paths:
                del self._paths[product_id]

model_manager = ModelManager()
