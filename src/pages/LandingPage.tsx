import { useAuth } from '@/src/contexts/AuthContext';
import { trackEvent } from '@/src/lib/posthog';
import { openCheckout } from '@/src/lib/paddle';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const APP_ROUTE = '/app';

// ─── Hero images ────────────────────────────────────────────────────────────
const heroExample = {
  before: '/examples/kettle-before.jpg',
  after: '/examples/kettle-after.png',
};

// ─── Proof cases ─────────────────────────────────────────────────────────────
const proofCases = [
  {
    name: 'Camera lens',
    before: '/examples/lens-before.jpg',
    after: '/examples/lens-after.jpg',
  },
  {
    name: 'Snack bar',
    before: '/examples/snicker-before.jpg',
    after: '/examples/snicker-after.png',
  },
  {
    name: 'Thermos bottle',
    before: '/examples/termos-before.jpg',
    after: '/examples/termos-after.jpg',
  },
  {
    name: 'Watch',
    before: '/examples/watch-before.jpg',
    after: '/examples/watch-after.jpg',
  },
];

// ─── Pricing ─────────────────────────────────────────────────────────────────
const PRICE_PRO = import.meta.env.VITE_PADDLE_PRICE_PRO as string;
const PRICE_LIFETIME = import.meta.env.VITE_PADDLE_PRICE_LIFETIME as string;

const pricingPlans = [
  {
    name: 'Free Trial',
    price: '$0',
    interval: '',
    quota: '5 free images',
    features: ['Full AI pipeline', 'Compliance report', 'Batch download'],
    tagline: 'Then $49/year — cancel anytime before.',
    cta: 'Start Free Trial',
    featured: false,
    priceId: PRICE_PRO,
  },
  {
    name: 'Pro',
    price: '$49',
    interval: '/ year',
    quota: 'Unlimited images',
    features: ['Everything in Free', 'Batch processing', 'Priority support'],
    tagline: 'Best value for active Amazon sellers.',
    cta: 'Get Pro',
    featured: true,
    priceId: PRICE_PRO,
  },
  {
    name: 'Lifetime',
    price: '$99',
    interval: 'one time',
    quota: 'Unlimited images forever',
    features: ['Everything in Pro', 'All future updates', 'No subscription ever'],
    tagline: 'Pay once. Never pay again.',
    cta: 'Get Lifetime Access',
    featured: false,
    priceId: PRICE_LIFETIME,
  },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const steps = [
  {
    number: '01',
    icon: '📸',
    title: 'Drop your product photo',
    description:
      'Upload any product image — JPEG, PNG or WEBP. Straight from your camera, phone, or supplier.',
  },
  {
    number: '02',
    icon: '⚡',
    title: 'AI fixes it in seconds',
    description:
      'Background removed, framing corrected, grounding shadow added. All compliance checks run automatically.',
  },
  {
    number: '03',
    icon: '✅',
    title: 'Download Amazon-ready',
    description:
      'Pure white background, 2000 × 2000px, under 10 MB. Passes Amazon main image requirements instantly.',
  },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  {
    icon: '🔒',
    title: '100% private',
    description: 'Images never leave your device. All AI processing runs in your browser.',
  },
  {
    icon: '📦',
    title: 'Batch processing',
    description: 'Drop an entire product catalogue. Multiple images processed in parallel.',
  },
  {
    icon: '🛡️',
    title: 'Compliance report',
    description: 'Every image scored against Amazon guidelines before and after processing.',
  },
  {
    icon: '🌑',
    title: 'Contact shadow',
    description: 'Subtle grounding shadow keeps products looking natural on white.',
  },
];

// ─── BeforeAfterSlider ────────────────────────────────────────────────────────
interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  label: string;
  autoPlay?: boolean;
  className?: string;
  startSplit?: number;
}

function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  label,
  autoPlay = false,
  className = '',
  startSplit = 52,
}: BeforeAfterSliderProps) {
  const [split, setSplit] = useState(startSplit);
  const [isInteracting, setIsInteracting] = useState(false);
  const directionRef = useRef(1);

  useEffect(() => {
    if (!autoPlay || isInteracting) return;
    const interval = window.setInterval(() => {
      setSplit((prev) => {
        let next = prev + directionRef.current * 0.32;
        if (next >= 82) { next = 82; directionRef.current = -1; }
        if (next <= 18) { next = 18; directionRef.current = 1; }
        return next;
      });
    }, 28);
    return () => window.clearInterval(interval);
  }, [autoPlay, isInteracting]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm ${className}`}>
      <img
        src={afterSrc}
        alt={`${label} after`}
        className="h-full w-full bg-white object-contain p-4 md:p-6"
        loading="lazy"
      />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-hidden="true">
        <img
          src={beforeSrc}
          alt={`${label} before`}
          className="h-full w-full bg-white object-contain p-4 md:p-6"
          loading="lazy"
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }}>
        <div className="h-full w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white shadow-md" />
      </div>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
        Before
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
        After
      </div>
      <input
        type="range" min={0} max={100} value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        onPointerDown={() => setIsInteracting(true)}
        onPointerUp={() => setIsInteracting(false)}
        onPointerLeave={() => setIsInteracting(false)}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        aria-label={`Adjust ${label} before and after comparison`}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) navigate(APP_ROUTE);
  }, [user, loading, navigate]);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handlePlanClick = async (planName: string, priceId?: string) => {
    trackEvent('pricing_plan_clicked', { plan: planName });
    if (loading) return;
    setCheckoutError(null);

    if (!user) {
      if (priceId) {
        // Save intent so AuthCallback can redirect to /pricing and resume checkout
        sessionStorage.setItem('pendingPriceId', priceId);
        sessionStorage.setItem('pendingPlanName', planName);
      }
      try { await signInWithGoogle(); } catch (err) { console.error('Sign in failed:', err); }
      return;
    }

    if (!priceId) return;

    setCheckoutLoading(planName);
    try {
      await openCheckout(priceId, user.email ?? undefined);
      // navigates away on success
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="fix.pictures logo" className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-sm font-bold tracking-wide text-zinc-900">fix.pictures</span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <a href="#how-it-works" className="transition hover:text-zinc-900">How it works</a>
            <a href="#examples" className="transition hover:text-zinc-900">Examples</a>
            <a href="/pricing" className="transition hover:text-zinc-900">Pricing</a>
          </div>
          <button
            onClick={() => handlePlanClick('Free')}
            className="rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          >
            {loading ? 'Loading…' : 'Start Free →'}
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 md:px-10">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="grid gap-12 pt-14 pb-16 md:grid-cols-[1fr_1.1fr] md:pt-20 md:pb-24">
          <div>
            {/* Trust pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              100% in-browser · zero uploads · fully private
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
              Amazon product images,{' '}
              <span className="bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] bg-clip-text text-transparent">
                fixed in seconds.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-600 md:text-lg">
              Drop any product photo. AI removes the background, corrects framing, adds a grounding shadow, and exports a 2000px Amazon-compliant JPG — all inside your browser.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={() => handlePlanClick('Free')}
                className="flex h-14 items-center justify-center rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-8 text-base font-bold text-white shadow-md transition hover:brightness-105 active:scale-[0.98]"
              >
                {loading ? 'Loading…' : 'Fix your images free →'}
              </button>
              <a
                href="#how-it-works"
                className="flex h-14 items-center justify-center rounded-xl border border-zinc-200 bg-white px-8 text-base font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                See how it works
              </a>
            </div>

            {/* Social proof mini-strip */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-base">⚡</span> Under 30 seconds per image
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-base">📦</span> Batch up to 50 images
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-base">✅</span> Passes Amazon guidelines
              </span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="space-y-4">
            <BeforeAfterSlider
              beforeSrc={heroExample.before}
              afterSrc={heroExample.after}
              label="Hero product example"
              autoPlay
              className="aspect-[4/3]"
              startSplit={58}
            />
            <div className="grid grid-cols-2 gap-3">
              {(['Pure white canvas ✓', 'Correct framing ✓', 'Contact shadow ✓', '2000px output ✓'] as const).map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-white py-6 shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-zinc-200 md:grid-cols-4">
            {[
              { stat: '< 30s', label: 'Average fix time' },
              { stat: '2000px', label: 'Output resolution' },
              { stat: '0 uploads', label: 'Images stay private' },
              { stat: '100%', label: 'Amazon compliance' },
            ].map(({ stat, label }) => (
              <div key={label} className="px-6 py-2 text-center">
                <p className="text-2xl font-black text-zinc-950">{stat}</p>
                <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section id="how-it-works" className="mt-24">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Process</p>
            <h2 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">
              Three steps. Zero effort.
            </h2>
            <p className="mt-3 text-sm text-zinc-500 md:text-base">
              No Photoshop. No outsourcing. No waiting.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                {i < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-zinc-300 md:block">→</div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{step.number}</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-zinc-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Proof / examples ────────────────────────────────────────────── */}
        <section id="examples" className="mt-24">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Examples</p>
            <h2 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">Works on any product type.</h2>
            <p className="mt-3 text-sm text-zinc-500 md:text-base">Drag the slider to compare.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {proofCases.map((item, index) => (
              <article key={item.name}>
                <BeforeAfterSlider
                  beforeSrc={item.before}
                  afterSrc={item.after}
                  label={`${item.name} example`}
                  className="aspect-[4/3]"
                  startSplit={46 + index * 4}
                />
                <p className="mt-2 text-sm font-semibold text-zinc-600">{item.name}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section id="features" className="mt-24">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Features</p>
            <h2 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">Everything Amazon sellers need.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, index) => (
              <div
                key={f.title}
                className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  features.length % 3 === 1 && index === features.length - 1 ? 'lg:col-start-2' : ''
                }`}
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 text-base font-black text-zinc-950">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Privacy callout ──────────────────────────────────────────────── */}
        <section className="mt-16 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-8 md:p-10">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Privacy first</p>
              <h3 className="mt-1.5 text-2xl font-black text-zinc-950 md:text-3xl">Your images never leave your device.</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
                The entire AI pipeline runs inside your browser using WebAssembly. No image is ever uploaded to any server. No storage. No data sharing. Just you and your browser.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="space-y-2 text-sm font-semibold">
                {['No uploads', 'No servers', 'No data sharing'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-emerald-800">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <section
          id="pricing"
          className="relative mt-16 overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-[#fff7fb] to-[#fff1e8] p-8 shadow-sm md:p-12"
        >
          <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[#e636a4]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-12 h-60 w-60 rounded-full bg-[#ff7a2f]/20 blur-3xl" />

          <div className="relative">
            <p className="text-center text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Pricing</p>
            <h2 className="mt-2 text-center text-3xl font-black text-zinc-950 md:text-4xl">Simple, honest pricing.</h2>
            <p className="mt-3 text-center text-sm text-zinc-500 md:text-base">
              Start free. No card needed. Upgrade when you're ready.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-2xl p-[1px] transition duration-300 ${
                    plan.featured
                      ? 'bg-gradient-to-br from-[#e636a4] via-[#f95093] to-[#ff7a2f] shadow-[0_18px_45px_rgba(230,54,164,0.22)] md:-translate-y-2'
                      : 'bg-zinc-200/80 hover:-translate-y-1 hover:shadow-lg'
                  }`}
                >
                  <div className="flex h-full flex-col rounded-[15px] bg-white p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-zinc-950">{plan.name}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{plan.tagline}</p>
                      </div>
                      {plan.featured && (
                        <span className="rounded-full bg-[#ffe6f5] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c71f8a]">
                          Best value
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-end gap-1.5">
                      <span className="text-4xl font-black leading-none text-zinc-950">{plan.price}</span>
                      <span className="mb-0.5 text-sm font-semibold text-zinc-500">{plan.interval}</span>
                    </div>

                    <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
                      {plan.quota}
                    </p>

                    <ul className="mt-4 grow space-y-2">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-xs text-zinc-600">
                          <span className="text-emerald-500">✓</span> {feat}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanClick(plan.name, plan.priceId)}
                      disabled={checkoutLoading === plan.name}
                      className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        plan.featured
                          ? 'bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] text-white hover:brightness-105'
                          : 'bg-zinc-900 text-white hover:bg-zinc-800'
                      }`}
                    >
                      {checkoutLoading === plan.name ? 'Loading…' : plan.cta}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {checkoutError && (
            <p className="mt-6 text-center text-sm text-red-500">{checkoutError}</p>
          )}
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="mt-16 rounded-3xl bg-gradient-to-br from-zinc-950 to-zinc-800 p-10 text-center shadow-xl md:p-16">
          <h2 className="text-3xl font-black text-white md:text-5xl">
            Ready for your first{' '}
            <span className="bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] bg-clip-text text-transparent">
              Amazon-ready image?
            </span>
          </h2>
          <p className="mt-4 text-sm text-zinc-400 md:text-base">
            Free to start. Results in under 30 seconds.
          </p>
          <button
            onClick={() => handlePlanClick('Free')}
            className="mt-8 inline-flex rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-10 py-4 text-base font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
          >
            {loading ? 'Loading…' : 'Open fix.pictures free →'}
          </button>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mx-auto mt-16 max-w-7xl border-t border-zinc-200 px-6 py-8 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="fix.pictures" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-sm font-bold text-zinc-800">fix.pictures</span>
            <span className="text-xs text-zinc-400">· Amazon Image Compliance Engine</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-500">
            <a href="/privacy" className="transition hover:text-zinc-900">Privacy Policy</a>
            <a href="/terms" className="transition hover:text-zinc-900">Terms of Service</a>
            <a href="/refund" className="transition hover:text-zinc-900">Refund Policy</a>
            <a href="/pricing" className="transition hover:text-zinc-900">Pricing</a>
            <a href={APP_ROUTE} className="transition hover:text-zinc-900">Open App</a>
          </div>
        </div>
        <p className="mt-6 text-xs text-zinc-400">
          © {new Date().getFullYear()} fix.pictures. All AI processing runs locally in your browser — your images are never uploaded or stored.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
