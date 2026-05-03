// Local dev handler — mirrors supabase/functions/process-image/index.ts exactly,
// minus quota enforcement (DB not running locally).
// Called by the Vite dev-server middleware in vite.config.ts.

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EDIT_PROMPT = [
  'Convert this product photo to a fully Amazon main image compliant result.',
  'BACKGROUND RULE: Every pixel that is not part of the physical product must be exactly RGB(255,255,255).',
  'This means zero gradients, zero off-white tones, zero texture, zero noise — mathematically pure white everywhere outside the product.',
  'SHADOW RULE: There must be NO shadow of any kind anywhere in the image.',
  'No drop shadow. No cast shadow. No floor shadow. No contact shadow. No ambient occlusion. No darkening near the base.',
  'Every pixel below, beside, and around the product must be exactly RGB(255,255,255) — not RGB(254,254,254), not RGB(245,245,245) — exactly 255.',
  'If the product was photographed on a surface that caused a natural shadow, erase that shadow completely and replace with pure white.',
  'FRAMING RULE: The product must fill 85–90% of the image frame. Crop tightly so the product is large in frame with only minimal padding on each side.',
  'Center the product both horizontally and vertically. Do not leave large empty white areas.',
  'COLOR PRESERVATION RULE: You must not change the color, brightness, or tone of any part of the product.',
  'Dark areas of the product must remain exactly as dark as in the original photo. Black must stay black. Dark grey must stay dark grey.',
  'Do not lighten, brighten, or adjust any part of the product. The only change allowed is removing the background.',
  'Do not add props, text, badges, watermarks, reflections, or any extra objects.',
  'Do not crop off any part of the product — the entire product including handles, lids, or protruding elements must be fully visible.',
  'Final output: one product, centered, filling most of the frame, on a mathematically pure white background with zero shadow.',
].join(' ');

const jsonResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function handleProcessImage(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse('Method not allowed', 405);
  }

  const geminiKey =
    process.env?.VITE_GEMINI_API_KEY ||
    process.env?.GEMINI_API_KEY ||
    undefined;

  if (!geminiKey) {
    return jsonResponse('VITE_GEMINI_API_KEY is not set in .env', 500);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse('Failed to parse form data');
  }

  const image = form.get('image');
  if (!(image instanceof File)) {
    return jsonResponse('Missing or invalid image field');
  }

  // Convert to base64 for Gemini inlineData
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
    return jsonResponse(`Failed to reach Gemini: ${msg}`, 502);
  }

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text().catch(() => '');
    return jsonResponse(`Gemini error: ${text}`, geminiResponse.status);
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
    return jsonResponse('Gemini returned no image data', 502);
  }

  const binaryOut = atob(encoded);
  const bytes = new Uint8Array(binaryOut.length);
  for (let i = 0; i < binaryOut.length; i++) {
    bytes[i] = binaryOut.charCodeAt(i);
  }

  return new Response(new Blob([bytes], { type: mimeType }), {
    status: 200,
    headers: {
      'content-type': mimeType,
      'cache-control': 'no-store',
      'x-model-used': GEMINI_MODEL,
    },
  });
}
