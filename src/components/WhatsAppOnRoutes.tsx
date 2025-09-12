// src/components/WhatsAppOnRoutes.tsx
"use client";
import FloatingWhatsApp from "./FloatingWhatsApp";

export default function WhatsAppOnRoutes() {
  return (
    <FloatingWhatsApp
      phone="+94762285303" // replace with your business number
      label="Need Help? Chat with us"
      routes={[
        "/",          // Home
        "/products",  // Product listing
        "/about",
        "/contact",
        "/policies",
        "/facts",
      ]}
    />
  );
}