"use client";

import { usePathname } from "next/navigation";
import FloatingWhatsApp from "./FloatingWhatsApp";

/**
 * Shows the floating WhatsApp only on selected routes.
 * - Includes product detail pages (/products/[slug]) via startsWith('/products/')
 * - Also About, Contact, future Policies + FAQ
 */
export default function WhatsAppOnRoutes() {
  const pathname = (usePathname() || "").toLowerCase();

  const shouldShow =
    pathname === "/" ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/policies" ||
    pathname === "/faq";

  if (!shouldShow) return null;

  // Optional: tweak message per page
  let label = "Need help? Chat with us";
  if (pathname.startsWith("/products/")) label = "Ask about this product";
  else if (pathname === "/checkout") label = "Help with checkout";

  return (
    <FloatingWhatsApp
      phone="94762285303"  
      label={label}
      utm="whatsapp-fab"
      bottom={24}
      left={24}
    />
  );
}