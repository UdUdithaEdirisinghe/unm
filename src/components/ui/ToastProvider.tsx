"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Toast = { id: number; text: string };
type Ctx = { toast: (text: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const [mounted, setMounted] = useState(false);

  // Mark mounted on client to avoid any SSR mismatch concerns
  useEffect(() => setMounted(true), []);

  const toast = useCallback((text: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, text }]);
    // auto-dismiss
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2300);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}

      {/* Toasts render right here; fixed positioning makes them overlay the app.
          No portals, no react-dom types, no hydration issues. */}
      {mounted && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-end p-4 sm:p-6">
          <div className="flex w-full max-w-sm flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.95)] px-3 py-2 text-sm text-slate-100 shadow-lg"
              >
                {t.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
}