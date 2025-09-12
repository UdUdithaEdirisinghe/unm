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

  // Only show on allowed routes
  if (routes && !routes.some((r) => pathname.startsWith(r))) return null;

  const url = `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 flex items-center gap-2 z-50"
    >
      {/* Circle background */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg">
        <Image
          src="/logo/whatsapp.png" // <- your plain white logo
          alt="WhatsApp"
          width={28}
          height={28}
          className="object-contain"
        />
      </div>

      {/* Desktop-only label */}
      {label && (
        <span className="hidden sm:inline-block whitespace-nowrap rounded-lg bg-white/10 px-3 py-2 text-sm text-white shadow">
          {label}
        </span>
      )}
    </a>
  );
}