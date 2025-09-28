// src/app/admin/login/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [csrf, setCsrf] = useState("");

  // 1) Ensure the CSRF cookie exists and grab the token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // this GET should set Set-Cookie: manny_csrf=... if missing
        const res = await fetch("/api/csrf", { credentials: "include" });
        if (!res.ok) throw new Error("csrf init failed");
        const data = await res.json();
        if (!cancelled) setCsrf(String(data?.token || ""));
      } catch {
        if (!cancelled) setMsg("Couldn't initialize security token. Refresh the page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!csrf) {
      setMsg("Security token missing. Please refresh the page.");
      return;
    }

    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",         // <- include cookies
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf,          // <- attach token
      },
      body: JSON.stringify({ password: pwd }),
    });

    if (res.ok) {
      window.location.href = "/admin";
    } else {
      setMsg("Invalid password.");
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
        />
        {msg && <p className="mt-2 text-sm text-rose-400">{msg}</p>}
        <button type="submit" className="btn-primary mt-4 w-full">
          Login
        </button>
      </form>
    </div>
  );
}