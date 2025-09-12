"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";

type Props = {
  phone: string;
  label?: string;
  routes?: string[];
};

export default function FloatingWhatsApp({ phone, label, routes }: Props) {
  const pathname = usePathname();
  if (routes && !routes.includes(pathname)) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <a
      href={`https://wa.me/${phone.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 flex items-center gap-2 z-50"
    >
      {/* WhatsApp logo */}
      <div className="w-12 h-12 rounded-full shadow-lg bg-green-500 flex items-center justify-center">
        <Image
          src="/logo/whatsapp.png"
          alt="WhatsApp"
          width={40}
          height={40}
          priority
        />
      </div>

      {/* Show label only on desktop */}
      {!isMobile && label && (
        <span className="px-3 py-2 rounded-full bg-white text-slate-800 shadow-lg text-sm font-medium">
          {label}
        </span>
      )}
    </a>
  );
}