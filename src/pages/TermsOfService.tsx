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
              By accessing or using fix.pictures ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">2. Service Description</h2>
            <p className="mt-3">
              fix.pictures provides an AI-powered image processing tool designed to help users create product images that comply with Amazon's marketplace requirements. While we strive for 100% compliance, the final responsibility for ensuring images meet platform-specific rules rests with the user.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">3. User Content & Privacy</h2>
            <p className="mt-3">
              You retain all ownership rights to the images you upload to the Service. By using the Service, you grant us a limited license to process your images solely for the purpose of providing the requested output. We do not sell or share your image data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">4. Prohibited Use</h2>
            <p className="mt-3">
              You agree not to use the Service for any unlawful purpose, including but not limited to processing copyrighted material without permission, or generating offensive or harmful content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">5. Limitation of Liability</h2>
            <p className="mt-3">
              In no event shall fix.pictures or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Service, even if fix.pictures has been notified of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">6. Modifications</h2>
            <p className="mt-3">
              fix.pictures may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
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
