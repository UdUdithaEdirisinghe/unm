"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/* ===== Types (local-only; do NOT import from elsewhere) ===== */
type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

type CartLine = {
  id: string;
  name: string;
  slug?: string;
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

/* ===== Utils ===== */
function fmtLKR(n: number) {
  const x = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(x);
}

/** Accept ISO string, ms epoch (number), or common snake_case variants */
function coerceCreatedAt(raw: unknown): string {
  const v: unknown =
    (raw as any)?.createdAt ??
    (raw as any)?.created_at ??
    (raw as any)?.created_at_iso ??
    (raw as any)?.created ??
    (raw as any)?.createdISO ??
    null;

  if (!v) return "";
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "string") {
    // if numeric string like "1717439123456"
    const maybeNum = Number(v);
    if (Number.isFinite(maybeNum) && v.trim().length >= 10) {
      return new Date(maybeNum).toISOString();
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return "";
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

/* ===== Page ===== */
export default function AdminOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id: string | undefined = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function load() {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      const raw = await r.json();
      if (!r.ok) throw new Error(raw?.error || "Failed to load order.");

      // ----- Normalize server fields so UI never crashes -----
      const createdAtIso = coerceCreatedAt(raw) || new Date().toISOString();

      const customerRaw = (raw.customer ?? {}) as Record<string, unknown>;
      const shipRaw =
        (customerRaw.shipToDifferent as Record<string, unknown> | undefined) ??
        (customerRaw.ship_to_different as Record<string, unknown> | undefined);

      // order notes can live in several places in older payloads
      const orderNotes =
        (customerRaw.notes as string | undefined) ??
        (raw.orderNotes as string | undefined) ??
        (raw.notes as string | undefined) ??
        undefined;

      const normalizedCustomer: Customer = {
        firstName: String(customerRaw.firstName ?? ""),
        lastName: String(customerRaw.lastName ?? ""),
        email: String(customerRaw.email ?? ""),
        phone: customerRaw.phone ? String(customerRaw.phone) : undefined,
        address: String(customerRaw.address ?? ""),
        city: String(customerRaw.city ?? ""),
        postal: customerRaw.postal ? String(customerRaw.postal) : undefined,
        notes: orderNotes,
        shipToDifferent: shipRaw
          ? {
              name:
                (shipRaw.name ? String(shipRaw.name) : "") ||
                `${shipRaw.firstName ? String(shipRaw.firstName) : ""} ${
                  shipRaw.lastName ? String(shipRaw.lastName) : ""
                }`.trim() ||
                undefined,
              firstName: shipRaw.firstName ? String(shipRaw.firstName) : undefined,
              lastName: shipRaw.lastName ? String(shipRaw.lastName) : undefined,
              phone: shipRaw.phone ? String(shipRaw.phone) : undefined,
              address: shipRaw.address ? String(shipRaw.address) : undefined,
              city: shipRaw.city ? String(shipRaw.city) : undefined,
              postal: shipRaw.postal ? String(shipRaw.postal) : undefined,
            }
          : undefined,
      };

      const itemsArr: unknown[] = Array.isArray(raw.items) ? raw.items : [];
      const normalizedItems: CartLine[] = itemsArr.map((it: any): CartLine => ({
        id: String(it?.id ?? ""),
        name: String(it?.name ?? ""),
        slug: it?.slug ? String(it.slug) : undefined,
        price: Number(it?.price ?? 0),
        quantity: Math.max(1, Number(it?.quantity ?? 1)),
      }));

      const bankSlipUrl: string | undefined =
        (raw.bankSlipUrl as string | undefined) ??
        (raw.bank_slip_url as string | undefined) ??
        (raw.bankSlipURL as string | undefined) ??
        undefined;

      const bankSlipName: string | undefined =
        (raw.bankSlipName as string | undefined) ??
        (raw.bank_slip_name as string | undefined) ??
        undefined;

      const normalized: Order = {
        id: String(raw.id),
        createdAt: createdAtIso,
        status: (raw.status as OrderStatus) ?? "pending",
        customer: normalizedCustomer,
        items: normalizedItems,
        subtotal: Number(raw.subtotal ?? 0),
        shipping: Number(raw.shipping ?? 0),
        total: Number(raw.total ?? 0),
        promoCode:
          (raw.promoCode as string | undefined) ??
          (raw.promo_code as string | undefined) ??
          undefined,
        promoDiscount:
          raw.promoDiscount != null
            ? Number(raw.promoDiscount)
            : raw.promo_discount != null
            ? Number(raw.promo_discount)
            : undefined,
        freeShipping:
          (raw.freeShipping as boolean | undefined) ??
          (raw.free_shipping as boolean | undefined) ??
          false,
        paymentMethod:
          (raw.paymentMethod as "COD" | "BANK" | undefined) ??
          (raw.payment_method as "COD" | "BANK" | undefined) ??
          "COD",
        bankSlipName,
        bankSlipUrl,
      };

      setOrder(normalized);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load order.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(next: OrderStatus) {
    if (!order) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const prev = order;
      setOrder({ ...order, status: next });
      const r = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) {
        setOrder(prev);
        throw new Error(await r.text());
      }
      setMsg("Status updated.");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  const totals = useMemo(() => {
    if (!order) return null;
    return {
      subtotal: fmtLKR(order.subtotal),
      promoDiscount: fmtLKR(order.promoDiscount ?? 0),
      shipping: fmtLKR(order.shipping),
      total: fmtLKR(order.total),
    };
  }, [order]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-4">
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
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-4">
          <Link href="/admin" className="btn-ghost">← Back</Link>
        </div>
        <div className="rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
          {err || "Order not found."}
        </div>
      </div>
    );
  }

  // Build “ship to different” lines
  const s: ShipDifferent | undefined = order.customer.shipToDifferent;
  const shipDifferentLines: string[] = s
    ? [
        s.name || [s.firstName, s.lastName].filter(Boolean).join(" "),
        s.phone,
        s.address,
        [s.city, s.postal].filter(Boolean).join(" "),
      ].filter(Boolean) as string[]
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin" className="btn-ghost">← Back</Link>
        <div className="flex items-center gap-2">
          {/* rectangular amount badge */}
          <span className="inline-flex items-center rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-200">
            {totals?.total}
          </span>
          <select
            className="field"
            value={order.status}
            onChange={(e) => updateStatus(e.target.value as OrderStatus)}
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

      {err && (
        <div className="mb-3 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-3 rounded border border-emerald-800/50 bg-emerald-900/30 px-3 py-2 text-emerald-100">
          {msg}
        </div>
      )}

      <h1 className="text-xl font-semibold mb-1">
        Order <span className="text-slate-300">#{order.id}</span>
      </h1>
      <div className="text-slate-400 mb-4">Created: {fmtDateTime(order.createdAt)}</div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Customer */}
        <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
          <div className="font-semibold mb-1">Customer</div>
          <div className="text-sm text-slate-300 whitespace-pre-line">
            {order.customer.firstName} {order.customer.lastName}
            {"\n"}
            {order.customer.email}
            {"\n"}
            {order.customer.phone || "No phone"}
            {"\n"}
            {order.customer.address}
            {"\n"}
            {order.customer.city} {order.customer.postal || ""}
          </div>

          {/* Order notes */}
          {order.customer.notes && (
            <div className="mt-3">
              <div className="font-semibold mb-1">Order notes</div>
              <div className="text-sm text-slate-300 whitespace-pre-line">
                {order.customer.notes}
              </div>
            </div>
          )}

          {/* Ship to (different) */}
          {shipDifferentLines.length > 0 && (
            <div className="mt-3">
              <div className="font-semibold mb-1">Ship to (different)</div>
              <div className="text-sm text-slate-300 whitespace-pre-line">
                {shipDifferentLines.join("\n")}
              </div>
            </div>
          )}
        </div>

        {/* Items & totals */}
        <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
          <div className="font-semibold mb-1">Items</div>
          <ul className="text-sm text-slate-300 list-disc pl-5">
            {order.items.map((it: CartLine) => (
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

          {/* Bank transfer details */}
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
    </div>
  );
}