import os
import hashlib
from pathlib import Path
from PIL import Image

def get_hash(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def verify_dataset(dataset_root: Path = None):
    if dataset_root is None:
        dataset_root = Path(__file__).resolve().parent.parent.parent / "datasets" / "visionqc_bottle"

    print("=" * 60)
    print(f"VERIFYING DATASET INTEGRITY AT: {dataset_root}")
    print("=" * 60)

    splits = {
        "reference": dataset_root / "reference",
        "validation_good": dataset_root / "validation" / "good",
        "validation_defective": dataset_root / "validation" / "defective",
        "test_good": dataset_root / "test" / "good",
        "test_defective": dataset_root / "test" / "defective"
    }

    expected_counts = {
        "reference": 25,
        "validation_good": 20,
        "validation_defective": 20,
        "test_good": 20,
        "test_defective": 20
    }

    hashes = {}
    all_valid = True

    for name, path in splits.items():
        if not path.exists():
            print(f"[ERROR] Directory does not exist: {path}")
            all_valid = False
            continue

        images = sorted([f for f in path.glob("*") if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg"]])
        count = len(images)
        exp = expected_counts[name]

        print(f"\n--- {name} ({count} images, Expected: {exp}) ---")
        if count != exp:
            print(f"  [ERROR] Count mismatch! Expected {exp}, got {count}")
            all_valid = False
        else:
            print(f"  [PASS] Image count matched ({count}).")

        # Verify readability, dimensions, and hashes
        for img_path in images:
            try:
                with Image.open(img_path) as img:
                    width, height = img.size
                    img_format = img.format
                    mode = img.mode
                
                h = get_hash(img_path)
                if h in hashes:
                    print(f"  [WARNING/OVERLAP] Duplicate content found!")
                    print(f"    Existing: {hashes[h]}")
                    print(f"    Current:  {img_path}")
                    all_valid = False
                else:
                    hashes[h] = f"{name}/{img_path.name}"

            except Exception as e:
                print(f"  [ERROR] Corrupt or unreadable image {img_path}: {e}")
                all_valid = False

        if images:
            print(f"  Sample: {images[0].name} (Format: {img_format}, Size: {width}x{height}, Mode: {mode})")

    print("\n" + "=" * 60)
    if all_valid:
        print("RESULT: ALL DATASET CHECKS PASSED PERFECTLY (0 Overlap, 100% Valid)")
    else:
        print("RESULT: DATASET VERIFICATION FAILED. Please resolve the issues above.")
    print("=" * 60)
    return all_valid

if __name__ == "__main__":
    verify_dataset()
