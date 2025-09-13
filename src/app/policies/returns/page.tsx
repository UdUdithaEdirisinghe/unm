export const metadata = { title: "Returns & Warranty | Manny.lk" };

export default function ReturnsPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white mb-4">Returns & Warranty Policy</h1>
      <div className="space-y-4 text-slate-300">
        <p>
          If an item arrives damaged or defective, contact us within <b>7 days</b> of delivery with your order ID,
          photos/video, and a description. We’ll guide you through replacement or refund options.
        </p>
        <ul className="list-disc pl-6">
          <li>Items must include original packaging and accessories.</li>
          <li>Physical damage or signs of misuse may void eligibility.</li>
          <li>Warranty terms may vary by product; see the product page for details.</li>
        </ul>
        <p>
          For returns, customers may be responsible for courier fees unless the item is DOA or incorrectly supplied.
        </p>
        <p>To start a return: email <a href="mailto:support@manny.lk" className="underline">support@manny.lk</a>.</p>
      </div>
    </section>
  );
}