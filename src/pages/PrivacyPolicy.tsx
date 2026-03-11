import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 selection:bg-[#ff7a2f]/10 selection:text-[#ff7a2f]">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-20">
        <header className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Home
          </Link>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 font-medium text-zinc-500">Last updated: March 6, 2026</p>
        </header>

        <div className="space-y-8 text-base leading-relaxed text-zinc-600">
          <section>
            <h2 className="text-xl font-bold text-zinc-950">1. What We Process</h2>
            <p className="mt-3">
              fix.pictures processes images you upload to generate compliant outputs. Processing runs in your browser worker runtime or in your own localhost service when enabled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">2. Data Storage</h2>
            <p className="mt-3">
              Uploaded images are handled in-session for processing and export. No cloud upload is required for the default browser-worker mode.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">3. Local Inference Option</h2>
            <p className="mt-3">
              If you run the optional local inference service on your machine, requests are sent only to loopback addresses (`127.0.0.1` / `localhost`) using short-lived session tokens.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
