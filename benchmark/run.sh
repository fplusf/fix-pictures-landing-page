#!/usr/bin/env bash
# =============================================================================
# fix.pictures — Phase 1 Benchmark
# One command to: scrape → process → report
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/../local-inference/.venv"
IMAGES_DIR="$SCRIPT_DIR/images"
OUTPUT_DIR="$SCRIPT_DIR/output"
RESULTS_JSON="$SCRIPT_DIR/results.json"
REPORT_HTML="$SCRIPT_DIR/report.html"

PYTHON="$VENV/bin/python3"

# Fallback: use system python if venv missing
if [ ! -f "$PYTHON" ]; then
  echo "⚠  venv python not found at $PYTHON — using system python3"
  PYTHON="python3"
  VENV_ARG=""
else
  VENV_ARG="--venv $VENV"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  fix.pictures · Phase 1 Benchmark        ║"
echo "║  Target: 90% success rate on Alibaba imgs ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Scrape ──────────────────────────────────────────────────────────
echo "▶ Step 1/3: Scraping Alibaba images (100 total)…"
echo ""
$PYTHON "$SCRIPT_DIR/scrape.py" \
  --output-dir "$IMAGES_DIR" \
  --n 10 \
  --delay 1.5

SCRAPED=$(python3 -c "import json; d=json.load(open('$IMAGES_DIR/manifest.json')); print(sum(len(v) for v in d.values()))" 2>/dev/null || echo "?")
echo ""
echo "   Scraped $SCRAPED images"

if [ "$SCRAPED" = "0" ] || [ "$SCRAPED" = "?" ]; then
  echo ""
  echo "⚠  Scraping failed or produced no images."
  echo "   Alibaba may be blocking the scraper."
  echo ""
  echo "   Manual fallback:"
  echo "   1. Browse alibaba.com in your browser"
  echo "   2. Right-click → Save Image for 10 products per category"
  echo "   3. Save to: benchmark/images/<category_name>/<file>.jpg"
  echo "   4. Run manually: python benchmark/scrape.py --help for category names"
  echo "   5. Then re-run: bash benchmark/run.sh"
  echo ""
  read -p "   Continue with partial images? [y/N]: " CONT
  if [[ "$CONT" != "y" && "$CONT" != "Y" ]]; then
    echo "   Aborted."
    exit 1
  fi
fi

# ── Step 2: Process ─────────────────────────────────────────────────────────
echo ""
echo "▶ Step 2/3: Running pipeline…"
echo ""
$PYTHON "$SCRIPT_DIR/process.py" \
  --images-dir "$IMAGES_DIR" \
  --output-dir "$OUTPUT_DIR" \
  --results-json "$RESULTS_JSON" \
  $VENV_ARG

# ── Step 3: Report ──────────────────────────────────────────────────────────
echo ""
echo "▶ Step 3/3: Generating report…"
echo ""
$PYTHON "$SCRIPT_DIR/report.py" \
  --results "$RESULTS_JSON" \
  --output  "$REPORT_HTML"

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Phase 1 complete"
echo ""
echo "  📊 Report:  $REPORT_HTML"
echo "  📋 Raw:     $RESULTS_JSON"
echo ""
echo "  Next steps if below 90%:"
echo "  → Check report's 'Failure Mode Analysis' table"
echo "  → Fix dominant failure type first (usually bbox_overflow)"
echo "  → Re-run:  bash benchmark/run.sh"
echo "══════════════════════════════════════════════"
echo ""

# Auto-open report on Mac
if command -v open &>/dev/null; then
  open "$REPORT_HTML"
fi
