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
            <h2 className="text-xl font-bold text-zinc-950">1. Information Collection</h2>
            <p className="mt-3">
              We collect minimal information required to provide our service. This includes account information via Google OAuth (email and name) to manage your subscription and usage quotas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">2. Image Processing</h2>
            <p className="mt-3">
              Your images are processed locally in your browser using Web Workers. We do *not* store your original or processed images on our servers. All image data is transient and exists only during your active session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">3. Data Security</h2>
            <p className="mt-3">
              We use industry-standard security measures to protect your account data. Access to your account is managed via Supabase, ensuring secure authentication and data handling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">4. Cookies & Analytics</h2>
            <p className="mt-3">
              We may use cookies to maintain your session and improve user experience. We may also use anonymous analytics to track Service performance and usage patterns.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">5. Contact Us</h2>
            <p className="mt-3">
              If you have any questions about this Privacy Policy, please contact us at support@fix.pictures.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
