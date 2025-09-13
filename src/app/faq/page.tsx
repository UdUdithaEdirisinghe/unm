// src/app/faq/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "FAQs",
  description: "Answers to the most common questions.",
};

export default function FAQPage() {
  const faqs: { q: string; a: string }[] = [
    { q: "How do I place an order?", a: "Add items to your cart, then checkout securely with Cash on Delivery or bank transfer." },
    { q: "Do I need an account to place an order?", a: "No, guest checkout is supported. Creating an account helps you track orders and saves your details for next time." },
    { q: "What shipping methods are available?", a: "Island-wide courier delivery. Free shipping may apply during promotions." },
    { q: "How long will delivery take?", a: "Usually 2–5 business days depending on location and stock availability." },
    { q: "Can I pick up my order?", a: "Pickup may be arranged if you contact us directly before placing the order." },
    { q: "What is your return policy?", a: "7-day return for unopened items. Warranty claims follow brand guidelines." },
    { q: "How do I apply a promo code?", a: "Enter it on the checkout page. Valid codes are applied automatically." },
    { q: "How can I contact support?", a: "Use the Contact page or the WhatsApp button on the site for quick support." },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Frequently Asked Questions</h1>

      <div className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] divide-y divide-slate-800/60">
        {faqs.map((f, i) => (
          <details key={i} className="group px-4 sm:px-6 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <span className="text-white font-medium">{f.q}</span>
              {/* Arrow icon */}
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-90"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6.293 4.293a1 1 0 011.414 0L13.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </summary>
            <div className="pt-2 text-slate-300">{f.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}