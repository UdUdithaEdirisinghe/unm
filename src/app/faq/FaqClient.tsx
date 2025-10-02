"use client";

import { useState } from "react";

type QA = { q: string; a: string };

const faqs: QA[] = [
  {
    q: "How do I place an order?",
    a: `
      <p><strong>To place an order:</strong></p>
      <ul class="list-disc pl-5 mt-2 space-y-1">
        <li><strong>Add items to your cart</strong> – Browse and select the products you want.</li>
        <li><strong>Proceed to checkout</strong> – Review your cart and click “Checkout.”</li>
        <li><strong>Enter delivery details</strong> – Provide your shipping address and contact info.</li>
        <li><strong>Choose a payment method</strong> – Select your preferred payment option.</li>
        <li><strong>Place your order</strong> – Confirm everything and submit your order.</li>
      </ul>
      <p class="mt-2">Prefer messaging? You can also place orders via <strong>WhatsApp</strong> for added convenience.</p>
    `,
  },
  {
    q: "Do I need an account to place an order?",
    a: `
      <p><strong>No account needed.</strong> All orders are placed as a guest, and we don’t maintain customer accounts.</p>
      <p class="mt-2">You’ll receive order confirmations and updates via the <strong>email</strong> you provide at checkout.</p>
    `,
  },
  {
    q: "What shipping methods are available?",
    a: `
      <p>We offer island-wide courier delivery via <strong>Koombiyo</strong>.</p>
      <ul class="list-disc pl-5 mt-2 space-y-1">
        <li><strong>Flat rate:</strong> LKR 400 anywhere in Sri Lanka</li>
        <li><strong>Delivery time:</strong> Typically <strong>1–3 working days</strong></li>
      </ul>
    `,
  },
  {
    q: "What payment methods do you accept?",
    a: `
      <p>We currently accept the following payment options:</p>
      <ul class="list-disc pl-5 mt-2 space-y-1">
        <li><strong>Cash on Delivery (COD)</strong> – Island-wide with <strong>no extra fee</strong>.</li>
        <li><strong>Bank Transfer</strong> – Bank details and a <strong>slip upload</strong> option are provided at checkout.</li>
        <li><strong>Card Payments</strong> – A secure card payment gateway is <em>coming soon</em>.</li>
      </ul>
    `,
  },
  {
    q: "Can I cancel or change my order?",
    a: `
      <p>If your order hasn’t shipped, <strong>contact us as soon as possible</strong> and we’ll try our best to help.</p>
      <p class="mt-2">Shipped orders can be handled via our <strong>Returns &amp; Warranty Policy</strong>.</p>
    `,
  },
  {
    q: "What is your return/warranty policy?",
    a: `
      <p><strong>Returns (defective or incorrect items):</strong> If your order arrives defective or incorrect, we’ll offer a <strong>free replacement</strong> or <strong>refund</strong>.</p>
      <p class="mt-2"><strong>Exchanges (change of mind):</strong> You can request an exchange within <strong>7 days</strong>, provided the product is in its original condition. Return shipping is covered by you, and refunds are issued as <strong>store credit</strong>.</p>
      <p class="mt-2"><strong>Warranty:</strong> Warranty details—such as <strong>6 months</strong>, <strong>1 year</strong>, or <strong>checking warranty</strong>—are clearly listed on each product page.</p>
      <p class="mt-1">Warranties cover <strong>manufacturing defects only</strong> and do <em>not</em> cover:</p>
      <ul class="list-disc pl-5 mt-1 space-y-1">
        <li>Physical or water damage</li>
        <li>Unauthorized repairs</li>
        <li>Misuse or mishandling</li>
      </ul>
      <p class="mt-2"><em>Some items are non-returnable. Details are provided at checkout or on the product page.</em></p>
    `,
  },
 {
  q: "Are products genuine?",
  a: `
    <p>Yes. The vast majority of our products are sourced from <strong>official brands</strong> and <strong>authorized distributors</strong>.</p>
    <p class="mt-2">We also offer a very limited selection of <strong>Grade A items</strong>—high-quality alternatives that are clearly labeled on product pages.</p>
    <p class="mt-2">Each listing includes what's in the box and any relevant regional notes.</p>
  `,
  },  
  {
    q: "Do you offer bulk or corporate pricing?",
    a: `
      <p>Yes — message us with your <strong>list and quantities</strong>, and we’ll send you a quote and lead times.</p>
    `,
  },
  {
    q: "How can I contact support?",
    a: `
      <p>We’re here to help — reach us in the way that’s most convenient for you:</p>
      <ul class="list-disc pl-5 mt-2 space-y-1">
        <li><strong>Call:</strong> +94 76 070 3523</li>
        <li><strong>Email:</strong> info@manny.lk</li>
        <li><strong>WhatsApp:</strong> Message us directly for quick assistance</li>
        <li><strong>Contact Page:</strong> You can also reach us via the Contact page on our website</li>
      </ul>
    `,
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
        <div className="overflow-hidden">
          {/* Render the formatted HTML answer. Container/classes unchanged. */}
          <div className="pt-1" dangerouslySetInnerHTML={{ __html: qa.a }} />
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
