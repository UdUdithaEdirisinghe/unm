// src/app/contact/ContactForm.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      toast.error("Please fill your name, email, and message.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send your message.");
      toast.success("Thanks for reaching out! One of our team members will get back to you shortly.");
      setForm({ name: "", email: "", message: "" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send your message.");
    } finally {
      setLoading(false);
    }
  }

  // match checkout field styles (placeholders inside boxes)
  const field = "field w-full";
  const area = "textarea w-full resize-y";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* No labels—placeholders inside inputs, but keep aria-labels for a11y */}
      <input
        aria-label="Your name"
        className={field}
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
      />

      <input
        aria-label="Your email"
        className={field}
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
      />

      <textarea
        aria-label="Your message"
        className={area}
        rows={6}
        placeholder="How can we help?"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}