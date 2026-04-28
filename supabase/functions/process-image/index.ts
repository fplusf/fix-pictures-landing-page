// Supabase Edge Function — Deno runtime
// Calls OpenAI gpt-image-2 to remove product photo backgrounds.
// Falls back gracefully: the browser local model runs if this returns non-200.

const OPENAI_API_URL = 'https://api.openai.com/v1/images/edits';
const MODEL = 'gpt-image-2';
const QUALITY = 'auto';

const EDIT_PROMPT = [
  'Convert this product photo to a fully Amazon main image compliant result.',
  'Replace the entire background with pure white (RGB 255, 255, 255) — no gradients, shadows, off-white tones, or texture.',
  'The product must fill at least 85% of the image frame — crop tight around the subject with minimal padding.',
  'Keep the exact real product: preserve every detail, color, texture, branding, shape, and proportion.',
  'Do not add any props, text, badges, watermarks, reflections, extra objects, or decorative elements.',
  'Do not alter the product design, branding, packaging, geometry, materials, or finish in any way.',
  'Do not crop off any part of the product.',
  'Output a single centered product on a pure white background with crisp clean edges.',
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return jsonError('OPENAI_API_KEY is not configured on the server', 500);
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

  // Forward to OpenAI image edits endpoint
  const outgoing = new FormData();
  outgoing.append('model', MODEL);
  outgoing.append('prompt', EDIT_PROMPT);
  outgoing.append('image', image, image.name || 'upload.png');
  outgoing.append('quality', QUALITY);
  outgoing.append('output_format', 'png');
  outgoing.append('background', 'auto');
  outgoing.append('size', 'auto');
  outgoing.append('moderation', 'auto');

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outgoing,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(`Failed to reach OpenAI: ${msg}`, 502);
  }

  if (!openaiResponse.ok) {
    const text = await openaiResponse.text().catch(() => '');
    return jsonError(`OpenAI error: ${text}`, openaiResponse.status);
  }

  const payload = await openaiResponse.json() as { data?: Array<{ b64_json?: string }> };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) {
    return jsonError('OpenAI returned no image data', 502);
  }

  // Decode base64 → binary
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'image/png',
      'cache-control': 'no-store',
    },
  });
});
