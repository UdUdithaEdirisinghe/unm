// src/app/contact/page.tsx
import ContactForm from "./ContactForm";

const brand = process.env.SITE_NAME || "Manny.lk";
const contactEmail = process.env.MAIL_TO_CONTACT || "info@manny.lk";
// plain digits, no hyphens/spaces
const waRaw = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");

export const metadata = { title: `Contact | ${brand}` };

export default function ContactPage() {
  return (
    <div className="site-container py-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Contact Us</h1>
        <p className="mt-2 text-slate-400">
          Can’t find what you’re looking for? Send us a message and we’ll get back within 24 hours.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: info cards */}
        <section className="space-y-6">
          <div className="panel p-5 h-full">
            <h2 className="text-slate-200 font-medium">Call Us</h2>
            <div className="mt-2 text-slate-300">
              {waRaw ? (
                <>
                  {/* click-to-call, no underline */}
                  <a
                    href={`tel:+${waRaw}`}
                    className="no-underline hover:opacity-90"
                  >
                    +{waRaw}
                  </a>
                  <div className="text-slate-500 text-sm mt-1">WhatsApp available</div>
                </>
              ) : (
                <div className="text-slate-400">WhatsApp / phone number coming soon.</div>
              )}
            </div>
          </div>

          <div className="panel p-5 h-full">
            <h2 className="text-slate-200 font-medium">Write to Us</h2>
            <p className="mt-2 text-slate-400">
              Fill out our form and we will contact you within 24 hours.
            </p>
            <div className="mt-3">
              {/* no underline, brand color handled by your theme */}
              <a href={`mailto:${contactEmail}`} className="no-underline hover:opacity-90 text-indigo-400">
                {contactEmail}
              </a>
            </div>
          </div>
        </section>

        {/* Right: form */}
        <section className="panel p-5 h-full">
          <h2 className="text-lg font-semibold text-slate-100 mb-3">We’d love to hear from you</h2>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}