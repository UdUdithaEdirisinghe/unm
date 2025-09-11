"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

/* ================= Types (self-contained) ================= */
type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

type CartLine = {
  id: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
};

type ShipDifferent = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
};

type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  postal?: string;
  notes?: string;
  shipToDifferent?: ShipDifferent;
};

type Order = {
  id: string;
  createdAt: string; // ISO
  status: OrderStatus;
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

/* ================= Utils ================= */
const fmtLKR = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ================= Inner component (uses hooks) ================= */
function ThankYouInner() {
  const params = useSearchParams(); // must be inside Suspense
  const orderIdParam = params.get("order") || params.get("orderId");
  const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam || "";

  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch order details once we have an orderId
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!orderId) return;
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = (await r.json()) as Order; // API already normalizes in /api/orders/[id]
        if (alive) setOrder(data);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load order.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
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

        {/* Order id box */}
        {orderId && (
          <div className="mt-4 rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4">
            <div className="text-sm text-slate-300">
              <span className="text-slate-400">Order ID:</span>{" "}
              <span className="font-mono">{orderId}</span>
            </div>
          </div>
        )}

        {/* Errors / loading */}
        {err && (
          <div className="mt-3 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
            {err}
          </div>
        )}
        {!err && loading && (
          <div className="mt-3 text-slate-300">Loading order details…</div>
        )}

        {/* Full order details */}
        {order && !loading && (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {/* Customer */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
              <div className="font-semibold mb-1">Customer</div>
              <div className="text-sm text-slate-300 whitespace-pre-line">
                {order.customer.firstName} {order.customer.lastName}
                {"\n"}
                {order.customer.email}
                {order.customer.phone ? `\n${order.customer.phone}` : ""}
                {"\n"}
                {order.customer.address}
                {"\n"}
                {order.customer.city} {order.customer.postal || ""}
                {order.customer.notes ? `\nNotes: ${order.customer.notes}` : ""}
              </div>

              {order.customer.shipToDifferent && (
                <div className="mt-3">
                  <div className="font-semibold mb-1">Ship to (different)</div>
                  <div className="text-sm text-slate-300 whitespace-pre-line">
                    {[
                      order.customer.shipToDifferent.name ||
                        [order.customer.shipToDifferent.firstName, order.customer.shipToDifferent.lastName]
                          .filter(Boolean)
                          .join(" "),
                      order.customer.shipToDifferent.phone,
                      order.customer.shipToDifferent.address,
                      [order.customer.shipToDifferent.city, order.customer.shipToDifferent.postal]
                        .filter(Boolean)
                        .join(" "),
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-slate-400">
                Placed on: {fmtDateTime(order.createdAt)}
              </div>
            </div>

            {/* Items & totals */}
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
              <div className="font-semibold mb-1">Items</div>
              <ul className="text-sm text-slate-300 list-disc pl-5">
                {order.items.map((it) => (
                  <li key={it.id}>
                    {it.name} × {it.quantity}
                  </li>
                ))}
              </ul>

              <div className="mt-2 text-sm text-slate-300">
                Subtotal: {totals?.subtotal}
                {order.promoCode && (
                  <>
                    <br />
                    Promo ({order.promoCode}): −{totals?.promoDiscount}
                  </>
                )}
                <br />
                Shipping: {totals?.shipping}
                {order.freeShipping ? " (free)" : ""}
                <br />
                <span className="font-semibold">Total: {totals?.total}</span>
              </div>

              {order.paymentMethod === "BANK" && (
                <div className="mt-3 text-sm text-slate-300">
                  <div className="font-semibold mb-1">Payment</div>
                  <div>Direct bank transfer</div>
                  {order.bankSlipUrl ? (
                    <a
                      className="text-brand-accent hover:underline"
                      href={order.bankSlipUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View bank slip
                    </a>
                  ) : (
                    <div>Bank slip: {order.bankSlipName || "—"}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Link href="/products" className="btn-primary">
            Continue shopping
          </Link>
          <Link href="/" className="btn-secondary">
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ================= Page (wrap with Suspense) ================= */
export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-slate-300">Loading…</div>}>
      <ThankYouInner />
    </Suspense>
  );
}