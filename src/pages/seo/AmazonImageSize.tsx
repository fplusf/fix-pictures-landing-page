import { Link } from 'react-router-dom';
import SeoPageLayout from '@/src/components/SeoPageLayout';

const sizeTable = [
  { dimension: 'Minimum (zoom disabled)', pixels: '1,000 × 1,000 px', note: 'Technically accepted but zoom won\'t activate' },
  { dimension: 'Minimum (zoom enabled)', pixels: '1,001 × 1,001 px', note: 'Zoom activates but degrades at this size' },
  { dimension: 'Recommended minimum', pixels: '2,000 × 2,000 px', note: 'Full zoom quality, Amazon\'s stated recommendation' },
  { dimension: 'Optimal', pixels: '2,500 × 2,500 px', note: 'Crisp zoom at all zoom levels' },
  { dimension: 'Maximum file size', pixels: '10 MB', note: 'Above this, uploads fail silently or get rejected' },
];

export default function AmazonImageSize() {
  return (
    <SeoPageLayout
      title="Amazon Product Image Size: 2000×2000 px Guide for Sellers"
      description="Complete guide to Amazon product image dimensions, zoom requirements, file size limits, and how to resize images without distortion for Amazon listings."
    >
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a2f]">
            Amazon Seller Guide
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Amazon Product Image Size: 2000 × 2000 px Guide
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500">
            Amazon requires images to be at least 1000px on the longest side — but at 1000px, your zoom feature won't work well. 2000 × 2000 is the minimum for a fully functional listing. Here's why it matters and how to get there without distorting your images.
          </p>
        </div>

        {/* Size requirements table */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">Amazon image size reference</h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700">Scenario</th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700">Dimensions</th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {sizeTable.map((row) => (
                  <tr key={row.dimension}>
                    <td className="px-5 py-4 text-zinc-900 font-medium">{row.dimension}</td>
                    <td className="px-5 py-4 font-mono text-zinc-700">{row.pixels}</td>
                    <td className="px-5 py-4 text-zinc-500 hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Amazon accepts square and rectangular images. For main images, square (1:1) is strongly recommended — non-square main images may be cropped differently across devices.
          </p>
        </section>

        {/* Why zoom matters */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Why image size directly affects conversions</h2>
          <p className="leading-relaxed text-zinc-500">
            Amazon's zoom feature lets shoppers hover over a product image to see a magnified view. This feature activates when the image is at least 1001px on its longest side — but the zoom quality depends on resolution. A 1200px image zoomed to fill a 400px zoom window looks pixelated. A 2000px image zoomed the same way looks sharp.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Zoom is a conversion driver. Shoppers who use the zoom feature on a product page are more likely to purchase than those who don't. Disabling or degrading zoom by using low-resolution images directly impacts your conversion rate — and Amazon's A9 algorithm weights conversion rate when ranking products in search.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { size: 'Under 1000px', zoom: 'No zoom', color: 'bg-red-50 text-red-600 border-red-100' },
              { size: '1000–1999px', zoom: 'Partial zoom', color: 'bg-amber-50 text-amber-600 border-amber-100' },
              { size: '2000px+', zoom: 'Full zoom', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            ].map((item) => (
              <div key={item.size} className={`rounded-xl border px-5 py-4 text-center ${item.color}`}>
                <p className="font-mono text-sm font-bold">{item.size}</p>
                <p className="mt-1 text-xs font-semibold">{item.zoom}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Common mistakes when resizing */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">How sellers mess up resizing</h2>
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-zinc-900">Upscaling a small image</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Stretching a 600px image to 2000px doesn't add detail — it just makes each original pixel larger and blurrier. Amazon's scanner accepts the image (it's technically 2000px), but the zoom view will be low quality. You need to start with a high-resolution source or use AI upscaling.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Changing aspect ratio</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Squashing a portrait-oriented photo to 2000 × 2000 distorts the product. The correct approach is to resize the canvas to square and add white padding on the sides — keeping the product at its natural proportions and centering it.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Over-compressing to stay under 10 MB</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                A 2000 × 2000 PNG can exceed 10 MB. Sellers sometimes compress aggressively with JPEG quality settings below 80, introducing visible artifacts and color shifts. JPEG at quality 90–95 in sRGB color space is the sweet spot.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Resizing without resampling correctly</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Resizing algorithms matter. Bicubic resampling (Photoshop's "Bicubic Sharper") preserves edge sharpness when downscaling. For AI-generated upscaling, tools like Topaz Gigapixel produce significantly better results than standard interpolation.
              </p>
            </div>
          </div>
        </section>

        {/* What file format */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">File format: JPEG vs PNG for Amazon</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5">
              <p className="font-bold text-zinc-900">JPEG</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>✓ Smaller file size — easier to stay under 10 MB</li>
                <li>✓ Amazon's preferred format</li>
                <li>✓ Fastest to upload and process</li>
                <li>✗ Lossy — compression artifacts at low quality settings</li>
                <li>✗ No transparency (irrelevant for white-background images)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5">
              <p className="font-bold text-zinc-900">PNG</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>✓ Lossless — no quality degradation</li>
                <li>✓ Supports transparency (for layered workflows)</li>
                <li>✗ Much larger file size — 2000×2000 PNG often exceeds 10 MB</li>
                <li>✗ Must be exported correctly or file size blows out</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            For Amazon main images: JPEG at quality 90–95 in sRGB color space, saved at 2000 × 2000 px. This gives you near-lossless quality in a file well under 10 MB.
          </p>
        </section>

        {/* How fix.pictures handles it */}
        <section className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 px-8 py-8">
          <h2 className="mb-4 text-xl font-bold text-zinc-950">Automated resizing without the headaches</h2>
          <p className="leading-relaxed text-zinc-500">
            fix.pictures AI outputs every processed image at 2000 × 2000 px, sRGB JPEG, at a file size under 10 MB. The product is centered and scaled to fill 85–90% of the canvas. You don't set canvas size, deal with aspect ratios, or compress manually — it's all handled automatically with the output verified against Amazon's requirements before download.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">Get perfectly-sized Amazon images automatically</h2>
          <p className="mt-3 text-zinc-400">
            Upload any product photo. Get a 2000 × 2000 px, white-background, Amazon-compliant image in under 30 seconds.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#e86b20]"
          >
            Resize my images free →
          </Link>
          <p className="mt-3 text-xs text-zinc-500">3 free images. No credit card.</p>
        </section>

        <section className="mt-14">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">Related guides</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/amazon-image-requirements', label: 'Full Amazon image requirements checklist' },
              { to: '/amazon-white-background', label: 'Amazon white background requirement' },
              { to: '/remove-background-amazon', label: 'Remove background from Amazon photos' },
              { to: '/fix-amazon-product-photos', label: 'Fix Amazon product photos' },
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
