FROM python:3.11-slim

WORKDIR /app

# Install minimal OS deps for common Python wheels (Pillow, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo \
    zlib1g \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --no-cache-dir --upgrade pip && \
    python -m pip install --no-cache-dir -r requirements.txt

COPY . .

# The model stays in Hugging Face, not in the Git repository.  Download it
# while Render builds the image so the service can start immediately.
ARG MODEL_URL=https://huggingface.co/ahmaddizo/crophix-plant-disease-model/resolve/main/plant_disease_model.keras
ENV MODEL_URL=${MODEL_URL}
RUN python download_model.py

ENV PORT=5000
EXPOSE 5000

CMD ["python", "-u", "server_py.py"]
