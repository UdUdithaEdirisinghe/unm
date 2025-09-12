"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

type Props = {
  phone: string;          // e.g. "+94760703523"
  label?: string;         // desktop-only label
  routes?: string[];      // e.g. ["/", "/products", "/products/*", "/about"]
};

function matchRoute(pathname: string, route: string) {
  // exact homepage
  if (route === "/") return pathname === "/";

  // simple wildcard: "/products/*" => matches "/products" and "/products/anything"
  if (route.endsWith("/*")) {
    const base = route.slice(0, -2);
    return pathname === base || pathname.startsWith(base + "/");
  }

  // normal route: match the route itself OR any subpath under it
  return pathname === route || pathname.startsWith(route + "/");
}

export default function FloatingWhatsApp({ phone, label, routes }: Props) {
  const pathname = usePathname();

  // Only show on allowed routes (if routes provided)
  if (routes && !routes.some((r) => matchRoute(pathname, r))) return null;

  const url = `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2"
    >
      {/* Circular button */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-black/30 ring-1 ring-black/10">
        <Image
          src="/logo/whatsapp.png"     // your plain white logo
          alt="WhatsApp"
          width={28}
          height={28}
          className="object-contain"
          priority
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