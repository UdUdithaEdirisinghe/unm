"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "../components/cart/CartProvider"; 

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "px-3 py-2 text-sm transition-colors",
        active ? "text-white font-semibold" : "text-slate-300 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { count, subtotal } = useCart();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", match: (p: string) => p === "/" },
    { href: "/products", label: "Products", match: (p: string) => p.startsWith("/products") },
    { href: "/about", label: "About", match: (p: string) => p === "/about" },
    { href: "/contact", label: "Contact", match: (p: string) => p === "/contact" },
    // Keep one top-level “Policies” for nav; sub-pages live in /policies/*
    { href: "/policies", label: "Policies", match: (p: string) => p.startsWith("/policies") },
    { href: "/faq", label: "FAQ", match: (p: string) => p === "/faq" },
  ];

  // ✅ Close menu on every route change to avoid stale open state
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/60 bg-[rgba(10,15,28,0.85)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Left: Logo + hamburger */}
        <div className="flex items-center gap-3">
          <button
            className="sm:hidden text-slate-300 hover:text-white"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo/manny-logo.png" alt="Manny.lk" className="h-12 w-auto" />
          </Link>
        </div>

        {/* Center: desktop links */}
        <nav className="hidden sm:flex items-center">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} active={l.match(pathname)} />
          ))}
        </nav>

        {/* Right: cart */}
        <div className="flex items-center gap-3">
          <Link href="/cart" className="flex items-center gap-2 text-slate-200 hover:text-white" aria-label="Cart">
            <span className="relative inline-flex">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6h15l-1.5 9h-12L5 3H2" />
                <circle cx="9" cy="21" r="1.8" />
                <circle cx="18" cy="21" r="1.8" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-rose-600 text-white text-[10px] px-[6px] py-[1px] leading-4">
                  {count}
                </span>
              )}
            </span>
            <span className="hidden sm:inline text-sm">LKR {Math.max(0, subtotal).toLocaleString("en-LK")}</span>
          </Link>
        </div>
      </div>

      {/* ✅ Backdrop to prevent click-through when open */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
        />
      )}

      {/* ✅ Mobile menu: fixed + scrollable; closes on any link click */}
      {open && (
        <div className="fixed top-16 left-0 right-0 z-50 sm:hidden border-t border-slate-800/60 bg-[rgba(10,15,28,0.95)] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col">
            {links.map((l) => (
              <NavLink
                key={l.href}
                href={l.href}
                label={l.label}
                active={l.match(pathname)}
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}