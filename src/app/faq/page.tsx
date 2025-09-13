import Link from "next/link";

export const dynamic = "force-static";
export const revalidate = 60 * 60 * 24; // re-gen daily

export const metadata = {
  title: "FAQs • Manny.lk",
  description:
    "Answers to common questions about ordering, shipping, payments, returns, warranty and support at Manny.lk.",
};

type Faq = { q: string; a: React.ReactNode };

const faqs: Faq[] = [
  {
    q: "How do I place an order?",
    a: (
      <>
        Browse products, pick the item and quantity, then click <b>Add to Cart</b>.
        Go to your cart and press <b>Checkout</b>. Fill the delivery details,
        choose a payment method (Cash on Delivery or Bank Transfer), and confirm.
        We’ll email your order confirmation immediately.
      </>
    ),
  },
  {
    q: "What payment methods are available?",
    a: (
      <>
        We currently accept <b>Cash on Delivery (COD)</b> and <b>Direct Bank Transfer</b>.
        If you choose bank transfer, please upload your payment slip on the order
        confirmation page or send it to us with your Order ID.
      </>
    ),
  },
  {
    q: "What shipping methods are available?",
    a: (
      <>
        Island-wide courier delivery. Standard delivery is used for most areas; a
        doorstep service is provided where available. Pickup is not guaranteed but
        can be arranged for certain items—<Link href="/contact" className="text-brand-accent hover:underline">contact us</Link> first.
      </>
    ),
  },
  {
    q: "How long will it take to get my package?",
    a: (
      <>
        Orders are usually dispatched within <b>24–48 hours</b> on business days.
        Delivery typically takes <b>1–5 working days</b> depending on your location
        and courier schedules. Pre-order items will show an estimated ship date on
        the product page.
      </>
    ),
  },
  {
    q: "How much is the shipping fee?",
    a: (
      <>
        Shipping is calculated at checkout based on destination and parcel size.
        We also run free-shipping promos occasionally—apply the code at checkout if available.
      </>
    ),
  },
  {
    q: "Can I track my order?",
    a: (
      <>
        Yes. You’ll receive an email/SMS with your tracking ID once your order is
        handed to the courier. You can also check your order status on the{" "}
        <Link href="/orders" className="text-brand-accent hover:underline">Orders</Link> page (if signed in).
      </>
    ),
  },
  {
    q: "Can I change or cancel my order?",
    a: (
      <>
        If your order hasn’t shipped, we can help. Reach us ASAP with your Order ID via{" "}
        <Link href="/contact" className="text-brand-accent hover:underline">Contact</Link>{" "}
        or WhatsApp (green bubble on the site). Once shipped, changes/cancellations
        aren’t guaranteed.
      </>
    ),
  },
  {
    q: "What is your return & refund policy?",
    a: (
      <>
        We accept returns for unused items in original packaging within{" "}
        <b>7 days</b> of delivery (some categories excluded for hygiene/safety).
        Faulty on arrival? We’ll repair/replace according to warranty. See{" "}
        <Link href="/policies" className="text-brand-accent hover:underline">Policies</Link> for details.
      </>
    ),
  },
  {
    q: "Do products come with a warranty?",
    a: (
      <>
        Yes—most items include a <b>manufacturer or store warranty</b>. Warranty
        length is listed on the product page. Keep your invoice/Order ID.
      </>
    ),
  },
  {
    q: "The item I want is out of stock. What can I do?",
    a: (
      <>
        Message us via WhatsApp—we can
        tell you the next restock date or suggest alternatives.
      </>
    ),
  },
  {
    q: "Do you offer bulk or corporate pricing?",
    a: (
      <>
        Yes. Email us your requirements or{" "}
        <Link href="/contact" className="text-brand-accent hover:underline">contact us</Link>{" "}
        for a quotation.
      </>
    ),
  },
  {
    q: "How do promo codes work?",
    a: (
      <>
        Enter your code on the checkout page. Valid codes apply automatically.
        Some codes exclude specific brands/categories or require a minimum spend.
      </>
    ),
  },
  {
    q: "Is my personal data safe?",
    a: (
      <>
        Yes. We only collect what’s needed to fulfill your order, and we never sell
        your data. Read our{" "}
        <Link href="/policies" className="text-brand-accent hover:underline">Privacy Policy</Link>.
      </>
    ),
  },
];

function jsonLd() {
  // schema.org FAQPage markup (limit to 12 Q&As for brevity)
  const nodes = faqs.slice(0, 12).map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text:
        typeof f.a === "string"
          ? f.a
          : // basic fallback: strip JSX to text-ish string
            String((f as any).a?.props?.children ?? "").toString(),
    },
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: nodes,
  });
}

export default function FaqPage() {
  return (
    <div className="space-y-8">
      {/* SEO JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd() }} />

      {/* Header */}
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-4 py-8 sm:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Quick answers about ordering, delivery, payments, warranty and returns.
          Can’t find what you need?{" "}
          <Link href="/contact" className="text-brand-accent hover:underline">
            Contact us
          </Link>
          .
        </p>
      </section>

      {/* FAQ list */}
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 sm:p-6">
        <div className="space-y-3">
          {faqs.map((item, i) => (
            <details
              key={i}
              className="group rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4"
            >
              <summary className="cursor-pointer select-none list-none font-semibold text-white leading-6">
                <span className="align-middle">{item.q}</span>
                <span className="float-right text-slate-400 transition-transform group-open:rotate-90">
                  →
                </span>
              </summary>
              <div className="mt-3 text-slate-300 leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/products" className="btn-secondary">
            Browse Products
          </Link>
          <Link href="/policies" className="btn-ghost">
            Read Policies
          </Link>
          <Link href="/contact" className="btn-primary">
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}