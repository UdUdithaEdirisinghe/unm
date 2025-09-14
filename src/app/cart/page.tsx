"use client";

import Link from "next/link";
import { useCart } from "../../components/cart/CartProvider";
import { formatCurrency } from "../../lib/format";

export default function CartPage() {
  const { items, setQty, remove, clear, subtotal } = useCart();
  const SHIPPING_FEE = 350;
  const total = subtotal + (items.length ? SHIPPING_FEE : 0);

  if (items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Your cart is empty</h1>
        <p className="text-slate-400 mb-6">Add something you love and come back here.</p>
        <Link href="/products" className="btn-primary">Shop now</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Cart</h1>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Items */}
        <div className="md:col-span-8 space-y-4">
          {items.map((it) => (
            <div key={it.id} className="form-card">
              <div className="grid gap-4 sm:grid-cols-12 sm:items-center">
                <div className="sm:col-span-6">
                  <div className="font-medium text-white leading-snug">{it.name}</div>
                  <div className="text-xs text-slate-400 truncate">{it.slug}</div>
                </div>
                <div className="sm:col-span-2 text-sm text-slate-300">
                  {formatCurrency(it.price)}
                </div>
                <div className="sm:col-span-3">
                  <div className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/40 px-2 py-1">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="h-8 w-8 rounded-md bg-slate-800 text-white"
                      onClick={() => setQty(it.id, Math.max(1, it.quantity - 1))}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-slate-100 tabular-nums">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="h-8 w-8 rounded-md bg-slate-800 text-white"
                      onClick={() => setQty(it.id, it.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-1 text-right font-semibold text-white">
                  {formatCurrency(it.price * it.quantity)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button className="btn-ghost text-rose-400 hover:text-rose-300" onClick={() => remove(it.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <aside className="md:col-span-4 space-y-4">
          <div className="summary-card">
            <h2 className="section-title">Cart totals</h2>
            <div className="space-y-2">
              <div className="row"><span className="label">Subtotal</span><span className="value">{formatCurrency(subtotal)}</span></div>
              <div className="row"><span className="label">Shipping</span><span className="value">{formatCurrency(items.length ? SHIPPING_FEE : 0)}</span></div>
              <div className="border-t border-slate-700/60 pt-2 row">
                <span className="value">Total</span>
                <span className="value">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button className="btn-ghost" onClick={clear}>Clear cart</button>
            <Link href="/products" className="btn-secondary">Continue shopping</Link>
            <Link href="/checkout" className="btn-primary">Proceed to checkout</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}