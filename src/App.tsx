import { useMemo, useState } from 'react';

type Locale = 'EN' | 'ES';

interface Feature {
  title: string;
  detail: string;
}

interface Step {
  title: string;
  detail: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface EngineMode {
  title: string;
  detail: string;
}

interface LandingContent {
  trustBadge: string;
  productName: string;
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  markets: string[];
  stats: Array<{ value: string; label: string }>;
  releaseTitle: string;
  releaseSubtitle: string;
  features: Feature[];
  workflowTitle: string;
  workflow: Step[];
  checksTitle: string;
  checks: Array<{ label: string; value: string }>;
  enginesTitle: string;
  engineModes: EngineMode[];
  testimonial: { quote: string; author: string; role: string };
  faqs: FaqItem[];
  finalTitle: string;
  finalSubtitle: string;
}

const palette = {
  gradient: 'from-[#2B0A57] via-[#E636A4] to-[#FF7A2F]',
  surface: 'bg-white/12',
  surfaceStrong: 'bg-white/22',
  accent: '#FF7A2F',
  highlight: '#FFD166',
};

const localizedContent: Record<Locale, LandingContent> = {
  EN: {
    trustBadge: 'New release: local GPU + batch zip workflow',
    productName: 'fix.pictures',
    headline: 'Marketplace image pipeline, now faster and more controllable.',
    subheadline:
      'The newest extension flow combines in-page Fix buttons, instant audit checks, dual inference engines, and one-click batch export for catalog teams.',
    primaryCta: { label: 'Start Free Trial', href: 'https://fix.pictures' },
    secondaryCta: { label: 'See New Workflow', href: '#workflow' },
    markets: ['Amazon', 'eBay', 'Etsy'],
    stats: [
      { value: '2', label: 'Parallel jobs per queue' },
      { value: '2000px', label: 'Master export canvas' },
      { value: '25MB', label: 'Single-file upload limit' },
    ],
    releaseTitle: 'Built for modern listing operations',
    releaseSubtitle: 'Aligned with the latest sidepanel architecture and QA flow.',
    features: [
      {
        title: 'Smart in-page capture',
        detail:
          'Injects a Fix chip directly in marketplace editors so operators can queue images from the listing screen.',
      },
      {
        title: 'Instant Analysis panel',
        detail:
          'Runs pre-checks before AI processing to flag background, framing, dimensions, and format issues early.',
      },
      {
        title: 'Dual inference engines',
        detail:
          'Uses browser worker by default and can switch to secure localhost GPU service with token handshakes.',
      },
      {
        title: 'Contact shadow controls',
        detail:
          'Auto mode applies grounded shadows and lets teams tune intensity or disable shadows for edge cases.',
      },
      {
        title: 'Queue + batch zip export',
        detail:
          'Processes multiple files concurrently, then exports selected outputs or a compressed batch archive.',
      },
      {
        title: 'Marketplace presets',
        detail:
          'Amazon, eBay, and Etsy rules are built into validation and output sizing for faster approvals.',
      },
    ],
    workflowTitle: 'How the new flow works',
    workflow: [
      {
        title: '1. Queue from listing or upload',
        detail: 'Drag, paste, or click the injected Fix badge to push assets into the sidepanel queue.',
      },
      {
        title: '2. Analyze before processing',
        detail: 'Instant checks score white background coverage, framing ratio, size, and accepted file format.',
      },
      {
        title: '3. Process with auto fallback',
        detail: 'Runs local GPU if available, then safely falls back to browser inference without stopping the batch.',
      },
      {
        title: '4. Export approved assets',
        detail: 'Download one image or a full ZIP package once compliance metrics pass the target preset.',
      },
    ],
    checksTitle: 'Compliance baseline on every output',
    checks: [
      { label: 'Background', value: 'Pure white target (<=1.00% off-white)' },
      { label: 'Framing', value: 'Subject fill target around 85%' },
      { label: 'Resolution', value: '2000 x 2000 master canvas' },
      { label: 'Formats', value: 'JPEG/PNG/WEBP input with optimized JPEG export' },
    ],
    enginesTitle: 'Processing engine modes',
    engineModes: [
      {
        title: 'Local GPU mode',
        detail:
          'Secure localhost handshake to 127.0.0.1:8765 with rotating session tokens for high-throughput teams.',
      },
      {
        title: 'Browser worker mode',
        detail:
          'Zero-infra fallback path in the extension worker, so operations continue even when local service is offline.',
      },
    ],
    testimonial: {
      quote:
        '"The new queue and fallback architecture removed blockers for our catalog ops team. We process batches without babysitting the pipeline."',
      author: 'Megan Ortiz',
      role: 'Head of Merch Ops, Multi-brand Seller',
    },
    faqs: [
      {
        question: 'Can we run without a local GPU service?',
        answer:
          'Yes. Browser worker inference is the default path and local GPU mode is optional when speed or volume requires it.',
      },
      {
        question: 'Does batch export keep names organized?',
        answer:
          'Yes. Single downloads keep generated filenames and batch export builds a dated ZIP archive for handoff.',
      },
      {
        question: 'Which marketplaces are currently tuned?',
        answer:
          'Preset logic is currently tuned for Amazon, eBay, and Etsy with strict-white and resolution differences handled in checks.',
      },
    ],
    finalTitle: 'Ship cleaner product media without adding headcount',
    finalSubtitle: 'Move from upload to compliant export in a single operator workflow.',
  },
  ES: {
    trustBadge: 'Nuevo release: GPU local + exportacion por lotes',
    productName: 'fix.pictures',
    headline: 'Pipeline de imagenes para marketplaces, mas rapido y controlable.',
    subheadline:
      'El flujo actual integra boton Fix en pagina, auditoria instantanea, motores duales de inferencia y exportacion por lotes para equipos de catalogo.',
    primaryCta: { label: 'Probar Gratis', href: 'https://fix.pictures' },
    secondaryCta: { label: 'Ver Flujo Nuevo', href: '#workflow' },
    markets: ['Amazon', 'eBay', 'Etsy'],
    stats: [
      { value: '2', label: 'Trabajos paralelos en cola' },
      { value: '2000px', label: 'Canvas maestro de salida' },
      { value: '25MB', label: 'Limite de carga por archivo' },
    ],
    releaseTitle: 'Disenado para operaciones de listado modernas',
    releaseSubtitle: 'Alineado con la arquitectura y QA del sidepanel actual.',
    features: [
      {
        title: 'Captura inteligente en pagina',
        detail:
          'Inserta un chip Fix dentro del editor del marketplace para encolar imagenes sin salir del flujo de publicacion.',
      },
      {
        title: 'Panel de analisis instantaneo',
        detail:
          'Ejecuta pre-chequeos antes del proceso IA para detectar fondo, encuadre, dimensiones y formato.',
      },
      {
        title: 'Motores duales de inferencia',
        detail:
          'Usa worker del navegador por defecto y puede cambiar a GPU localhost segura con handshake por token.',
      },
      {
        title: 'Control de sombra de contacto',
        detail:
          'Modo automatico para sombras realistas y control manual de intensidad o apagado en casos especiales.',
      },
      {
        title: 'Cola + ZIP por lotes',
        detail:
          'Procesa varios archivos en paralelo y exporta seleccionados o un paquete comprimido con un clic.',
      },
      {
        title: 'Presets por marketplace',
        detail:
          'Reglas de Amazon, eBay y Etsy incluidas en validacion y tamano de salida para aprobar mas rapido.',
      },
    ],
    workflowTitle: 'Como funciona el nuevo flujo',
    workflow: [
      {
        title: '1. Encola desde listing o carga',
        detail: 'Arrastra, pega o usa el badge Fix inyectado para enviar archivos al sidepanel.',
      },
      {
        title: '2. Analiza antes de procesar',
        detail: 'Chequeos instantaneos validan fondo blanco, encuadre, tamano y formato permitido.',
      },
      {
        title: '3. Procesa con fallback automatico',
        detail: 'Usa GPU local si esta disponible y vuelve al navegador sin detener el lote.',
      },
      {
        title: '4. Exporta activos aprobados',
        detail: 'Descarga una imagen o un ZIP completo cuando los indicadores de cumplimiento pasan.',
      },
    ],
    checksTitle: 'Base de cumplimiento en cada salida',
    checks: [
      { label: 'Fondo', value: 'Objetivo blanco puro (<=1.00% fuera de blanco)' },
      { label: 'Encuadre', value: 'Objetivo de relleno cercano a 85%' },
      { label: 'Resolucion', value: 'Canvas maestro de 2000 x 2000' },
      { label: 'Formatos', value: 'Entrada JPEG/PNG/WEBP y salida JPEG optimizada' },
    ],
    enginesTitle: 'Modos de procesamiento',
    engineModes: [
      {
        title: 'Modo GPU local',
        detail:
          'Handshake seguro con 127.0.0.1:8765 y tokens de sesion rotativos para operaciones de alto volumen.',
      },
      {
        title: 'Modo worker del navegador',
        detail:
          'Ruta de respaldo sin infraestructura para seguir operando cuando el servicio local no esta disponible.',
      },
    ],
    testimonial: {
      quote:
        '"La nueva cola con fallback elimino bloqueos del equipo. Procesamos lotes completos sin supervisar cada imagen."',
      author: 'Megan Ortiz',
      role: 'Head of Merch Ops, Multi-brand Seller',
    },
    faqs: [
      {
        question: 'Podemos usarlo sin servicio GPU local?',
        answer:
          'Si. El worker del navegador es el camino por defecto y el modo GPU local es opcional para mayor velocidad.',
      },
      {
        question: 'La exportacion por lotes conserva nombres?',
        answer:
          'Si. La descarga individual mantiene nombres generados y el ZIP crea un paquete fechado para el equipo.',
      },
      {
        question: 'Que marketplaces estan optimizados hoy?',
        answer:
          'Actualmente esta optimizado para Amazon, eBay y Etsy con diferencias de fondo y resolucion en los presets.',
      },
    ],
    finalTitle: 'Publica imagenes limpias sin ampliar equipo',
    finalSubtitle: 'Pasa de carga a exportacion cumplida en un solo flujo operativo.',
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
    <div className={`min-h-screen overflow-hidden bg-gradient-to-br ${palette.gradient} text-white`}>
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-40 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[24rem] w-[24rem] rounded-full bg-pink-300/15 blur-3xl" />
        <div className="absolute right-0 top-0 h-[20rem] w-[20rem] rounded-full bg-orange-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-16 px-6 py-10 md:px-8 md:py-14">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <img src="/logo.png" alt="fix.pictures logo" className="h-10 w-10 rounded-xl object-cover" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">fix.pictures</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-100">{content.trustBadge}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight drop-shadow-2xl md:text-6xl">
              {content.headline}
            </h1>
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

        <section className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-xl leading-relaxed text-white/85 md:text-2xl">{content.subheadline}</p>
            <div className="flex flex-wrap gap-2">
              {content.markets.map((market) => (
                <span
                  key={market}
                  className="rounded-full border border-pink-200/30 bg-fuchsia-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-50"
                >
                  {market}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
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
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-3xl font-black">{stat.value}</span>
                  <p className="mt-1 text-sm text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className={`${palette.surfaceStrong} rounded-[2.2rem] border border-white/20 p-4 backdrop-blur-xl`}>
              <img
                src="/hero-dashboard.png"
                alt="fix.pictures workflow preview"
                className="aspect-[4/3] w-full rounded-[1.8rem] object-cover object-top"
                loading="eager"
              />
            </div>
            <div
              className={`animate-float absolute -bottom-6 -left-4 rounded-2xl border border-white/10 p-4 backdrop-blur ${palette.surfaceStrong}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Queue + ZIP exports</p>
              <p className="text-sm text-white/70">Batch-ready pipeline</p>
            </div>
            <div
              className={`animate-float-delayed absolute -right-4 top-6 rounded-2xl border border-white/10 p-4 backdrop-blur ${palette.surfaceStrong}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">GPU fallback</p>
              <p className="text-sm text-white/70">Local + browser worker</p>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/65">{content.releaseSubtitle}</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">{content.releaseTitle}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {content.features.map((feature, index) => (
              <article
                key={feature.title}
                className={`animate-rise rounded-3xl border border-white/10 p-6 backdrop-blur ${palette.surface}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${palette.accent}24`, color: palette.accent }}
                >
                  <CheckIcon />
                </div>
                <h3 className="mb-2 text-xl font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{feature.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className={`rounded-[2.5rem] border border-white/10 p-8 md:p-10 ${palette.surface}`}>
          <h2 className="text-3xl font-black md:text-4xl">{content.workflowTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {content.workflow.map((step) => (
              <article key={step.title} className={`rounded-3xl border border-white/10 p-5 ${palette.surfaceStrong}`}>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className={`rounded-[2.2rem] border border-white/10 p-7 ${palette.surface}`}>
            <h3 className="text-2xl font-black">{content.checksTitle}</h3>
            <div className="mt-5 space-y-3">
              {content.checks.map((check) => (
                <div key={check.label} className="flex items-start justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">{check.label}</span>
                  <span className="text-right text-sm text-white/75">{check.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className={`rounded-[2.2rem] border border-white/10 p-7 ${palette.surface}`}>
            <h3 className="text-2xl font-black">{content.enginesTitle}</h3>
            <div className="mt-5 space-y-4">
              {content.engineModes.map((engine) => (
                <div key={engine.title} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <h4 className="font-bold text-white">{engine.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{engine.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          id="social-proof"
          className={`rounded-[2.5rem] border border-white/10 p-8 backdrop-blur-xl md:p-10 ${palette.surface}`}
        >
          <p className="text-lg text-white/90">{content.testimonial.quote}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-2xl ${palette.surfaceStrong}`} />
            <div>
              <p className="font-semibold">{content.testimonial.author}</p>
              <p className="text-sm text-white/65">{content.testimonial.role}</p>
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

        <section id="cta" className="space-y-6 rounded-[2.5rem] border border-white/10 bg-white/5 px-6 py-12 text-center">
          <h2 className="text-3xl font-black md:text-5xl">{content.finalTitle}</h2>
          <p className="mx-auto max-w-3xl text-base text-white/75 md:text-lg">{content.finalSubtitle}</p>
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
