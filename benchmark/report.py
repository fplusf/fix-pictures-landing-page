#!/usr/bin/env python3
"""
Phase 1 — HTML Report Generator
Reads results.json and produces a rich before/after report with:
  - Overall pass rate vs 90% target
  - Per-category breakdown
  - Failure mode analysis
  - Side-by-side before/after images
  - Embedded base64 images (single self-contained .html file)

Usage:
    python report.py [--results ./results.json] [--output ./report.html]
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_results(path: Path) -> list[dict]:
    with path.open() as f:
        return json.load(f)


def img_to_base64(path: str | None) -> str | None:
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        return None
    data = p.read_bytes()
    ext = p.suffix.lower().lstrip(".")
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}.get(ext, "jpeg")
    return f"data:image/{mime};base64,{base64.b64encode(data).decode()}"


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

def compute_stats(results: list[dict]) -> dict:
    total = len(results)
    passed = [r for r in results if r["status"] == "pass"]
    failed = [r for r in results if r["status"] == "fail"]
    success_rate = len(passed) / max(total, 1)

    # Per-category
    cat_stats: dict[str, dict] = defaultdict(lambda: {"pass": 0, "fail": 0, "reasons": []})
    for r in results:
        cat = r["category"]
        cat_stats[cat][r["status"]] += 1
        if r["failure_reason"]:
            cat_stats[cat]["reasons"].append(r["failure_reason"])

    # Failure reasons
    reason_counts = Counter(r["failure_reason"] for r in failed if r["failure_reason"])

    # Processing time stats (for passed only)
    times = [r["processing_ms"] for r in passed if r["processing_ms"]]
    avg_ms = int(sum(times) / len(times)) if times else 0
    max_ms = max(times) if times else 0

    return {
        "total":         total,
        "passed":        len(passed),
        "failed":        len(failed),
        "success_rate":  success_rate,
        "target_met":    success_rate >= 0.90,
        "cat_stats":     dict(cat_stats),
        "reason_counts": dict(reason_counts),
        "avg_ms":        avg_ms,
        "max_ms":        max_ms,
        "passed_records": passed,
        "failed_records": failed,
    }


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------

def pct_color(rate: float) -> str:
    if rate >= 0.90:
        return "#22c55e"   # green
    if rate >= 0.70:
        return "#f59e0b"   # amber
    return "#ef4444"       # red


REASON_LABELS = {
    "no_transparency": "No transparency — solid background",
    "bbox_overflow":   "Bbox overflow — low mask confidence",
    "rembg_crash":     "rembg crash — model exception",
    "file_too_small":  "File too small — download error",
    "not_an_image":    "Corrupt image — invalid file",
    "timeout":         "Timeout — image too large",
}


def render_card(r: dict, show_images: bool = True) -> str:
    before_b64 = img_to_base64(r.get("image")) if show_images else None
    after_b64  = img_to_base64(r.get("output")) if show_images else None
    is_pass    = r["status"] == "pass"
    badge      = ('<span class="badge pass">✓ PASS</span>' if is_pass
                  else '<span class="badge fail">✗ FAIL</span>')
    reason_html = ""
    if r.get("failure_reason"):
        label = REASON_LABELS.get(r["failure_reason"], r["failure_reason"])
        reason_html = f'<div class="reason">⚠ {label}</div>'

    before_html = (
        f'<img src="{before_b64}" alt="before" loading="lazy"/>'
        if before_b64 else '<div class="no-img">image not found</div>'
    )
    after_html = (
        f'<img src="{after_b64}" alt="after" loading="lazy"/>'
        if after_b64 else '<div class="no-img">—</div>'
    )

    dims = f'{r.get("width", 0)}×{r.get("height", 0)}' if r.get("width") else ""
    ms   = f'{r["processing_ms"]}ms' if r.get("processing_ms") else ""
    tr   = f'{r["transparency_ratio"]:.1%} transparent' if r.get("transparency_ratio") else ""
    meta = " · ".join(x for x in [dims, ms, tr] if x)

    return f"""
<div class="card {'card-pass' if is_pass else 'card-fail'}">
  <div class="card-header">
    <span class="filename">{r['filename']}</span>
    <span class="category-tag">{r['category']}</span>
    {badge}
  </div>
  {reason_html}
  <div class="images">
    <div class="img-wrap">
      <div class="img-label">Before</div>
      {before_html}
    </div>
    <div class="img-wrap">
      <div class="img-label">After</div>
      <div class="after-bg">{after_html}</div>
    </div>
  </div>
  <div class="meta">{meta}</div>
</div>
"""


def render_category_table(cat_stats: dict) -> str:
    rows = ""
    for cat in sorted(cat_stats.keys()):
        s   = cat_stats[cat]
        p   = s["pass"]; f = s["fail"]; tot = p + f
        rate = p / max(tot, 1)
        color = pct_color(rate)
        bar_w = int(rate * 100)
        rows += f"""
<tr>
  <td><strong>{cat}</strong></td>
  <td class="num">{tot}</td>
  <td class="num">{p}</td>
  <td class="num">{f}</td>
  <td>
    <div class="bar-bg">
      <div class="bar-fill" style="width:{bar_w}%; background:{color};"></div>
    </div>
    <span style="color:{color}; font-weight:600;">{rate:.0%}</span>
  </td>
</tr>"""
    return rows


def render_failure_table(reason_counts: dict) -> str:
    if not reason_counts:
        return "<p>No failures — congratulations!</p>"
    rows = ""
    total = sum(reason_counts.values())
    for reason, count in sorted(reason_counts.items(), key=lambda x: -x[1]):
        label = REASON_LABELS.get(reason, reason)
        pct   = count / total
        rows += f"""
<tr>
  <td>{label}</td>
  <td class="num">{count}</td>
  <td class="num">{pct:.0%}</td>
</tr>"""
    return rows


def generate_html(results: list[dict], stats: dict) -> str:
    rate   = stats["success_rate"]
    color  = pct_color(rate)
    target = "🎉 TARGET MET" if stats["target_met"] else f"⚠ Need {int(0.90 * stats['total']) - stats['passed']} more to reach 90%"

    # Separate pass/fail cards — show failures first (more diagnostic value)
    fail_cards = "".join(render_card(r) for r in stats["failed_records"])
    pass_cards  = "".join(render_card(r) for r in stats["passed_records"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>fix.pictures · Phase 1 Benchmark Report</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f172a; color: #e2e8f0; line-height: 1.5; }}
  .container {{ max-width: 1400px; margin: 0 auto; padding: 24px; }}

  /* Header */
  .page-header {{ text-align: center; padding: 48px 0 32px; }}
  .page-header h1 {{ font-size: 2.2rem; font-weight: 800; color: #f8fafc; }}
  .page-header .subtitle {{ color: #94a3b8; margin-top: 8px; }}

  /* Hero stat */
  .hero {{ display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 32px; justify-content: center; }}
  .stat-card {{ background: #1e293b; border: 1px solid #334155; border-radius: 12px;
                padding: 24px 32px; text-align: center; min-width: 160px; }}
  .stat-card .num {{ font-size: 2.5rem; font-weight: 800; }}
  .stat-card .lbl {{ font-size: 0.8rem; color: #94a3b8; margin-top: 4px; text-transform: uppercase; }}
  .target-banner {{ background: #1e293b; border: 2px solid {color};
                    border-radius: 12px; padding: 16px 32px; text-align: center;
                    font-size: 1.1rem; font-weight: 700; color: {color}; margin-bottom: 32px; }}

  /* Tables */
  .section {{ margin-bottom: 40px; }}
  .section h2 {{ font-size: 1.2rem; font-weight: 700; margin-bottom: 16px; color: #f1f5f9; }}
  table {{ width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 10px; overflow: hidden; }}
  th {{ background: #0f172a; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase;
        padding: 10px 16px; text-align: left; }}
  td {{ padding: 10px 16px; border-top: 1px solid #334155; font-size: 0.9rem; }}
  .num {{ text-align: center; }}
  .bar-bg {{ background: #334155; border-radius: 4px; height: 8px; width: 120px; display: inline-block; vertical-align: middle; margin-right: 8px; }}
  .bar-fill {{ height: 100%; border-radius: 4px; }}

  /* Cards */
  .cards-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }}
  .card {{ background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }}
  .card-pass {{ border-color: #166534; }}
  .card-fail {{ border-color: #7f1d1d; }}
  .card-header {{ display: flex; align-items: center; gap: 8px; padding: 12px 16px;
                  background: #0f172a; flex-wrap: wrap; }}
  .filename {{ font-weight: 600; font-size: 0.85rem; flex: 1; color: #e2e8f0; word-break: break-all; }}
  .category-tag {{ background: #334155; color: #94a3b8; font-size: 0.7rem;
                   padding: 2px 8px; border-radius: 20px; text-transform: uppercase; }}
  .badge {{ font-size: 0.75rem; font-weight: 700; padding: 2px 10px; border-radius: 20px; }}
  .badge.pass {{ background: #166534; color: #86efac; }}
  .badge.fail {{ background: #7f1d1d; color: #fca5a5; }}
  .reason {{ background: #431407; color: #fdba74; font-size: 0.8rem;
             padding: 8px 16px; border-left: 3px solid #f97316; }}
  .images {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; }}
  .img-wrap {{ display: flex; flex-direction: column; gap: 4px; }}
  .img-label {{ font-size: 0.7rem; color: #64748b; text-transform: uppercase; text-align: center; }}
  .img-wrap img {{ width: 100%; height: 180px; object-fit: contain; border-radius: 6px;
                   background: #334155; }}
  .after-bg img {{ background: repeating-conic-gradient(#475569 0% 25%, #334155 0% 50%)
                              0 0 / 16px 16px; }}
  .no-img {{ height: 180px; display: flex; align-items: center; justify-content: center;
             color: #475569; font-size: 0.8rem; border: 1px dashed #334155; border-radius: 6px; }}
  .meta {{ font-size: 0.75rem; color: #64748b; padding: 4px 12px 12px; }}

  /* Tabs */
  .tabs {{ display: flex; gap: 8px; margin-bottom: 16px; }}
  .tab {{ padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
          font-weight: 600; background: #1e293b; border: 1px solid #334155; color: #94a3b8; }}
  .tab.active {{ background: #334155; color: #f1f5f9; border-color: #475569; }}
  .tab-content {{ display: none; }}
  .tab-content.active {{ display: block; }}
</style>
</head>
<body>
<div class="container">

  <div class="page-header">
    <h1>fix.pictures · Phase 1 Benchmark</h1>
    <div class="subtitle">Alibaba product images · Background removal pipeline validation</div>
  </div>

  <!-- Hero stats -->
  <div class="hero">
    <div class="stat-card">
      <div class="num" style="color:{color};">{rate:.0%}</div>
      <div class="lbl">Success Rate</div>
    </div>
    <div class="stat-card">
      <div class="num">{stats['total']}</div>
      <div class="lbl">Total Images</div>
    </div>
    <div class="stat-card">
      <div class="num" style="color:#22c55e;">{stats['passed']}</div>
      <div class="lbl">Passed</div>
    </div>
    <div class="stat-card">
      <div class="num" style="color:#ef4444;">{stats['failed']}</div>
      <div class="lbl">Failed</div>
    </div>
    <div class="stat-card">
      <div class="num">{stats['avg_ms']}ms</div>
      <div class="lbl">Avg Process Time</div>
    </div>
    <div class="stat-card">
      <div class="num">{stats['max_ms']}ms</div>
      <div class="lbl">Max Process Time</div>
    </div>
  </div>

  <div class="target-banner">{target}</div>

  <!-- Category breakdown -->
  <div class="section">
    <h2>Performance by Category</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Total</th><th>Pass</th><th>Fail</th><th>Rate</th></tr>
      </thead>
      <tbody>
        {render_category_table(stats['cat_stats'])}
      </tbody>
    </table>
  </div>

  <!-- Failure breakdown -->
  <div class="section">
    <h2>Failure Mode Analysis</h2>
    <table>
      <thead>
        <tr><th>Failure Reason</th><th>Count</th><th>% of Failures</th></tr>
      </thead>
      <tbody>
        {render_failure_table(stats['reason_counts'])}
      </tbody>
    </table>
  </div>

  <!-- Before/After cards -->
  <div class="section">
    <h2>Image Results</h2>
    <div class="tabs">
      <div class="tab active" onclick="showTab('failures')">
        Failures ({stats['failed']})
      </div>
      <div class="tab" onclick="showTab('passes')">
        Passes ({stats['passed']})
      </div>
      <div class="tab" onclick="showTab('all')">
        All ({stats['total']})
      </div>
    </div>

    <div id="failures" class="tab-content active">
      {'<p style="color:#64748b; padding:16px;">No failures — all images passed!</p>' if not fail_cards else f'<div class="cards-grid">{fail_cards}</div>'}
    </div>
    <div id="passes" class="tab-content">
      {'<p style="color:#64748b; padding:16px;">No passes yet.</p>' if not pass_cards else f'<div class="cards-grid">{pass_cards}</div>'}
    </div>
    <div id="all" class="tab-content">
      <div class="cards-grid">{fail_cards}{pass_cards}</div>
    </div>
  </div>

</div>

<script>
function showTab(id) {{
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.classList.add('active');
}}
</script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate HTML benchmark report")
    parser.add_argument("--results", default="./results.json", help="Path to results.json")
    parser.add_argument("--output",  default="./report.html",  help="Output HTML file")
    parser.add_argument("--no-images", action="store_true",
                        help="Omit embedded images (faster, smaller file)")
    args = parser.parse_args()

    results_path = Path(args.results)
    if not results_path.exists():
        print(f"✗ results.json not found: {results_path}", file=sys.stderr)
        print("  Run process.py first.", file=sys.stderr)
        sys.exit(1)

    results = load_results(results_path)
    stats   = compute_stats(results)
    html    = generate_html(results, stats)

    out = Path(args.output)
    out.write_text(html, encoding="utf-8")
    print(f"✅ Report written → {out}")
    print(f"   Open in browser:  open {out}")
    print(f"\n   Pass rate: {stats['success_rate']:.1%}  ({'TARGET MET ✓' if stats['target_met'] else 'below 90% target'})")


if __name__ == "__main__":
    main()
