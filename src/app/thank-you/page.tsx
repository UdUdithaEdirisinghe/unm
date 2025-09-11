// src/app/thank-you/page.tsx
import Link from "next/link";

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const orderIdParam = searchParams["orderId"];
  const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-6 text-slate-100">
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-slate-300">
          Your order has been received. We’ve sent a confirmation email with your
          order details.
        </p>

        {orderId && (
          <div className="mt-4 rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4">
            <div className="text-sm text-slate-300">
              <span className="text-slate-400">Order ID:</span>{" "}
              <span className="font-mono">{orderId}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link href="/products" className="btn-primary">
            Continue shopping
          </Link>
          <Link href="/" className="btn-secondary">
            Go to Home
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          If you chose bank transfer, please upload your bank slip from the
          email link or the order details page once available.
        </p>
      </div>
    </div>
  );
}