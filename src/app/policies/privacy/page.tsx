export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Privacy Policy • Manny.lk" };

export default function PrivacyPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Privacy Policy</h1>
      <div className="prose prose-invert mt-4 max-w-none">
        <p>
          We collect only what we need to process your orders and improve our services:
          contact details, addresses, and order history. We never sell your data.
        </p>
        <h3>Data Use</h3>
        <ul>
          <li>Fulfil orders, payments, and delivery.</li>
          <li>Provide support and service updates.</li>
          <li>Fraud prevention and analytics.</li>
        </ul>
        <h3>Security</h3>
        <p>
          We use modern security practices and reputable payment processors. You can request
          a copy or deletion of your personal data by contacting us.
        </p>
      </div>
    </section>
  );
}