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
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cart</h1>
      </header>

      {/* Items */}
      <div className="space-y-4">
        {items.map((it) => (
          <div key={it.id} className="panel p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-center">
              {/* title/slug */}
              <div className="sm:col-span-6">
                <div className="font-medium text-white leading-snug">{it.name}</div>
                <div className="text-xs text-slate-400 truncate">{it.slug}</div>
              </div>

              {/* unit price */}
              <div className="sm:col-span-2 text-sm text-slate-300">
                {formatCurrency(it.price)}
              </div>

              {/* qty control */}
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

              {/* line total */}
              <div className="sm:col-span-1 text-right font-semibold text-white">
                {formatCurrency(it.price * it.quantity)}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                className="btn-ghost text-rose-400 hover:text-rose-300"
                onClick={() => remove(it.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals + actions */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel p-4">
          <dl className="space-y-2 text-slate-200">
            <div className="flex justify-between">
              <dt className="text-slate-300">Subtotal</dt>
              <dd className="font-semibold">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-300">Shipping</dt>
              <dd className="font-semibold">
                {items.length ? formatCurrency(SHIPPING_FEE) : formatCurrency(0)}
              </dd>
            </div>
            <div className="border-t border-slate-700/60 pt-2 flex justify-between">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{formatCurrency(total)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="btn-ghost" onClick={clear}>Clear cart</button>
          <Link href="/products" className="btn-secondary">Continue shopping</Link>
          <Link href="/checkout" className="btn-primary">Proceed to checkout</Link>
        </div>
      </div>
    </section>
  );
}