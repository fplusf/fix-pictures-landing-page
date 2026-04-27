// Supabase Edge Function — Deno runtime
// Calls OpenAI gpt-image-1 to remove product photo backgrounds.
// Falls back gracefully: the browser local model runs if this returns non-200.

const OPENAI_API_URL = 'https://api.openai.com/v1/images/edits';
const MODEL = 'gpt-image-1';
const QUALITY = 'high';

const EDIT_PROMPT = [
  'Transform the uploaded image into a production-safe product cutout for ecommerce.',
  'Keep the exact real product from the source image.',
  'Preserve shape, color, texture, branding, proportions, and product details.',
  'Remove the entire background and output the product on a fully transparent background.',
  'Do not add props, text, badges, reflections, extra objects, decorative elements, or new shadows.',
  'Do not alter the product design, branding, packaging, geometry, materials, or finish.',
  'Do not crop off any part of the product.',
  'Return a single centered product cutout with crisp edges and no surrounding scene.',
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
  outgoing.append('background', 'transparent');
  outgoing.append('input_fidelity', 'high');

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
