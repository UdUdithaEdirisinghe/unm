"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: string; msg: string };
type Ctx = { push: (msg: string) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    // auto-dismiss after 2.5s
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* toasts container */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-3 py-2 shadow-lg"
          >
            <div className="text-sm text-emerald-200">✓ {t.msg}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}