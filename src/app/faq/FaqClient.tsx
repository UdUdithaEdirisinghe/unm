"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";

/** Keep content simple & safe. You can edit these Q&As anytime. */
type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: "How do I place an order?",
    a: "Browse products, add items to your cart, then proceed to checkout to confirm your delivery and payment details.",
  },
  {
    q: "Do I need an account to place an order?",
    a: "No. You can checkout as a guest. Creating an account lets you track orders and speeds up future checkouts.",
  },
  {
    q: "What shipping methods are available?",
    a: "Island-wide courier delivery. Express delivery is available in selected areas—message us on WhatsApp for options.",
  },
  {
    q: "How long will delivery take?",
    a: "Colombo: 1–3 business days. Other districts: 2–5 business days. Pre-order items ship when stock arrives.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Cash on Delivery (COD) and direct bank transfer. For bank transfer, upload the slip at checkout or on the order page.",
  },
  {
    q: "Can I cancel or change my order?",
    a: "Contact us as soon as possible. If your order hasn’t shipped yet we can modify or cancel it. If shipped, returns policy applies.",
  },
  {
    q: "What is your return/warranty policy?",
    a: "Unused items can be returned within 7 days in original packaging. Manufacturer warranty applies to eligible products—keep your invoice.",
  },
  {
    q: "Do you offer bulk or corporate orders?",
    a: "Yes. Email us or message on WhatsApp with your list and we’ll prepare a quotation and lead time.",
  },
];

function buildJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FaqClient() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <>
      {/* SEO: structured data (client OK via next/script) */}
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(FAQS)) }}
      />

      <div className="space-y-8">
        {/* Hero / header (matches your site styling) */}
        <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-4 py-8 sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-slate-300">
            Can’t find what you’re looking for?{" "}
            <Link href="/contact" className="text-brand-accent hover:underline">
              Contact us
            </Link>{" "}
            or tap the WhatsApp bubble.
          </p>
        </section>

        {/* Accordion */}
        <section className="space-y-3">
          {FAQS.map((item, i) => {
            const open = openIdx === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)]"
              >
                <h2>
                  <button
                    aria-expanded={open}
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left text-white"
                  >
                    <span className="text-base font-medium">{item.q}</span>
                    <span className="text-slate-300">
                      <Chevron open={open} />
                    </span>
                  </button>
                </h2>

                {/* simple height+opacity transition; accessible (content stays in DOM) */}
                <div
                  className={`px-4 overflow-hidden transition-[max-height,opacity] duration-200 ${
                    open ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-slate-300 leading-relaxed">{item.a}</p>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}