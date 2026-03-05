import { useEffect, useRef, useState } from 'react';

const INSTALL_EXTENSION_URL = 'https://chromewebstore.google.com/';

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
  return (
    <main className="min-h-screen bg-[#fcfcfd] text-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="fix.pictures logo" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-sm font-semibold tracking-wide text-zinc-800">fix.pictures</span>
          </div>
          <a
            href={INSTALL_EXTENSION_URL}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Install Extension
          </a>
        </header>

        <section className="mt-8 grid min-h-[78vh] items-center gap-8 md:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-zinc-950 md:text-6xl">
              Fix Amazon product images instantly.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 md:text-lg">
              Remove backgrounds, fix framing, add grounding. Export Amazon-ready images automatically.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={INSTALL_EXTENSION_URL}
                className="rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-6 py-3 text-center text-base font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Install Chrome Extension
              </a>
              <a
                href="#proof"
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-center text-base font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                View Demo
              </a>
            </div>
          </div>

          <BeforeAfterSlider
            beforeSrc={heroExample.before}
            afterSrc={heroExample.after}
            label="Hero product"
            autoPlay
            className="aspect-[4/3]"
            startSplit={58}
          />
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

        <section className="mt-14 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black text-zinc-950">Built for Amazon sellers.</h2>
          <div className="mt-6 space-y-3 text-lg font-medium text-zinc-700 md:text-xl">
            <p>Fix backgrounds automatically</p>
            <p>Frame products correctly</p>
            <p>Export compliant images</p>
          </div>
        </section>

        <section className="mt-12 grid gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm md:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="text-3xl font-black text-zinc-950">Fix images while uploading to Amazon.</h2>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                Amazon listing page
              </div>
              <p className="text-center text-zinc-400">↓</p>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                Extension button appears
              </div>
              <p className="text-center text-zinc-400">↓</p>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                Click Fix Image
              </div>
              <p className="text-center text-zinc-400">↓</p>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                Download compliant image
              </div>
            </div>

            <a
              href={INSTALL_EXTENSION_URL}
              className="mt-7 inline-flex rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-zinc-800"
            >
              Install Extension
            </a>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <img
              src="/hero-dashboard.png"
              alt="Extension workflow preview"
              className="h-full w-full rounded-xl object-cover object-top"
            />
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-zinc-200 bg-gradient-to-r from-[#fdf2fa] via-white to-[#fff3ea] p-10 text-center shadow-sm">
          <h2 className="text-4xl font-black text-zinc-950">Fix your Amazon images now.</h2>
          <a
            href={INSTALL_EXTENSION_URL}
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Install Chrome Extension
          </a>
        </section>
      </div>
    </main>
  );
}

export default App;
