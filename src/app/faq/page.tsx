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
          "Browse products, add items to your cart, then proceed to checkout to confirm delivery details and payment. You’ll get an email and an order number once it’s placed.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need an account to place an order?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "No. You can checkout as a guest. Creating an account lets you track orders and speeds up future checkouts.",
      },
    },
    {
      "@type": "Question",
      name: "What shipping methods are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "We offer island-wide courier delivery. Express options may be available at checkout depending on your address.",
      },
    },
  ],
};

export default function FaqPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-white">Frequently Asked Questions</h1>
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