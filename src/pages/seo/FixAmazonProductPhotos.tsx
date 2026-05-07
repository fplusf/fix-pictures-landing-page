import { Link } from 'react-router-dom';
import SeoPageLayout from '@/src/components/SeoPageLayout';

const problems = [
  {
    problem: 'Photos taken on a cluttered background',
    manual: '20–30 min Photoshop selection work per image',
    automated: '< 30 seconds with AI',
  },
  {
    problem: 'Product floating in frame (under 85% fill)',
    manual: 'Manually reframe and resize canvas',
    automated: 'Auto-reframed in output',
  },
  {
    problem: 'Image too small (under 2000px)',
    manual: 'Upscale and hope quality holds',
    automated: 'AI upscaling built in',
  },
  {
    problem: 'Off-white background (not 255/255/255)',
    manual: 'Select and fill in Photoshop',
    automated: 'Background replaced, not fixed',
  },
  {
    problem: 'Shadow bleeding into white area',
    manual: 'Clone stamp or content-aware fill',
    automated: 'Background generated clean',
  },
  {
    problem: 'File over 10 MB',
    manual: 'Re-export with different quality settings',
    automated: 'Auto-compressed to spec',
  },
];

export default function FixAmazonProductPhotos() {
  return (
    <SeoPageLayout
      title="Fix Amazon Product Photos — From Non-Compliant to Ready in 30 Seconds"
      description="How to fix common Amazon product photo problems: wrong background, bad framing, wrong size, file too large. Manual steps vs. AI-automated fixes for each issue."
    >
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a2f]">
            Amazon Seller Guide
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Fix Amazon Product Photos
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500">
            Most Amazon product photos fail compliance for one of six predictable reasons. Here's how to diagnose and fix each one — manually with Photoshop, or automatically with AI if you have more than a handful of images.
          </p>
        </div>

        {/* Why your photos need fixing */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Why your product photos probably need work</h2>
          <p className="leading-relaxed text-zinc-500">
            Getting a product photo to meet Amazon's main image requirements is harder than it sounds. You need: pure white background (RGB 255/255/255), product filling at least 85% of the frame, image at least 2000 × 2000 px, no text or watermarks, no lifestyle elements, file under 10 MB, sRGB color space.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Most product photos — even professionally shot ones — fail at least one requirement. Supplier photos almost always fail. Phone photos almost always fail. Studio photos often have background issues even when they look perfect on your monitor.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            The cost of a non-compliant image isn't just rejection. Amazon's algorithm can suppress your listing from search results without any notification. You'll see a traffic drop, investigate, and only then discover the image issue.
          </p>
        </section>

        {/* The 6 problems and fixes */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">The 6 most common problems and how to fix them</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">1. Wrong background (not pure white)</h3>
              <p className="mt-2 leading-relaxed text-zinc-500">
                Amazon requires RGB 255/255/255. Off-white from studio lighting, JPEG compression artifacts, or incorrect color profiles all fail. The fix isn't to "brighten" the background — you need to replace it.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Manual fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Photoshop: Select Subject, invert selection, delete background, fill with new solid color fill layer at 255/255/255, flatten, export as sRGB JPEG.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: 10–25 min per image</p>
                </div>
                <div className="rounded-xl border border-[#ff7a2f]/20 bg-[#ff7a2f]/5 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#ff7a2f]">Automated fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    fix.pictures AI replaces the background entirely — not cleans it up. Outputs guaranteed 255/255/255 pixels.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: under 30 seconds</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900">2. Product too small in frame (under 85% fill)</h3>
              <p className="mt-2 leading-relaxed text-zinc-500">
                The product must occupy at least 85% of the image area. Products that are small, far away, or poorly cropped fail this. Common with supplier photos where the product is shown with accessories or packaging.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Manual fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Crop tightly around the product, then resize the canvas to square and add white padding. Measure fill percentage manually.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: 5–15 min per image</p>
                </div>
                <div className="rounded-xl border border-[#ff7a2f]/20 bg-[#ff7a2f]/5 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#ff7a2f]">Automated fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    fix.pictures automatically detects the product region and scales it to fill 85–90% of the output canvas.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: under 30 seconds</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900">3. Image too small (under 2000 × 2000 px)</h3>
              <p className="mt-2 leading-relaxed text-zinc-500">
                Images below 1000px disable Amazon's zoom feature. Even images between 1000 and 1999px produce degraded zoom. Supplier photos are commonly 800 × 800 or lower. Phone photos are often large enough but poorly framed.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Manual fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    AI upscaling tools (Topaz Gigapixel, Adobe Enhance) can upscale to 2000px. Standard bicubic upscaling in Photoshop produces blurry results.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: varies + requires paid software</p>
                </div>
                <div className="rounded-xl border border-[#ff7a2f]/20 bg-[#ff7a2f]/5 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#ff7a2f]">Automated fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    fix.pictures outputs at 2000 × 2000 px regardless of input size, using AI to maintain quality.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: under 30 seconds</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900">4. Supplier or lifestyle photo used as main image</h3>
              <p className="mt-2 leading-relaxed text-zinc-500">
                Many sellers use photos provided by suppliers. These often show the product in an environment, in packaging, with text overlays, or in a group photo. All of these violate Amazon's main image rules.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Manual fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Either hire a photographer to reshoot on white, or use extensive Photoshop work to isolate the product from the lifestyle scene.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: $50–200/product or 30–60 min</p>
                </div>
                <div className="rounded-xl border border-[#ff7a2f]/20 bg-[#ff7a2f]/5 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#ff7a2f]">Automated fix</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    fix.pictures extracts the product from any background — studio, lifestyle, or supplier photo — and regenerates a compliant main image.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">Time: under 30 seconds</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Time comparison */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">Manual vs. automated: time comparison</h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700">Problem</th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700">Manual</th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700">Automated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {problems.map((row) => (
                  <tr key={row.problem}>
                    <td className="px-5 py-4 text-zinc-900 font-medium">{row.problem}</td>
                    <td className="px-5 py-4 text-zinc-500">{row.manual}</td>
                    <td className="px-5 py-4 text-[#ff7a2f] font-medium">{row.automated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* When to hire vs automate */}
        <section className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 px-8 py-8">
          <h2 className="mb-4 text-xl font-bold text-zinc-950">When to hire a photo editor vs. automate</h2>
          <p className="leading-relaxed text-zinc-500">
            For 1–5 products, a freelance photo editor ($3–8/image) or a few hours in Photoshop is reasonable. For 10+ products, the time and cost of manual editing becomes the real bottleneck — especially when you're adding new SKUs regularly or updating images for seasonal changes.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Agencies charge $3–8 per image and have turnaround times of 1–3 business days. fix.pictures charges a fraction of that and delivers in under 30 seconds. For high-volume sellers, the economics are straightforward.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">Fix your Amazon product photos now</h2>
          <p className="mt-3 text-zinc-400">
            Drop in any product photo — supplier image, phone shot, studio photo with the wrong background. Get an Amazon-compliant main image in under 30 seconds.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#e86b20]"
          >
            Fix my photos free →
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
