export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Returns & Warranty • Manny.lk" };

export default function ReturnsPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Return &amp; Warranty Policy</h1>
      <p className="mt-1 text-sm text-white/60">Last updated: October 2, 2025</p>

      <div className="prose prose-invert mt-6 max-w-none space-y-6">
        <p>
          At Manny.lk, we value our customers and aim to provide the best service possible.
          Please read this policy carefully before making a purchase.
        </p>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">
            Returns (Defective or Incorrect Items)
          </h2>
          <ul>
            <li>
              If your product arrives <strong>defective or incorrect</strong> due to our error,
              please contact us <strong>immediately</strong>.
            </li>
            <li>We will arrange a replacement or refund at no extra cost to you.</li>
          </ul>
          <h3 className="mt-4 mb-2 font-semibold">Refunds</h3>
          <ul>
            <li>Approved refunds are processed using the original method of payment.</li>
            <li>
              <strong>Cash on Delivery (COD)</strong> refunds may be provided as{" "}
              <strong>Store Credit</strong> (valid for 1 year) or via{" "}
              <strong>Bank Transfer</strong> (to an account you provide).
            </li>
            <li>
              Shipping charges are <strong>non-refundable</strong> except where the return is due
              to our mistake (e.g., wrong item sent, defective product).
            </li>
            <li>
              <strong>Processing time:</strong> Approved refunds are typically processed within{" "}
              7–10 business days (actual posting may vary by payment provider).
            </li>
            <li>
              <strong>Discretion:</strong> Manny.lk reserves the right to approve or deny refund
              requests based on case-by-case evaluation.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Exchanges</h2>
          <h3 className="mt-4 mb-2 font-semibold">1. Contact Us First</h3>
          <ul>
            <li>You must contact us within 3 days of receiving your order.</li>
            <li>Exchanges are only possible if:</li>
            <ul className="list-disc pl-6">
              <li>You received the correct product in good condition (not defective).</li>
              <li>You simply want to change it for another product.</li>
              <li>The product has no damage and is in its original condition.</li>
            </ul>
            <li>
              If the product is defective or the wrong item was sent, this is handled under{" "}
              <em>Returns (Defective or Incorrect Items)</em>.
            </li>
          </ul>

          <h3 className="mt-4 mb-2 font-semibold">2. Send the Product Back</h3>
          <ul>
            <li>Once you contact us, you have 7 days to ship the product back.</li>
            <li>The item must be in its original packaging and undamaged.</li>
            <li>
              Customers are responsible for ensuring the product is{" "}
              <strong>securely packaged</strong> during return. Manny.lk is not responsible for
              damage caused during return shipping.
            </li>
            <li>Customers are responsible for all courier/shipping costs for exchanges.</li>
          </ul>

          <h3 className="mt-4 mb-2 font-semibold">3. After We Receive It</h3>
          <ul>
            <li>We will inspect the returned product.</li>
            <li>If approved, we will issue <strong>store credit</strong> (not cash).</li>
          </ul>

          <h3 className="mt-4 mb-2 font-semibold">4. Using Store Credit</h3>
          <ul>
            <li>Store credits are valid for 1 year from the date of issue.</li>
            <li>Store credits can be used to place a new order via our website or WhatsApp.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Non-Returnable Items</h2>
          <ul>
            <li>Products damaged after delivery.</li>
            <li>Products without original packaging.</li>
            <li>Items specifically marked as non-returnable.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Warranty Policy</h2>
          <ul>
            <li>
              Warranty periods vary by product and are clearly stated on the product page (e.g., 6
              months, 1 year, or checking warranty).
            </li>
            <li>Warranties cover manufacturing defects only.</li>
            <li>
              Physical damage, water damage, unauthorized repairs, or misuse will{" "}
              <strong>void</strong> the warranty.
            </li>
            <li>To claim a warranty, customers must provide proof of purchase (invoice/receipt).</li>
            <li>
              Warranty claims will be <strong>inspected within 7 working days</strong>, and if
              approved, the product will be <strong>repaired or replaced</strong> based on
              availability.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
