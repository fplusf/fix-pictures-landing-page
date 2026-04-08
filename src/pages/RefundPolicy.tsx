import { Link } from 'react-router-dom';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 selection:bg-[#ff7a2f]/10 selection:text-[#ff7a2f]">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-20">
        <header className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Home
          </Link>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">Refund Policy</h1>
          <p className="mt-4 font-medium text-zinc-500">Last updated: April 7, 2026</p>
        </header>

        <div className="space-y-8 text-base leading-relaxed text-zinc-600">
          <section>
            <h2 className="text-xl font-bold text-zinc-950">1. Trial and Usage</h2>
            <p className="mt-3">
              We offer a free tier that allows you to test the full fix.pictures workflow with 5 images. We strongly encourage all users to utilize this free tier to ensure the service meets their needs before upgrading to a paid plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">2. Refund Eligibility</h2>
            <p className="mt-3">
              Refunds are available for Pro Yearly and Lifetime plans within 7 days of purchase, provided that the account has processed fewer than 10 images since the upgrade. Once 10 or more images have been processed on a paid plan, the purchase is considered fully consumed and non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">3. Subscription Cancellations</h2>
            <p className="mt-3">
              You can cancel your subscription at any time. When you cancel, you will maintain access to your Pro features until the end of your current billing period. No further charges will be made.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">4. Processing Errors</h2>
            <p className="mt-3">
              If the service fails to process an image due to a technical error on our side, it will not count towards your quota. If you believe a credit was unfairly deducted, please contact support with the image ID or details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-950">5. How to Request a Refund</h2>
            <p className="mt-3">
              To request a refund, please email support@fix.pictures with your account email and the transaction ID from your receipt. Refunds are typically processed within 3-5 business days.
            </p>
          </section>
        </div>

        <footer className="mt-20 border-t border-zinc-100 pt-8">
          <p className="text-sm text-zinc-400">© {new Date().getFullYear()} fix.pictures. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
