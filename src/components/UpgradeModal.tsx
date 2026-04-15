import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/src/components/ui/dialog';
import { openCheckout } from '@/src/lib/paddle';
import { useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';

const PRICE_PRO = import.meta.env.VITE_PADDLE_PRICE_PRO as string;
const PRICE_LIFETIME = import.meta.env.VITE_PADDLE_PRICE_LIFETIME as string;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'pro' | 'lifetime' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: 'pro' | 'lifetime') => {
    const priceId = plan === 'pro' ? PRICE_PRO : PRICE_LIFETIME;
    setLoading(plan);
    setError(null);
    try {
      await openCheckout(priceId, user?.email ?? undefined);
      // openCheckout navigates away — code below only runs on failure
    } catch (err) {
      console.error('Checkout failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-0">
        {/* Accessible title/description (visually hidden — gradient header serves as the UI heading) */}
        <DialogTitle className="sr-only">Upgrade your plan</DialogTitle>
        <DialogDescription className="sr-only">
          You have used all 5 free images. Choose a Pro or Lifetime plan to continue processing.
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#e636a4] via-[#f95093] to-[#ff7a2f] px-8 py-8 text-white text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-2xl font-black">You've used your 5 free images</h2>
          <p className="mt-2 text-white/80 text-sm">
            Upgrade to keep processing — unlimited images, no restrictions.
          </p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3 bg-white">
          {/* Pro */}
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={!!loading}
            className="w-full rounded-xl border-2 border-[#e636a4] p-4 text-left transition hover:bg-pink-50 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-900">Pro — $49 / year</p>
                <p className="text-sm text-zinc-500 mt-0.5">Unlimited images · Cancel anytime</p>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-[#c71f8a]">
                {loading === 'pro' ? 'Loading…' : 'Best value'}
              </span>
            </div>
          </button>

          {/* Lifetime */}
          <button
            onClick={() => handleUpgrade('lifetime')}
            disabled={!!loading}
            className="w-full rounded-xl border-2 border-zinc-200 p-4 text-left transition hover:bg-zinc-50 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-900">Lifetime — $99 one-time</p>
                <p className="text-sm text-zinc-500 mt-0.5">Pay once, use forever · All future updates</p>
              </div>
              {loading === 'lifetime' && (
                <span className="text-xs text-zinc-400">Loading…</span>
              )}
            </div>
          </button>

          {error && (
            <p className="text-center text-sm text-red-500 pt-1">{error}</p>
          )}

          <button
            onClick={onClose}
            className="w-full text-center text-sm text-zinc-400 hover:text-zinc-600 pt-2 transition"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
