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
              <div className="flex justify-center sm:justify-start gap-4 text-slate-400">
                <a
                  href="https://www.instagram.com/your-handle"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:text-slate-200"
                >
                  <i className="fab fa-instagram text-xl"></i>
                </a>
                <a
                  href="https://www.facebook.com/your-page"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="hover:text-slate-200"
                >
                  <i className="fab fa-facebook text-xl"></i>
                </a>
                <a
                  href="https://www.tiktok.com/@your-handle"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="hover:text-slate-200"
                >
                  <i className="fab fa-tiktok text-xl"></i>
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