"use client";

import { useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [csrf, setCsrf] = useState<string>("");   // CSRF token
  const [busy, setBusy] = useState(false);

  // Fetch CSRF on mount
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/admin/csrf", { method: "GET", cache: "no-store" });
        const j = await r.json();
        if (live && j?.token) setCsrf(String(j.token));
      } catch {
        // show nothing; server route will still reject without token
      }
    })();
    return () => { live = false; };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const password = (pwd || "").slice(0, 200); // simple length cap
    if (!password) {
      setMsg("Password is required.");
      return;
    }
    if (!csrf) {
      setMsg("Security token missing. Please refresh the page.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,                 // send token in header
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/admin";
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.message || "Invalid password.");
      }
    } catch {
      setMsg("Network error, try again.");
    } finally {
      setBusy(false);
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
          autoComplete="current-password"
          onChange={(e) => setPwd(e.target.value)}
        />
        {msg && <p className="mt-2 text-sm text-rose-400">{msg}</p>}
        <button type="submit" className="btn-primary mt-4 w-full" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}