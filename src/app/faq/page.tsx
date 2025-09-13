// src/app/faq/page.tsx
import Link from "next/link";

export const dynamic = "force-static";             // ✅ allowed in App Router
export const revalidate = 60 * 60 * 24;            // ✅ 24h ISR
export const metadata = {
  title: "FAQs • Manny.lk",
  description:
    "Answers to common questions about ordering, shipping, payments, delivery times, returns, warranty, and support at Manny.lk.",
};

type QA = { q: string; a: React.ReactNode };

const faqs: QA[] = [
  { q: "How do I place an order?", a: <>Add items to your cart, head to checkout, and confirm. You’ll receive an order ID by email/SMS.</> },
  { q: "Do I need an account to order?", a: <>No—guest checkout works. Creating an account helps track orders and save addresses.</> },
  { q: "What payment methods are available?", a: <>We support <strong>Cash on Delivery</strong> and <strong>Bank Transfer</strong>.</> },
  { q: "What shipping methods are available?", a: <>Island-wide courier delivery. Free shipping may apply with promos/thresholds.</> },
  { q: "How long will delivery take?", a: <>Processing 24–48h. Delivery usually 2–5 business days depending on your location.</> },
  { q: "Can I track my order?", a: <>Yes — you’ll get a tracking reference once the parcel is dispatched.</> },
  { q: "What is your return & refund policy?", a: <>Returns within 7 days for unopened/defective items. See <Link href="/policies" className="text-brand-accent hover:underline">Policies</Link> for details.</> },
  { q: "Do products have warranty?", a: <>Yes. Warranty length varies by product/brand; see the product page for specifics.</> },
  { q: "How can I contact support?", a: <>Use the <Link href="/contact" className="text-brand-accent hover:underline">Contact</Link> page or WhatsApp bubble on the site.</> },
];

export default function FAQPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-4 py-8 sm:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h1>
        <p className="mt-2 text-slate-300 max-w-2xl">
          Quick answers about orders, shipping, payments, and more. Need help?
          {" "}
          <Link href="/contact" className="text-brand-accent hover:underline">Contact us</Link>.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 sm:p-6">
        <ul className="divide-y divide-slate-800/60">
          {faqs.map((item, i) => (
            <li key={i} className="py-3 sm:py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-white">{item.q}</h2>
                  <span
                    aria-hidden
                    className="shrink-0 rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200 transition-transform group-open:rotate-180"
                  >
                    ▼
                  </span>
                </summary>
                <div className="mt-2 text-sm sm:text-base text-slate-300">{item.a}</div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}