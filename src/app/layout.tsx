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
      <body className="bg-[var(--bg)] text-[var(--text)] antialiased min-h-screen flex flex-col">
        <CartProvider>
          {/* Top Navigation */}
          <Navbar />

          {/* 🔔 Global toasts (top-center, just under the navbar) */}
          <ToastProvider />

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
            {children}
          </main>

          {/* Footer */}
          <Footer />

          {/* WhatsApp bubble */}
          <FloatingWhatsApp
            phone="+94760703523"
            label="Need Help? Chat with us"
            routes={[
              "/",            // Home (exact)
              "/products",    // List
              "/products/",   // Ensure nested detail pages work
              "/products/*",  // Product detail
              "/about",
              "/contact",
              "/policies",
              "/faq",
              "/facts",
              "/cart",
              "/checkout",    // ✅ Added checkout too
            ]}
          />
        </CartProvider>
      </body>
    </html>
  );
}