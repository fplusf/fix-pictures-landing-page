// Supabase Edge Function — Deno runtime
// Creates a PayPal order for a given plan and returns the PayPal approval URL.
// The user is then redirected to PayPal to approve, and PayPal sends them back
// to the capture-paypal-order function which finalises the subscription.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PAYPAL_BASE =
  Deno.env.get('PAYPAL_ENV') === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://fix.pictures';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

const PLAN_AMOUNTS: Record<string, { value: string; description: string }> = {
  starter: { value: '19.00', description: 'Starter — 100 image credits' },
  growth:  { value: '49.00', description: 'Growth — 500 image credits' },
  pro:     { value: '99.00', description: 'Pro — 1,500 image credits' },
};

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
  const json = await res.json();
  return json.access_token as string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify Supabase auth
    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan } = await req.json();
    const planMeta = PLAN_AMOUNTS[plan as string];
    if (!planMeta) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getPayPalToken();

    const captureUrl = `${SUPABASE_URL}/functions/v1/capture-paypal-order`;

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: planMeta.value },
          description: planMeta.description,
          // Embed userId:plan so we can update the subscription on capture
          custom_id: `${user.id}:${plan}`,
        }],
        application_context: {
          brand_name: 'fix.pictures',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: captureUrl,
          cancel_url: `${APP_ORIGIN}/upgrade`,
        },
      }),
    });

    if (!orderRes.ok) {
      const body = await orderRes.text();
      throw new Error(`PayPal order error: ${body}`);
    }

    const order = await orderRes.json();
    const approvalLink = order.links?.find((l: { rel: string }) => l.rel === 'approve');
    if (!approvalLink) throw new Error('PayPal approval URL not found in order response');

    return new Response(JSON.stringify({ approvalUrl: approvalLink.href }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[create-paypal-order]', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
