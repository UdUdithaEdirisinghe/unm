export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Shipping & Delivery • Manny.lk" };

export default function ShippingPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Shipping &amp; Delivery Policy</h1>
      <p className="mt-1 text-sm text-white/60">Last updated: October 2, 2025</p>

      <div className="prose prose-invert mt-6 max-w-none space-y-6">
        <p>
          At Manny.lk, we make every effort to deliver orders promptly. Delivery timelines
          are estimates and may vary due to external factors.
        </p>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Order Delivery</h2>
          <ul>
            <li>We aim to dispatch and deliver orders as quickly as possible.</li>
            <li>
              Delivery timeframes are <strong>estimates only</strong> and may be affected by
              courier operations or external conditions.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Shipping Charges</h2>
          <ul>
            <li>Shipping charges are applied at checkout.</li>
            <li>
              Shipping charges are <strong>non-refundable</strong>, except where a return is due
              to our mistake (e.g., wrong item sent, defective product).
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Damaged or Incorrect Items on Arrival</h2>
          <ul>
            <li>
              If your order arrives defective or incorrect due to our error, please contact us{" "}
              <strong>immediately</strong>.
            </li>
            <li>We will arrange a replacement or refund at no extra cost to you.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
