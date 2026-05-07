import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface SeoPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function SeoPageLayout({ title, description, children }: SeoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 selection:bg-[#ff7a2f]/10 selection:text-[#ff7a2f]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="fix.pictures logo" className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-sm font-bold tracking-wide text-zinc-900">fix.pictures AI</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <Link to="/#how-it-works" className="transition hover:text-zinc-900">How it works</Link>
            <Link to="/pricing" className="transition hover:text-zinc-900">Pricing</Link>
            <Link
              to="/app"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Try free
            </Link>
          </div>
          <Link
            to="/app"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 md:hidden"
          >
            Try free
          </Link>
        </div>
      </nav>

      {/* Page meta hint for crawlers via visible heading */}
      <div className="sr-only">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {/* Content */}
      {children}

      {/* Footer */}
      <footer className="mt-24 border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="fix.pictures logo" className="h-7 w-7 rounded-lg object-cover" />
              <span className="text-sm font-bold tracking-wide text-zinc-900">fix.pictures AI</span>
            </Link>
            <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
              <Link to="/amazon-image-requirements" className="hover:text-zinc-900">Image Requirements</Link>
              <Link to="/remove-background-amazon" className="hover:text-zinc-900">Remove Background</Link>
              <Link to="/amazon-white-background" className="hover:text-zinc-900">White Background</Link>
              <Link to="/amazon-image-size" className="hover:text-zinc-900">Image Size</Link>
              <Link to="/amazon-listing-image-checker" className="hover:text-zinc-900">Image Checker</Link>
              <Link to="/fix-amazon-product-photos" className="hover:text-zinc-900">Fix Product Photos</Link>
            </div>
            <div className="flex gap-5 text-sm text-zinc-500">
              <Link to="/terms" className="hover:text-zinc-900">Terms</Link>
              <Link to="/privacy" className="hover:text-zinc-900">Privacy</Link>
            </div>
          </div>
          <p className="mt-8 text-xs text-zinc-400">
            © {new Date().getFullYear()} fix.pictures AI. Not affiliated with Amazon.com, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
