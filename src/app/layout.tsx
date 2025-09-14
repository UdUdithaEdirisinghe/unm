import type { ReactNode } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CartProvider } from "../components/cart/CartProvider";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import ToastProvider from "../components/ui/ToastProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <CartProvider>
          {/* Page shell */}
          <div className="flex min-h-screen flex-col">
            {/* Top nav */}
            <Navbar />

            {/* Global toasts (under nav) */}
            <ToastProvider />

            {/* Main content area */}
            <main className="flex-1">
              <div className="site-container">{children}</div>
            </main>

            {/* Footer */}
            <Footer />
          </div>

          {/* WhatsApp bubble (same routes you had) */}
          <FloatingWhatsApp
            phone="+94760703523"
            label="Need Help? Chat with us"
            routes={[
              "/",
              "/products",
              "/products/",
              "/products/*",
              "/about",
              "/contact",
              "/policies",
              "/faq",
              "/facts",
              "/cart",
            ]}
          />
        </CartProvider>
      </body>
    </html>
  );
}