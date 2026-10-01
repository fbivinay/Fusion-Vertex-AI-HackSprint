# Fusion Vertex AI

Fusion Vertex AI turns fragmented business sources into evidence-linked requirements, visible conflicts, recorded human decisions, project-grounded answers, and a traceable BRD.

## Architecture

- `frontend/` — Next.js, React, TypeScript, Tailwind CSS; deploys to Vercel.
- `backend/` — FastAPI service; deploys to Cloud Run.
- Gemini integration — Google Gen AI SDK against the Gemini Developer API using an AI Studio API key kept on the backend.
- Storage — private Cloud Storage bucket using `projects/{project_id}/raw/`, `processed/`, and `outputs/` prefixes.
- Structured records — BigQuery dataset `fusion_vertex`, with projects, sources, requirements, evidence, conflicts, and decisions tables.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY` to your Google AI Studio key. Leave `FUSION_BUCKET` and `BIGQUERY_DATASET` blank for local storage. Never put the key in the frontend or commit it.
2. Start the API: `cd backend && python -m venv .venv && .venv/Scripts/Activate.ps1 && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8080`.
3. Start the UI in another terminal: `cd frontend && npm install && npm run dev`.
4. Open `http://localhost:3000`; create a project or run the five-source checkout demo.

To run the live Gemini flow instead of only the local parser/API checks, run `python scripts/live_demo_smoke.py` from `backend/`. It sends one analysis, one Ask Fusion, and one BRD request through the configured key and waits at least 12 seconds between model requests.

With no cloud dataset or bucket configured, project records and uploads are stored locally under `backend/data/`. Gemini calls use the Developer API and are serialized with a 12-second minimum interval to stay conservative on free-tier RPM limits. Google AI Studio's current per-project limits should still be checked in AI Studio because they vary by project and model.

## Demo

The checkout project includes a meeting transcript, product requirements PDF, payment-compliance PDF, checkout payment screenshot, and analytics CSV. The transcript/UI ask to remember a payment method; the security control prohibits retaining reusable payment credentials. The demo leaves that conflict unresolved for a human decision.

## Deploy

Cloud deployment targets the existing project `hacksprint-510314`; it does not create a Gemini API key in Google Cloud. The backend uses the AI Studio Developer API key stored in Secret Manager at deployment, while Cloud Run uses its service identity for private Cloud Storage and BigQuery access. No service-account key is used.

Billing is active for `hacksprint-510314`. The private Cloud Storage bucket `fusion-vertex-ai-1068593649702`, BigQuery dataset `fusion_vertex`, Cloud Run service identity, scoped IAM access, required APIs, and Secret Manager secret resource `gemini-api-key` are provisioned. The secret resource still needs a version containing the AI Studio key before Cloud Run can be deployed. Add that version in [Secret Manager](https://console.cloud.google.com/security/secret-manager/secret/gemini-api-key/versions?project=hacksprint-510314), then deploy `backend/` to Cloud Run and `frontend/` to Vercel with `NEXT_PUBLIC_API_URL` set to the Cloud Run URL and its Vercel origin added to `CORS_ORIGINS`.

Production deployments:

- Frontend: [fusion-vertex-ai-hacksprint.vercel.app](https://fusion-vertex-ai-hacksprint.vercel.app)
- API: [fusion-api-aqvjbqmv3a-uc.a.run.app](https://fusion-api-aqvjbqmv3a-uc.a.run.app)
- The frontend's Vercel build uses `NEXT_PUBLIC_API_URL` and the Next.js framework preset in `frontend/vercel.json`.
- Cloud Run uses the AI Studio key from Secret Manager, a private bucket, BigQuery, one instance maximum, one request at a time, and a 12-second Gemini request interval.

Production smoke check: the demo uploaded five sources, generated six cited requirements and ten evidence rows, and stored one critical unresolved payment-retention conflict in BigQuery. The UI and API/CORS checks passed. A subsequent Ask Fusion request received a temporary Gemini `503` high-demand response; no retry or BRD request was sent, so Ask Fusion and BRD generation remain unverified in production.

