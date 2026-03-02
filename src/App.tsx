import { useMemo, useState } from 'react';

type Locale = 'EN' | 'ES';

const palette = {
  gradient: 'from-[#04050B] via-[#0B6D66] to-[#38BDF8]',
  surface: 'bg-white/10',
  surfaceStrong: 'bg-white/20',
  accent: '#34D399',
  highlight: '#F59E0B',
};

const localizedContent = {
  EN: {
    trustBadge: 'Used by 1,200+ marketplace sellers',
    productName: 'fix.pictures',
    tagline: 'Turn raw product photos into listing-ready images in seconds.',
    subheadline:
      'Upload once or click the in-page Fix badge on Amazon, eBay, and Etsy. Remove backgrounds, center products, and pass image checks before you publish.',
    primaryCta: { label: 'Start Free Trial', href: 'https://fix.pictures' },
    secondaryCta: { label: 'See 60s Demo', href: '#demo' },
    stats: [
      { value: '85.5%', label: 'Auto product fill target' },
      { value: '2000px', label: 'Canvas output for marketplaces' },
      { value: '<=1.0%', label: 'Off-white background threshold' },
    ],
    features: [
      {
        title: 'One-click marketplace flow',
        detail:
          'Fix images directly inside listing builders with an injected badge so teams stop downloading and re-uploading files.',
      },
      {
        title: 'AI cutout + realistic shadow',
        detail:
          'RMBG-1.4 removes backgrounds while preserving edges, then generates contact shadows that keep products grounded.',
      },
      {
        title: 'Built-in compliance audit',
        detail:
          'Instant checks validate white background, framing ratio, dimensions, format, and size before export.',
      },
    ],
    testimonial: {
      quote:
        '"We cut image prep time from 20 minutes to under 2 minutes per SKU, and approval rejections dropped fast."',
      author: 'Nadia Price',
      role: 'Catalog Lead, DTC Home Brand',
    },
    faqs: [
      {
        question: 'Does it work with Amazon, eBay, and Etsy?',
        answer:
          'Yes. The extension is tuned for those listing flows and applies marketplace-ready framing and background standards.',
      },
      {
        question: 'Do I need design skills to use it?',
        answer:
          'No. Drop an image, choose a preset, and export. The workflow was built for operators, not designers.',
      },
      {
        question: 'Can my team review quality before publish?',
        answer:
          'Yes. Every output includes compliance and audit panels so reviewers can spot and fix issues immediately.',
      },
    ],
    ready: 'Ready to scale catalog output?',
    close: 'Book a 20-minute demo',
    sticker: 'Chrome Extension + AI Worker',
    videoLabel: 'Product Walkthrough',
  },
  ES: {
    trustBadge: 'Usado por mas de 1,200 vendedores',
    productName: 'fix.pictures',
    tagline: 'Convierte fotos de producto en imagenes listas para vender.',
    subheadline:
      'Sube una foto o usa el boton Fix en Amazon, eBay y Etsy. Elimina fondos, centra el producto y valida cumplimiento antes de publicar.',
    primaryCta: { label: 'Probar Gratis', href: 'https://fix.pictures' },
    secondaryCta: { label: 'Ver Demo 60s', href: '#demo' },
    stats: [
      { value: '85.5%', label: 'Escala automatica del producto' },
      { value: '2000px', label: 'Salida optimizada para marketplaces' },
      { value: '<=1.0%', label: 'Margen maximo fuera de blanco' },
    ],
    features: [
      {
        title: 'Flujo en un clic',
        detail:
          'Corrige imagenes dentro del editor de publicaciones con el badge Fix sin descargar ni subir archivos manualmente.',
      },
      {
        title: 'Recorte IA + sombra realista',
        detail:
          'RMBG-1.4 limpia el fondo y crea una sombra de contacto para mantener un acabado natural.',
      },
      {
        title: 'Auditoria integrada',
        detail:
          'Revisa fondo blanco, escala, dimensiones, formato y peso antes de exportar para evitar rechazos.',
      },
    ],
    testimonial: {
      quote:
        '"Reducimos el trabajo por SKU a menos de 2 minutos y mejoramos la tasa de aprobacion en cada lote."',
      author: 'Nadia Price',
      role: 'Catalog Lead, DTC Home Brand',
    },
    faqs: [
      {
        question: 'Funciona con Amazon, eBay y Etsy?',
        answer:
          'Si. El flujo esta ajustado para esos marketplaces con parametros de encuadre y fondo listos para publicar.',
      },
      {
        question: 'Necesito experiencia en diseno?',
        answer:
          'No. Solo subes la imagen, eliges preset y exportas. El sistema fue creado para equipos operativos.',
      },
      {
        question: 'Mi equipo puede revisar calidad antes de publicar?',
        answer:
          'Si. Cada imagen incluye paneles de cumplimiento y auditoria para detectar problemas de inmediato.',
      },
    ],
    ready: 'Listo para escalar tu catalogo?',
    close: 'Agenda una demo de 20 minutos',
    sticker: 'Extension Chrome + IA',
    videoLabel: 'Recorrido del Producto',
  },
};

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function App() {
  const [locale, setLocale] = useState<Locale>('EN');
  const content = useMemo(() => localizedContent[locale], [locale]);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${palette.gradient} text-white`}>
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-10 md:px-8 md:py-14">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <img src="/logo.png" alt="fix.pictures logo" className="h-10 w-10 rounded-xl object-cover" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/75">
                fix.pictures
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
              {content.trustBadge}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight drop-shadow-2xl md:text-6xl">
              {content.productName}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-white/80 md:text-xl">{content.tagline}</p>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(localizedContent) as Locale[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`h-12 w-14 rounded-2xl border text-sm font-black tracking-wide transition ${
                  locale === code
                    ? 'border-white/60 bg-white/20 text-white'
                    : 'border-white/20 text-white/75 hover:bg-white/10'
                }`}
                aria-pressed={locale === code}
              >
                {code}
              </button>
            ))}
          </div>
        </header>

        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <p className="text-2xl font-semibold leading-tight md:text-3xl">{content.subheadline}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={content.primaryCta.href}
                className="rounded-2xl px-6 py-3 text-center text-lg font-semibold shadow-lg transition hover:brightness-110 sm:w-auto"
                style={{ backgroundColor: palette.accent, color: '#0F172A' }}
              >
                {content.primaryCta.label}
              </a>
              <a
                href={content.secondaryCta.href}
                className={`rounded-2xl border border-white/30 px-6 py-3 text-center text-lg font-semibold ${palette.surface}`}
              >
                {content.secondaryCta.label}
              </a>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {content.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-3xl font-black">{stat.value}</span>
                  <span className="text-sm text-white/70">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div
              className={`${palette.surfaceStrong} rounded-[2.5rem] border border-white/20 p-4 backdrop-blur-xl`}
            >
              <img
                src="/hero-dashboard.png"
                alt="fix.pictures workflow preview"
                className="aspect-[4/3] w-full rounded-[2rem] object-cover object-top"
                loading="eager"
              />
            </div>
            <div
              className={`absolute -bottom-6 -right-4 rounded-2xl border border-white/10 p-4 backdrop-blur ${palette.surfaceStrong}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">{content.sticker}</p>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-6 md:grid-cols-3">
          {content.features.map((feature) => (
            <div
              key={feature.title}
              className={`rounded-3xl border border-white/10 p-6 backdrop-blur ${palette.surface}`}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${palette.accent}22`, color: palette.accent }}
              >
                <CheckIcon />
              </div>
              <h3 className="mb-2 text-xl font-bold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-white/70">{feature.detail}</p>
            </div>
          ))}
        </section>

        <section
          id="social-proof"
          className={`rounded-[2.5rem] border border-white/10 p-10 backdrop-blur-xl ${palette.surface}`}
        >
          <p className="mb-4 text-lg text-white/85">{content.testimonial.quote}</p>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl ${palette.surfaceStrong}`}></div>
            <div>
              <p className="font-semibold">{content.testimonial.author}</p>
              <p className="text-sm text-white/60">{content.testimonial.role}</p>
            </div>
          </div>
        </section>

        <section id="demo" className={`rounded-[2.5rem] border border-white/10 p-8 ${palette.surface}`}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
            {content.videoLabel}
          </p>
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <img
              src="/hero-dashboard.png"
              alt="fix.pictures dashboard preview"
              className="aspect-video w-full rounded-3xl border border-white/10 object-cover object-top"
              loading="lazy"
            />
            <div className="space-y-4 rounded-3xl border border-white/10 bg-[#020617]/40 p-6">
              <p className="text-sm text-white/80">
                See how operators upload, auto-fix, and export compliant images in one workflow.
              </p>
              <ul className="space-y-2 text-sm text-white/75">
                <li>AI background cleanup with edge-safe masking</li>
                <li>Marketplace-specific framing and dimensions</li>
                <li>Instant pass/fail checks before export</li>
              </ul>
              <a
                href="https://fix.pictures"
                className="inline-block rounded-xl px-4 py-2 font-semibold"
                style={{ backgroundColor: palette.accent, color: '#0F172A' }}
              >
                Open Live Product
              </a>
            </div>
          </div>
        </section>

        <section id="faq" className="grid gap-4">
          {content.faqs.map((item) => (
            <details key={item.question} className={`rounded-3xl border border-white/10 ${palette.surface}`}>
              <summary className="cursor-pointer p-6 text-lg font-semibold">{item.question}</summary>
              <p className="px-6 pb-6 text-white/75">{item.answer}</p>
            </details>
          ))}
        </section>

        <section id="cta" className="space-y-6 py-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/65">{content.ready}</p>
          <h2 className="text-3xl font-black md:text-4xl">{content.close}</h2>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={content.primaryCta.href}
              className="rounded-2xl px-8 py-4 text-lg font-semibold text-[#0f172a] shadow-xl transition hover:brightness-110"
              style={{
                backgroundImage: `linear-gradient(135deg, ${palette.highlight}, #FDE047)`,
              }}
            >
              {content.primaryCta.label}
            </a>
            <a
              href={content.secondaryCta.href}
              className="rounded-2xl border border-white/30 px-8 py-4 text-lg font-semibold"
            >
              {content.secondaryCta.label}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
