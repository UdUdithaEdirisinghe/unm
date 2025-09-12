"use client";

import { Toaster } from "react-hot-toast";

/**
 * Global toast host — rendered right under the Navbar (via layout.tsx).
 * Position: top-center, offset so it sits below the navbar.
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      gutter={8}
      containerStyle={{ top: 72 }} // push down a bit so it doesn't overlap the navbar
      toastOptions={{
        duration: 2500,
        style: {
          background: "rgba(15,23,42,0.95)",  // matches your dark glass UI
          color: "#E2E8F0",                    // slate-200
          border: "1px solid rgba(51,65,85,0.6)",
          backdropFilter: "blur(6px)",
        },
        success: {
          iconTheme: { primary: "#10B981", secondary: "#0B1220" }, // emerald
        },
        error: {
          iconTheme: { primary: "#EF4444", secondary: "#0B1220" }, // rose
        },
      }}
    />
  );
}