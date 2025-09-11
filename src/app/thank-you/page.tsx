// src/app/thank-you/page.tsx
import Link from "next/link";

type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";
type CartLine = { id: string; name: string; slug: string; price: number; quantity: number };
type ShipDifferent = { name?: string; firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; postal?: string };
type Customer = {
  firstName: string; lastName: string; email: string; phone?: string;
  address: string; city: string; postal?: string; notes?: string; shipToDifferent?: ShipDifferent;
};
type Order = {
  id: string; createdAt: string; status: OrderStatus; customer: Customer; items: CartLine[];
  subtotal: number; shipping: number; total: number;
  promoCode?: string; promoDiscount?: number; freeShipping?: boolean;
  paymentMethod: "COD" | "BANK"; bankSlipName?: string; bankSlipUrl?: string;
};

function fmtLKR(n: number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);
}
function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-LK", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });
}

async function getOrder(orderId?: string): Promise<Order | null> {
  if (!orderId) return null;
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/orders/${orderId}`, {
      cache: "no-store",
      // For local dev fallback when NEXT_PUBLIC_BASE_URL not set:
      next: { revalidate: 0 }
    });
    if (!r.ok) return null;
    return (await r.json()) as Order;
  } catch {
    // Try relative fetch (useful on Vercel and locally)
    try {
      const r2 = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!r2.ok) return null;
      return (await r2.json()) as Order;
    } catch {
      return null;
    }
  }
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const orderIdParam = searchParams["orderId"];
  const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;

  const order = await getOrder(orderId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-6 text-slate-100">
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-slate-300">
          Your order has been received. We’ve sent a confirmation email with your order details.
        </p>

        {orderId && (
          <div className="mt-4 rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-4">
            <div className="text-sm text-slate-300">
              <span className="text-slate-400">Order ID:</span>{" "}
              <span className="font-mono">{orderId}</span>
            </div>
            {order ? (
              <>
                <div className="mt-2 text-sm text-slate-300">
                  <span className="text-slate-400">Placed:</span> {fmtDateTime(order.createdAt)}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.25)] p-3">
                    <div className="font-semibold mb-1">Customer</div>
                    <div className="text-sm text-slate-300 whitespace-pre-line">
                      {order.customer.firstName} {order.customer.lastName}
                      {"\n"}{order.customer.email}
                      {"\n"}{order.customer.phone || "No phone"}
                      {"\n"}{order.customer.address}
                      {"\n"}{order.customer.city} {order.customer.postal || ""}
                      {order.customer.notes && <>\nNotes: {order.customer.notes}</>}
                    </div>
                    {order.customer.shipToDifferent && (
                      <div className="mt-3">
                        <div className="font-semibold mb-1">Ship to (different)</div>
                        <div className="text-sm text-slate-300 whitespace-pre-line">
                          {[
                            order.customer.shipToDifferent.name ||
                              [order.customer.shipToDifferent.firstName, order.customer.shipToDifferent.lastName]
                                .filter(Boolean).join(" "),
                            order.customer.shipToDifferent.phone,
                            order.customer.shipToDifferent.address,
                            [order.customer.shipToDifferent.city, order.customer.shipToDifferent.postal]
                              .filter(Boolean).join(" "),
                          ].filter(Boolean).join("\n")}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.25)] p-3">
                    <div className="font-semibold mb-1">Items</div>
                    <ul className="text-sm text-slate-300 list-disc pl-5">
                      {order.items.map((it) => (
                        <li key={it.id}>
                          {it.name} × {it.quantity}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 text-sm text-slate-300">
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
              </>
            ) : (
              <div className="mt-2 text-sm text-slate-400">
                Can’t load order details right now. You’ll receive them by email.
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