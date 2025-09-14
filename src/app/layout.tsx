import type { ReactNode } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer"; // <- match casing
import { CartProvider } from "../components/cart/CartProvider";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import ToastProvider from "../components/ui/ToastProvider";
import "./globals.css";

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