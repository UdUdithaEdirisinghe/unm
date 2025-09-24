// src/app/contact/ContactForm.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill name, email, and message.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      toast.success("Thanks! We’ll get back to you within 24 hours.");
      setForm({ name: "", email: "", message: "" });
    } catch (err: any) {
      toast.error(err?.message || "Could not send message.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-slate-100 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-1">Your Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputClass}
          placeholder="John Doe"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Your Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className={inputClass}
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Your Message</label>
        <textarea
          rows={6}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className={`${inputClass} resize-y`}
          placeholder="How can we help?"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-4 py-2 font-medium text-white transition-colors"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}