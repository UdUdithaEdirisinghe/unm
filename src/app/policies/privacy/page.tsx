export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Privacy Policy • Manny.lk" };

export default function PrivacyPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Privacy Policy</h1>
      <p className="mt-1 text-sm text-white/60">Last updated: October 2, 2025</p>

      <div className="prose prose-invert mt-6 max-w-none space-y-6">
        <p>
          At Manny.lk, your privacy is important to us. This Privacy Policy explains how we
          collect, use, and safeguard your information.
        </p>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Information We Collect</h2>
          <ul>
            <li>
              <strong>Personal details</strong> (name, email, phone number) during registration
              or checkout.
            </li>
            <li>
              <strong>Payment and billing information</strong> (securely processed via trusted
              third-party providers).
            </li>
            <li>
              <strong>Browsing data</strong> (IP address, browser type, device information) via
              cookies and analytics tools.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Use of Information</h2>
          <ul>
            <li>To process and deliver orders.</li>
            <li>To provide customer support and respond to inquiries.</li>
            <li>To improve our website and product offerings.</li>
            <li>To detect and prevent fraudulent or unauthorized activities.</li>
            <li>
              Since we run ads on Facebook, TikTok, and Instagram, we may use browsing data for
              targeted advertising through third-party platforms, in accordance with their
              privacy policies.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Sharing Information</h2>
          <p>We do not sell or rent customer data. Information may be shared only with:</p>
          <ul>
            <li>Trusted service providers (delivery, payment processing).</li>
            <li>Legal authorities if required by law.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Data Security</h2>
          <p>
            We use industry-standard security practices to protect your personal data. However,
            no system is 100% secure, and we cannot guarantee absolute safety.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mt-8 mb-3">Cookies</h2>
          <p>
            We use cookies to enhance your browsing experience. You can disable cookies in your
            browser settings, but this may affect site functionality.
          </p>
        </div>
      </div>
    </section>
  );
}
