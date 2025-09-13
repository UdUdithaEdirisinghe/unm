"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "FAQs • Manny.lk",
  description:
    "Common questions about ordering, shipping, payments, returns, warranty and support at Manny.lk.",
};

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: "How do I place an order?",
    a: "Browse products, add items to your cart, then go to the Cart page and proceed to Checkout. Fill in your details, choose a payment method (Cash on Delivery or direct bank transfer), and confirm the order.",
  },
  {
    q: "Do I need an account to place an order?",
    a: "No. You can checkout as a guest. Creating an account helps you track orders and speeds up future checkout, but it isn’t required.",
  },
  {
    q: "What shipping methods are available?",
    a: "We ship island-wide via trusted couriers. Standard shipping is offered by default; express/priority is available in selected areas. Shipping fees are shown at checkout, and some promos may include free shipping.",
  },
  {
    q: "How long will delivery take?",
    a: "Colombo and suburbs typically deliver in 1–3 business days; other districts usually 2–5 business days. Pre-order or back-order items will ship once stock arrives (we’ll notify you).",
  },
  {
    q: "What payment methods do you accept?",
    a: "We currently support Cash on Delivery (COD) and direct bank transfer. For bank transfers, please upload a clear bank slip at checkout or send it to us with your order ID.",
  },
  {
    q: "How do I use a promo code?",
    a: "Enter the promo code on the Cart or Checkout page. If the code is valid and active, the discount will be applied automatically before you place the order.",
  },
  {
    q: "Can I cancel or change my order?",
    a: "Contact us as soon as possible. If the order hasn’t shipped yet, we’ll do our best to modify or cancel it. Once shipped, standard return policies apply.",
  },
  {
    q: "What is your return policy?",
    a: "Unused items in original packaging can be returned within 7 days of delivery unless stated otherwise on the product page. For defective items, contact us immediately so we can arrange a replacement or warranty claim.",
  },
  {
    q: "Is there a warranty?",
    a: "Most products include a manufacturer or shop warranty. The warranty period and coverage may vary by brand and item. Keep your order confirmation (and bank slip if paid by transfer).",
  },
  {
    q: "My item arrived damaged or is faulty. What should I do?",
    a: "Please report it within 48 hours of delivery with photos/video and your order ID. We’ll guide you through a replacement or warranty process right away.",
  },
  {
    q: "Do you offer bulk or corporate orders?",
    a: "Yes. Reach out via our Contact page with your requirements or message us on WhatsApp. We’ll prepare a tailored quote and lead times.",
  },
  {
    q: "How can I reach support?",
    a: "Use the WhatsApp button on the site, the Contact page, or email us. We usually respond within business hours on the same day.",
  },
];

/** Build JSON-LD from the same FAQ list (for Google rich results) */
function buildJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
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
      className={`transition-transform duration-200 ${
        open ? "rotate-180" : "rotate-0"
      }`}
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

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0); // first one open by default

  return (
    <>
      {/* JSON-LD (SEO). Using next/script avoids hydration issues. */}
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(FAQS)),
        }}
      />

      <div className="space-y-8">
        {/* Header */}
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
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-button-${i}`;
            return (
              <div
                key={i}
                className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)]"
              >
                <h2>
                  <button
                    id={btnId}
                    aria-controls={panelId}
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

                {/* Animated reveal without layout jump */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
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

        {/* Extra help */}
        <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
          <p className="text-slate-300">
            Still need help? Check our{" "}
            <Link href="/policies" className="text-brand-accent hover:underline">
              store policies
            </Link>{" "}
            or message us on WhatsApp — we’re happy to help.
          </p>
        </div>
      </div>
    </>
  );
}