"use client";

import { useState } from "react";

type QA = { q: string; a: string };

const faqs: QA[] = [
  { q: "How do I place an order?", a: "Browse products, add items to your cart, and proceed to checkout. Fill in delivery details, choose a payment method, and confirm. You’ll receive an order number and email/SMS confirmation." },
  { q: "Do I need an account to place an order?", a: "No, guest checkout is supported. Creating an account lets you track orders, view history, and checkout faster next time." },
  { q: "What shipping methods are available?", a: "We deliver island-wide via trusted couriers. Express/priority options may appear at checkout depending on your address." },
  { q: "How long will delivery take?", a: "Colombo/Greater Colombo: 1–3 working days. Other districts: 2–5 working days. Pre-orders ship on/after the indicated date." },
  { q: "What payment methods do you accept?", a: "Cash on Delivery (selected areas), bank transfer, and card payments where available. Payment options are shown at checkout." },
  { q: "Can I cancel or change my order?", a: "If your order hasn’t shipped, contact us as soon as possible and we’ll try our best to help. Shipped orders can be handled via our returns policy." },
  { q: "What is your return/warranty policy?", a: "Most items include a limited warranty from the brand or distributor. Defects are handled per our Returns & Warranty Policy. Physical or liquid damage is not covered." },
  { q: "Are products genuine?", a: "Yes. We source from official brands and authorized distributors. Product pages list what’s included and any regional notes." },
  { q: "Do you offer bulk or corporate pricing?", a: "Yes—message us with your list and quantities and we’ll send you a quote and lead times." },
];

/** Chevron/plus style arrow */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      className={`text-slate-300 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
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
    <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] px-4 py-4">
      <button
        type="button"
        aria-label={open ? "Hide answer" : "Show answer"}
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        onClick={() => onToggle(index)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium text-slate-100">{qa.q}</span>
        <Chevron open={open} />
      </button>

      <div
        id={`faq-panel-${index}`}
        className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${
          open ? "opacity-100" : "opacity-0"
        }`}
        style={{ maxHeight: open ? 500 : 0 }}
      >
        <p className="pt-2 text-sm text-slate-300 leading-relaxed">{qa.a}</p>
      </div>
    </div>
  );
}

export default function FaqClient() {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setOpenSet((cur) => {
      const next = new Set(cur);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {faqs.map((qa, i) => (
        <Item key={qa.q} qa={qa} index={i} open={openSet.has(i)} onToggle={toggle} />
      ))}
    </div>
  );
}