// src/app/faq/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "FAQs",
  description: "Answers to the most common questions.",
};

export default function FAQPage() {
  const faqs: { q: string; a: string }[] = [
    { q: "How do I place an order?", a: "Add items to cart, then checkout. You can pay Cash on Delivery or via bank transfer." },
    { q: "Do I need an account to place an order?", a: "No. Guest checkout is supported. Creating an account helps you track orders." },
    { q: "What shipping methods are available?", a: "Island-wide courier. Free shipping may apply when we run promotions." },
    { q: "How long will delivery take?", a: "Usually 2–5 business days depending on your location and stock." },
    { q: "Can I pick up my order?", a: "Contact us first; pickup may be possible by arrangement." },
    { q: "What is your return policy?", a: "7-day return for unopened items. Warranty claims follow the brand’s policy." },
    { q: "How do I apply a promo code?", a: "Enter it on the checkout page. Valid codes are applied automatically." },
    { q: "How can I contact support?", a: "Use the Contact page or the WhatsApp button on the site." },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Frequently Asked Questions</h1>

      <div className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] divide-y divide-slate-800/60">
        {faqs.map((f, i) => (
          <details key={i} className="group px-4 sm:px-6 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <span className="text-white font-medium">{f.q}</span>
              <span className="ml-4 rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-300 group-open:hidden">Show</span>
              <span className="ml-4 rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hidden group-open:inline">Hide</span>
            </summary>
            <div className="pt-2 text-slate-300">{f.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}