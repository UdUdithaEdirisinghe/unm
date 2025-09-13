// src/app/faq/page.tsx
import Link from "next/link";

/** Cache safely but allow easy updates once a day */
export const dynamic = "force-static";
export const revalidate = 60 * 60 * 24; // 24h

export const metadata = {
  title: "FAQs • Manny.lk",
  description:
    "Answers to common questions about ordering, shipping, payments, delivery times, returns, warranty, and support at Manny.lk.",
};

/** No client JS needed — <details> gives us an accessible accordion. */
type QA = { q: string; a: React.ReactNode };

const faqs: QA[] = [
  {
    q: "How do I place an order?",
    a: (
      <>
        Add your item(s) to cart and proceed to checkout. Enter your shipping
        details, choose a payment method, and confirm the order. You’ll receive
        an email/SMS with your order ID immediately.
      </>
    ),
  },
  {
    q: "Do I need an account to place an order?",
    a: (
      <>
        No — guest checkout is supported. Creating an account lets you view
        order history, track statuses, and save addresses for faster checkout.
      </>
    ),
  },
  {
    q: "What payment methods are available?",
    a: (
      <>
        We currently support <strong>Cash on Delivery (COD)</strong> and{" "}
        <strong>Bank Transfer</strong>. For bank transfer, upload the slip at
        checkout or share it with your order ID via{" "}
        <Link href="/contact" className="text-brand-accent hover:underline">
          Contact
        </Link>
        .
      </>
    ),
  },
  {
    q: "What shipping methods are available?",
    a: (
      <>
        We ship across Sri Lanka via trusted couriers. Standard shipping is
        applied at checkout. Free shipping may apply during promotions or with
        specific promo codes.
      </>
    ),
  },
  {
    q: "How long will it take to get my package?",
    a: (
      <>
        Orders are typically processed within <strong>24–48 hours</strong>.
        Delivery time is usually <strong>2–5 business days</strong> depending on
        your location and courier load. You’ll be notified once your order is
        shipped.
      </>
    ),
  },
  {
    q: "Can I track my order?",
    a: (
      <>
        Yes. After dispatch, we’ll email/SMS your tracking reference. You can
        also check the status from the{" "}
        <Link href="/admin" className="text-brand-accent hover:underline">
          admin panel
        </Link>{" "}
        (for store staff) or by contacting us with your order ID.
      </>
    ),
  },
  {
    q: "What is your return & refund policy?",
    a: (
      <>
        Unopened/unused items can be returned within{" "}
        <strong>7 days</strong> of delivery. For DOA/defects, we will repair,
        replace, or refund as per inspection. Please read our full policy at{" "}
        <Link href="/policies" className="text-brand-accent hover:underline">
          Policies
        </Link>
        .
      </>
    ),
  },
  {
    q: "Do products come with warranty?",
    a: (
      <>
        Yes. Most items carry a <strong>manufacturer or store warranty</strong>.
        Warranty duration depends on brand and product category (see product
        page). Keep your order ID and any provided warranty card/slip.
      </>
    ),
  },
  {
    q: "Do you offer bulk or corporate orders?",
    a: (
      <>
        Absolutely. For quotations and availability, please reach out via{" "}
        <Link href="/contact" className="text-brand-accent hover:underline">
          Contact
        </Link>{" "}
        with product links and quantities.
      </>
    ),
  },
  {
    q: "Can I change or cancel my order?",
    a: (
      <>
        If the order hasn’t shipped, we can modify or cancel it. Contact us ASAP
        with your order ID. Shipped orders can’t be cancelled, but you may be
        eligible for a return per policy.
      </>
    ),
  },
  {
    q: "Do you have physical pickup?",
    a: (
      <>
        Limited pickup may be available on request. Please message us on{" "}
        <Link
          href="/contact"
          className="text-brand-accent hover:underline"
        >
          Contact
        </Link>{" "}
        to confirm before placing your order.
      </>
    ),
  },
  {
    q: "The price dropped after I ordered — can I get the lower price?",
    a: (
      <>
        Promotions are time-bound. If your order is within an active promo
        window and not yet shipped, contact us and we’ll try to help.
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-4 py-8 sm:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-slate-300 max-w-2xl">
          Quick answers about ordering, shipping, payments, returns, and
          warranty. Need something else?{" "}
          <Link href="/contact" className="text-brand-accent hover:underline">
            Contact us
          </Link>
          .
        </p>
      </header>

      {/* FAQ list */}
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 sm:p-6">
        <ul className="divide-y divide-slate-800/60">
          {faqs.map((item, idx) => (
            <li key={idx} className="py-3 sm:py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-white">
                    {item.q}
                  </h2>
                  <span
                    aria-hidden
                    className="shrink-0 rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200 transition-transform group-open:rotate-180"
                  >
                    ▼
                  </span>
                </summary>

                <div className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
                  {item.a}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Still need help?</h3>
            <p className="text-slate-300">
              We reply quickly on WhatsApp and email. Share your order ID if you
              have one.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/contact" className="btn-primary">
              Contact Support
            </Link>
            <Link href="/policies" className="btn-secondary">
              Read Policies
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}