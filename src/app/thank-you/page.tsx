// src/app/thank-you/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CartLine = { id: string; name: string; slug: string; price: number; quantity: number };
type ShipDifferent = { name?: string; firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; postal?: string };
type Customer = { firstName: string; lastName: string; email: string; phone?: string; address: string; city: string; postal?: string; notes?: string; shipToDifferent?: ShipDifferent };
type Order = {
  id: string;
  createdAt: string;
  customer: Customer;
  items: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  promoCode?: string;
  promoDiscount?: number;
  freeShipping?: boolean;
  paymentMethod: "COD" | "BANK";
  bankSlipName?: string;
  bankSlipUrl?: string;
};

function fmtLKR(n: number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);
}

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const orderIdParam = searchParams["orderId"];
  const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;

  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setOrder(data);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load order.");
      }
    })();
  }, [orderId]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-6 text-slate-100">
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-slate-300">
          Your order has been received. We’ve sent a confirmation email with your order details.
        </p>

        {err && (
          <div className="mt-4 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
            {err}
          </div>
        )}

        {order && (
          <div className="mt-6 space-y-4">
            {/* Order meta */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4">
              <div className="text-sm text-slate-300">
                <span className="text-slate-400">Order ID:</span>{" "}
                <span className="font-mono">{order.id}</span>
                <br />
                <span className="text-slate-400">Date:</span>{" "}
                {fmtDateTime(order.createdAt)}
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4">
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
                      [order.customer.shipToDifferent.firstName, order.customer.shipToDifferent.lastName].filter(Boolean).join(" ")}
                    {"\n"}{order.customer.shipToDifferent.phone}
                    {"\n"}{order.customer.shipToDifferent.address}
                    {"\n"}{order.customer.shipToDifferent.city} {order.customer.shipToDifferent.postal || ""}
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4">
              <div className="font-semibold mb-1">Items</div>
              <ul className="text-sm text-slate-300 list-disc pl-5">
                {order.items.map((it) => (
                  <li key={it.id}>
                    {it.name} × {it.quantity} — {fmtLKR(it.price * it.quantity)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4 text-sm text-slate-300">
              Subtotal: {fmtLKR(order.subtotal)}
              {order.promoCode && (
                <>
                  <br />
                  Promo ({order.promoCode}): −{fmtLKR(order.promoDiscount ?? 0)}
                </>
              )}
              <br />
              Shipping: {fmtLKR(order.shipping)}
              {order.freeShipping ? " (free)" : ""}
              <br />
              <span className="font-semibold">Total: {fmtLKR(order.total)}</span>
            </div>

            {/* Bank transfer */}
            {order.paymentMethod === "BANK" && (
              <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4 text-sm text-slate-300">
                <div className="font-semibold mb-1">Payment</div>
                Direct bank transfer
                {order.bankSlipUrl ? (
                  <div>
                    <a className="text-brand-accent hover:underline" href={order.bankSlipUrl} target="_blank" rel="noreferrer">
                      View bank slip
                    </a>
                  </div>
                ) : (
                  <div>Bank slip: {order.bankSlipName || "—"}</div>
                )}
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