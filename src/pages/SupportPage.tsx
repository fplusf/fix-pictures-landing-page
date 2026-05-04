import { useState } from 'react';
import { supabase } from '@/src/lib/supabase';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function SupportPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const { error } = await supabase.from('support_tickets').insert({
        title,
        description,
        sender_email: senderEmail || null,
      });

      if (error) throw error;
      setStatus('sent');
      setTitle('');
      setDescription('');
      setSenderEmail('');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please email us directly.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* Nav */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="fix.pictures AI" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-sm font-bold text-zinc-800">fix.pictures AI</span>
          </a>
          <a href="/" className="text-sm text-zinc-500 transition hover:text-zinc-900">
            ← Back to home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-zinc-900">Support</h1>
          <p className="mt-3 text-zinc-500">
            Have a question or issue? Fill out the form below and we'll get back to you.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Or email us directly at{' '}
            <a
              href="mailto:fuzailof@gmail.com"
              className="font-medium text-[#e636a4] transition hover:underline"
            >
              fuzailof@gmail.com
            </a>
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {status === 'sent' ? (
            <div className="py-10 text-center">
              <div className="mb-4 text-5xl">✅</div>
              <h2 className="text-xl font-bold text-zinc-900">Message sent!</h2>
              <p className="mt-2 text-zinc-500">
                We've received your message and will reply to you shortly.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-6 rounded-lg bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
                  Your email <span className="font-normal text-zinc-400">(optional — so we can reply)</span>
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#e636a4] focus:ring-2 focus:ring-[#e636a4]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Image processing issue"
                  required
                  maxLength={120}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#e636a4] focus:ring-2 focus:ring-[#e636a4]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue or question in as much detail as possible…"
                  required
                  rows={6}
                  maxLength={2000}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#e636a4] focus:ring-2 focus:ring-[#e636a4]/20"
                />
                <p className="mt-1 text-right text-xs text-zinc-400">
                  {description.length}/2000
                </p>
              </div>

              {status === 'error' && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {errorMsg}{' '}
                  <a href="mailto:fuzailof@gmail.com" className="underline">
                    fuzailof@gmail.com
                  </a>
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !title.trim() || !description.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-[#e636a4] to-[#ff7a2f] py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-zinc-400">
          We typically respond within 24 hours on business days.
        </p>
      </main>
    </div>
  );
}
