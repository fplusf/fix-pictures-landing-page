import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { supabase } from './supabase';

// ─── Config ────────────────────────────────────────────────────────────────

const TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
const ENV   = (import.meta.env.VITE_PADDLE_ENV as 'production' | 'sandbox') ?? 'production';

const INIT_TIMEOUT_MS     = 5_000; // max wait for initializePaddle (ProfitWell can stall)
const CHECKOUT_LOAD_MS    = 5_000; // max wait for checkout.loaded event before falling back

// ─── Checkout load detection ────────────────────────────────────────────────
// When initializePaddle succeeds we get an eventCallback. We use it to signal
// openCheckout() that the overlay actually loaded (vs. iframe being blocked).

let resolveCheckoutLoaded: ((ok: boolean) => void) | null = null;

function onPaddleEvent(event: { name?: string }) {
  if (event.name === 'checkout.loaded') {
    resolveCheckoutLoaded?.(true);
    resolveCheckoutLoaded = null;
  }
  if (event.name === 'checkout.error' || event.name === 'checkout.warning') {
    resolveCheckoutLoaded?.(false);
    resolveCheckoutLoaded = null;
  }
}

// ─── Singleton init ─────────────────────────────────────────────────────────

let paddleInstance: Paddle | null = null;
let initPromise: Promise<Paddle | null> | null = null;
/** True when paddleInstance came from window.Paddle fallback (no eventCallback) */
let usingWindowFallback = false;

async function doInit(): Promise<Paddle | null> {
  if (!TOKEN) {
    console.warn('[Paddle] VITE_PADDLE_CLIENT_TOKEN is not set — checkout unavailable.');
    return null;
  }

  const timeoutP = new Promise<undefined>((resolve) =>
    setTimeout(() => resolve(undefined), INIT_TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([
      initializePaddle({ token: TOKEN, environment: ENV, eventCallback: onPaddleEvent }),
      timeoutP,
    ]);
    if (result) {
      paddleInstance = result;
      usingWindowFallback = false;
      return result;
    }
    console.warn('[Paddle] initializePaddle timed out (analytics blocked). Trying window.Paddle.');
  } catch (err) {
    console.warn('[Paddle] initializePaddle threw:', err);
  }

  // Paddle loads checkout runtime independently of ProfitWell analytics.
  // window.Paddle is usually available even when analytics is blocked.
  for (let i = 0; i < 20; i++) {
    const wp = (window as unknown as { Paddle?: Paddle }).Paddle;
    if (wp) {
      paddleInstance = wp;
      usingWindowFallback = true;
      console.warn('[Paddle] Using window.Paddle fallback (no eventCallback — will use load timeout).');
      return wp;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.warn('[Paddle] SDK unavailable — will use server-side checkout.');
  return null;
}

function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return Promise.resolve(paddleInstance);
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

export function warmPaddle(): void {
  getPaddle();
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export async function openCheckout(priceId: string, email?: string): Promise<void> {
  const paddle = await getPaddle();

  if (paddle) {
    // If we're using window.Paddle it means initializePaddle timed out — almost
    // certainly because ProfitWell analytics was blocked by an ad-blocker.
    // The same blocker will also kill the buy.paddle.com iframe inside the overlay,
    // so skip the overlay entirely and go straight to the server-side redirect.
    if (usingWindowFallback) {
      console.warn('[Paddle] window.Paddle fallback — skipping overlay, using server-side redirect.');
    } else {
      // initializePaddle succeeded with our eventCallback registered.
      // Open the overlay and wait for checkout.loaded. If it never fires
      // (iframe blocked), we fall through to the server-side redirect.
      try {
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: email ? { email } : undefined,
          settings: { successUrl: `${window.location.origin}/app` },
        });

        const loaded = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => {
            resolveCheckoutLoaded = null;
            resolve(false);
          }, CHECKOUT_LOAD_MS);
          resolveCheckoutLoaded = (ok) => { clearTimeout(timer); resolve(ok); };
        });

        if (loaded) return; // Overlay working — done.

        console.warn('[Paddle] checkout.loaded never fired (iframe likely blocked). Falling back to redirect.');
        try { paddle.Checkout.close(); } catch { /* ignore */ }
      } catch (err) {
        console.warn('[Paddle] Overlay checkout threw:', err);
      }
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

  // Full-page navigation — never intercepted by ad-blockers.
  window.location.href = data.url;
}
