"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-[rgba(10,15,28,0.85)] backdrop-blur mt-12">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col items-center text-center">
        {/* Centered logo */}
        <Link href="/" className="flex items-center justify-center">
          <img
            src="/logo/manny-logo.png"
            alt="Manny.lk"
            className="h-10 w-auto"
          />
        </Link>

        {/* Copyright */}
        <p className="mt-4 text-sm text-slate-400">
          © {new Date().getFullYear()} Manny.lk. All rights reserved.
        </p>
      </div>
    </footer>
  );
}