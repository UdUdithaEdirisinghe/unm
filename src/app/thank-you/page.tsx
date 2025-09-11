// src/app/thank-you/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* --- Types --- */
type ShipDifferent = {
  name?: string; firstName?: string; lastName?: string;
  phone?: string; address?: string; city?: string; postal?: string;
};
type Customer = {
  firstName: string; lastName: string; email: string;
  phone?: string; address: string; city: string; postal?: string; notes?: string;
  shipToDifferent?: ShipDifferent;
};
type Order = {
  id: string; createdAt: string; status: string; customer: Customer;
  items: { id: string; name: string; quantity: number; price: number }[];
  subtotal: number; shipping: number; total: number;
  promoCode?: string; promoDiscount?: number; freeShipping?: boolean;
  paymentMethod: "COD" | "BANK"; bankSlipUrl?: string;
};

const fmtLKR = (n: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);

export default function ThankYouPage() {
  const sp = useSearchParams();
  // Accept both ?orderId=... and ?order=...
  const orderId = sp.get("orderId") ?? sp.get("order") ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        setOrder(await r.json());
      } catch (e: any) {
        setErr(e?.message || "Failed to load order.");
      }
    })();
  }, [orderId]);

  const totals = useMemo(() => {
    if (!order) return null;
    return {
      subtotal: fmtLKR(order.subtotal),
      promoDiscount: fmtLKR(order.promoDiscount ?? 0),
      shipping: fmtLKR(order.shipping),
      total: fmtLKR(order.total),
    };
  }, [order]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-6 text-slate-100">
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-slate-300">
          Your order has been received. We’ve sent a confirmation email with your order details.
        </p>

        {orderId && (
          <div className="mt-4 text-sm text-slate-300">
            <span className="text-slate-400">Order ID:</span>{" "}
            <span className="font-mono">{orderId}</span>
          </div>
        )}

        {err && (
          <div className="mt-4 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
            {err}
          </div>
        )}

        {order && (
          <div className="mt-6 space-y-4">
            {/* Customer */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-3">
              <div className="font-semibold mb-1">Customer</div>
              <div className="text-sm text-slate-300 whitespace-pre-line">
                {order.customer.firstName} {order.customer.lastName}
                {"\n"}{order.customer.email}
                {"\n"}{order.customer.phone || "No phone"}
                {"\n"}{order.customer.address}
                {"\n"}{order.customer.city} {order.customer.postal || ""}
                {order.customer.notes && `\nNotes: ${order.customer.notes}`}
              </div>

              {order.customer.shipToDifferent && (
                <div className="mt-3">
                  <div className="font-semibold mb-1">Ship to (different)</div>
                  <div className="text-sm text-slate-300 whitespace-pre-line">
                    {order.customer.shipToDifferent.name ||
                      `${order.customer.shipToDifferent.firstName || ""} ${order.customer.shipToDifferent.lastName || ""}`}
                    {"\n"}{order.customer.shipToDifferent.phone || ""}
                    {"\n"}{order.customer.shipToDifferent.address || ""}
                    {"\n"}{order.customer.shipToDifferent.city || ""} {order.customer.shipToDifferent.postal || ""}
                  </div>
                </div>
              )}
            </div>

            {/* Items & totals */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-3">
              <div className="font-semibold mb-1">Items</div>
              <ul className="text-sm text-slate-300 list-disc pl-5">
                {order.items.map(it => (
                  <li key={it.id}>{it.name} × {it.quantity} — {fmtLKR(it.price * it.quantity)}</li>
                ))}
              </ul>
              <div className="mt-2 text-sm text-slate-300">
                Subtotal: {totals?.subtotal}
                {order.promoCode && <>
                  <br />Promo ({order.promoCode}): −{totals?.promoDiscount}
                </>}
                <br />Shipping: {totals?.shipping}{order.freeShipping ? " (free)" : ""}
                <br /><span className="font-semibold">Total: {totals?.total}</span>
              </div>
            </div>

            {/* Payment */}
            {order.paymentMethod === "BANK" && (
              <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-3">
                <div className="font-semibold mb-1">Payment</div>
                <div className="text-sm text-slate-300">
                  Direct bank transfer
                  {order.bankSlipUrl ? (
                    <div>
                      <a href={order.bankSlipUrl} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline">
                        View bank slip
                      </a>
                    </div>
                  ) : (
                    <div>Bank slip: not uploaded yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link href="/products" className="btn-primary">Continue shopping</Link>
          <Link href="/" className="btn-secondary">Go to Home</Link>
        </div>
      </div>
    </div>
  );
}