Integrating OpenAI via a local server proxy

1) Install dependencies

```bash
npm init -y
npm install express cors axios dotenv
```

2) Create a `.env` file in the project root with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

3) Run the server

```bash
node server.js
```

4) Frontend

The frontend will POST to `/api/chat` with JSON: `{ conversationId, message, messages }`.
The server forwards to OpenAI and returns `{ reply }`.

Security note: keep your `.env` and API key private and do not commit it to version control.

# Model location (optional)
# To keep the ML model outside the project (for example on the D: drive),
# move the model file and set `MODEL_PATH` in your `.env`.
# Example PowerShell commands to move the model and update `.env`:
# Move-Item -Path ".\plant_disease_model.keras" -Destination "D:\models\plant_disease_model.keras"
# (Edit `.env`) MODEL_PATH=D:\models\plant_disease_model.keras
