# fix.pictures — Phase 1 Benchmark

Test the background removal pipeline against 100 real Alibaba product images.
Goal: **≥90% success rate** before any marketing.

## Quick Start

```bash
cd fix-pictures-app
bash benchmark/run.sh
```

This runs three steps automatically:
1. **Scrape** — downloads 10 product images × 10 categories from Alibaba
2. **Process** — runs every image through the exact pipeline in `local-inference/app/main.py`
3. **Report** — generates a self-contained `benchmark/report.html` and opens it in your browser

---

## Categories

| Category     | Query                           |
|--------------|---------------------------------|
| electronics  | smartphone bluetooth earphones  |
| clothing     | men women t-shirt fashion       |
| shoes        | sneakers running shoes          |
| bags         | leather handbag backpack        |
| furniture    | office chair sofa               |
| kitchen      | blender coffee maker            |
| tools        | power drill hand tools          |
| beauty       | lipstick foundation skincare    |
| toys         | lego building blocks toy        |
| watches      | mens wristwatch luxury          |

---

## If Scraping Fails

Alibaba uses aggressive bot detection. If `scrape.py` downloads 0 images, collect them manually:

1. Browse alibaba.com in your browser
2. For each category, save 10 product photos:
   - Right-click the product image → **Save Image As**
   - Save to `benchmark/images/<category_name>/` (e.g. `benchmark/images/electronics/`)
3. Re-run `bash benchmark/run.sh`

**Or** use browser cookies to authenticate the scraper:

```bash
# Export cookies from your browser to cookies.txt (using a browser extension like "Cookie-Editor")
python benchmark/scrape.py --output-dir benchmark/images
```

---

## Running Individual Steps

```bash
# Just scrape
python benchmark/scrape.py --output-dir benchmark/images --n 10

# Just process (after scraping)
python benchmark/process.py \
  --images-dir benchmark/images \
  --output-dir benchmark/output \
  --results-json benchmark/results.json \
  --venv local-inference/.venv

# Quick test with 10 images only
python benchmark/process.py --limit 10

# Just regenerate the report
python benchmark/report.py \
  --results benchmark/results.json \
  --output  benchmark/report.html
```

---

## Understanding the Report

### Pass/Fail Criteria
An image **passes** if:
- rembg generates a meaningful alpha mask (>0.3% transparency)
- The bounding box doesn't cover >97% of the frame

An image **fails** with one of these reasons:

| Failure Reason | What It Means | How to Fix |
|---------------|--------------|-----------|
| `no_transparency` | rembg returned a fully opaque mask — background wasn't removed | Product likely blends into background; try a different rembg model (`isnet-general-use`) |
| `bbox_overflow` | Product mask covers nearly the whole image — low segmentation confidence | Image has too much negative space or unusual framing; tune `MAX_BBOX_COVERAGE_RATIO` |
| `rembg_crash` | rembg raised an exception | Check image format (CMYK JPEGs from Alibaba are common) — convert to RGB first |
| `file_too_small` | Downloaded file was <2KB — a placeholder or HTTP error response | Scraper got blocked; retry or collect manually |
| `not_an_image` | File is corrupt | Download failed; retry |

### The 90% Target
- With 100 images: you need **90 passes**
- If you're at 75-89%: fix the dominant failure type (usually `bbox_overflow` or `rembg_crash`)
- If you're at <75%: the pipeline needs architectural work before marketing

---

## Fixing Common Failures

### bbox_overflow (most common on Alibaba)
Alibaba images often have white backgrounds with lots of padding around the product.
The current threshold is very strict (97%). Consider:
```python
# In local-inference/app/main.py
MAX_BBOX_COVERAGE_RATIO = 0.99  # loosen slightly
```

### rembg_crash on CMYK images
Alibaba suppliers often use CMYK JPEGs. Add a pre-conversion step:
```python
# At the start of run_local_pipeline()
from PIL import Image
img = Image.open(io.BytesIO(raw))
if img.mode == "CMYK":
    img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    raw = buf.getvalue()
```

### no_transparency on complex backgrounds
Switch to a more powerful rembg model:
```python
removed = remove(raw, session=new_session("isnet-general-use"))
```

---

## File Structure

```
benchmark/
├── run.sh              ← single command entry point
├── scrape.py           ← Alibaba image downloader
├── process.py          ← pipeline runner (mirrors main.py exactly)
├── report.py           ← HTML report generator
├── README.md
├── images/             ← scraped images (created on run)
│   ├── electronics/
│   ├── clothing/
│   └── ...
├── output/             ← processed PNGs (created on run)
│   ├── electronics/
│   └── ...
├── manifest.json       ← list of scraped images
├── results.json        ← per-image pass/fail + metadata
└── report.html         ← final report (open in browser)
```
