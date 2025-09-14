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
      <body>
        <CartProvider>
          <Navbar />
          <ToastProvider />

          <main className="mx-auto w-full max-w-6xl px-4 py-6">
            {children}
          </main>

          <Footer />

          <FloatingWhatsApp
            phone="+94760703523"
            label="Need Help? Chat with us"
            routes={[
              "/", "/products", "/products/*", "/about",
              "/contact", "/policies", "/faq", "/facts", "/cart",
            ]}
          />
        </CartProvider>
      </body>
    </html>
  );
}