"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SearchBarProps = {
initial?: string;
placeholder?: string;
className?: string;
};

export default function SearchBar({
initial = "",
placeholder = "Search products…",
className = "",
}: SearchBarProps) {
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
className={`flex gap-2 w-full ${className}`}
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
