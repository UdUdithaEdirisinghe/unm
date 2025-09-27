// src/app/layout.tsx
import { Analytics } from "@vercel/analytics/next"
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CartProvider } from "../components/cart/CartProvider";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import ToastProvider from "../components/ui/ToastProvider";
import "./globals.css";

// Versioned asset URLs (new paths bust old CDN/browser caches)
const FV = "/favicons/manny-v1.png";
const ICO = "/favicons/manny-v1.ico";              // optional
const APPLE = "/favicons/apple-touch-icon-v1.png"; // 180×180 recommended

export const metadata: Metadata = {
  title: { default: "Manny.lk", template: "%s | Manny.lk" },
  icons: {
    icon: [
      { url: FV, type: "image/png", sizes: "16x16" },
      { url: FV, type: "image/png", sizes: "32x32" },
      { url: FV, type: "image/png" },         // generic
      { url: ICO, type: "image/x-icon" },     // optional fallback
    ],
    shortcut: FV,
    apple: APPLE,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      {/* extra links help some stubborn UAs; harmless elsewhere */}
      <head>
        <link rel="icon" type="image/png" sizes="16x16" href={FV} />
        <link rel="icon" type="image/png" sizes="32x32" href={FV} />
        <link rel="icon" type="image/png" href={FV} />
        {/* remove if you didn't add the ICO */}
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
            routes={["/","/products","/products/","/products/*","/about","/contact","/policies","/faq","/facts","/cart"]}
          />
        </CartProvider>
      </body>
    </html>
  );
}