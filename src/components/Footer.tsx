"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-800/60 bg-[rgba(10,15,28,0.85)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Top: Logo */}
        <div className="flex justify-center">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/logo/manny-logo.png"
              alt="Manny.lk"
              className="h-10 w-auto"
            />
          </Link>
        </div>

        {/* Middle: Columns */}
        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
          {/* Quick links */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-semibold text-slate-200">Quick Links</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-slate-200">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-400 hover:text-slate-200">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-slate-200">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-slate-400 hover:text-slate-200">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-semibold text-slate-200">Policies</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/policies/privacy" className="text-slate-400 hover:text-slate-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/shipping" className="text-slate-400 hover:text-slate-200">
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link href="/policies/returns" className="text-slate-400 hover:text-slate-200">
                  Returns &amp; Warranty
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-semibold text-slate-200">Follow Us</h3>
            <div className="mt-3 flex items-center justify-center gap-4 md:justify-start">
              {/* Instagram */}
              <a
                href="https://instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.2A2.8 2.8 0 1 0 12 15.8 2.8 2.8 0 0 0 12 9.2zm5.4-2.1a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/>
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M13 22v-8h3l.6-3H13V9.2c0-.9.3-1.5 1.8-1.5H17V5.1c-.3 0-1.3-.1-2.3-.1-2.3 0-3.8 1.3-3.8 3.9V11H8v3h2.9v8H13z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M21 8.1a7 7 0 0 1-4.9-2.1v9.6a6.6 6.6 0 1 1-6.6-6.6c.3 0 .6 0 .9.1v3a3.6 3.6 0 1 0 2.7 3.5V2h3a7 7 0 0 0 4.9 2v4.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-slate-800/60 pt-4 text-center">
          <p className="text-sm text-slate-400">© {year} Manny.lk. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}