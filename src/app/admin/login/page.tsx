// src/app/admin/login/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [csrf, setCsrf] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/csrf", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed");
        const { token } = await res.json();
        if (mounted) setCsrf(String(token || ""));
      } catch {
        if (mounted) setMsg("Could not initialize secure session. Please refresh.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!csrf) {
      setMsg("Security token missing. Please refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf, // send the same token we set in cookie
        },
        credentials: "include",
        body: JSON.stringify({ password: pwd.trim() }),
      });

      if (res.ok) {
        window.location.href = "/admin";
      } else {
        let text = "Invalid password.";
        try {
          const j = await res.json();
          if (j?.error) text = j.error;
        } catch {}
        setMsg(text);
      }
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-800 bg-[rgba(10,15,28,0.8)] p-6"
      >
        <h1 className="mb-4 text-lg font-semibold">Admin Login</h1>
        <input
          type="password"
          className="field w-full"
          placeholder="Password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoComplete="current-password"
        />
        {msg && <p className="mt-2 text-sm text-rose-400">{msg}</p>}
        <button type="submit" className="btn-primary mt-4 w-full" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}