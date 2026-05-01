import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { trackEvent } from '@/src/lib/posthog';
import { openCheckout, type PayPalPlan } from '@/src/lib/paypal';

const APP_ROUTE = '/app';

const pricingPlans: Array<{
  name: string;
  price: string;
  interval: string;
  quota: string;
  features: string[];
  tagline: string;
  cta: string;
  featured: boolean;
  planId: PayPalPlan | null;
  isTrial: boolean;
}> = [
  {
    name: 'Free Trial',
    price: '$0',
    interval: '',
    quota: '10 free images',
    features: ['Amazon-ready exports', 'Compliance report', 'Before/after review'],
    tagline: 'Test the output quality on real images.',
    cta: 'Start Free Trial',
    featured: false,
    planId: null,
    isTrial: true,
  },
  {
    name: 'Starter',
    price: '$19',
    interval: '',
    quota: '100 image credits',
    features: ['Everything in Free', 'Credits never expire', 'Best for smaller catalogs'],
    tagline: 'For sellers who need a practical first paid tier.',
    cta: 'Get Starter',
    featured: false,
    planId: 'starter',
    isTrial: false,
  },
  {
    name: 'Growth',
    price: '$49',
    interval: '',
    quota: '500 image credits',
    features: ['Everything in Starter', 'Lower cost per image', 'For active sellers'],
    tagline: 'For teams working through larger SKU batches.',
    cta: 'Get Growth',
    featured: true,
    planId: 'growth',
    isTrial: false,
  },
  {
    name: 'Pro',
    price: '$99',
    interval: '',
    quota: '1,500 image credits',
    features: ['Everything in Growth', 'Lowest cost per image', 'High-volume catalogs'],
    tagline: 'For agencies and large-catalog Amazon sellers.',
    cta: 'Get Pro',
    featured: false,
    planId: 'pro',
    isTrial: false,
  },
];

export default function PricingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // After OAuth redirect back to /pricing, resume the pending checkout automatically
  useEffect(() => {
    if (!user || loading) return;
    const pendingPlanId = sessionStorage.getItem('pendingPlanId') as PayPalPlan | null;
    const pendingPlanName = sessionStorage.getItem('pendingPlanName');
    if (!pendingPlanId) return;
    sessionStorage.removeItem('pendingPlanId');
    sessionStorage.removeItem('pendingPlanName');
    const name = pendingPlanName ?? '';
    setCheckoutLoading(name);
    openCheckout(pendingPlanId, user.email ?? undefined)
      .catch((err) => {
        console.error('Checkout failed:', err);
        setCheckoutError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => setCheckoutLoading(null));
  }, [user, loading]);

  const handlePlanClick = async (planName: string, planId: PayPalPlan | null) => {
    trackEvent('pricing_plan_clicked', { plan: planName });
    if (loading) return;
    setCheckoutError(null);

    if (!user) {
      if (planId) {
        sessionStorage.setItem('pendingPlanId', planId);
        sessionStorage.setItem('pendingPlanName', planName);
      }
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error('Sign in failed:', err);
      }
      return;
    }

    if (!planId) return;

    setCheckoutLoading(planName);
    try {
      await openCheckout(planId, user.email ?? undefined);
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(null);
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
            Start with 10 trial images, then move to the credit pack that fits your catalog volume.
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

                <button
                  onClick={() => handlePlanClick(plan.name, plan.planId)}
                  disabled={checkoutLoading === plan.name}
                  className={`mt-10 inline-flex w-full items-center justify-center rounded-xl py-4 text-base font-bold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.featured
                      ? 'bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] text-white hover:brightness-105'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {checkoutLoading === plan.name ? 'Redirecting…' : plan.cta}
                </button>
              </div>
            </article>
          ))}
        </div>

        {checkoutError && (
          <p className="mt-6 text-center text-sm text-red-500">{checkoutError}</p>
        )}

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
                  You get 10 full-resolution, Amazon-ready trial images. Once you use your quota, you can move to Starter or Growth depending on the image volume you need.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-950">How do paid plans work?</h4>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  Starter includes up to 1,000 processed images and Growth includes up to 2,500. Choose the tier that matches your expected catalog workload.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-950">Is my data private?</h4>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  We handle uploaded images only to deliver the service, generate outputs, maintain the workflow, and protect the platform from abuse. We do not sell customer images.
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
          © {new Date().getFullYear()} fix.pictures. Built for Amazon-ready product image cleanup and compliance workflows.
        </p>
      </footer>
    </div>
  );
}
