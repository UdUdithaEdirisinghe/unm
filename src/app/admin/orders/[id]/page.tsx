"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Order, OrderStatus } from "../../../../lib/products";

function fmtLKR(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export default function AdminOrderDetails() {
  const params = useParams<{ id: string }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to load order");
      setOrder(data);
    } catch (e: any) {
      setErr(e?.message ?? "Load failed");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function setOrderStatus(status: OrderStatus) {
    if (!order) return;
    setSaving(true);
    setErr(null);
    try {
      setOrder({ ...order, status }); // optimistic
      const r = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Update failed");
      setOrder(data);
    } catch (e: any) {
      setErr(e?.message ?? "Update failed");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Order #{id}</h1>
          <Link href="/admin" className="btn-ghost">← Back</Link>
        </div>
        <div className="rounded border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
          <div className="text-slate-300">Loading…</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Order #{id}</h1>
          <Link href="/admin" className="btn-ghost">← Back</Link>
        </div>
        <div className="rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
          {err || "Order not found."}
        </div>
      </div>
    );
  }

  const shipDiff: any = (order.customer as any).shipToDifferent;
  const shipName =
    shipDiff?.name ||
    [shipDiff?.firstName, shipDiff?.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order #{order.id}</h1>
        <Link href="/admin" className="btn-ghost">← Back</Link>
      </div>

      {err && (
        <div className="rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
          {err}
        </div>
      )}

      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            Created: {new Date(order.createdAt).toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
              {fmtLKR(order.total)}
            </span>
            <select
              className="field"
              value={order.status}
              onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
              disabled={saving}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Customer */}
          <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
            <div className="font-semibold mb-1">Customer</div>
            <div className="text-sm text-slate-300">
              {order.customer.firstName} {order.customer.lastName}<br />
              {order.customer.email}<br />
              {order.customer.phone || "No phone"}<br />
              {order.customer.address}, {order.customer.city} {order.customer.postal || ""}
              {order.customer.notes && (
                <>
                  <br />
                  <span className="text-slate-400">Notes: </span>
                  {order.customer.notes}
                </>
              )}
            </div>

            {shipDiff && (
              <div className="mt-3">
                <div className="font-semibold mb-1">Ship to (different)</div>
                <div className="text-sm text-slate-300">
                  {shipName || "—"}<br />
                  {shipDiff.phone}<br />
                  {shipDiff.address}, {shipDiff.city} {shipDiff.postal || ""}
                </div>
              </div>
            )}
          </div>

          {/* Items & totals */}
          <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
            <div className="font-semibold mb-1">Items</div>
            <ul className="text-sm text-slate-300 list-disc pl-5">
              {order.items.map((it) => (
                <li key={it.id}>{it.name} × {it.quantity}</li>
              ))}
            </ul>

            <div className="mt-2 text-sm text-slate-300">
              Subtotal: {fmtLKR(order.subtotal)}<br />
              {order.promoCode && <>Promo ({order.promoCode}): −{fmtLKR(order.promoDiscount ?? 0)}<br /></>}
              Shipping: {fmtLKR(order.shipping)}{order.freeShipping ? " (free)" : ""}<br />
              <span className="font-semibold">Total: {fmtLKR(order.total)}</span>
            </div>

            {order.paymentMethod === "BANK" && (
              <div className="mt-2 text-sm text-slate-300">
                Payment: Direct bank transfer<br />
                {order.bankSlipUrl ? (
                  <a className="text-brand-accent hover:underline" href={order.bankSlipUrl} target="_blank" rel="noreferrer">
                    View bank slip
                  </a>
                ) : (
                  <>Bank slip: {order.bankSlipName || "—"}</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}