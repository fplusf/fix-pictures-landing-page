// Supabase Edge Function — Deno runtime
// PayPal redirects the user here after they approve payment.
// We capture the order, update the subscription in Supabase, then redirect to /app.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PAYPAL_BASE =
  Deno.env.get('PAYPAL_ENV') === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const APP_ORIGIN    = Deno.env.get('APP_ORIGIN') ?? 'https://fix.pictures';
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getPayPalToken(): Promise<string> {
  const clientId     = Deno.env.get('PAYPAL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
  const credentials  = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

Deno.serve(async (req) => {
  try {
    const url     = new URL(req.url);
    const token   = url.searchParams.get('token');   // PayPal order ID
    const payerId = url.searchParams.get('PayerID');

    if (!token || !payerId) {
      return Response.redirect(`${APP_ORIGIN}/upgrade?error=cancelled`, 302);
    }

    const paypalToken = await getPayPalToken();

    // Capture the payment
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paypalToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      console.error('[capture-paypal-order] capture failed:', await captureRes.text());
      return Response.redirect(`${APP_ORIGIN}/upgrade?error=payment_failed`, 302);
    }

    const captured = await captureRes.json();

    // Extract userId and plan from custom_id we set during order creation
    const customId = captured.purchase_units?.[0]?.custom_id as string | undefined;
    if (!customId) {
      console.error('[capture-paypal-order] missing custom_id in captured order');
      return Response.redirect(`${APP_ORIGIN}/app?paypal=ok`, 302);
    }

    const [userId, plan] = customId.split(':');
    if (!userId || !plan) {
      console.error('[capture-paypal-order] malformed custom_id:', customId);
      return Response.redirect(`${APP_ORIGIN}/app?paypal=ok`, 302);
    }

    // Update subscription using service role key (no user auth here — browser redirect)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({ user_id: userId, plan }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('[capture-paypal-order] subscription upsert failed:', upsertError);
      // Payment captured but DB failed — log for manual recovery, still redirect to app
    }

    console.log(`[capture-paypal-order] success — user ${userId} → plan ${plan}`);
    return Response.redirect(`${APP_ORIGIN}/app?paypal=ok`, 302);
  } catch (err) {
    console.error('[capture-paypal-order] unexpected error:', err);
    return Response.redirect(`${APP_ORIGIN}/upgrade?error=unexpected`, 302);
  }
});
