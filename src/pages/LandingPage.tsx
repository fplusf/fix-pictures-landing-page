import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';

const APP_ROUTE = '/app';

const heroExample = {
  before:
    'https://images.unsplash.com/photo-1585386959984-a41552262a27?auto=format&fit=crop&w=1400&q=80',
  after:
    'https://images.unsplash.com/photo-1585386959984-a41552262a27?auto=format&fit=crop&w=1400&q=80&sat=-35&exp=20',
};

const proofCases = [
  {
    name: 'Electronics',
    before:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Cosmetics',
    before:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Packaging',
    before:
      'https://images.unsplash.com/photo-1586880244406-556ebe35f282?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Tools',
    before:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1581147036324-c1c2a8c2e4b7?auto=format&fit=crop&w=1200&q=80',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    interval: '',
    quota: '5 images',
    tagline: 'Try the full workflow before upgrading.',
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Pro Yearly',
    price: '$49',
    interval: '/ year',
    quota: 'Unlimited images',
    tagline: 'Best value for frequent Amazon listings.',
    cta: 'Choose Pro Yearly',
    featured: true,
  },
  {
    name: 'Lifetime',
    price: '$99',
    interval: '',
    quota: 'Unlimited images forever',
    tagline: 'One payment for permanent access.',
    cta: 'Get Lifetime',
    featured: false,
  },
];

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
      setSplit((previous) => {
        let next = previous + directionRef.current * 0.32;
        if (next >= 82) {
          next = 82;
          directionRef.current = -1;
        }
        if (next <= 18) {
          next = 18;
          directionRef.current = 1;
        }
        return next;
      });
    }, 28);

    return () => window.clearInterval(interval);
  }, [autoPlay, isInteracting]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm ${className}`}>
      <img src={beforeSrc} alt={`${label} before`} className="h-full w-full object-cover" loading="lazy" />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        aria-hidden="true"
      >
        <img src={afterSrc} alt={`${label} after`} className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }}>
        <div className="h-full w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white shadow-md" />
      </div>

      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
        Before
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#e636a4]/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
        After
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        onPointerDown={() => setIsInteracting(true)}
        onPointerUp={() => setIsInteracting(false)}
        onPointerLeave={() => setIsInteracting(false)}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        aria-label={`Adjust ${label} before and after comparison`}
      />
    </div>
  );
}

function App() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to app
  useEffect(() => {
    if (user && !loading) {
      navigate(APP_ROUTE);
    }
  }, [user, loading, navigate]);

  const handleStartClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  return (
    <main className="min-h-screen bg-[#fcfcfd] text-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="fix.pictures logo" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-sm font-semibold tracking-wide text-zinc-800">fix.pictures</span>
          </div>
        </header>

        <section className="mt-8 grid min-h-[78vh] items-center gap-8 md:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-zinc-950 md:text-6xl">
              Fix Amazon product images instantly.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 md:text-lg">
              Remove backgrounds, fix framing, add grounding. Export Amazon-ready images automatically.
            </p>

            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row">
              <a
                href={APP_ROUTE}
                onClick={handleStartClick}
                className="h-[56px] flex items-center justify-center rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-8 text-base font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                {loading ? 'Loading...' : 'Start Fixing Images'}
              </a>
              <a
                href="#proof"
                className="h-[56px] flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-8 text-base font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                View Demo
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <BeforeAfterSlider
              beforeSrc={heroExample.before}
              afterSrc={heroExample.after}
              label="Hero product"
              autoPlay
              className="aspect-[4/3]"
              startSplit={58}
            />
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-zinc-900">Fixed for Amazon compliance:</p>
              <ul className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    ✓
                  </span>
                  Pure white background
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    ✓
                  </span>
                  Correct product framing
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    ✓
                  </span>
                  Natural grounding shadow
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    ✓
                  </span>
                  High-resolution output
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="proof" className="mt-2">
          <div className="grid gap-4 md:grid-cols-2">
            {proofCases.map((item, index) => (
              <article key={item.name} className="space-y-2">
                <BeforeAfterSlider
                  beforeSrc={item.before}
                  afterSrc={item.after}
                  label={`${item.name} example`}
                  className="aspect-[4/3]"
                  startSplit={46 + index * 4}
                />
                <p className="text-sm font-semibold text-zinc-700">{item.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="relative mt-12 overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-[#fff7fb] to-[#fff1e8] p-8 shadow-sm md:p-10"
        >
          <div className="pointer-events-none absolute -left-20 -top-16 h-48 w-48 rounded-full bg-[#e636a4]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-[#ff7a2f]/20 blur-3xl" />

          <div className="relative">
            <p className="text-center text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">Pricing</p>
            <h2 className="mt-2 text-center text-3xl font-black text-zinc-950 md:text-4xl">Simple plans. Fast results.</h2>
            <p className="mt-3 text-center text-sm text-zinc-600 md:text-base">
              Start free, scale with Pro, or lock in lifetime access.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-2xl p-[1px] transition duration-300 ${
                    plan.featured
                      ? 'bg-gradient-to-br from-[#e636a4] via-[#f95093] to-[#ff7a2f] shadow-[0_18px_45px_rgba(230,54,164,0.22)] md:-translate-y-2'
                      : 'bg-zinc-200/80 hover:-translate-y-1 hover:shadow-lg'
                  }`}
                >
                  <div
                    className={`h-full rounded-[15px] p-6 ${
                      plan.featured ? 'bg-white' : 'bg-white/95 backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-zinc-950">{plan.name}</h3>
                        <p className="mt-1 text-sm font-medium text-zinc-600">{plan.tagline}</p>
                      </div>
                      {plan.featured && (
                        <span className="rounded-full bg-[#ffe6f5] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#c71f8a]">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-4xl font-black leading-none text-zinc-950">{plan.price}</span>
                      {plan.interval && <span className="pb-1 text-sm font-semibold text-zinc-500">{plan.interval}</span>}
                    </div>

                    <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
                      {plan.quota}
                    </p>

                    <a
                      href={APP_ROUTE}
                      onClick={handleStartClick}
                      className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        plan.featured
                          ? 'bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] text-white hover:brightness-105'
                          : 'bg-zinc-900 text-white hover:bg-zinc-800'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-zinc-200 bg-gradient-to-r from-[#fdf2fa] via-white to-[#fff3ea] p-10 text-center shadow-sm">
          <h2 className="text-4xl font-black text-zinc-950">Fix your Amazon images now.</h2>
          <a
            href={APP_ROUTE}
            onClick={handleStartClick}
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Open fix.pictures App
          </a>
        </section>
      </div>
    </main>
  );
}

export default App;
