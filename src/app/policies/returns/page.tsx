export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Returns & Warranty • Manny.lk" };

export default function ReturnsPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Returns &amp; Warranty Policy</h1>
      <div className="prose prose-invert mt-4 max-w-none">
        <p>
          We stand by the quality of our products. If your item is defective on arrival or
          develops a manufacturing fault within the warranty period, we’ll assist with repair
          or replacement according to brand/distributor terms.
        </p>
        <h3>Eligibility</h3>
        <ul>
          <li>Provide the order number and proof of purchase.</li>
          <li>Original packaging and accessories are required where possible.</li>
          <li>Physical, liquid, and accidental damage are not covered.</li>
        </ul>
        <h3>Process</h3>
        <ol>
          <li>Contact us with details and a brief description of the issue.</li>
          <li>We may request photos/videos for quick assessment.</li>
          <li>Ship/bring the item to the service point we provide.</li>
        </ol>
        <p className="text-slate-400">
          Note: Diagnostics and manufacturer timelines may apply. Data loss and
          compatibility issues are excluded.
        </p>
      </div>
    </section>
  );
}