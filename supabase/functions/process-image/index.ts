// Supabase Edge Function — Deno runtime
// Calls Google Gemini to remove product photo backgrounds.
// Enforces per-user quota server-side before touching Gemini.
//
// NOTE: OpenAI gpt-image-2 integration is commented out below.
// To switch back: swap the Gemini block for the OpenAI block.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── Model config ───────────────────────────────────────────────────────────────
// Gemini model that supports image-in → image-out editing
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// /* [OpenAI — commented out]
// const OPENAI_API_URL = 'https://api.openai.com/v1/images/edits';
// const OPENAI_MODEL = 'gpt-image-2';
// const OPENAI_QUALITY = 'auto';
// */

// Must stay in sync with src/hooks/useSubscription.ts
const FREE_IMAGE_LIMIT = 15;
const STARTER_IMAGE_LIMIT = 250;
const GROWTH_IMAGE_LIMIT = 1000;
const PRO_IMAGE_LIMIT = 3000;

// Hard cap on total free users — raise once payments are live
const FREE_USER_CAP = 100;

const PLAN_LIMITS: Record<string, number | null> = {
  free: FREE_IMAGE_LIMIT,
  starter: STARTER_IMAGE_LIMIT,
  growth: GROWTH_IMAGE_LIMIT,
  pro: PRO_IMAGE_LIMIT,
  lifetime: null, // unlimited
};

const EDIT_PROMPT = [
  'Convert this product photo to a fully Amazon main image compliant result.',

  // Background — absolute pixel requirement
  'BACKGROUND RULE: Every pixel that is not part of the physical product must be exactly RGB(255,255,255).',
  'This means zero gradients, zero off-white tones, zero texture, zero noise — mathematically pure white everywhere outside the product.',

  // Shadow — the #1 failure mode
  'SHADOW RULE: There must be NO shadow of any kind anywhere in the image.',
  'No drop shadow. No cast shadow. No floor shadow. No contact shadow. No ambient occlusion. No darkening near the base.',
  'Every pixel below, beside, and around the product must be exactly RGB(255,255,255) — not RGB(254,254,254), not RGB(245,245,245) — exactly 255.',
  'If the product was photographed on a surface that caused a natural shadow, erase that shadow completely and replace with pure white.',

  // Framing
  'FRAMING RULE: The product must fill 85–90% of the image frame. Crop tightly so the product is large in frame with only minimal padding on each side.',
  'Center the product both horizontally and vertically. Do not leave large empty white areas.',

  // Product fidelity — colour is the most common failure mode
  'COLOR PRESERVATION RULE: You must not change the color, brightness, or tone of any part of the product.',
  'Dark areas of the product must remain exactly as dark as in the original photo. Black must stay black. Dark grey must stay dark grey.',
  'Do not lighten, brighten, or adjust any part of the product. The only change allowed is removing the background.',
  'Do not add props, text, badges, watermarks, reflections, or any extra objects.',
  'Do not crop off any part of the product — the entire product including handles, lids, or protruding elements must be fully visible.',

  'Final output: one product, centered, filling most of the frame, on a mathematically pure white background with zero shadow.',
].join(' ');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonError = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError('Missing or invalid Authorization header', 401);
  }
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError('Unauthorized', 401);
  }

  // ── 2. Quota check (before touching the model) ─────────────────────────────
  const [subResult, usageResult] = await Promise.all([
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).maybeSingle(),
    supabase.from('image_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const plan = (subResult.data?.plan as string) ?? 'free';
  const imagesUsed = usageResult.count ?? 0;
  const limit = PLAN_LIMITS[plan] ?? FREE_IMAGE_LIMIT;

  if (limit !== null && imagesUsed >= limit) {
    return jsonError('Image processing limit reached. Please upgrade your plan.', 402);
  }

  // ── Global free-user cap ───────────────────────────────────────────────────
  if (plan === 'free' && imagesUsed === 0) {
    const { data: totalFreeUsers } = await supabase.rpc('count_free_users');
    if ((totalFreeUsers ?? 0) >= FREE_USER_CAP) {
      return jsonError('SYSTEM_CAPACITY', 503);
    }
  }

  // ── 3. Parse image ─────────────────────────────────────────────────────────
  const geminiKey = Deno.env.get('VITE_GEMINI_API_KEY');
  if (!geminiKey) {
    return jsonError('VITE_GEMINI_API_KEY is not configured on the server', 500);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError('Failed to parse form data — send multipart/form-data with an image field');
  }

  const image = form.get('image');
  if (!(image instanceof File)) {
    return jsonError('Missing or invalid image field');
  }

  // ── 4. Call Gemini ─────────────────────────────────────────────────────────
  // Convert image file to base64 for the Gemini inlineData format
  const imageBytes = await image.arrayBuffer();
  const uint8Array = new Uint8Array(imageBytes);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < uint8Array.length; i += CHUNK) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + CHUNK));
  }
  const base64Image = btoa(binary);

  const requestBody = {
    contents: [{
      parts: [
        { text: EDIT_PROMPT },
        {
          inlineData: {
            mimeType: image.type || 'image/jpeg',
            data: base64Image,
          },
        },
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(`Failed to reach Gemini: ${msg}`, 502);
  }

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text().catch(() => '');
    return jsonError(`Gemini error: ${text}`, geminiResponse.status);
  }

  const payload = await geminiResponse.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };

  const imagePart = payload.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data,
  );
  const encoded = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType ?? 'image/png';

  if (!encoded) {
    return jsonError('Gemini returned no image data', 502);
  }

  // /* [OpenAI block — commented out]
  // const openaiKey = Deno.env.get('OPENAI_API_KEY');
  // if (!openaiKey) return jsonError('OPENAI_API_KEY is not configured on the server', 500);
  //
  // const outgoing = new FormData();
  // outgoing.append('model', OPENAI_MODEL);
  // outgoing.append('prompt', EDIT_PROMPT);
  // outgoing.append('image', image, image.name || 'upload.png');
  // outgoing.append('quality', OPENAI_QUALITY);
  // outgoing.append('output_format', 'png');
  // outgoing.append('background', 'auto');
  // outgoing.append('size', 'auto');
  // outgoing.append('moderation', 'auto');
  //
  // const openaiResponse = await fetch(OPENAI_API_URL, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${openaiKey}` },
  //   body: outgoing,
  // });
  // if (!openaiResponse.ok) {
  //   const text = await openaiResponse.text().catch(() => '');
  //   return jsonError(`OpenAI error: ${text}`, openaiResponse.status);
  // }
  // const payload = await openaiResponse.json() as { data?: Array<{ b64_json?: string }> };
  // const encoded = payload.data?.[0]?.b64_json;
  // */

  // ── 5. Track usage server-side (only on success) ───────────────────────────
  await supabase.from('image_usage').insert({ user_id: user.id });

  // ── 6. Return image ────────────────────────────────────────────────────────
  const binaryOut = atob(encoded);
  const bytes = new Uint8Array(binaryOut.length);
  for (let i = 0; i < binaryOut.length; i++) {
    bytes[i] = binaryOut.charCodeAt(i);
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'content-type': mimeType,
      'cache-control': 'no-store',
      'x-usage-tracked': 'true',
      'x-model-used': GEMINI_MODEL,
    },
  });
});
