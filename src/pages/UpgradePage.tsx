import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openCheckout } from '@/src/lib/paddle';
import { useAuth } from '@/src/contexts/AuthContext';
import { trackEvent } from '@/src/lib/posthog';
import { FREE_IMAGE_LIMIT, useSubscription } from '@/src/hooks/useSubscription';

const PRICE_STARTER = (import.meta.env.VITE_PADDLE_PRICE_STARTER || import.meta.env.VITE_PADDLE_PRICE_PRO) as string;
const PRICE_GROWTH = (import.meta.env.VITE_PADDLE_PRICE_GROWTH as string) || '';

export default function UpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { imagesUsed } = useSubscription();
  const [loading, setLoading] = useState<'starter' | 'growth' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: 'starter' | 'growth') => {
    const priceId = plan === 'starter' ? PRICE_STARTER : PRICE_GROWTH;
    if (!priceId) return;
    setLoading(plan);
    setError(null);
    trackEvent('pricing_plan_clicked', {
      plan,
      price: plan === 'starter' ? 49 : 99,
      billing: 'credits',
      source: 'upgrade_page',
    });
    try {
      await openCheckout(priceId, user?.email ?? undefined);
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
    navigate('/app');
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
            Upgrade to keep processing with the credit pack that fits your catalog.
          </p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3 bg-white">
          {/* Free — display only, not selectable */}
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
            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full bg-zinc-400"
                style={{ width: `${(usedCapped / FREE_IMAGE_LIMIT) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => handleUpgrade('starter')}
            disabled={!!loading}
            className="w-full rounded-xl border-2 border-zinc-200 p-4 text-left transition hover:bg-zinc-50 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-900">Starter — $49</p>
                <p className="text-sm text-zinc-500 mt-0.5">1,000 images · Best for smaller catalogs</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                {loading === 'starter' ? 'Loading…' : 'Entry'}
              </span>
            </div>
          </button>

          <button
            onClick={() => handleUpgrade('growth')}
            disabled={!!loading || !PRICE_GROWTH}
            className="w-full rounded-xl border-2 border-[#e636a4] p-4 text-left transition hover:bg-pink-50 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-900">Growth — $99</p>
                <p className="text-sm text-zinc-500 mt-0.5">2,500 images · Lower cost per image</p>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-[#c71f8a]">
                {loading === 'growth' ? 'Loading…' : !PRICE_GROWTH ? 'Set Paddle Price' : 'Best value'}
              </span>
            </div>
          </button>

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
