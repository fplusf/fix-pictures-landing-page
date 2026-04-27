const OPENAI_API_URL = 'https://api.openai.com/v1/images/edits';
const DEFAULT_MODEL = 'gpt-image-1';
const DEFAULT_QUALITY = 'high';

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

const jsonResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function decodeBase64Image(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getOpenAiKey(): string | undefined {
  if (typeof process !== 'undefined') {
    // Prefer the server-only name (no VITE_ prefix = not exposed to browser bundle)
    return process.env?.OPENAI_API_KEY || process.env?.VITE_OPEN_AI_API_KEY || undefined;
  }
  return undefined;
}

export async function handleProcessImage(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse('Method not allowed', 405);
  }

  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return jsonResponse('OPENAI_API_KEY is not configured', 500);
  }

  const form = await request.formData();
  const image = form.get('image');
  if (!(image instanceof File)) {
    return jsonResponse('Missing image upload');
  }

  const outgoing = new FormData();
  outgoing.append('model', DEFAULT_MODEL);
  outgoing.append('prompt', EDIT_PROMPT);
  outgoing.append('image', image, image.name || 'upload.png');
  outgoing.append('quality', DEFAULT_QUALITY);
  outgoing.append('output_format', 'png');
  outgoing.append('background', 'transparent');
  outgoing.append('input_fidelity', 'high');

  const openaiResponse = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: outgoing,
  });

  if (!openaiResponse.ok) {
    const text = await openaiResponse.text();
    return jsonResponse(`OpenAI image edit failed: ${text}`, openaiResponse.status);
  }

  const payload = await openaiResponse.json() as {
    data?: Array<{ b64_json?: string }>;
  };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) {
    return jsonResponse('OpenAI image edit returned no image', 502);
  }

  const bytes = decodeBase64Image(encoded);
  const outputBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Response(new Blob([outputBuffer], { type: 'image/png' }), {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': 'no-store',
    },
  });
}
