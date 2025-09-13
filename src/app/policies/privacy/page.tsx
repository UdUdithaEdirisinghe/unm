export const metadata = { title: "Shipping & Delivery | Manny.lk" };

export default function ShippingPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white mb-4">Shipping & Delivery Policy</h1>
      <div className="space-y-4 text-slate-300">
        <p>We deliver island-wide via trusted couriers. Orders are processed within <b>1–2 business days</b>.</p>
        <ul className="list-disc pl-6">
          <li>Delivery time: typically 2–5 business days depending on location.</li>
          <li>Fees are shown at checkout; Cash-on-Delivery is not available.</li>
          <li>We’ll notify you if an item is out of stock or needs extra time.</li>
        </ul>
        <p>For address changes after ordering, contact us ASAP with your order ID.</p>
      </div>
    </section>
  );
}