"use client";

import Link from "next/link";
import { useCart } from "../../components/cart/CartProvider";
import { formatCurrency } from "../../lib/format";

/**
 * Matches the layout in your screenshots:
 * - Clean stacked rows on mobile
 * - Table-like columns on desktop
 * - Dark palette, no bright white boxes
 */
export default function CartPage() {
  const { items, setQty, remove, clear, subtotal } = useCart();

  const SHIPPING_FEE = 350;
  const total = subtotal + (items.length ? SHIPPING_FEE : 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-slate-400 mb-6">Add something you love and come back here.</p>
        <Link href="/products" className="btn-primary">Shop now</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Cart</h1>

      {/* header (desktop) */}
      <div className="hidden md:grid grid-cols-12 px-4 py-2 text-xs text-slate-400">
        <div className="col-span-6">Product</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-center">Quantity</div>
        <div className="col-span-2 text-right">Subtotal</div>
      </div>

      {/* items */}
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="card p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
              {/* title */}
              <div className="md:col-span-6">
                <div className="font-medium text-white">{it.name}</div>
                <div className="text-xs text-slate-400">{it.slug}</div>
              </div>

              {/* price */}
              <div className="md:col-span-2 md:text-right text-slate-200">
                {formatCurrency(it.price)}
              </div>

              {/* qty */}
              <div className="md:col-span-2 md:text-center">
                <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900/40">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="h-9 w-9 text-white"
                    onClick={() => setQty(it.id, Math.max(1, it.quantity - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center text-slate-100 tabular-nums">
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="h-9 w-9 text-white"
                    onClick={() => setQty(it.id, it.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* row subtotal */}
              <div className="md:col-span-2 md:text-right font-semibold text-white">
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

      {/* totals & actions */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-slate-300">Shipping</span>
            <span className="font-semibold">
              {items.length ? formatCurrency(SHIPPING_FEE) : formatCurrency(0)}
            </span>
          </div>
          <div className="mt-2 border-t border-slate-700/60 pt-2 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="btn-ghost" onClick={clear}>Clear cart</button>
          <Link href="/products" className="btn-secondary">Continue shopping</Link>
          <Link href="/checkout" className="btn-primary">Proceed to checkout</Link>
        </div>
      </div>
    </div>
  );
}