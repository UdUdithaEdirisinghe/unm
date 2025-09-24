// src/app/contact/page.tsx
import Link from "next/link";
import ContactForm from "./ContactForm";

export const dynamic = "force-static";

export const metadata = {
  title: "Contact",
};

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_PHONE
  ? `https://wa.me/${String(process.env.NEXT_PUBLIC_WHATSAPP_PHONE).replace(/[^\d]/g, "")}`
  : null;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Contact us</h1>
      <p className="text-sm text-slate-400 mb-8">
        Questions, feedback, or a quick hello—drop us a message. We’ll get back as soon as possible.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info card */}
        <div className="md:col-span-1 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-slate-300 font-medium">Email</div>
              <Link
                href={`mailto:${process.env.MAIL_TO_CONTACT || "info@manny.lk"}`}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {process.env.MAIL_TO_CONTACT || "info@manny.lk"}
              </Link>
            </div>

            <div>
              <div className="text-slate-300 font-medium">WhatsApp</div>
              {WHATSAPP ? (
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-md border border-slate-700 px-3 py-1.5 mt-1 text-slate-200 hover:bg-slate-800"
                >
                  Chat on WhatsApp
                </a>
              ) : (
                <div className="text-slate-400">Available via the green bubble</div>
              )}
            </div>

            <div>
              <div className="text-slate-300 font-medium">Hours</div>
              <div className="text-slate-400">Mon–Fri, 9:00–18:00</div>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="md:col-span-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}