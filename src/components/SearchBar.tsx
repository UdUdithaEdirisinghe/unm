"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SearchBar({
  initial = "",
  placeholder = "Search products…",
  className = "",
}: {
  initial?: string;
  placeholder?: string;
  className?: string; // ✅ allow passing className
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex gap-2 w-full ${className}`} // ✅ merges parent classes
    >
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