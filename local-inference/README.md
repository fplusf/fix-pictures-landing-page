# Local Inference Service (Handshake + Token Auth)

This service runs on localhost and enables fix.pictures clients (web app and extension) to process images without sending them to cloud infrastructure.

## What it provides

- `GET /v1/health` loopback-only health probe.
- `POST /v1/handshake` session creation with short-lived bearer token.
- `POST /v1/process` authenticated image processing endpoint.

The client performs:

1. Local service probe.
2. Handshake to get `sessionId` + `token`.
3. Authenticated `/v1/process` calls.
4. Automatic fallback to browser worker if local service is unavailable.

## Run locally

```bash
cd local-inference
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Optional hardening:
# export FIX_ALLOWED_EXTENSION_IDS="<your-client-id>"
# export FIX_ALLOWED_ORIGINS="http://localhost:5173,https://your-domain.com"

uvicorn app.main:app --host 127.0.0.1 --port 8765
```

## Security model

- Accepts only loopback clients (`127.0.0.1` / `::1`).
- Requires per-session bearer token for `/v1/process`.
- Session TTL is 15 minutes.
- Optional allowlist for client IDs via `FIX_ALLOWED_EXTENSION_IDS`.
- Optional CORS allowlist via `FIX_ALLOWED_ORIGINS`.

## Notes

- Processing requires `rembg`; if rembg fails or output has no meaningful transparency, the service returns an error.
- When that happens, the app automatically falls back to the in-browser worker.
- This file is focused on secure local integration plumbing.
- You can replace `run_local_pipeline()` with ONNX Runtime GPU + your full SAM2/Real-ESRGAN stack.
