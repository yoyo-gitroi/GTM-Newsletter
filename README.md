# GTM Newsletter

Full-stack GTM newsletter workflow app:
- **Frontend:** React (CRA + CRACO) in `frontend/`
- **Backend API:** FastAPI in `backend/server.py`

## Local development

### Backend

```bash
pip install -r backend/requirements.txt
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

Environment variables:

- `MONGO_URL` (optional, default: `mongodb://localhost:27017`)
- `DB_NAME` (optional, default: `gtm_newsletter`)
- `EMERGENT_LLM_KEY` (required for non-custom key model execution)
- `CORS_ORIGINS` (optional, comma-separated)

### Frontend

```bash
cd frontend
npm install
npm start
```

Environment variables:

- `REACT_APP_BACKEND_URL` (optional).  
  If omitted, frontend calls same-origin `/api`, which works on Vercel.

## Vercel deployment

This repo includes `vercel.json` configured to:
- Build frontend as a static app
- Serve FastAPI at `/api/*` from `api/index.py`
- Rewrite SPA routes to `index.html`

Set these project environment variables in Vercel:
- `MONGO_URL`
- `DB_NAME`
- `EMERGENT_LLM_KEY` (if needed)
- `CORS_ORIGINS` (recommended for explicit origin allowlist)

## Notes on security

- This API currently has no authentication/authorization layer.
- Settings endpoints can read/write provider keys. Run behind authenticated access before production use.
