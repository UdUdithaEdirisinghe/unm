import ContactForm from "./ContactForm";

const brand = process.env.SITE_NAME || "Manny.lk";
const contactEmail = process.env.MAIL_TO_CONTACT || "info@manny.lk";
const wa = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
const waHref = wa ? `https://wa.me/${wa}` : null;

export const metadata = {
  title: `Contact — ${brand}`,
  description:
    "Questions about products or an existing order? Reach out — we’re happy to help.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Contact us
        </h1>
        <p className="mt-2 text-slate-600">
          We usually reply within a few hours during business days.
        </p>
      </div>

      {/* Quick options */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">Email</div>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-1 inline-block text-slate-600 hover:text-slate-900"
          >
            {contactEmail}
          </a>
          <p className="mt-2 text-xs text-slate-500">
            Best for product questions and order help.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">WhatsApp</div>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-slate-600 hover:text-slate-900"
            >
              {`+${wa}`}
            </a>
          ) : (
            <div className="mt-1 text-slate-600">Available on request</div>
          )}
          <p className="mt-2 text-xs text-slate-500">Quickest for simple queries.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">Hours</div>
          <div className="mt-1 text-slate-600">Mon–Sat, 9:00–18:00</div>
          <p className="mt-2 text-xs text-slate-500">Colombo time (GMT+5:30).</p>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium text-slate-900">Send us a message</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fill in the form and we’ll get back to you by email.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        {/* Side info (keeps layout consistent with other pages) */}
        <aside className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-900">Helpful links</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="/faq" className="text-slate-600 hover:text-slate-900">
                FAQs
              </a>
            </li>
            <li>
              <a href="/policies" className="text-slate-600 hover:text-slate-900">
                Shipping & returns
              </a>
            </li>
            <li>
              <a href="/products" className="text-slate-600 hover:text-slate-900">
                Browse products
              </a>
            </li>
          </ul>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            Prefer email? Write to{" "}
            <a href={`mailto:${contactEmail}`} className="underline underline-offset-2">
              {contactEmail}
            </a>{" "}
            and include your order ID if you have one.
          </div>
        </aside>
      </div>
    </div>
  );
}