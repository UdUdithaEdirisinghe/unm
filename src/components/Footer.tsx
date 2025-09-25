"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-[rgba(10,15,28,0.85)] backdrop-blur mt-12">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Logo (centered) */}
        <div className="flex justify-center">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/logo/manny-logo.png"
              alt="Manny.lk"
              className="h-10 w-auto"
            />
          </Link>
        </div>

        {/* Links grid: centered container; stacks on mobile, spreads evenly on desktop */}
        <div className="mt-10">
          <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-10 text-sm">
            {/* Quick Links */}
            <div className="text-center sm:text-left">
              <h3 className="text-slate-200 font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/about" className="hover:text-slate-200">About</Link></li>
                <li><Link href="/blog" className="hover:text-slate-200">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-slate-200">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-slate-200">FAQs</Link></li>
              </ul>
            </div>

            {/* Policies */}
            <div className="text-center sm:text-left">
              <h3 className="text-slate-200 font-semibold mb-3">Policies</h3>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/policies#privacy" className="hover:text-slate-200">Privacy Policy</Link></li>
                <li><Link href="/policies#shipping" className="hover:text-slate-200">Shipping &amp; Delivery</Link></li>
                <li><Link href="/policies#returns" className="hover:text-slate-200">Returns &amp; Warranty</Link></li>
              </ul>
            </div>

            {/* Social */}
            <div className="text-center sm:text-left">
              <h3 className="text-slate-200 font-semibold mb-3">Follow Us</h3>
              <div className="flex justify-center sm:justify-start gap-4">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-slate-400 hover:text-slate-200"
                >
                  {/* Instagram SVG */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor"/>
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-slate-400 hover:text-slate-200"
                >
                  {/* Facebook SVG */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M14.5 8H16V4h-2a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h2.2l.3-4H14V8a1 1 0 0 1 1-1Z" fill="currentColor"/>
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-slate-400 hover:text-slate-200"
                >
                  {/* TikTok SVG */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M14 3v8.5a4.5 4.5 0 1 1-3.6-1.77" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 3c1.2 2.1 3.3 3.5 5.7 3.6V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <p className="mt-10 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Manny.lk. All rights reserved.
        </p>
      </div>
    </footer>
  );
}