#!/usr/bin/env python3
"""
Phase 1 — Alibaba Image Scraper
Downloads 10 real product images per category (100 total) from Alibaba's CDN.
Targets alibaba.com search pages and extracts product image URLs.

Usage:
    python scrape.py [--output-dir ./images] [--delay 1.0]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path
from typing import Iterator

# ---------------------------------------------------------------------------
# Categories → search queries
# ---------------------------------------------------------------------------
CATEGORIES: dict[str, str] = {
    "electronics":    "smartphone bluetooth earphones",
    "clothing":       "men women t-shirt fashion",
    "shoes":          "sneakers running shoes",
    "bags":           "leather handbag backpack",
    "furniture":      "office chair sofa",
    "kitchen":        "blender coffee maker",
    "tools":          "power drill hand tools",
    "beauty":         "lipstick foundation skincare",
    "toys":           "lego building blocks toy",
    "watches":        "mens wristwatch luxury",
}

IMAGES_PER_CATEGORY = 10

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.alibaba.com/",
}


# ---------------------------------------------------------------------------
# Image URL extraction
# ---------------------------------------------------------------------------
ALIBABA_CDN_PATTERN = re.compile(
    r'(https?://(?:sc\d+|img|ae01)\.alicdn\.com/kf/[A-Za-z0-9/_\-]+\.(?:jpg|jpeg|png|webp))'
    r'(?:_\d+x\d+\.jpg)?',
    re.IGNORECASE,
)

ALIEXPRESS_CDN_PATTERN = re.compile(
    r'(https?://ae\d*\.alicdn\.com/kf/[A-Za-z0-9/_\-]+\.(?:jpg|jpeg|png|webp))',
    re.IGNORECASE,
)

# If Alibaba search blocks, fall back to AliExpress (same CDN infrastructure)
SEARCH_URLS = [
    # Alibaba.com keyword search — returns JSON-embedded image data
    "https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText={query}&viewtype=G",
    # AliExpress search as fallback (same Alibaba group CDN)
    "https://www.aliexpress.com/wholesale?catId=0&initiative_id=SB_20240101&SearchText={query}",
]


def fetch_url(url: str, timeout: int = 15) -> str | None:
    """Fetch a URL and return the text body, or None on error."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            # Try to decode — pages may be gzipped
            try:
                import gzip
                raw = gzip.decompress(raw)
            except Exception:
                pass
            for enc in ("utf-8", "latin-1"):
                try:
                    return raw.decode(enc)
                except UnicodeDecodeError:
                    continue
    except Exception as exc:
        print(f"  ⚠  fetch failed for {url[:80]}…  ({exc})", file=sys.stderr)
    return None


def extract_image_urls(html: str) -> list[str]:
    """Pull all Alibaba CDN image URLs from raw HTML / JSON."""
    found: list[str] = []
    for pattern in (ALIBABA_CDN_PATTERN, ALIEXPRESS_CDN_PATTERN):
        found.extend(pattern.findall(html))

    # Normalise: strip resize suffixes, deduplicate, prefer .jpg
    clean: dict[str, str] = {}
    for url in found:
        # Remove Alibaba resize tokens like _220x220.jpg
        base = re.sub(r'_\d+x\d+\.(jpg|jpeg|png|webp)$', '', url, flags=re.IGNORECASE)
        # Keep the highest-quality variant per base path
        if base not in clean:
            clean[base] = url
    return list(clean.values())


def download_image(url: str, dest: Path, timeout: int = 20) -> bool:
    """Download one image file to *dest*.  Returns True on success."""
    req = urllib.request.Request(url, headers={
        **HEADERS,
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
        if len(data) < 2_000:          # too small — probably an error page thumbnail
            return False
        dest.write_bytes(data)
        return True
    except Exception as exc:
        print(f"  ⚠  download failed ({exc})", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# Per-category scrape
# ---------------------------------------------------------------------------

def scrape_category(
    name: str,
    query: str,
    output_dir: Path,
    n: int,
    delay: float,
) -> list[Path]:
    """Scrape up to *n* images for one category.  Returns saved paths."""
    cat_dir = output_dir / name
    cat_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📦 {name.upper()}  (query: '{query}')")

    all_urls: list[str] = []
    for template in SEARCH_URLS:
        url = template.format(query=urllib.parse.quote_plus(query))
        html = fetch_url(url)
        if html:
            urls = extract_image_urls(html)
            print(f"   → found {len(urls)} image URLs from {url[:60]}…")
            all_urls.extend(urls)
        time.sleep(delay)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_urls = [u for u in all_urls if not (u in seen or seen.add(u))]  # type: ignore

    if not unique_urls:
        print(f"   ✗  no image URLs extracted — try --debug to inspect HTML")
        return []

    saved: list[Path] = []
    for i, img_url in enumerate(unique_urls):
        if len(saved) >= n:
            break
        dest = cat_dir / f"{name}_{i+1:03d}.jpg"
        if dest.exists():
            print(f"   · skip (exists): {dest.name}")
            saved.append(dest)
            continue
        ok = download_image(img_url, dest)
        if ok:
            size_kb = dest.stat().st_size // 1024
            print(f"   ✓  {dest.name}  ({size_kb} KB)")
            saved.append(dest)
        else:
            print(f"   ✗  {img_url[:80]}")
        time.sleep(delay * 0.5)

    print(f"   → saved {len(saved)}/{n}")
    return saved


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(output_dir: Path, results: dict[str, list[Path]]) -> Path:
    data = {
        cat: [str(p) for p in paths]
        for cat, paths in results.items()
    }
    manifest = output_dir / "manifest.json"
    manifest.write_text(json.dumps(data, indent=2))
    print(f"\n📋 Manifest written → {manifest}")
    return manifest


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    import urllib.parse  # noqa: F401 (used above, ensure imported)

    parser = argparse.ArgumentParser(description="Scrape Alibaba product images for benchmarking")
    parser.add_argument("--output-dir", default="./images", help="Where to save images")
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between requests (be polite)")
    parser.add_argument("--categories", nargs="*", help="Subset of categories to scrape")
    parser.add_argument("--n", type=int, default=IMAGES_PER_CATEGORY, help="Images per category")
    parser.add_argument("--debug", action="store_true", help="Dump raw HTML to stderr for inspection")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    cats = CATEGORIES
    if args.categories:
        cats = {k: v for k, v in CATEGORIES.items() if k in args.categories}

    results: dict[str, list[Path]] = {}
    for name, query in cats.items():
        paths = scrape_category(name, query, output_dir, args.n, args.delay)
        results[name] = paths

    write_manifest(output_dir, results)

    total = sum(len(v) for v in results.values())
    print(f"\n✅ Done — {total} images downloaded across {len(results)} categories")

    if total < 10:
        print("\n⚠  Very few images downloaded. Alibaba may be blocking the scraper.")
        print("   → Try running with a real browser session (see README for cookie approach)")
        print("   → Or use the manual fallback: download/images-manual/ instructions in README")


if __name__ == "__main__":
    import urllib.parse
    main()
