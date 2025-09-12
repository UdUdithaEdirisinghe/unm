"use client";

import { usePathname } from "next/navigation";

type Props = {
  routes: string[];
  label?: string;
};

export default function WhatsAppOnRoutes({ routes, label }: Props) {
  const pathname = usePathname();

  // Only show on selected routes
  if (!routes.includes(pathname)) return null;

  return (
    <a
      href="https://wa.me/94762285303" // ✅ put your business WhatsApp number here
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white shadow-lg hover:bg-green-600 transition"
    >
      {/* WhatsApp icon */}
      <span className="text-xl">💬</span>
      {label && <span className="hidden sm:inline">{label}</span>}
    </a>
  );
}