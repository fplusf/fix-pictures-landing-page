import { Link } from 'react-router-dom';
import SeoPageLayout from '@/src/components/SeoPageLayout';

const requirements = [
  {
    rule: 'Pure white background',
    detail: 'RGB 255, 255, 255. No off-white, no gradients, no shadows touching the edges.',
  },
  {
    rule: 'Product fills 85–100% of frame',
    detail: 'The product must occupy at least 85% of the image area. Dead space = rejection.',
  },
  {
    rule: '2000 × 2000 px minimum',
    detail: 'Enables Amazon\'s zoom feature. Smaller images get flagged and suppress zoom on the listing.',
  },
  {
    rule: 'JPEG, PNG, TIFF, or GIF',
    detail: 'JPEG at sRGB color space is the safe default. Avoid CMYK — it displays incorrectly.',
  },
  {
    rule: 'Under 10 MB file size',
    detail: 'Amazon\'s upload limit. Above this, the upload silently fails or gets resized.',
  },
  {
    rule: 'No text, logos, or watermarks',
    detail: 'Nothing overlaid on the main image — not your brand logo, not "New", not a sale badge.',
  },
  {
    rule: 'No mannequins or models for certain categories',
    detail: 'Jewelry, some apparel, and accessories have additional restrictions on how products are shown.',
  },
  {
    rule: 'No borders, frames, or multiple views',
    detail: 'The main image is strictly one product, clean, against white. Collages are for secondary slots only.',
  },
];

export default function AmazonImageRequirements() {
  return (
    <SeoPageLayout
      title="Amazon Main Image Requirements 2024 — Complete Checklist"
      description="Full breakdown of Amazon's main product image requirements: white background, minimum size, file format, and common rejection reasons. With a tool to fix non-compliant images automatically."
    >
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a2f]">
            Amazon Seller Guide
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Amazon Main Image Requirements (2025)
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500">
            Amazon's main image rules are strict, non-negotiable, and enforced algorithmically. A non-compliant image can suppress your listing from search, trigger an automated takedown, or tank your click-through rate. Here's every requirement — and what happens when you miss one.
          </p>
        </div>

        {/* Requirements table */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">The complete checklist</h2>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            {requirements.map((r) => (
              <div key={r.rule} className="flex flex-col gap-1 px-6 py-4 md:flex-row md:gap-8">
                <div className="flex items-start gap-3 md:w-56 md:shrink-0">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff7a2f]/15 text-[10px] font-bold text-[#ff7a2f]">✓</span>
                  <span className="font-semibold text-zinc-900">{r.rule}</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500 md:pl-0 pl-8">{r.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deep-dive sections */}
        <section className="mb-14 space-y-10">
          <h2 className="text-2xl font-bold text-zinc-950">Why each rule exists</h2>

          <div>
            <h3 className="text-lg font-bold text-zinc-900">The white background rule</h3>
            <p className="mt-2 leading-relaxed text-zinc-500">
              Amazon's search result grid is designed around pure white thumbnails. Any off-white — even RGB 250, 250, 250 — creates a visible gray box in the grid that makes your listing look amateurish next to professional listings. Amazon's algorithm also uses image analysis to detect non-white backgrounds, and will suppress listings or add a compliance badge warning.
            </p>
            <p className="mt-3 leading-relaxed text-zinc-500">
              Many sellers use "pure white background" presets in Lightroom that output RGB 253, 253, 253 — close enough for human eyes but rejected by Amazon's scanner. The only safe value is 255, 255, 255.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-900">The 85% fill requirement</h3>
            <p className="mt-2 leading-relaxed text-zinc-500">
              Under-filled images — product floating in a sea of white — look low-effort and reduce perceived product quality. Amazon's standard is that the product (not packaging) must fill at least 85% of the frame. If you're selling a mug, the mug itself, not the box it shipped in, needs to dominate the frame.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-900">The 2000 × 2000 px minimum</h3>
            <p className="mt-2 leading-relaxed text-zinc-500">
              Images smaller than 1000px on the longest side disable Amazon's zoom feature entirely. Zoom drives conversion — shoppers who zoom are significantly more likely to buy. 2000 × 2000 is the minimum that enables full zoom. Anything between 1000 and 1999px technically uploads but doesn't get full zoom capability.
            </p>
          </div>
        </section>

        {/* Common rejection reasons */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Top reasons Amazon rejects main images</h2>
          <ul className="space-y-3">
            {[
              'Background isn\'t truly white — off-white from studio lighting or JPEG compression',
              'Product is cut off at the edges due to incorrect crop',
              'Packaging shown instead of the actual product',
              'Multiple products or variants shown in one image',
              'Lifestyle photo used as main image (grass, table, hands holding product)',
              'Image resolution below 1000px (prevents zoom)',
              'Watermark or promotional text overlaid',
              'Shadow extends to the edge and bleeds against the background',
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-zinc-500">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs text-red-500">✕</span>
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The manual problem */}
        <section className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 px-8 py-8">
          <h2 className="mb-4 text-xl font-bold text-zinc-950">The manual editing problem</h2>
          <p className="leading-relaxed text-zinc-500">
            Fixing a non-compliant image manually means: open Photoshop, select the background, delete it, fill with 255/255/255 white, check the product fill percentage, resize the canvas to 2000 × 2000 without distorting the product, check file size, export as JPEG, upload, wait for Amazon's compliance checker. Per image. For every SKU. For every catalog update.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            At 10 products, it's annoying. At 50, it's a part-time job. At 200+, it's a serious operational bottleneck. Most agencies charge $3–8 per image for this work.
          </p>
        </section>

        {/* Solution CTA */}
        <section className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">Fix every requirement automatically</h2>
          <p className="mt-3 text-zinc-400">
            fix.pictures AI takes your product photo and outputs a fully compliant main image — pure white background, 2000 × 2000 px, product properly framed — in under 30 seconds.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#e86b20]"
          >
            Fix my images free →
          </Link>
          <p className="mt-3 text-xs text-zinc-500">3 free images. No credit card.</p>
        </section>

        {/* Internal links */}
        <section className="mt-14">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">Related guides</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/amazon-white-background', label: 'Amazon white background requirement' },
              { to: '/amazon-image-size', label: 'Amazon product image size guide' },
              { to: '/remove-background-amazon', label: 'Remove background from Amazon photos' },
              { to: '/amazon-listing-image-checker', label: 'Amazon listing image checker' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
              >
                <span className="text-[#ff7a2f]">→</span>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SeoPageLayout>
  );
}
