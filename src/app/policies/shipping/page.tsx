export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Shipping & Delivery • Manny.lk" };

export default function ShippingPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Shipping &amp; Delivery Policy</h1>
      <div className="prose prose-invert mt-4 max-w-none">
        <p>We deliver island-wide via trusted courier partners.</p>
        <h3>Timeframes</h3>
        <ul>
          <li>Colombo &amp; suburbs: 1–3 working days</li>
          <li>Other districts: 2–5 working days</li>
          <li>Pre-orders: ship on/after the stated date</li>
        </ul>
        <h3>Rates</h3>
        <p>Calculated at checkout based on destination and weight. Free or discounted delivery may appear during promotions.</p>
        <h3>Notes</h3>
        <ul>
          <li>Please provide accurate address and contact details.</li>
          <li>Delays can occur due to weather or courier limitations.</li>
        </ul>
      </div>
    </section>
  );
}