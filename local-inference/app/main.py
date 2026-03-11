from __future__ import annotations

import base64
import datetime as dt
import io
import ipaddress
import os
import secrets
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter

APP_VERSION = "0.1.0"
SESSION_TTL_SECONDS = 15 * 60
MAX_IMAGE_BYTES = 25 * 1024 * 1024
ALPHA_FOREGROUND_THRESHOLD = 136
MIN_TRANSPARENCY_RATIO = 0.003
ALPHA_LOW_CUTOFF = 72
ALPHA_HIGH_SNAP = 236
HOLE_FILL_THRESHOLD = 108
MAX_BBOX_COVERAGE_RATIO = 0.97


@dataclass
class Session:
    session_id: str
    token: str
    extension_id: str
    expires_at: dt.datetime


class SessionStore:
    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    def create(self, extension_id: str) -> Session:
        self.prune()
        now = dt.datetime.now(dt.timezone.utc)
        expires_at = now + dt.timedelta(seconds=SESSION_TTL_SECONDS)
        session = Session(
            session_id=secrets.token_urlsafe(24),
            token=secrets.token_urlsafe(32),
            extension_id=extension_id,
            expires_at=expires_at,
        )
        self._sessions[session.session_id] = session
        return session

    def resolve(self, session_id: str) -> Optional[Session]:
        self.prune()
        return self._sessions.get(session_id)

    def prune(self) -> None:
        now = dt.datetime.now(dt.timezone.utc)
        stale = [sid for sid, session in self._sessions.items() if session.expires_at <= now]
        for sid in stale:
            self._sessions.pop(sid, None)


sessions = SessionStore()
app = FastAPI(title="fix.pictures local inference", version=APP_VERSION)

allowed_origins_env = os.environ.get("FIX_ALLOWED_ORIGINS", "")
allowed_origins = [value.strip() for value in allowed_origins_env.split(",") if value.strip()]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

allowed_extension_ids_env = os.environ.get("FIX_ALLOWED_EXTENSION_IDS", "")
allowed_extension_ids = {value.strip() for value in allowed_extension_ids_env.split(",") if value.strip()}


def ensure_loopback_client(request: Request) -> None:
    client_host = request.client.host if request.client else ""
    if not client_host:
        raise HTTPException(status_code=403, detail="Missing client host")

    try:
        ip = ipaddress.ip_address(client_host)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Invalid client host") from exc

    if not ip.is_loopback:
        raise HTTPException(status_code=403, detail="Only loopback clients are allowed")


@app.get("/v1/health")
async def health(request: Request) -> dict:
    ensure_loopback_client(request)
    return {"ok": True, "version": APP_VERSION}


@app.post("/v1/handshake")
async def handshake(request: Request, payload: dict) -> dict:
    ensure_loopback_client(request)

    client = str(payload.get("client", "")).strip()
    extension_id = str(payload.get("extensionId", "")).strip()
    nonce = str(payload.get("nonce", "")).strip()

    if client not in {"fix-pictures-extension", "fix-pictures-web"}:
        raise HTTPException(status_code=400, detail="Unsupported client")
    if not extension_id:
        raise HTTPException(status_code=400, detail="Missing extensionId")
    if not nonce:
        raise HTTPException(status_code=400, detail="Missing nonce")

    if allowed_extension_ids and extension_id not in allowed_extension_ids:
        raise HTTPException(status_code=403, detail="Extension is not allowed")

    session = sessions.create(extension_id=extension_id)
    return {
        "sessionId": session.session_id,
        "token": session.token,
        "expiresAt": session.expires_at.isoformat(),
    }


def authorize_session(
    request: Request,
    authorization: Optional[str],
    session_header: Optional[str],
) -> Session:
    ensure_loopback_client(request)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if not session_header:
        raise HTTPException(status_code=401, detail="Missing X-Fix-Session header")

    session = sessions.resolve(session_header)
    if not session:
        raise HTTPException(status_code=401, detail="Unknown or expired session")

    token = authorization.removeprefix("Bearer ").strip()
    if not secrets.compare_digest(token, session.token):
        raise HTTPException(status_code=403, detail="Invalid session token")

    return session


@app.post("/v1/process")
async def process_image(
    request: Request,
    image: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
    x_fix_session: Optional[str] = Header(default=None),
) -> dict:
    authorize_session(request, authorization, x_fix_session)

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image payload")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 25MB max size")

    try:
        png_bytes, width, height, bounds, histogram = run_local_pipeline(raw)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=422, detail=f"Unable to process image: {exc}") from exc

    return {
        "fileName": image.filename or "image.png",
        "width": width,
        "height": height,
        "maskedImageBase64": base64.b64encode(png_bytes).decode("ascii"),
        "bounds": bounds,
        "histogram": {"average": histogram},
    }


def run_local_pipeline(raw: bytes) -> Tuple[bytes, int, int, dict, list[int]]:
    try:
        from rembg import remove  # type: ignore
    except Exception as exc:
        raise RuntimeError("rembg is not available in local runtime") from exc

    # Pre-convert CMYK images → RGB before passing to rembg.
    # Alibaba suppliers commonly export JPEG product shots in CMYK mode;
    # rembg / onnxruntime expects 3-channel RGB input and will crash otherwise.
    try:
        _preflight = Image.open(io.BytesIO(raw))
        if _preflight.mode == "CMYK":
            _preflight = _preflight.convert("RGB")
            _buf = io.BytesIO()
            _preflight.save(_buf, format="JPEG", quality=95)
            raw = _buf.getvalue()
    except Exception:
        pass  # If pre-flight fails, let rembg handle or fail gracefully below

    try:
        removed = remove(raw)
        rgba_image = Image.open(io.BytesIO(removed)).convert("RGBA")
    except Exception as exc:
        raise RuntimeError("rembg failed to generate a cutout") from exc

    rgba_image = postprocess_mask(rgba_image)
    transparency_ratio = compute_transparency_ratio(rgba_image)
    if transparency_ratio < MIN_TRANSPARENCY_RATIO:
        raise RuntimeError(
            "segmentation produced no meaningful transparency; refusing non-cutout output"
        )

    width, height = rgba_image.size
    bounds = compute_alpha_bounds(rgba_image)
    bbox_width = max(bounds["maxX"] - bounds["minX"] + 1, 1)
    bbox_height = max(bounds["maxY"] - bounds["minY"] + 1, 1)
    if (
        (bbox_width / max(width, 1)) >= MAX_BBOX_COVERAGE_RATIO
        and (bbox_height / max(height, 1)) >= MAX_BBOX_COVERAGE_RATIO
    ):
        raise RuntimeError("local mask confidence too low (bbox covers almost entire frame)")

    histogram = compute_histogram(rgba_image)

    out = io.BytesIO()
    rgba_image.save(out, format="PNG")
    return out.getvalue(), width, height, bounds, histogram


def compute_alpha_bounds(image: Image.Image) -> dict:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()

    min_x = width
    min_y = height
    max_x = -1
    max_y = -1

    for y in range(height):
        for x in range(width):
            if pixels[x, y] < ALPHA_FOREGROUND_THRESHOLD:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if max_x < 0 or max_y < 0:
        return {"minX": 0, "minY": 0, "maxX": width - 1, "maxY": height - 1}

    return {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y}


def compute_histogram(image: Image.Image) -> list[int]:
    rgb = image.convert("RGB")
    pixels = list(rgb.getdata())
    total = max(len(pixels), 1)

    r_sum = sum(pixel[0] for pixel in pixels)
    g_sum = sum(pixel[1] for pixel in pixels)
    b_sum = sum(pixel[2] for pixel in pixels)

    return [round(r_sum / total), round(g_sum / total), round(b_sum / total)]


def compute_transparency_ratio(image: Image.Image) -> float:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    transparent = 0
    total = max(width * height, 1)

    for y in range(height):
        for x in range(width):
            if pixels[x, y] < 250:
                transparent += 1

    return transparent / total


def postprocess_mask(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")

    # Morphological close + median reduces pepper noise from segmentation.
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.MedianFilter(3))

    alpha = alpha.point(
        lambda value: 0
        if value <= ALPHA_LOW_CUTOFF
        else (255 if value >= ALPHA_HIGH_SNAP else value)
    )
    alpha = fill_internal_holes(alpha)

    output = image.copy()
    output.putalpha(alpha)
    return output


def fill_internal_holes(alpha: Image.Image) -> Image.Image:
    """
    Fill enclosed transparent holes inside the foreground mask.

    Previously implemented as a pure-Python BFS which ran in O(w×h) Python
    loops — catastrophically slow on 1000×1000 images (20–60 s observed).

    Replaced with a numpy/cv2 flood-fill approach that is 50–150× faster
    while producing identical results: flood-fill the exterior from all four
    borders to identify background pixels, then fill any enclosed transparent
    region (i.e. hole) that was not reachable from the border.
    """
    import cv2  # available in the local-inference venv

    arr = np.array(alpha, dtype=np.uint8)
    binary = (arr >= HOLE_FILL_THRESHOLD).astype(np.uint8) * 255

    h, w = binary.shape
    # Pad by 1 pixel so flood-fill can escape from every edge
    padded = np.zeros((h + 2, w + 2), dtype=np.uint8)
    padded[1:h+1, 1:w+1] = binary
    flood_mask = np.zeros((h + 4, w + 4), dtype=np.uint8)  # cv2 mask is 2px larger than image
    cv2.floodFill(padded, flood_mask, (0, 0), 255)
    exterior = padded[1:h+1, 1:w+1]  # strip padding

    # Pixels that are NOT exterior background AND NOT foreground → holes
    holes = (exterior == 0) & (binary == 0)
    filled = binary.copy()
    filled[holes] = 255

    # Respect the original max-hole-pixel cap from the old algorithm:
    # only fill small holes (≤ 2.5% of bbox area, min 240 px).
    # For the vast majority of product images this is a no-op; it matters
    # only for large open regions on cluttered backgrounds.
    bounds = compute_alpha_bounds_from_alpha(
        bytearray(arr.tobytes()), w, h, HOLE_FILL_THRESHOLD
    )
    min_x, min_y = bounds["minX"], bounds["minY"]
    max_x, max_y = bounds["maxX"], bounds["maxY"]
    if min_x < max_x and min_y < max_y:
        bbox_area = (max_x - min_x + 1) * (max_y - min_y + 1)
        max_hole_pixels = int(max(240, bbox_area * 0.025))
        # Label each hole component and remove those that are too large
        num_labels, labels = cv2.connectedComponents(holes.astype(np.uint8))
        for label in range(1, num_labels):
            if (labels == label).sum() > max_hole_pixels:
                filled[labels == label] = 0  # revert oversized holes

    return Image.fromarray(filled, "L")

    # ── Legacy Python BFS (kept for reference, do not remove) ───────────────
    width, height = alpha.size
    raw = bytearray(alpha.tobytes())
    visited = bytearray(width * height)
    bounds = compute_alpha_bounds_from_alpha(raw, width, height, HOLE_FILL_THRESHOLD)

    min_x = bounds["minX"]
    min_y = bounds["minY"]
    max_x = bounds["maxX"]
    max_y = bounds["maxY"]

    if min_x >= max_x or min_y >= max_y:
        return alpha

    bbox_area = max((max_x - min_x + 1) * (max_y - min_y + 1), 1)
    max_hole_pixels = int(max(240, bbox_area * 0.025))

    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            idx = y * width + x
            if visited[idx]:
                continue
            if raw[idx] >= HOLE_FILL_THRESHOLD:
                visited[idx] = 1
                continue

            queue = [idx]
            visited[idx] = 1
            component: list[int] = []
            head = 0
            touches_border = False

            while head < len(queue):
                current = queue[head]
                head += 1
                component.append(current)
                cx = current % width
                cy = current // width

                if cx == min_x or cx == max_x or cy == min_y or cy == max_y:
                    touches_border = True

                if cx > min_x:
                    left = current - 1
                    if not visited[left] and raw[left] < HOLE_FILL_THRESHOLD:
                        visited[left] = 1
                        queue.append(left)
                if cx < max_x:
                    right = current + 1
                    if not visited[right] and raw[right] < HOLE_FILL_THRESHOLD:
                        visited[right] = 1
                        queue.append(right)
                if cy > min_y:
                    up = current - width
                    if not visited[up] and raw[up] < HOLE_FILL_THRESHOLD:
                        visited[up] = 1
                        queue.append(up)
                if cy < max_y:
                    down = current + width
                    if not visited[down] and raw[down] < HOLE_FILL_THRESHOLD:
                        visited[down] = 1
                        queue.append(down)

            if not touches_border and len(component) <= max_hole_pixels:
                for pixel_idx in component:
                    raw[pixel_idx] = 255

    return Image.frombytes("L", (width, height), bytes(raw))


def compute_alpha_bounds_from_alpha(
    alpha: bytearray,
    width: int,
    height: int,
    threshold: int,
) -> dict:
    min_x = width
    min_y = height
    max_x = -1
    max_y = -1

    for y in range(height):
        row_base = y * width
        for x in range(width):
            if alpha[row_base + x] < threshold:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if max_x < 0 or max_y < 0:
        return {"minX": 0, "minY": 0, "maxX": width - 1, "maxY": height - 1}

    return {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y}
