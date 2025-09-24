// src/app/contact/page.tsx
import ContactForm from "./ContactForm";

const brand = process.env.SITE_NAME || "Manny.lk";
const contactEmail = process.env.MAIL_TO_CONTACT || "info@manny.lk";
const wa = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
const waHuman = wa
  ? `+${wa.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, "$1 $2 $3 $4").trim()}`
  : null;
const waHref = wa ? `https://wa.me/${wa}` : null;

export const metadata = {
  title: `Contact | ${brand}`,
};

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100">Contact Us</h1>
      <p className="mt-2 text-slate-400">
        Can’t find what you’re looking for? Send us a message and we’ll get back within 24 hours.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: contact info */}
        <div className="space-y-8">
          <section>
            <h2 className="text-slate-200 font-medium">Call Us</h2>
            <div className="mt-2 text-slate-400">
              {waHuman ? (
                <>
                  <div>{waHuman}</div>
                  {waHref && (
                    <div>
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline"
                      >
                        {waHuman} (WhatsApp)
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div>WhatsApp / Phone number coming soon.</div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-slate-200 font-medium">Write to Us</h2>
            <p className="mt-2 text-slate-400">
              Fill out our form and we’ll contact you within 24 hours.
            </p>
            <div className="mt-2">
              <a
                href={`mailto:${contactEmail}`}
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Email: {contactEmail}
              </a>
            </div>
          </section>
        </div>

        {/* Right: form */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-5">
          <h2 className="text-lg font-medium text-slate-100 mb-4">
            We Would Love to Hear From You
          </h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}