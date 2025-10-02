export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Terms & Conditions • Manny.lk" };

export default function TermsConditions() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Terms &amp; Conditions</h1>
      <p className="mt-1 text-sm text-white/60">Last updated: October 2, 2025</p>

      <div className="prose prose-invert mt-6 max-w-none space-y-6">
        <p>
          Welcome to Manny.lk. By accessing and using our website, you agree to the following terms:
        </p>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Purchases &amp; Eligibility</h2>
          <ul>
            <li>Customers do not have to be 18 years old to make purchases.</li>
            <li>
              If a customer is under 18 years old, purchases must be made with the consent of a{" "}
              <strong>parent or guardian</strong>.
            </li>
            <li>Customers agree to provide accurate and up-to-date information when placing orders.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Orders &amp; Payments</h2>
          <ul>
            <li>Placing an order constitutes an <strong>offer to purchase</strong>.</li>
            <li>
              We reserve the right to cancel orders due to <strong>errors, suspected fraud, or stock
              unavailability</strong>.
            </li>
            <li>Payments are processed securely through trusted third-party gateways.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Shipping &amp; Delivery</h2>
          <ul>
            <li>We make every effort to deliver orders promptly.</li>
            <li>Delivery timelines are estimates and may vary due to external factors.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Returns &amp; Warranty</h2>
          <p>
            Returns, exchanges, and warranties are subject to our{" "}
            <strong>Return &amp; Warranty Policy</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Intellectual Property</h2>
          <p>
            All content on Manny.lk (logos, images, text, etc.) is the property of Manny.lk and
            cannot be copied or reused without permission.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Limitation of Liability</h2>
          <ul>
            <li>
              Manny.lk is not liable for <strong>indirect, incidental, or consequential damages</strong>{" "}
              arising from product use.
            </li>
            <li>
              Product specifications, prices, and availability are subject to change without notice.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Amendments</h2>
          <p>
            We reserve the right to update or modify these Terms &amp; Conditions at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
