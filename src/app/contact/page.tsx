// src/app/contact/page.tsx
import ContactForm from "./ContactForm";

const brand = process.env.SITE_NAME || "Manny.lk";
const contactEmail = process.env.MAIL_TO_CONTACT || "info@manny.lk";

// plain, unformatted digits for display (you asked: no hyphen/spaces)
const waRaw = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");

export const metadata = { title: `Contact | ${brand}` };

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100">Contact Us</h1>
        <p className="mt-2 text-slate-400">
          Can’t find what you’re looking for? Send us a message and we’ll get back within 24 hours.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: contact info */}
        <section className="space-y-8">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-slate-200 font-medium">Call Us</h2>
            <div className="mt-2 text-slate-400">
              {waRaw ? (
                <>
                  <div className="text-slate-300">{`+${waRaw}`}</div>
                  <div className="text-slate-500 text-sm">(WhatsApp available)</div>
                </>
              ) : (
                <div>WhatsApp / phone number coming soon.</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-slate-200 font-medium">Write to Us</h2>
            <p className="mt-2 text-slate-400">
              Fill out our form and we’ll contact you within 24 hours.
            </p>
            <div className="mt-3">
              <a
                href={`mailto:${contactEmail}`}
                // no underline, keeps your brand color; add hover opacity only
                className="text-indigo-400 no-underline hover:opacity-90"
              >
                {contactEmail}
              </a>
            </div>
          </div>
        </section>

        {/* Right: form */}
        <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-5">
          <h2 className="text-lg font-medium text-slate-100 mb-4">
            We Would Love to Hear From You
          </h2>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}