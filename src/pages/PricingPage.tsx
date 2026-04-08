import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { trackEvent } from '@/src/lib/posthog';

const APP_ROUTE = '/app';

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    interval: '',
    quota: '5 images',
    features: ['Full AI pipeline', 'Compliance report', 'Batch download'],
    tagline: 'Try the full workflow, no card needed.',
    cta: 'Start Free',
    featured: false,
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
    checkoutUrl: 'https://YOURSTORE.lemonsqueezy.com/buy/PRO_VARIANT_ID',
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
    checkoutUrl: 'https://YOURSTORE.lemonsqueezy.com/buy/LIFETIME_VARIANT_ID',
  },
];

export default function PricingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      // We don't necessarily want to redirect from pricing if they are logged in, 
      // but if they click a plan they should go to app or checkout.
    }
  }, [user, loading, navigate]);

  const handleStartClick = async (e: React.MouseEvent<HTMLAnchorElement>, planName?: string) => {
    if (planName) trackEvent('pricing_plan_clicked', { plan: planName });
    if (loading) { e.preventDefault(); return; }
    
    // If it's a paid plan with a checkout URL, let it navigate (but only if it's a real URL)
    if (e.currentTarget.href.includes('lemonsqueezy.com')) {
      return;
    }

    // Otherwise, it's the free plan or an app redirect
    e.preventDefault();
    if (user) {
      navigate(APP_ROUTE);
    } else {
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error('Sign in failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900">
      <nav className="border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="fix.pictures logo" className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-sm font-bold tracking-wide text-zinc-900">fix.pictures</span>
          </Link>
          <Link
            to={APP_ROUTE}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Open App →
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Pricing</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            Simple, honest pricing.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
            Start fixing your Amazon images for free. Upgrade whenever you need unlimited batch processing and priority support.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl p-[1px] transition duration-300 ${
                plan.featured
                  ? 'bg-gradient-to-br from-[#e636a4] via-[#f95093] to-[#ff7a2f] shadow-[0_18px_45px_rgba(230,54,164,0.22)] md:-translate-y-2'
                  : 'bg-zinc-200/80 hover:-translate-y-1 hover:shadow-lg'
              }`}
            >
              <div className="flex h-full flex-col rounded-[15px] bg-white p-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black text-zinc-950">{plan.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{plan.tagline}</p>
                  </div>
                  {plan.featured && (
                    <span className="rounded-full bg-[#ffe6f5] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c71f8a]">
                      Best value
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-end gap-1.5">
                  <span className="text-5xl font-black leading-none text-zinc-950">{plan.price}</span>
                  <span className="mb-1 text-base font-semibold text-zinc-500">{plan.interval}</span>
                </div>

                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">
                  {plan.quota}
                </div>

                <ul className="mt-8 grow space-y-4">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm text-zinc-600">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.checkoutUrl || APP_ROUTE}
                  onClick={(e) => handleStartClick(e, plan.name)}
                  className={`mt-10 inline-flex w-full items-center justify-center rounded-xl py-4 text-base font-bold transition ${
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

        <section className="mt-24 rounded-[2rem] border border-zinc-200 bg-white p-10 md:p-16">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black text-zinc-950">Frequently Asked Questions</h2>
              <p className="mt-4 text-zinc-600">
                Everything you need to know about fix.pictures pricing and plans.
              </p>
            </div>
            <div className="space-y-8">
              <div>
                <h4 className="font-bold text-zinc-950">How does the free tier work?</h4>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  You get 5 full-resolution, Amazon-ready images for free. No credit card required. Once you use your quota, you can upgrade to a Pro or Lifetime plan for unlimited access.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-950">What is the "Lifetime" plan?</h4>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  The Lifetime plan is a one-time payment. You pay $99 once and get unlimited images forever, including all future updates and AI model improvements.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-950">Is my data private?</h4>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  Yes. All AI processing happens locally in your browser. We never upload your images to our servers. Your privacy is our priority.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl border-t border-zinc-200 px-6 py-12 md:px-10">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="fix.pictures" className="h-6 w-6 rounded-lg object-cover" />
            <span className="text-sm font-bold text-zinc-800">fix.pictures</span>
          </div>
          <div className="flex items-center gap-8 text-xs font-medium text-zinc-500">
            <Link to="/privacy" className="hover:text-zinc-900">Privacy</Link>
            <Link to="/terms" className="hover:text-zinc-900">Terms</Link>
            <Link to="/refund" className="hover:text-zinc-900">Refunds</Link>
            <Link to="/" className="hover:text-zinc-900">Home</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} fix.pictures. All AI processing runs locally.
        </p>
      </footer>
    </div>
  );
}
