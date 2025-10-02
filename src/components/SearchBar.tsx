"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

/**
 * Exact-match search bar. Keeps your existing palette & spacing.
 * Note: We intentionally keep it dumb (no fuzzy) per your request.
 */
export default function SearchBar({
  initial = "",
  placeholder = "Search power banks,earbuds, cables...",
  className = "",
}: {
  initial?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState<string>(initial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = (q || "").trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
  }

  return (
    <form onSubmit={onSubmit} className={`flex gap-2 ${className}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="input flex-1"
      />
      <button type="submit" className="btn-primary px-5">
        Search
      </button>
    </form>
  );
}