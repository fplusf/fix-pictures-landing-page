import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { supabase } from './supabase';

// ─── Config ────────────────────────────────────────────────────────────────

const TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
const ENV   = (import.meta.env.VITE_PADDLE_ENV as 'production' | 'sandbox') ?? 'production';

/**
 * How long to wait for initializePaddle() before giving up.
 * Adblockers sometimes stall (never reject) the ProfitWell analytics request,
 * which hangs initializePaddle indefinitely. 5 s is generous for slow networks.
 */
const INIT_TIMEOUT_MS = 5_000;

// ─── Singleton init ─────────────────────────────────────────────────────────

let paddleInstance: Paddle | null = null;
let initPromise: Promise<Paddle | null> | null = null;

async function doInit(): Promise<Paddle | null> {
  if (!TOKEN) {
    console.warn('[Paddle] VITE_PADDLE_CLIENT_TOKEN is not set — checkout unavailable.');
    return null;
  }

  // Race initializePaddle against a timeout so a stalled ProfitWell request
  // never blocks the checkout button.
  const timeoutP = new Promise<undefined>((resolve) =>
    setTimeout(() => resolve(undefined), INIT_TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([
      initializePaddle({ token: TOKEN, environment: ENV }),
      timeoutP,
    ]);
    if (result) {
      paddleInstance = result;
      return result;
    }
    console.warn('[Paddle] initializePaddle timed out — analytics may be blocked. Trying window.Paddle fallback.');
  } catch (err) {
    console.warn('[Paddle] initializePaddle threw — analytics may be blocked:', err);
  }

  // Paddle loads its checkout runtime (paddle.js) separately from ProfitWell analytics.
  // Even when analytics is blocked, window.Paddle is usually set within a few hundred ms.
  for (let i = 0; i < 20; i++) {
    const wp = (window as unknown as { Paddle?: Paddle }).Paddle;
    if (wp) {
      paddleInstance = wp;
      return wp;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.warn('[Paddle] window.Paddle never appeared — SDK unavailable, will use server-side checkout.');
  return null;
}

/** Returns the Paddle instance, initializing once if needed. Never throws. */
function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return Promise.resolve(paddleInstance);
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

/** Call once at startup to warm Paddle in the background. */
export function warmPaddle(): void {
  getPaddle(); // fire-and-forget; errors are already swallowed inside doInit
}

// ─── Checkout ───────────────────────────────────────────────────────────────

/**
 * Opens checkout for the given price.
 *
 * Strategy (in order):
 * 1. Paddle.js overlay  — best UX, works for the vast majority of users.
 * 2. Server-side redirect — fallback when the SDK is unavailable (aggressive
 *    adblockers, CDN blocked). Calls our Supabase Edge Function to create a
 *    Paddle transaction, then navigates to the resulting checkout URL.
 *    This is a plain top-level navigation so no adblocker can intercept it.
 */
export async function openCheckout(priceId: string, email?: string): Promise<void> {
  const paddle = await getPaddle();

  if (paddle) {
    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        settings: {
          successUrl: `${window.location.origin}/app`,
        },
      });
      return; // overlay opened — done
    } catch (err) {
      console.warn('[Paddle] Overlay checkout failed, falling back to redirect:', err);
    }
  }

  // ── Server-side fallback ──────────────────────────────────────────────────
  await openCheckoutViaRedirect(priceId, email);
}

async function openCheckoutViaRedirect(priceId: string, email?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId, email },
  });

  if (error || !data?.url) {
    const msg = data?.error ?? error?.message ?? 'Could not open checkout. Please try again.';
    throw new Error(String(msg));
  }

  window.location.href = data.url;
}
