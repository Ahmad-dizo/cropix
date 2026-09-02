# Flask Plant Disease Prediction API

## Deploy to Render

This repository is configured for a Docker web service through `render.yaml`.
The Keras model is downloaded from Hugging Face during the Docker build, so it
does not need to be committed to GitHub.

1. Push these files to your GitHub repository.
2. In Render, select **New +** > **Blueprint**, connect the GitHub repository,
   and approve the detected `croppix-api` service.
3. Set any secrets in Render's Environment tab (for example `OPENAI_API_KEY`,
   `EMAIL_PASSWORD`, and `CONTACT_RECEIVER`). Do not commit them to GitHub.
4. Deploy, then open `https://YOUR-SERVICE.onrender.com/health`. It should
   return `"status":"ok"` after the model has loaded.

The main Render URL (`https://YOUR-SERVICE.onrender.com/`) serves the CROPIX
website as well as the API, so no frontend API URL change is required.

If you need a different model later, update `MODEL_URL` in the `Dockerfile`
and redeploy. The Blueprint starts on Render's free plan for testing. TensorFlow
can be memory-intensive, so switch to a plan with at least 2 GB RAM only if the
free service runs out of memory.

This project exposes a simple Flask API that loads a Keras model and provides an endpoint to predict an uploaded image.

Files:
- `server_py.py` - Flask app with `/predict` endpoint (and existing `/api/chat` proxy)
- `plant_disease_model.keras` - your trained Keras model (already in the repo)
- `labels.txt` (optional) - one label per line matching model output order
- `predict_example_frontend.html` - minimal frontend example using `fetch()`
- `requirements.txt` - Python dependencies

Run locally (create a virtualenv first):

```bash
python -m venv .venv
.\.venv\Scripts\activate    # Windows
pip install -r requirements.txt
python server_py.py
```

The server will start on port 5000. The `/predict` endpoint accepts a `multipart/form-data` POST with field name `image`.

Example `curl` call:

```bash
curl -X POST -F "image=@/path/to/photo.jpg" http://localhost:5000/predict
```

Open `predict_example_frontend.html` in your browser (or serve it) and use the form to send images to the API.

Notes:
- If `labels.txt` exists beside `server_py.py`, it will be used to map predicted indices to human-friendly labels.
- The code attempts to handle both binary (single-output) and multi-class model outputs.
- For production, consider using a WSGI server (gunicorn/uvicorn) and secure CORS origins.
