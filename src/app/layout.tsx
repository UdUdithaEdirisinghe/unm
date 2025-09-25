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
 * Put your logo at:
 *   public/favicon.png           (main)
 *   public/favicon.ico           (fallback, optional)
 *   public/apple-touch-icon.png  (optional, iOS home screen)
 */
export const metadata: Metadata = {
  title: {
    default: "Manny.lk",
    template: "%s | Manny.lk",
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }], // ✅ always use your favicon.png
    shortcut: "/favicon.png", // make shortcut the same PNG
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
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