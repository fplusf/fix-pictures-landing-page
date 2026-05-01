import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openCheckout, type PayPalPlan } from '@/src/lib/paypal';
import { useAuth } from '@/src/contexts/AuthContext';
import { trackEvent } from '@/src/lib/posthog';
import { FREE_IMAGE_LIMIT, useSubscription } from '@/src/hooks/useSubscription';

const PLANS: Array<{
  id: PayPalPlan;
  label: string;
  price: number;
  perImage: string;
  badge: string;
  highlight: boolean;
  description: string;
}> = [
  {
    id: 'starter',
    label: 'Starter',
    price: 19,
    perImage: '$0.076',
    badge: 'Entry',
    highlight: false,
    description: '250 image credits · Good for testing',
  },
  {
    id: 'growth',
    label: 'Growth',
    price: 49,
    perImage: '$0.049',
    badge: 'Best value',
    highlight: true,
    description: '1,000 image credits · For active sellers',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 99,
    perImage: '$0.033',
    badge: 'Most images',
    highlight: false,
    description: '3,000 image credits · High-volume catalogs',
  },
];

export default function UpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { imagesUsed } = useSubscription();
  const [loading, setLoading] = useState<PayPalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: PayPalPlan, price: number) => {
    setLoading(plan);
    setError(null);
    trackEvent('pricing_plan_clicked', {
      plan,
      price,
      billing: 'credits',
      source: 'upgrade_page',
    });
    try {
      await openCheckout(plan, user?.email ?? undefined);
    } catch (err) {
      console.error('Checkout failed:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      trackEvent('checkout_error', { plan, source: 'upgrade_page', error: message });
    } finally {
      setLoading(null);
    }
  };

  const handleDismiss = () => {
    trackEvent('upgrade_dismissed', { source: 'upgrade_page' });
    navigate('/', { state: { skipAppRedirect: true } });
  };

  const usedCapped = Math.min(imagesUsed, FREE_IMAGE_LIMIT);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#e636a4] via-[#f95093] to-[#ff7a2f] px-8 py-8 text-white text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h1 className="text-2xl font-black">
            You've used {usedCapped} of {FREE_IMAGE_LIMIT} free images
          </h1>
          <p className="mt-2 text-white/80 text-sm">
            Pick a credit pack to keep processing. Credits never expire.
          </p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3 bg-white">
          {/* Free — display only */}
          <div className="w-full rounded-xl border-2 border-zinc-100 bg-zinc-50 p-4 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-400">Free — {FREE_IMAGE_LIMIT} credits</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {usedCapped}/{FREE_IMAGE_LIMIT} used · Limit reached
                </p>
              </div>
              <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold text-zinc-400">
                Current plan
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full bg-zinc-400"
                style={{ width: `${(usedCapped / FREE_IMAGE_LIMIT) * 100}%` }}
              />
            </div>
          </div>

          {/* Paid plans */}
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleUpgrade(plan.id, plan.price)}
              disabled={!!loading}
              className={`w-full rounded-xl border-2 p-4 text-left transition disabled:opacity-60 ${
                plan.highlight
                  ? 'border-[#e636a4] hover:bg-pink-50'
                  : 'border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-zinc-900">
                    {plan.label} — ${plan.price}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5">{plan.description}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{plan.perImage} per image</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ml-3 ${
                  plan.highlight
                    ? 'bg-pink-100 text-[#c71f8a]'
                    : 'bg-zinc-100 text-zinc-700'
                }`}>
                  {loading === plan.id ? 'Redirecting…' : plan.badge}
                </span>
              </div>
            </button>
          ))}

          {error && (
            <p className="text-center text-sm text-red-500 pt-1">{error}</p>
          )}

          <button
            onClick={handleDismiss}
            className="w-full text-center text-sm text-zinc-400 hover:text-zinc-600 pt-2 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
