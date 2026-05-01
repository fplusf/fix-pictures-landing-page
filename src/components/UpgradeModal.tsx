import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/src/components/ui/dialog';
import { openCheckout } from '@/src/lib/paypal';
import { useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'starter' | 'growth' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: 'starter' | 'growth') => {
    setLoading(plan);
    setError(null);
    try {
      await openCheckout(plan, user?.email ?? undefined);
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
        <DialogTitle className="sr-only">Upgrade your plan</DialogTitle>
        <DialogDescription className="sr-only">
          You have used all 10 free images. Upgrade to Starter or Growth to continue processing.
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#e636a4] via-[#f95093] to-[#ff7a2f] px-8 py-8 text-white text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-2xl font-black">You've used your 10 free images</h2>
          <p className="mt-2 text-white/80 text-sm">
            Upgrade to keep processing with the credit pack that fits your catalog.
          </p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3 bg-white">
          <button
            onClick={() => handleUpgrade('starter')}
            disabled={!!loading}
            className="w-full rounded-xl border-2 border-zinc-200 p-4 text-left transition hover:bg-zinc-50 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-900">Starter — $19</p>
                <p className="text-sm text-zinc-500 mt-0.5">100 images · Good for testing</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                {loading === 'starter' ? 'Redirecting…' : 'Entry'}
              </span>
            </div>
          </button>

          <button
            onClick={() => handleUpgrade('growth')}
            disabled={!!loading}
            className="w-full rounded-xl border-2 border-[#e636a4] p-4 text-left transition hover:bg-pink-50 disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-zinc-900">Growth — $49</p>
                <p className="text-sm text-zinc-500 mt-0.5">500 images · For active sellers</p>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-[#c71f8a]">
                {loading === 'growth' ? 'Redirecting…' : 'Best value'}
              </span>
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
