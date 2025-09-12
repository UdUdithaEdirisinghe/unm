// src/app/layout.tsx
import type { ReactNode } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CartProvider } from "../components/cart/CartProvider";
import WhatsAppOnRoutes from "../components/WhatsAppOnRoutes";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-4 py-6">
            {children}
          </main>
          <Footer />

          {/* Floating WhatsApp (renders only on allowed routes) */}
          <WhatsAppOnRoutes />
        </CartProvider>
      </body>
    </html>
  );
}