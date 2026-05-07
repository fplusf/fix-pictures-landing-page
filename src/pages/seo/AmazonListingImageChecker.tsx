import { Link } from 'react-router-dom';
import SeoPageLayout from '@/src/components/SeoPageLayout';

const checkItems = [
  { label: 'Background is pure white (RGB 255/255/255)', detail: 'No off-white, no gradients, no shadows extending to edges' },
  { label: 'Product fills 85%+ of the frame', detail: 'Measured against the full image canvas, not just visible area' },
  { label: 'Image is at least 2000 × 2000 px', detail: 'Below 1000px disables zoom entirely' },
  { label: 'File size is under 10 MB', detail: 'Above this, uploads may silently fail' },
  { label: 'No text or graphics overlaid', detail: 'No sale badges, no "New", no brand watermarks' },
  { label: 'No borders or frames', detail: 'Any border, even 1px, can trigger non-compliance' },
  { label: 'Single product shown', detail: 'No collages, variants, or accessories in the main image' },
  { label: 'No lifestyle or contextual background', detail: 'No hands, no surfaces, no environments — product only' },
  { label: 'JPEG in sRGB color space', detail: 'CMYK images display incorrectly on Amazon' },
  { label: 'Product is not packaged (where applicable)', detail: 'Show the product itself, not the box, for most categories' },
];

export default function AmazonListingImageChecker() {
  return (
    <SeoPageLayout
      title="Amazon Listing Image Checker — 10-Point Compliance Checklist"
      description="Use this Amazon listing image checker to audit your main product image before uploading. Covers all 10 compliance requirements and common reasons for suppression."
    >
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a2f]">
            Amazon Seller Tool
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Amazon Listing Image Checker
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500">
            Before you upload a main product image to Amazon, run it through this checklist. A single compliance failure can suppress your listing from search — often without any notification. Here's every requirement you need to verify.
          </p>
        </div>

        {/* Checklist */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">The 10-point Amazon image checklist</h2>
          <div className="space-y-3">
            {checkItems.map((item, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 text-xs font-bold text-zinc-400">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">{item.label}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How Amazon detects violations */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">How Amazon detects non-compliant images</h2>
          <p className="leading-relaxed text-zinc-500">
            Amazon uses a combination of automated image analysis and periodic manual reviews. The automated system runs continuously and can flag or suppress listings at any time — not just at upload. Many sellers discover compliance failures weeks or months after listing, when traffic drops and they investigate.
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="font-semibold text-zinc-900">Pixel-level background analysis</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Amazon's system samples background pixels and flags images where a significant portion of the background region isn't within a narrow tolerance of 255/255/255. Even single-pixel halos or JPEG artifacts can trigger this.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="font-semibold text-zinc-900">Product fill ratio detection</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                The system estimates how much of the frame is occupied by the product vs. empty white space. Images where the product occupies less than 85% get flagged for potential suppression.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="font-semibold text-zinc-900">Text and graphic detection</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                OCR-style detection scans for text overlays. Promotional text, brand names, and watermarks overlaid on the image are reliably caught.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="font-semibold text-zinc-900">Lifestyle/environmental scene detection</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Amazon's classifier detects "scene" images — photos where the product is in an environment (kitchen, outdoors, hands holding the item). These are flagged as non-compliant for main images.
              </p>
            </div>
          </div>
        </section>

        {/* What to do when you fail */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">What to do when your listing is suppressed</h2>
          <div className="space-y-5">
            {[
              {
                step: '1',
                title: 'Check Seller Central for the specific violation',
                body: 'Go to Catalog > Manage All Inventory > filter for Suppressed. Amazon usually specifies which image slot is non-compliant and which rule was violated.',
              },
              {
                step: '2',
                title: 'Identify the exact failure',
                body: 'Is it the background, the fill percentage, text overlay, or file size? Each has a different fix. Don\'t guess — check the notification.',
              },
              {
                step: '3',
                title: 'Fix the image',
                body: 'For background issues: replace the background entirely with true white. For fill issues: reframe the product. For size issues: resize the canvas. For text overlays: remove them in your image editor.',
              },
              {
                step: '4',
                title: 'Upload the replacement',
                body: 'Go to the listing, edit the main image, upload the corrected version. Amazon usually re-evaluates within 24 hours and reinstates the listing if the new image is compliant.',
              },
              {
                step: '5',
                title: 'Monitor for future flags',
                body: 'Amazon can re-flag previously accepted images. Check your inventory health report weekly and set up a Seller Central notification for suppressed listings.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-white">
                  {item.step}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Common false positives */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Images Amazon might flag that look fine to you</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Off-white background that looks white on your calibrated monitor',
              'Subtle drop shadow from product touching the edge',
              'Brand logo printed ON the product itself (vs. overlaid)',
              'Multiple sizes/colors of the same product shown',
              'Product in packaging that happens to have text',
              'Reflective product surface showing studio environment',
              'Prop holding up product (hands, stand, hook)',
              'Model wearing the product (some categories require this)',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                <span className="mt-0.5 text-amber-500">⚠</span>
                <p className="text-sm leading-relaxed text-zinc-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Automated checking */}
        <section className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 px-8 py-8">
          <h2 className="mb-4 text-xl font-bold text-zinc-950">Skip the manual checklist — check and fix automatically</h2>
          <p className="leading-relaxed text-zinc-500">
            fix.pictures AI runs every uploaded image through an automated compliance check against all 10 requirements above. If something fails, it fixes it — replacing the background, reframing the product, correcting size — before generating your download. Every output is compliance-verified before you see it.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Instead of manually checking each image against this list, you can upload your product photo and get a compliant image in under 30 seconds. If you want to see the compliance score without fixing it, the tool shows you which requirements pass and fail on the original image.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">Check and fix your Amazon images automatically</h2>
          <p className="mt-3 text-zinc-400">
            Upload your product image. Get an instant compliance score and an auto-fixed version that passes every requirement.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#e86b20]"
          >
            Check my image free →
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
