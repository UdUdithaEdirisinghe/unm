"use client";

import { useState } from "react";

type QA = { q: string; a: string };

const faqs: QA[] = [
  {
    q: "How do I place an order?",
    a: `To place an order:

Add items to your cart – Browse and select the products you want.

Proceed to checkout – Review your cart and click “Checkout.”

Enter delivery details – Provide your shipping address and contact info.

Choose a payment method – Select your preferred payment option.

Place your order – Confirm everything and submit your order.

Prefer messaging? You can also place orders via WhatsApp for added convenience.`,
  },
  {
    q: "Do I need an account to place an order?",
    a: `No account needed. All orders are placed as a guest, and we don’t store customer accounts. You’ll receive order confirmations and updates via the email or phone number you provide at checkout.`,
  },
  {
    q: "What payment methods do you accept?",
    a: `We currently accept the following payment options:

Cash on Delivery – Available island-wide with no extra fee.

Bank Transfer – Bank details and a slip upload option are provided at checkout.

Card Payments – A secure card payment gateway is coming soon.`,
  },
  {
    q: "What shipping methods are available?",
    a: `We offer island-wide courier delivery via Koombiyo.

Flat rate: LKR 400 anywhere in Sri Lanka

Delivery time: Typically 1–3 working days.`,
  },
  {
    q: "What is your return policy?",
    a: `If your order arrives defective or incorrect, we’ll offer a free replacement or refund.

If you’d like to exchange a product, you can do so within 7 days, provided it’s in its original condition. Return shipping costs are covered by you, and refunds are issued as store credit.

Please note: Some items are non-returnable. Details are provided at checkout or on the product page.`,
  },
  {
    q: "Do your products have a warranty?",
    a: `Yes. Warranty details—such as 6 months, 1 year, or checking warranty—are clearly listed on each product page.

Warranties cover manufacturing defects only. They do not cover:

• Physical or water damage  
• Unauthorized repairs  
• Misuse or mishandling`,
  },
  {
    q: "How can I contact support?",
    a: `We’re here to help—reach us in the way that’s most convenient for you:

Call: +94 76 070 3523

Email: info@manny.lk

WhatsApp: Message us directly for quick assistance

Contact Page: You can also reach us via the Contact page on our website`,
  },
];

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
    <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        onClick={() => onToggle(index)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-medium text-slate-100">{qa.q}</span>
        {/* chevron */}
        <svg
          className={`h-5 w-5 shrink-0 text-slate-300 transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* panel */}
      <div
        id={`faq-panel-${index}`}
        className={`px-4 pb-3 text-slate-300 transition-[grid-template-rows] ${
          open ? "grid grid-rows-[1fr]" : "grid grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden whitespace-pre-wrap">
          <p className="pt-1">{qa.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FaqClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((qa, i) => (
        <Item
          key={qa.q}
          qa={qa}
          index={i}
          open={openIndex === i}
          onToggle={(idx) =>
            setOpenIndex((cur) => (cur === idx ? null : idx))
          }
        />
      ))}
    </div>
  );
}
