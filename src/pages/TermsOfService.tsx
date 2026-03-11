import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 selection:bg-[#ff7a2f]/10 selection:text-[#ff7a2f]">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-20">
        <header className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Home
          </Link>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-zinc-500 font-medium">Last updated: March 6, 2026</p>
        </header>

        <div className="prose prose-zinc max-w-none space-y-8 text-base leading-relaxed text-zinc-600">
          <section>
            <h2 className="text-xl font-bold text-zinc-950">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing or using fix.pictures, you agree to be bound by these Terms of Service. 
              If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">2. Use of Service</h2>
            <p className="mt-3">
              Our service is provided "as is". We aim to provide high-quality image corrections for Amazon sellers, 
              but we do not guarantee specific results or compliance with Amazon's ever-changing policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">3. Intellectual Property</h2>
            <p className="mt-3">
              The fix.pictures logo, branding, and application code are the property of fix.pictures. 
              You retain ownership of the images you process through our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">4. Limitation of Liability</h2>
            <p className="mt-3">
              fix.pictures shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
              resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">5. Changes to Terms</h2>
            <p className="mt-3">
              We reserve the right to modify these terms at any time. Your continued use of the service 
              after such changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>

        <footer className="mt-20 border-t border-zinc-100 pt-8">
          <p className="text-sm text-zinc-400">© 2025 fix.pictures. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
