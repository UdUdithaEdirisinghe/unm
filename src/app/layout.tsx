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
 * Favicon / app icons (files live in /public)
 * You can reuse the same PNG for all sizes for now.
 */
const FV = "/favicon.png?v=2";           // bump v=2 -> v=3 next time you replace the icon
const ICO = "/favicon.ico?v=2";
const APPLE = "/apple-touch-icon.png?v=2";

export const metadata: Metadata = {
  title: {
    default: "Manny.lk",
    template: "%s | Manny.lk",
  },
  icons: {
    icon: [
      { url: FV, type: "image/png", sizes: "16x16" },
      { url: FV, type: "image/png", sizes: "32x32" },
      { url: FV, type: "image/png" }, // generic
      { url: ICO, type: "image/x-icon" },
    ],
    shortcut: FV,
    apple: APPLE,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      {/* Extra <link>s for stubborn caches / some user agents */}
      <head>
        <link rel="icon" type="image/png" sizes="16x16" href={FV} />
        <link rel="icon" type="image/png" sizes="32x32" href={FV} />
        <link rel="icon" type="image/png" href={FV} />
        <link rel="shortcut icon" href={ICO} />
        <link rel="apple-touch-icon" href={APPLE} />
      </head>

      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar />
          <ToastProvider />
          <main className="site-container flex-1">{children}</main>
          <Footer />
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