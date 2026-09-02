"""Download the ML model during the container image build.

Keeping the model in Hugging Face avoids committing a large binary to GitHub.
"""

from pathlib import Path
from urllib.request import Request, urlopen
import os
import shutil


MODEL_URL = os.environ.get(
    "MODEL_URL",
    "https://huggingface.co/ahmaddizo/crophix-plant-disease-model/resolve/main/plant_disease_model.keras",
)
MODEL_PATH = Path(os.environ.get("MODEL_PATH", "/app/plant_disease_model.keras"))
MIN_MODEL_BYTES = 1_000_000


def main():
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = MODEL_PATH.with_suffix(MODEL_PATH.suffix + ".download")
    request = Request(MODEL_URL, headers={"User-Agent": "Croppix-Render-Builder/1.0"})

    print(f"Downloading plant-disease model from {MODEL_URL}")
    with urlopen(request, timeout=300) as response, temporary_path.open("wb") as output:
        shutil.copyfileobj(response, output)

    size = temporary_path.stat().st_size
    if size < MIN_MODEL_BYTES:
        temporary_path.unlink(missing_ok=True)
        raise RuntimeError(f"Downloaded model is unexpectedly small ({size} bytes).")

    temporary_path.replace(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH} ({size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
