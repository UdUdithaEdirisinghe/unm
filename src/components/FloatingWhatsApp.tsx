"use client";

import Link from "next/link";
import { useMemo } from "react";

type Props = {
  phone?: string;
  message?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
};

export default function FloatingWhatsApp({
  phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "",
  message = "Hi! I need help with an order.",
  label = "Need Help? Chat with us",
  showLabel = true,
  className = "",
}: Props) {
  // keep only digits + plus
  const clean = useMemo(() => phone.replace(/[^\d+]/g, ""), [phone]);
  const href = useMemo(() => {
    const base = `https://wa.me/${clean.startsWith("+") ? clean.slice(1) : clean}`;
    const q = `?text=${encodeURIComponent(message)}`;
    return base + q;
  }, [clean, message]);

  if (!clean) return null;

  return (
    <div className={`fixed z-50 right-4 bottom-4 flex items-end gap-2 ${className}`}>
      {showLabel && (
        <div
          className="hidden sm:block rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow
                     border border-slate-200"
        >
          {label}
        </div>
      )}

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]
                   shadow-lg ring-1 ring-black/10 hover:scale-105 active:scale-95 transition"
      >
        {/* WhatsApp SVG */}
        <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 fill-white">
          <path d="M19.11 17.55c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.69.15-.2.3-.79.97-.98 1.17-.18.2-.36.22-.66.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.77-1.64-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.69-1.66-.95-2.27-.25-.6-.5-.5-.69-.5l-.59-.01c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.19 5.09 4.47.71.31 1.26.49 1.69.63.71.22 1.35.19 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/>
          <path d="M26.88 5.12A13.9 13.9 0 0 0 16 .75C7.86.75 1.25 7.37 1.25 15.5c0 2.6.69 5.12 2 7.36L1 31l8.33-2.18c2.17 1.18 4.62 1.8 7.12 1.8 8.13 0 14.75-6.62 14.75-14.75 0-3.94-1.53-7.64-4.32-10.75zM16.46 28.5c-2.26 0-4.48-.6-6.42-1.72l-.46-.27-4.95 1.3 1.32-4.83-.3-.5a12.3 12.3 0 0 1-1.86-6.48C3.79 8.46 9.45 2.8 16.46 2.8c3.3 0 6.41 1.29 8.75 3.62a12.29 12.29 0 0 1 3.62 8.74c0 6.99-5.67 12.66-12.37 12.66z"/>
        </svg>
      </Link>
    </div>
  );
}