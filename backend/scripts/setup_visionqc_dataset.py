import os
import shutil
import hashlib
from pathlib import Path
from PIL import Image

def get_hash(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def setup_dataset():
    base_dir = Path(__file__).resolve().parent.parent.parent
    src_bottle = base_dir / "datasets" / "bottle"
    target_dir = base_dir / "datasets" / "visionqc_bottle"

    print(f"Setting up VisionQC dataset from {src_bottle} to {target_dir}")

    # Clean and re-create target directory cleanly
    if target_dir.exists():
        for p in target_dir.rglob("*"):
            if p.is_file():
                try:
                    p.chmod(0o777)
                    p.unlink()
                except Exception:
                    pass
        try:
            shutil.rmtree(target_dir, ignore_errors=True)
        except Exception:
            pass

    # Target folders
    ref_dir = target_dir / "reference"
    val_good_dir = target_dir / "validation" / "good"
    val_def_dir = target_dir / "validation" / "defective"
    test_good_dir = target_dir / "test" / "good"
    test_def_dir = target_dir / "test" / "defective"

    for d in [ref_dir, val_good_dir, val_def_dir, test_good_dir, test_def_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # 1. Reference images: 25 good images from train/good (000 to 024)
    train_good = sorted((src_bottle / "train" / "good").glob("*.png"))
    if len(train_good) < 45:
        raise RuntimeError(f"Expected at least 45 train/good images, found {len(train_good)}")

    for i in range(25):
        shutil.copy2(train_good[i], ref_dir / f"ref_{i:03d}.png")
    print(f"Copied 25 reference images to {ref_dir}")

    # 2. Validation Good: 20 good images from train/good (025 to 044)
    for i in range(25, 45):
        shutil.copy2(train_good[i], val_good_dir / f"val_good_{i:03d}.png")
    print(f"Copied 20 validation good images to {val_good_dir}")

    # 3. Test Good: 20 good images from test/good (000 to 019)
    test_good = sorted((src_bottle / "test" / "good").glob("*.png"))
    for i in range(min(20, len(test_good))):
        shutil.copy2(test_good[i], test_good_dir / f"test_good_{i:03d}.png")
    print(f"Copied 20 test good images to {test_good_dir}")

    # 4. Defective images: split without overlap between validation and test
    broken_large = sorted((src_bottle / "test" / "broken_large").glob("*.png"))
    broken_small = sorted((src_bottle / "test" / "broken_small").glob("*.png"))
    contamination = sorted((src_bottle / "test" / "contamination").glob("*.png"))

    # Validation Defective (20 total: 7 broken_large, 7 broken_small, 6 contamination)
    for i in range(7):
        shutil.copy2(broken_large[i], val_def_dir / f"broken_large_{i:03d}.png")
    for i in range(7):
        shutil.copy2(broken_small[i], val_def_dir / f"broken_small_{i:03d}.png")
    for i in range(6):
        shutil.copy2(contamination[i], val_def_dir / f"contamination_{i:03d}.png")
    print(f"Copied 20 validation defective images to {val_def_dir}")

    # Test Defective (20 total: 7 broken_large, 7 broken_small, 6 contamination)
    for i in range(7, 14):
        shutil.copy2(broken_large[i], test_def_dir / f"broken_large_{i:03d}.png")
    for i in range(7, 14):
        shutil.copy2(broken_small[i], test_def_dir / f"broken_small_{i:03d}.png")
    for i in range(6, 12):
        shutil.copy2(contamination[i], test_def_dir / f"contamination_{i:03d}.png")
    print(f"Copied 20 test defective images to {test_def_dir}")

if __name__ == "__main__":
    setup_dataset()
