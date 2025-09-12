"use client";

import Link from "next/link";
import { useMemo } from "react";

type Props = {
  phone: string;                 // e.g. "94771234567"
  label?: string;                // desktop-only text bubble
  utm?: string;                  // optional UTM/source tag
  bottom?: number;               // px from bottom
  left?: number;                 // px from left
};

export default function FloatingWhatsApp({
  phone,
  label = "Need help? Chat with us",
  utm = "site-bubble",
  bottom = 24,
  left = 24,
}: Props) {
  const href = useMemo(() => {
    // Use wa.me to open WhatsApp; include a friendly prefilled message.
    const msg = encodeURIComponent("Hi Manny.lk 👋 I need some help.");
    return `https://wa.me/${phone}?text=${msg}&utm_source=${encodeURIComponent(
      utm
    )}`;
  }, [phone, utm]);

  return (
    <div
      className="fixed z-50 flex items-center gap-2"
      style={{ bottom, left }}
      aria-live="polite"
    >
      {/* Label bubble: hidden on small screens */}
      <div className="hidden sm:block select-none rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-lg">
        {label}
      </div>

      <Link
        href={href}
        target="_blank"
        aria-label="Chat on WhatsApp"
        className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] shadow-lg ring-1 ring-black/10 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {/* WhatsApp icon (inline SVG to avoid extra deps) */}
        <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 fill-white">
          <path d="M19.11 17.18c-.29-.15-1.69-.83-1.95-.93-.26-.1-.45-.15-.64.15-.19.3-.73.93-.9 1.12-.17.19-.33.22-.62.08-.29-.15-1.22-.45-2.33-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.3-.02-.46.13-.6.14-.14.3-.37.45-.56.15-.19.19-.3.29-.49.1-.19.05-.37-.03-.52-.08-.15-.64-1.54-.88-2.11-.23-.56-.47-.49-.64-.5-.17-.01-.37-.01-.56-.01-.19 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.46 0 1.45 1.06 2.86 1.21 3.06.15.19 2.1 3.21 5.08 4.5.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.69-.69 1.93-1.35.24-.67.24-1.25.17-1.35-.07-.1-.26-.17-.55-.31z"></path>
          <path d="M26.65 5.35C23.86 2.57 20.06 1 16 1 7.72 1 1 7.72 1 16c0 2.66.7 5.22 2.03 7.49L1 31l7.7-2c2.2 1.2 4.69 1.84 7.3 1.84 8.28 0 15-6.72 15-15 0-4.06-1.57-7.86-4.35-10.65zm-10.65 24c-2.32 0-4.55-.61-6.52-1.77l-.47-.28-4.58 1.19 1.22-4.47-.3-.46C3.2 21.5 2.5 18.81 2.5 16 2.5 8.56 8.56 2.5 16 2.5S29.5 8.56 29.5 16 23.44 29.5 16 29.5z"></path>
        </svg>
      </Link>
    </div>
  );
}