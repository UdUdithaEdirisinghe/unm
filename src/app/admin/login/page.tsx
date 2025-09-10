"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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