// src/app/thank-you/page.tsx
import { readOrders } from "../../lib/products";
import { formatCurrency } from "../../lib/format";

type Props = { searchParams?: { order?: string } };

export default async function ThankYouPage({ searchParams }: Props) {
  const id = searchParams?.order ?? "";
  const orders = await readOrders();
  const o = orders.find((x) => x.id === id);

  if (!o) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p className="mt-2 text-slate-300">We couldn’t find your order.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-4">
        <h1 className="text-2xl font-bold">Thank you for your order!</h1>
        <p className="text-slate-200 mt-1">
          Order <span className="font-mono">{o.id}</span> placed on{" "}
          {new Date(o.createdAt).toLocaleString()}.
        </p>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
        <h2 className="text-lg font-semibold mb-2">Items</h2>
        <div className="space-y-2 text-sm text-slate-300">
          {o.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between">
              <div className="truncate">
                {it.name} × {it.quantity}
              </div>
              <div className="shrink-0">
                {formatCurrency(it.price * it.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-slate-700/60 pt-2 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(o.subtotal)}</span>
          </div>
          {o.promoCode && (
            <div className="flex justify-between text-emerald-300">
              <span>Promo ({o.promoCode})</span>
              <span>-{formatCurrency(o.promoDiscount ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>
              {o.freeShipping ? "Free" : formatCurrency(o.shipping)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(o.total)}</span>
          </div>
        </div>
      </div>

      {/* Customer / Shipping */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
          <h2 className="text-lg font-semibold mb-2">Billing details</h2>
          <div className="text-sm text-slate-300 space-y-1">
            <div>
              {o.customer.firstName} {o.customer.lastName}
            </div>
            <div>{o.customer.email}</div>
            {o.customer.phone && <div>{o.customer.phone}</div>}
            <div>
              {o.customer.address}
              <br />
              {o.customer.city} {o.customer.postal ?? ""}
            </div>
            {o.customer.notes && <div>Notes: {o.customer.notes}</div>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
          <h2 className="text-lg font-semibold mb-2">
            {o.customer.shipToDifferent ? "Ship to (different)" : "Shipping"}
          </h2>
          <div className="text-sm text-slate-300 space-y-1">
            {o.customer.shipToDifferent ? (
              <>
                <div>{o.customer.shipToDifferent.name}</div>
                <div>{o.customer.shipToDifferent.phone}</div>
                <div>
                  {o.customer.shipToDifferent.address}
                  <br />
                  {o.customer.shipToDifferent.city}{" "}
                  {o.customer.shipToDifferent.postal ?? ""}
                </div>
              </>
            ) : (
              <>
                <div>
                  {o.customer.firstName} {o.customer.lastName}
                </div>
                {o.customer.phone && <div>{o.customer.phone}</div>}
                <div>
                  {o.customer.address}
                  <br />
                  {o.customer.city} {o.customer.postal ?? ""}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
        <h2 className="text-lg font-semibold mb-2">Payment</h2>
        <div className="text-sm text-slate-300">
          {o.paymentMethod === "BANK" ? "Direct bank transfer" : "Cash on delivery"}
          {o.bankSlipUrl && (
            <>
              {" "}
              • <a href={o.bankSlipUrl} target="_blank" className="text-brand-accent underline">View bank slip</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}