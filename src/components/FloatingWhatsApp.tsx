// src/components/FloatingWhatsApp.tsx
"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

type FloatingWhatsAppProps = {
  label?: string;
  phone: string;
  routes?: string[];
};

export default function FloatingWhatsApp({
  label = "Need Help? Chat with us",
  phone,
  routes = [],
}: FloatingWhatsAppProps) {
  const pathname = usePathname();

  // Show only on allowed routes
  if (routes.length > 0 && !routes.includes(pathname)) return null;

  const link = `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 rounded-full bg-white px-3 py-2 shadow-lg hover:shadow-xl transition"
    >
      {/* WhatsApp Logo */}
      <Image
        src="/logo/whatsapp.png.png"
        alt="WhatsApp"
        width={36}
        height={36}
        className="rounded-full"
      />

      {/* Hide label on mobile, show on larger screens */}
      <span className="hidden sm:inline text-sm font-medium text-slate-800">
        {label}
      </span>
    </a>
  );
}