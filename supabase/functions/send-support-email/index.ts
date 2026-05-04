// Supabase Edge Function — Deno runtime
// Accepts a support message (title + description + optional sender email)
// and forwards it to the support inbox via Resend.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPPORT_TO = 'fuzailof@gmail.com';
const FROM_ADDRESS = 'support@fix.pictures'; // must be a verified Resend sender domain

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, description, senderEmail } = await req.json() as {
      title: string;
      description: string;
      senderEmail?: string;
    };

    if (!title?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: 'title and description are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const replyTo = senderEmail?.trim() ? senderEmail.trim() : undefined;

    const emailBody = [
      `Subject: ${title.trim()}`,
      '',
      description.trim(),
      '',
      replyTo ? `—\nReply-to: ${replyTo}` : '— (no sender email provided)',
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [SUPPORT_TO],
        reply_to: replyTo,
        subject: `[fix.pictures support] ${title.trim()}`,
        text: emailBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-support-email error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
