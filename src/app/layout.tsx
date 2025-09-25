// src/app/layout.tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CartProvider } from "../components/cart/CartProvider";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import ToastProvider from "../components/ui/ToastProvider";
import "./globals.css";

/**
 * Favicon / app icons
 * Files expected in /public:
 *   - /favicon.png            (main)
 *   - /favicon.ico            (fallback, optional)
 *   - /apple-touch-icon.png   (iOS home screen, optional)
 */
export const metadata: Metadata = {
  title: {
    default: "Manny.lk",
    template: "%s | Manny.lk",
  },
  icons: {
    // keep PNG as the primary; include ICO as a fallback for older UAs
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      {/* Explicit links help bust stubborn favicon caches in some browsers */}
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>

      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar />
          {/* Global toasts (top-center, just under the navbar) */}
          <ToastProvider />

          {/* Main area */}
          <main className="site-container flex-1">{children}</main>

          <Footer />

          {/* WhatsApp bubble on selected routes */}
          <FloatingWhatsApp
            phone="+94760703523"
            label="Need Help? Chat with us"
            routes={[
              "/",
              "/products", "/products/", "/products/*",
              "/about", "/contact", "/policies",
              "/faq", "/facts", "/cart",
            ]}
          />
        </CartProvider>
      </body>
    </html>
  );
}