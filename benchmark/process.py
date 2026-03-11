#!/usr/bin/env python3
"""
Phase 1 — Pipeline Runner
Processes scraped Alibaba images through the fix.pictures rembg pipeline.
Mirrors the exact logic from local-inference/app/main.py so results are identical.

Usage:
    python process.py [--images-dir ./images] [--output-dir ./output]

Two modes:
  1. Direct (default): imports rembg from the venv directly — fast, no server needed
  2. API:  sends images to the running local-inference FastAPI server
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import time
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Replicate main.py constants exactly
# ---------------------------------------------------------------------------
ALPHA_FOREGROUND_THRESHOLD = 136
MIN_TRANSPARENCY_RATIO = 0.003
ALPHA_LOW_CUTOFF = 72
ALPHA_HIGH_SNAP = 236
HOLE_FILL_THRESHOLD = 108
MAX_BBOX_COVERAGE_RATIO = 0.97


# ---------------------------------------------------------------------------
# Pipeline — exact copy of main.py logic so results are identical
# ---------------------------------------------------------------------------

def run_pipeline(raw: bytes, remove_fn) -> tuple[bytes, int, int, dict, list[int]]:
    """Run the fix.pictures pipeline. remove_fn is rembg.remove."""
    from PIL import Image, ImageFilter

    removed = remove_fn(raw)
    rgba_image = Image.open(io.BytesIO(removed)).convert("RGBA")
    rgba_image = postprocess_mask(rgba_image)

    transparency_ratio = compute_transparency_ratio(rgba_image)
    if transparency_ratio < MIN_TRANSPARENCY_RATIO:
        raise ValueError("segmentation produced no meaningful transparency; refusing non-cutout output")

    width, height = rgba_image.size
    bounds = compute_alpha_bounds(rgba_image)
    bbox_width = max(bounds["maxX"] - bounds["minX"] + 1, 1)
    bbox_height = max(bounds["maxY"] - bounds["minY"] + 1, 1)

    if (
        (bbox_width / max(width, 1)) >= MAX_BBOX_COVERAGE_RATIO
        and (bbox_height / max(height, 1)) >= MAX_BBOX_COVERAGE_RATIO
    ):
        raise ValueError("local mask confidence too low (bbox covers almost entire frame)")

    histogram = compute_histogram(rgba_image)
    out = io.BytesIO()
    rgba_image.save(out, format="PNG")
    return out.getvalue(), width, height, bounds, histogram


def compute_alpha_bounds(image) -> dict:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        for x in range(width):
            if pixels[x, y] < ALPHA_FOREGROUND_THRESHOLD:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if max_x < 0:
        return {"minX": 0, "minY": 0, "maxX": width - 1, "maxY": height - 1}
    return {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y}


def compute_histogram(image) -> list[int]:
    rgb = image.convert("RGB")
    pixels = list(rgb.getdata())
    total = max(len(pixels), 1)
    return [
        round(sum(p[0] for p in pixels) / total),
        round(sum(p[1] for p in pixels) / total),
        round(sum(p[2] for p in pixels) / total),
    ]


def compute_transparency_ratio(image) -> float:
    from PIL import Image  # noqa
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    transparent = sum(1 for y in range(height) for x in range(width) if pixels[x, y] < 250)
    return transparent / max(width * height, 1)


def postprocess_mask(image):
    from PIL import ImageFilter
    alpha = image.getchannel("A")
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.MedianFilter(3))
    alpha = alpha.point(
        lambda v: 0 if v <= ALPHA_LOW_CUTOFF else (255 if v >= ALPHA_HIGH_SNAP else v)
    )
    alpha = fill_internal_holes(alpha)
    output = image.copy()
    output.putalpha(alpha)
    return output


def fill_internal_holes(alpha):
    from PIL import Image
    width, height = alpha.size
    raw = bytearray(alpha.tobytes())
    visited = bytearray(width * height)
    bounds = _alpha_bounds_raw(raw, width, height, HOLE_FILL_THRESHOLD)
    min_x, min_y = bounds["minX"], bounds["minY"]
    max_x, max_y = bounds["maxX"], bounds["maxY"]
    if min_x >= max_x or min_y >= max_y:
        return alpha
    bbox_area = max((max_x - min_x + 1) * (max_y - min_y + 1), 1)
    max_hole = int(max(240, bbox_area * 0.025))
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            idx = y * width + x
            if visited[idx] or raw[idx] >= HOLE_FILL_THRESHOLD:
                visited[idx] = 1
                continue
            queue = [idx]
            visited[idx] = 1
            component: list[int] = []
            head = 0
            touches_border = False
            while head < len(queue):
                cur = queue[head]; head += 1
                component.append(cur)
                cx, cy = cur % width, cur // width
                if cx in (min_x, max_x) or cy in (min_y, max_y):
                    touches_border = True
                for nxt in (cur - 1 if cx > min_x else -1,
                             cur + 1 if cx < max_x else -1,
                             cur - width if cy > min_y else -1,
                             cur + width if cy < max_y else -1):
                    if nxt >= 0 and not visited[nxt] and raw[nxt] < HOLE_FILL_THRESHOLD:
                        visited[nxt] = 1
                        queue.append(nxt)
            if not touches_border and len(component) <= max_hole:
                for pi in component:
                    raw[pi] = 255
    return Image.frombytes("L", (width, height), bytes(raw))


def _alpha_bounds_raw(alpha: bytearray, width: int, height: int, threshold: int) -> dict:
    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        rb = y * width
        for x in range(width):
            if alpha[rb + x] < threshold:
                continue
            min_x = min(min_x, x); min_y = min(min_y, y)
            max_x = max(max_x, x); max_y = max(max_y, y)
    if max_x < 0:
        return {"minX": 0, "minY": 0, "maxX": width - 1, "maxY": height - 1}
    return {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y}


# ---------------------------------------------------------------------------
# Failure classification
# ---------------------------------------------------------------------------

FAILURE_REASONS = {
    "no_transparency": "rembg produced no meaningful transparency (solid background)",
    "bbox_overflow":   "bounding box covers nearly entire frame (confidence too low)",
    "rembg_crash":     "rembg raised an exception (likely corrupt/unsupported image)",
    "file_too_small":  "image file too small (<2KB) — likely a placeholder or error thumbnail",
    "not_an_image":    "file is not a valid image (corrupt download)",
    "timeout":         "processing took >60s (image resolution too high or model crashed)",
}


def classify_failure(exc: Exception) -> str:
    msg = str(exc).lower()
    if "no meaningful transparency" in msg:
        return "no_transparency"
    if "bbox covers" in msg or "confidence too low" in msg:
        return "bbox_overflow"
    return "rembg_crash"


# ---------------------------------------------------------------------------
# Result record
# ---------------------------------------------------------------------------

def make_result(
    image_path: Path,
    category: str,
    status: str,                    # "pass" | "fail"
    failure_reason: Optional[str],
    output_path: Optional[Path],
    processing_ms: int,
    width: int = 0,
    height: int = 0,
    bounds: Optional[dict] = None,
    transparency_ratio: float = 0.0,
) -> dict:
    return {
        "image":            str(image_path),
        "filename":         image_path.name,
        "category":         category,
        "status":           status,
        "failure_reason":   failure_reason,
        "output":           str(output_path) if output_path else None,
        "processing_ms":    processing_ms,
        "width":            width,
        "height":           height,
        "bounds":           bounds,
        "transparency_ratio": round(transparency_ratio, 4),
    }


# ---------------------------------------------------------------------------
# Main batch processor
# ---------------------------------------------------------------------------

def load_rembg(venv_dir: Optional[str]) -> object:
    """Import rembg.remove, optionally from a virtualenv."""
    if venv_dir:
        import sys
        venv_path = Path(venv_dir)
        # Find the site-packages inside the venv
        site_pkgs = list(venv_path.glob("lib/python*/site-packages"))
        if not site_pkgs:
            print(f"⚠  No site-packages found in {venv_dir}", file=sys.stderr)
        else:
            sys.path.insert(0, str(site_pkgs[0]))
            print(f"ℹ  Using venv: {site_pkgs[0]}")

    from rembg import remove  # type: ignore
    return remove


def process_batch(
    manifest: Path,
    output_dir: Path,
    venv_dir: Optional[str],
    limit: Optional[int],
) -> list[dict]:
    with manifest.open() as f:
        cats: dict[str, list[str]] = json.load(f)

    remove_fn = load_rembg(venv_dir)
    print(f"✓ rembg loaded\n")

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []

    all_images: list[tuple[str, Path]] = []
    for cat, paths in cats.items():
        for p in paths:
            all_images.append((cat, Path(p)))

    if limit:
        all_images = all_images[:limit]

    total = len(all_images)
    passed = failed = 0

    for i, (category, img_path) in enumerate(all_images, 1):
        label = f"[{i:>3}/{total}]"
        if not img_path.exists():
            print(f"{label} ✗ MISSING   {img_path.name}")
            results.append(make_result(img_path, category, "fail", "not_an_image", None, 0))
            failed += 1
            continue

        file_size = img_path.stat().st_size
        if file_size < 2_000:
            print(f"{label} ✗ TOO SMALL {img_path.name}  ({file_size}B)")
            results.append(make_result(img_path, category, "fail", "file_too_small", None, 0))
            failed += 1
            continue

        # Validate it's a real image
        try:
            from PIL import Image
            img = Image.open(img_path)
            img.verify()
        except Exception:
            print(f"{label} ✗ CORRUPT   {img_path.name}")
            results.append(make_result(img_path, category, "fail", "not_an_image", None, 0))
            failed += 1
            continue

        raw = img_path.read_bytes()
        t0 = time.monotonic()

        try:
            png_bytes, w, h, bounds, hist = run_pipeline(raw, remove_fn)
            elapsed_ms = int((time.monotonic() - t0) * 1000)

            # Re-open to get transparency ratio for reporting
            from PIL import Image
            rgba = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
            tr = compute_transparency_ratio(rgba)

            out_path = output_dir / category / (img_path.stem + "_out.png")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(png_bytes)

            passed += 1
            print(f"{label} ✓ PASS      {img_path.name}  {w}×{h}  {elapsed_ms}ms  transp={tr:.2%}")
            results.append(make_result(img_path, category, "pass", None, out_path, elapsed_ms, w, h, bounds, tr))

        except ValueError as exc:
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            reason = classify_failure(exc)
            failed += 1
            print(f"{label} ✗ {reason.upper()[:12]:<12} {img_path.name}  {elapsed_ms}ms  → {exc}")
            results.append(make_result(img_path, category, "fail", reason, None, elapsed_ms))

        except Exception as exc:
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            failed += 1
            print(f"{label} ✗ CRASH     {img_path.name}  {elapsed_ms}ms  → {exc}")
            results.append(make_result(img_path, category, "fail", "rembg_crash", None, elapsed_ms))

    success_rate = passed / max(total, 1)
    print(f"\n{'='*60}")
    print(f"  Total:   {total}")
    print(f"  Passed:  {passed}  ({success_rate:.1%})")
    print(f"  Failed:  {failed}")
    if success_rate >= 0.90:
        print(f"  🎉 TARGET MET — ≥90% success rate!")
    else:
        shortfall = int(0.90 * total) - passed
        print(f"  ⚠  Need {shortfall} more passes to hit 90% target")
    print(f"{'='*60}")

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Run fix.pictures pipeline on Alibaba benchmark images")
    parser.add_argument("--images-dir",  default="./images",   help="Directory containing scraped images")
    parser.add_argument("--output-dir",  default="./output",   help="Where to write processed PNGs")
    parser.add_argument("--manifest",    default=None,         help="Path to manifest.json (default: --images-dir/manifest.json)")
    parser.add_argument("--venv",        default=None,         help="Path to local-inference venv (e.g. ../local-inference/.venv)")
    parser.add_argument("--limit",       type=int, default=None, help="Process only first N images (for quick testing)")
    parser.add_argument("--results-json", default="./results.json", help="Where to write results JSON")
    args = parser.parse_args()

    manifest = Path(args.manifest) if args.manifest else Path(args.images_dir) / "manifest.json"
    if not manifest.exists():
        print(f"✗ Manifest not found: {manifest}", file=sys.stderr)
        print("  Run scrape.py first.", file=sys.stderr)
        sys.exit(1)

    results = process_batch(
        manifest=manifest,
        output_dir=Path(args.output_dir),
        venv_dir=args.venv,
        limit=args.limit,
    )

    results_path = Path(args.results_json)
    results_path.write_text(json.dumps(results, indent=2))
    print(f"\n📊 Results written → {results_path}")
    print(f"   Run: python report.py --results {results_path}")


if __name__ == "__main__":
    main()
