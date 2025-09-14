"use client";

import { useState } from "react";

type QA = { q: string; a: string };

const faqs: QA[] = [
  {
    q: "How do I place an order?",
    a: "Browse products, add items to your cart, and proceed to checkout. Fill in delivery details, choose a payment method, and confirm. You’ll receive an order number and email/SMS confirmation.",
  },
  {
    q: "Do I need an account to place an order?",
    a: "No, guest checkout is supported. Creating an account lets you track orders, view history, and checkout faster next time.",
  },
  {
    q: "What shipping methods are available?",
    a: "We deliver island-wide via trusted couriers. Express/priority options may appear at checkout depending on your address.",
  },
  {
    q: "How long will delivery take?",
    a: "Colombo/Greater Colombo: 1–3 working days. Other districts: 2–5 working days. Pre-orders ship on/after the indicated date.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Cash on Delivery (selected areas), bank transfer, and card payments where available. Payment options are shown at checkout.",
  },
  {
    q: "Can I cancel or change my order?",
    a: "If your order hasn’t shipped, contact us as soon as possible and we’ll try our best to help. Shipped orders can be handled via our returns policy.",
  },
  {
    q: "What is your return/warranty policy?",
    a: "Most items include a limited warranty from the brand or distributor. Defects are handled per our Returns & Warranty Policy. Physical or liquid damage is not covered.",
  },
  {
    q: "Are products genuine?",
    a: "Yes. We source from official brands and authorized distributors. Product pages list what’s included and any regional notes.",
  },
  {
    q: "Do you offer bulk or corporate pricing?",
    a: "Yes—message us with your list and quantities and we’ll send you a quote and lead times.",
  },
];

/** Fixed-size chevron so global SVG styles can’t blow it up */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className={`text-slate-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Item({
  qa,
  index,
  open,
  onToggle,
}: {
  qa: QA;
  index: number;
  open: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)]">
      {/* Header row: text left (not clickable), arrow button right (toggles) */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-medium text-slate-100">{qa.q}</span>

        <button
          type="button"
          aria-label={open ? "Hide answer" : "Show answer"}
          aria-expanded={open}
          aria-controls={`faq-panel-${index}`}
          onClick={() => onToggle(index)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/60 hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        >
          <Chevron open={open} />
        </button>
      </div>

      {/* Panel: smooth, clean; hidden by default. 
         Using max-height animation to avoid Tailwind purge issues. */}
      <div
        id={`faq-panel-${index}`}
        className="px-4 pb-3 text-slate-300 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{
          maxHeight: open ? 500 : 0, // plenty for typical answers; bump if you write very long ones
          opacity: open ? 1 : 0.0,
        }}
      >
        <p className="pt-1 text-sm leading-relaxed">{qa.a}</p>
      </div>
    </div>
  );
}

export default function FaqClient() {
  // Multiple open at once (each arrow controls its own panel)
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set([0]));

  const toggle = (idx: number) => {
    setOpenSet((cur) => {
      const next = new Set(cur);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {faqs.map((qa, i) => (
        <Item key={qa.q} qa={qa} index={i} open={openSet.has(i)} onToggle={toggle} />
      ))}
    </div>
  );
}