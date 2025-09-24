import React from "react";

// Server component wrapper keeps hydration clean.
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Contact us</h1>
      <p className="text-slate-600 mb-8">
        Have a question about a product or order? Send us a message and we’ll get back to you.
      </p>
      <ContactForm />
    </div>
  );
}

// --- client form only (avoids hydration warnings) ---
"use client";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "", // honeypot (keep hidden)
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill name, email and message.");
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
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      toast.success("Thanks! Your message was sent.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
    } catch (err: any) {
      toast.error(err?.message || "Could not send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Remove <Toaster /> if you already have one globally; harmless if duplicated */}
      <Toaster position="top-right" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name *</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email *</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Subject</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Message *</label>
        <textarea
          className="mt-1 w-full min-h-[140px] rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
      </div>

      {/* Honeypot: keep hidden */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        className="hidden"
        aria-hidden="true"
      />

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}

