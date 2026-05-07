import { Link } from 'react-router-dom';
import SeoPageLayout from '@/src/components/SeoPageLayout';

export default function AmazonWhiteBackground() {
  return (
    <SeoPageLayout
      title="Amazon White Background Requirement — What Sellers Get Wrong"
      description="Amazon's main image white background rule explained: what RGB value counts as white, how Amazon detects violations, and the fastest way to fix non-compliant images."
    >
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a2f]">
            Amazon Seller Guide
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Amazon White Background Requirement
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500">
            Amazon's main image must have a pure white background. Not off-white. Not light gray. Not 253/253/253. RGB 255/255/255. Here's exactly what that means, how Amazon enforces it, and why so many correctly-photographed listings still fail.
          </p>
        </div>

        {/* The exact rule */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">What Amazon's rules actually say</h2>
          <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-7">
            <p className="font-mono text-sm text-zinc-500">From Amazon Seller Central image guidelines:</p>
            <p className="mt-3 text-base leading-relaxed text-zinc-700 italic">
              "Main images must have a pure white background (RGB 255, 255, 255). The product image must not include text, borders, or inset images added to the main image."
            </p>
          </div>
          <p className="mt-5 leading-relaxed text-zinc-500">
            "Pure white" isn't aesthetic guidance — it's a specific technical requirement. Amazon's product image compliance system uses pixel analysis to detect whether the background is at the correct value. A background that's RGB 250, 250, 250 looks white in isolation but renders as a faint gray box in Amazon's white search result grid.
          </p>
        </section>

        {/* Why studio photography isn't enough */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Why professional studio photos still fail</h2>
          <p className="leading-relaxed text-zinc-500">
            A white sweep, correct exposure, and professional lighting still won't guarantee compliance. Here's why:
          </p>
          <div className="mt-6 space-y-5">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm text-red-500 font-bold">1</div>
              <div>
                <p className="font-semibold text-zinc-900">JPEG compression shifts white values</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Even if your photo has a perfect 255/255/255 background, JPEG compression introduces subtle artifacts. A "quality 90" JPEG export can shift background pixels to 252–254. Amazon's scanner catches this.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm text-red-500 font-bold">2</div>
              <div>
                <p className="font-semibold text-zinc-900">Studio lighting creates shadows and gradients</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Light falls off at the edges of the frame. Even a well-lit studio shot will have slightly darker corners. The background gradient from 255 at center to 248 at corners reads as non-compliant.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm text-red-500 font-bold">3</div>
              <div>
                <p className="font-semibold text-zinc-900">Product shadows bleed into background</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Contact shadows from the product base, or ambient shadows cast from product edges, create areas below 255. These are desirable in photography for realism but fail Amazon's white requirement.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm text-red-500 font-bold">4</div>
              <div>
                <p className="font-semibold text-zinc-900">Camera color profiles affect white</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Cameras capture in their own color space. If your export settings use Adobe RGB instead of sRGB, white in your file doesn't correspond to the same pixel value Amazon expects.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Amazon does with violations */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">What happens when your background isn't white enough</h2>
          <div className="space-y-4">
            {[
              {
                stage: 'Initial upload',
                what: 'Amazon accepts the image but may flag it in their compliance queue for manual review.',
              },
              {
                stage: 'Automated detection',
                what: 'Amazon\'s image AI scans listings and can suppress non-compliant images from search results without notifying you.',
              },
              {
                stage: 'Compliance notification',
                what: 'You receive a Seller Central notification: "Your listing may be suppressed due to non-compliant main image." You have 14 days to fix.',
              },
              {
                stage: 'Listing suppression',
                what: 'After the grace period, the listing is removed from search results until a compliant image is uploaded.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
                <div className="shrink-0">
                  <span className="inline-block rounded-lg bg-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-600">{item.stage}</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500">{item.what}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to achieve true white */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">How to achieve true 255/255/255 white</h2>

          <h3 className="mt-5 text-lg font-bold text-zinc-900">Option A: Photoshop manual correction</h3>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-500">
            <li>1. Select the background using Magic Wand or Quick Selection</li>
            <li>2. Expand selection by 1–2px to catch edge anti-aliasing</li>
            <li>3. Delete selected area</li>
            <li>4. Create new layer below filled with RGB 255/255/255</li>
            <li>5. Flatten the image</li>
            <li>6. Export as sRGB JPEG at maximum quality (quality 12 in Photoshop)</li>
          </ol>
          <p className="mt-3 text-sm text-zinc-400">Time: 10–20 minutes per image. Requires Photoshop.</p>

          <h3 className="mt-8 text-lg font-bold text-zinc-900">Option B: Fix automatically with AI</h3>
          <p className="mt-3 leading-relaxed text-zinc-500">
            fix.pictures AI processes your photo and generates a new image with a programmatically guaranteed 255/255/255 background. The background isn't cleaned up — it's replaced entirely. The output is tested pixel-by-pixel before you download.
          </p>
          <p className="mt-3 text-sm text-zinc-400">Time: under 30 seconds per image. No software required.</p>
        </section>

        {/* The visual difference */}
        <section className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 px-8 py-8">
          <h2 className="mb-4 text-xl font-bold text-zinc-950">Does it actually matter visually?</h2>
          <p className="leading-relaxed text-zinc-500">
            In isolation, the difference between 248/248/248 and 255/255/255 is invisible. Side by side with a compliant listing, the non-compliant image shows as a slight gray box. In Amazon's search results, where 8–12 products appear on screen simultaneously, a gray-background listing looks noticeably lower quality — and Amazon's search algorithm may penalize it.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Beyond aesthetics: Amazon can suppress listings algorithmically. You may never get a notification. You'll just notice your organic traffic drop off.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">Get true white backgrounds automatically</h2>
          <p className="mt-3 text-zinc-400">
            fix.pictures replaces your background with pixel-perfect 255/255/255 white — guaranteed compliant, 2000×2000px, Amazon-ready in under 30 seconds.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#e86b20]"
          >
            Fix white background free →
          </Link>
          <p className="mt-3 text-xs text-zinc-500">3 free images. No credit card.</p>
        </section>

        <section className="mt-14">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">Related guides</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/amazon-image-requirements', label: 'Full Amazon image requirements checklist' },
              { to: '/remove-background-amazon', label: 'Remove background from Amazon photos' },
              { to: '/amazon-image-size', label: 'Amazon product image size 2000×2000' },
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
