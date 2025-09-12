"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  phone: string;           // e.g. "+94762285303"
  label?: string;          // bubble text for desktop
  routes: string[];        // pages to show on; supports "/*" prefix matches
};

/** Show on specific routes; hide label on mobile; use crisp WhatsApp SVG icon */
export default function FloatingWhatsApp({ phone, label, routes }: Props) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const set = () => setIsMobile(window.innerWidth < 768);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // support exact ("/about") and prefix ("/products/*")
  const allowed = routes.some((r) =>
    r.endsWith("/*") ? pathname.startsWith(r.slice(0, -2)) : pathname === r
  );
  if (!allowed) return null;

  const href = `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-lg ring-1 ring-black/5 hover:shadow-xl transition"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "#25D366" }}>
        <Image
          src="/whatsapp.svg"
          alt="WhatsApp"
          width={20}
          height={20}
          priority
        />
      </span>
      {!isMobile && label && (
        <span className="text-sm font-medium text-gray-800">{label}</span>
      )}
    </a>
  );
}