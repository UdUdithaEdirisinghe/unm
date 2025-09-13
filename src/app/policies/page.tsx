export const metadata = { title: "Policies | Manny.lk" };

export default function PoliciesIndex() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white mb-4">Policies</h1>
      <p className="text-slate-300 mb-6">
        Here you’ll find details about privacy, returns, shipping and more. For questions, contact us.
      </p>
      <ul className="space-y-3 text-slate-200 underline-offset-2">
        <li><a className="hover:underline" href="/policies/returns">Returns & Warranty Policy</a></li>
        <li><a className="hover:underline" href="/policies/shipping">Shipping & Delivery Policy</a></li>
        <li><a className="hover:underline" href="/policies/privacy">Privacy Policy</a></li>
      </ul>
    </section>
  );
}