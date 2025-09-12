// src/components/FloatingWhatsApp.tsx
"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";

type Props = {
  phone: string;
  label: string;
  routes: string[];
};

export default function FloatingWhatsApp({ phone, label, routes }: Props) {
  const pathname = usePathname();
  const show = routes.some((r) =>
    pathname === r || pathname.startsWith(r + "/")
  );

  if (!show) return null;

  return (
    <a
      href={`https://wa.me/${phone.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2"
    >
      {/* ✅ Better logo handling */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 shadow-lg">
        <Image
          src="/logo/whatsapp.png" // put your uploaded logo in public/whatsapp.png
          alt="WhatsApp"
          width={28}
          height={28}
          priority
        />
      </div>

      {/* ✅ Show label only on desktop */}
      <span className="hidden md:inline rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 shadow">
        {label}
      </span>
    </a>
  );
}