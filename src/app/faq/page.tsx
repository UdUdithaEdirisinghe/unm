export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "FAQs • Manny.lk",
  description:
    "Common questions about ordering, shipping, payments, returns, warranty and support at Manny.lk.",
};

import FaqClient from "./FaqClient";

/** JSON-LD for rich FAQ results (only top Qs to keep payload small) */
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I place an order?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
`To place an order:

Add items to your cart – Browse and select the products you want.

Proceed to checkout – Review your cart and click “Checkout.”

Enter delivery details – Provide your shipping address and contact info.

Choose a payment method – Select your preferred payment option.

Place your order – Confirm everything and submit your order.

Prefer messaging? You can also place orders via WhatsApp for added convenience.`,
      },
    },
    {
      "@type": "Question",
      name: "Do I need an account to place an order?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
`No account needed. All orders are placed as a guest, and we don’t store customer accounts. You’ll receive order confirmations and updates via the email or phone number you provide at checkout.`,
      },
    },
    {
      "@type": "Question",
      name: "What shipping methods are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
`We offer island-wide courier delivery via Koombiyo.

Flat rate: LKR 400 anywhere in Sri Lanka

Delivery time: Typically 1–3 working days.

Cash on Delivery – Available island-wide with no extra fee.

Bank Transfer – Bank details and a slip upload option are provided at checkout.

Card Payments – A secure card payment gateway is coming soon.`,
      },
    },
  ],
};

export default function FaqPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-white">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 mb-6 text-slate-300">
          Can’t find what you’re looking for?{" "}
          <a href="/contact" className="text-brand-accent hover:underline">
            Contact us
          </a>{" "}
          or tap the WhatsApp bubble.
        </p>

        {/* Client accordion */}
        <FaqClient />
      </section>

      {/* SEO: FAQ JSON-LD */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  );
}
