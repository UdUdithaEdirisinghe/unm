import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Contact us</h1>
      <p className="text-slate-600 mb-8">
        Have a question about a product or order? Send us a message and we’ll get back to you.
      </p>
      <ContactForm />
    </div>
  );
}