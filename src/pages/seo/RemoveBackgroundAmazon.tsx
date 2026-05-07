import { Link } from 'react-router-dom';
import SeoPageLayout from '@/src/components/SeoPageLayout';

const methods = [
  {
    name: 'Photoshop Magic Eraser / Background Eraser',
    pros: 'Fine-grained control on complex edges',
    cons: '$20/month, 15–30 min per image, inconsistent on fur or hair',
  },
  {
    name: 'Remove.bg / Slazzer (free tools)',
    pros: 'Fast, no software install',
    cons: 'Outputs often leave gray halos; background may not be true 255/255/255 white',
  },
  {
    name: 'Canva background remover',
    pros: 'Simple interface',
    cons: 'Adds white background but doesn\'t fix framing, size, or fill percentage',
  },
  {
    name: 'fix.pictures AI',
    pros: 'Full compliance: white background, 2000×2000px, 85% fill, contact shadow',
    cons: '3 images free, paid plans for bulk',
  },
];

export default function RemoveBackgroundAmazon() {
  return (
    <SeoPageLayout
      title="Remove Background from Amazon Product Photos — 4 Methods Compared"
      description="How to remove the background from Amazon product photos and replace it with compliant pure white. Comparison of Photoshop, remove.bg, Canva, and AI tools."
    >
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a2f]">
            Amazon Seller Guide
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Remove Background from Amazon Product Photos
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500">
            Amazon requires all main images to have a pure white background — RGB 255, 255, 255, no exceptions. Here's how to get there, what tools actually work, and why most "white background" tools leave you with a compliance failure.
          </p>
        </div>

        {/* Why it's harder than it looks */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Why background removal for Amazon is different</h2>
          <p className="leading-relaxed text-zinc-500">
            Removing a background and replacing it with Amazon-compliant white are two different problems. Most background removal tools — even good ones — leave artifacts: gray halos around edges, semi-transparent pixels, or a "white" that's actually RGB 248, 248, 248.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            Amazon's compliance scanner checks for true white. It also checks that the product fills at least 85% of the frame. A perfectly removed background on a product that's too small in the frame still fails. And even a product perfectly framed against white will fail if the image is smaller than 1000px on its shortest side (zoom will be disabled).
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            That means removing the background is step one of at least four: (1) remove background, (2) verify white is truly 255/255/255, (3) reframe product to fill 85%+, (4) resize to 2000 × 2000. Most background removal tools only do step one.
          </p>
        </section>

        {/* Common mistakes */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">The gray halo problem</h2>
          <p className="leading-relaxed text-zinc-500">
            The most common failure mode: the background appears white on your screen but Amazon's image scanner — or even a human eye on the search results page — picks up a gray fringe around the product. This happens because background removal algorithms use feathering or anti-aliasing on edges, leaving semi-transparent pixels that render as gray when placed on white.
          </p>
          <p className="mt-4 leading-relaxed text-zinc-500">
            In Photoshop, "Decontaminate Colors" during Select and Mask helps. In AI tools, the quality varies massively by image type. Products with complex edges — carbon fiber, fur, liquids, glass — reliably produce halos in consumer-grade tools.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-6 py-5">
            <p className="text-sm font-semibold text-amber-800">Quick check</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-700">
              After removing the background, zoom into the edge of your product at 400%+ in Photoshop or Figma. If you see gray, light-colored, or semi-transparent pixels, your listing will look off in Amazon's white grid.
            </p>
          </div>
        </section>

        {/* Methods comparison */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">4 methods compared</h2>
          <div className="space-y-4">
            {methods.map((m) => (
              <div key={m.name} className="rounded-2xl border border-zinc-200 bg-white px-6 py-5">
                <p className="font-bold text-zinc-900">{m.name}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Pros</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{m.pros}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Cons</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{m.cons}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step by step */}
        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-bold text-zinc-950">How fix.pictures handles background removal</h2>
          <div className="space-y-4">
            {[
              {
                n: '01',
                title: 'Upload any product photo',
                body: 'JPEG, PNG, or WebP. Doesn\'t matter if the background is busy, colorful, or already white.',
              },
              {
                n: '02',
                title: 'AI isolates the product',
                body: 'The product is extracted cleanly from the background — including complex edges like reflective surfaces, fabric texture, and transparent elements.',
              },
              {
                n: '03',
                title: 'True white background is applied',
                body: 'The new background is generated as pure RGB 255/255/255 — not "looks white", actually white. No halos.',
              },
              {
                n: '04',
                title: 'Framing and size are corrected',
                body: 'The product is centered and scaled to fill 85–90% of the frame, then the canvas is set to 2000 × 2000 px.',
              },
              {
                n: '05',
                title: 'Compliance check',
                body: 'Every output is scored against Amazon\'s main image checklist before you download.',
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff7a2f]/10 text-sm font-black text-[#ff7a2f]">
                  {step.n}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What types of products */}
        <section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-zinc-950">Which product types are hardest to remove backgrounds from?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { product: 'Clear bottles / glass', issue: 'Transparent edges and reflections blend into background' },
              { product: 'Jewelry', issue: 'Fine chains and facets create aliasing at edges' },
              { product: 'Electronics', issue: 'Black objects against dark backgrounds lose edge definition' },
              { product: 'Fabric / clothing', issue: 'Loose threads and fine texture need clean separation' },
              { product: 'Metallic products', issue: 'Reflections from environment appear in the product' },
              { product: 'Shoes', issue: 'Complex sole geometry and laces are easy to clip incorrectly' },
            ].map((item) => (
              <div key={item.product} className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
                <p className="font-semibold text-zinc-900">{item.product}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.issue}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-zinc-950 px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">Remove backgrounds and make images Amazon-ready</h2>
          <p className="mt-3 text-zinc-400">
            Upload your product photo. Get a clean, white-background, 2000 × 2000 image in under 30 seconds. No Photoshop required.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7a2f] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#e86b20]"
          >
            Fix my product photos free →
          </Link>
          <p className="mt-3 text-xs text-zinc-500">3 free images. No credit card.</p>
        </section>

        {/* Internal links */}
        <section className="mt-14">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">Related guides</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/amazon-white-background', label: 'Amazon white background requirement' },
              { to: '/amazon-image-requirements', label: 'Full Amazon image requirements checklist' },
              { to: '/amazon-image-size', label: 'Amazon product image size guide' },
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
