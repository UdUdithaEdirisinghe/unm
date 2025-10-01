// Checkout page (your file, with minimal changes highlighted in comments)
"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../../components/cart/CartProvider";
import { useRouter } from "next/navigation";
import { formatCurrency } from "../../lib/format";
import { toast } from "react-hot-toast";

const SHIPPING_FEE = 400;

type Pay = "COD" | "BANK";
type PromoResult = { code: string; freeShipping: boolean; discount: number };
type Shortage = { id: string; name: string; requested: number; available: number };

export default function CheckoutPage() {
  const { items, clear, subtotal } = useCart();
  const router = useRouter();

  // Billing
  const [bill, setBill] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal: "",
    notes: "",
    payment: "COD" as Pay,
  });

  // Optional shipping (different address)
  const [shipDifferent, setShipDifferent] = useState(false);
  const [ship, setShip] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    postal: "",
  });

  // Bank slip (for BANK)
  const [slipFile, setSlipFile] = useState<File | null>(null);

  // Terms
  const [agree, setAgree] = useState(false);

  // NEW: Printed invoice request
  const [wantsPrintedInvoice, setWantsPrintedInvoice] = useState(false);

  // Promo / Store credit (unified)
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<PromoResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Errors/loading
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Shortages from server
  const [shortages, setShortages] = useState<Shortage[] | null>(null);

  // NEW: ref so we can scroll to the banner
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Totals
  const discount = applied?.discount ?? 0;
  const shipping = applied?.freeShipping ? 0 : (items.length ? SHIPPING_FEE : 0);
  const total = Math.max(0, subtotal - discount) + shipping;

  function updBill<K extends keyof typeof bill>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setBill((s) => ({ ...s, [k]: e.target.value }));
  }
  function updShip<K extends keyof typeof ship>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setShip((s) => ({ ...s, [k]: e.target.value }));
  }

  /** Apply code against the unified validator: /api/promos/validate */
  async function applyCode() {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) return;
    setChecking(true);
    setErr(null);
    try {
      const r = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal }),
      });
      const data = await r.json().catch(() => ({} as any));

      if (!r.ok || !data?.valid) {
        setApplied(null);
        setErr(typeof data?.message === "string" ? data.message : "That code isn’t valid or has expired.");
      } else {
        setApplied({
          code: data?.promo?.code || trimmed,
          freeShipping: !!data?.freeShipping,
          discount: Number(data?.discount || 0),
        });
      }
    } catch (e: any) {
      setApplied(null);
      setErr(e?.message ?? "Could not validate the code right now.");
    } finally {
      setChecking(false);
    }
  }

  function removeCode() {
    setApplied(null);
    setCodeInput("");
  }

  async function uploadSlip(): Promise<string | undefined> {
    if (!slipFile) return undefined;
    const fd = new FormData();
    fd.append("file", slipFile);
    const r = await fetch("/api/upload?kind=bank-slip", { method: "POST", body: fd });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.path) throw new Error(data?.error || "Slip upload failed");
    return data.path as string;
  }

  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rePhone10 = /^[0-9]{10}$/;

  async function place(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setShortages(null);

    if (!bill.firstName.trim() || !bill.lastName.trim())
      return setErr("Please enter your first and last name.");
    if (!reEmail.test(bill.email))
      return setErr("Please enter a valid email address.");
    if (!rePhone10.test(bill.phone))
      return setErr("Please enter a valid 10-digit phone number.");
    if (!bill.address.trim() || !bill.city.trim())
      return setErr("Please enter your street address and town/city.");
    if (items.length === 0) return setErr("Your cart is empty.");
    if (!agree) return setErr("Please agree to the Terms & Conditions.");

    let shippingAddress: typeof ship | undefined;
    if (shipDifferent) {
      if (
        !ship.firstName.trim() ||
        !ship.lastName.trim() ||
        !ship.address.trim() ||
        !ship.city.trim() ||
        !rePhone10.test(ship.phone)
      ) {
        return setErr(
          "For shipping to a different address, please enter recipient name, address, town/city and a valid 10-digit phone."
        );
      }
      shippingAddress = ship;
    }

    if (bill.payment === "BANK" && !slipFile)
      return setErr("Please upload your bank transfer slip.");

    setBusy(true);
    try {
      const bankSlipUrl =
        bill.payment === "BANK" ? await uploadSlip() : undefined;

      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          paymentMethod: bill.payment,
          promoCode: applied?.code, // unified field
          bankSlipUrl,
          shipping,
          customer: bill,
          shipDifferent,
          shippingAddress,
          // NEW: forward the printed-invoice intent
          wantsPrintedInvoice,
        }),
      });

      if (r.status === 409) {
        const data = await r.json().catch(() => ({}));
        const arr = Array.isArray(data?.shortages) ? data.shortages : [];
        if (arr.length) setShortages(arr as Shortage[]);
        setErr(
          data?.error ||
            "Some items are not available in the requested quantity. Please adjust your cart."
        );
        return;
      }

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setErr(typeof data?.error === "string" ? data.error : "Order failed.");
        return;
      }

      clear();
      router.push(`/thank-you?order=${data.orderId}`);
    } catch (e: any) {
      setErr(e?.message ?? "Order failed.");
    } finally {
      setBusy(false);
    }
  }

  // NEW: toast + scroll when an error appears
  useEffect(() => {
    if (err) {
      toast.error(err);
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [err]);

  // Totals block
  const discountRow = discount > 0 && (
    <div className="flex justify-between text-emerald-300">
      <span>Discount</span><span>-{formatCurrency(discount)}</span>
    </div>
  );

  return (
    <div className="site-container">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      {err && (
        <div
          ref={errorRef}
          className="mb-4 rounded-lg border border-rose-700/40 bg-rose-900/20 px-4 py-2 text-rose-200"
        >
          {err}
        </div>
      )}

      {shortages && shortages.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-amber-100">
          <div className="font-semibold mb-1">Item availability</div>
          <ul className="list-disc pl-5 text-sm">
            {shortages.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name}</span>: requested{" "}
                <span className="tabular-nums">{s.requested}</span>, available{" "}
                <span className="tabular-nums">{s.available}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-200/90">
            Please reduce the quantity of the items above or remove them to continue.
          </p>
        </div>
      )}

      {/* Desktop: 2+1 grid so summary never collapses under shipping section */}
      <form onSubmit={place} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* LEFT (md: span 2) */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="field" placeholder="First name" value={bill.firstName} onChange={updBill("firstName")} required />
            <input className="field" placeholder="Last name" value={bill.lastName} onChange={updBill("lastName")} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="field" type="email" placeholder="Email" value={bill.email} onChange={updBill("email")} required />
            <input className="field" type="tel" placeholder="Phone" value={bill.phone} pattern="[0-9]{10}" title="Enter a valid 10-digit phone number" onChange={updBill("phone")} required />
          </div>

          <input className="field" placeholder="Street address" value={bill.address} onChange={updBill("address")} required />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="field" placeholder="Town / City" value={bill.city} onChange={updBill("city")} required />
            <input className="field" placeholder="Postcode / ZIP (optional)" value={bill.postal} onChange={updBill("postal")} />
          </div>

          <textarea className="textarea" placeholder="Order notes (optional)" value={bill.notes} onChange={updBill("notes")} />

          {/* Ship to different */}
          <div className="panel p-4 space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={shipDifferent} onChange={(e) => setShipDifferent(e.target.checked)} />
              <span className="text-slate-200">Ship to a different address</span>
            </label>

            {shipDifferent && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="field" placeholder="Recipient first name" value={ship.firstName} onChange={updShip("firstName")} required />
                  <input className="field" placeholder="Recipient last name" value={ship.lastName} onChange={updShip("lastName")} required />
                </div>
                <input className="field" type="tel" placeholder="Recipient phone" value={ship.phone} pattern="[0-9]{10}" title="Enter a valid 10-digit phone number" onChange={updShip("phone")} required />
                <input className="field" placeholder="Street address" value={ship.address} onChange={updShip("address")} required />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input className="field" placeholder="Town / City" value={ship.city} onChange={updShip("city")} required />
                  <input className="field" placeholder="Postcode / ZIP (optional)" value={ship.postal} onChange={updShip("postal")} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (sticky summary) */}
        <div className="md:col-span-1 md:sticky md:top-24 self-start">
          <div className="panel p-4 space-y-4">
            <h2 className="text-lg font-semibold">Your order</h2>

            <div className="space-y-2 text-sm text-slate-300">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <div className="truncate">{it.name} × {it.quantity}</div>
                  <div className="shrink-0">{formatCurrency(it.price * it.quantity)}</div>
                </div>
              ))}
            </div>

            {/* One input for promo OR store credit — unified */}
            <div className="mt-2">
              {applied ? (
                <div className="flex justify-between rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-emerald-200">
                  <span>Code <b>{applied.code}</b> applied</span>
                  <button type="button" onClick={removeCode} className="btn-ghost">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="field w-full"
                    placeholder="Promotion / Store credit code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={applyCode}
                    disabled={checking}
                  >
                    {checking ? "Checking…" : "Apply"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-2 border-t border-slate-700/60 pt-2 text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discountRow}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{applied?.freeShipping ? "Free" : formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="pay" value="COD" checked={bill.payment === "COD"} onChange={() => setBill((f) => ({ ...f, payment: "COD" }))} />
                <span>Cash on delivery</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="pay" value="BANK" checked={bill.payment === "BANK"} onChange={() => setBill((f) => ({ ...f, payment: "BANK" }))} />
                <span>Direct bank transfer</span>
              </label>

              {bill.payment === "BANK" && (
                <div className="space-y-3 rounded-lg border border-slate-700/60 p-3">
                  <div className="text-sm">
                    <div><b>Bank:</b> Commercial Bank PLC</div>
                    <div><b>Branch:</b> Peradeniya</div>
                    <div><b>Account No:</b> 8012454613</div>
                    <div><b>Contact:</b> 0760703523</div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Upload bank slip</label>
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} required />
                  </div>
                </div>
              )}
            </div>

            {/* Agree + Printed invoice (new checkbox placed right below, as requested) */}
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="text-slate-200">
                I agree to the <Link href="/policies" className="underline">Terms & Conditions</Link>.
              </span>
            </label>

            <label className="mt-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={wantsPrintedInvoice}
                onChange={(e) => setWantsPrintedInvoice(e.target.checked)}
              />
              <span className="text-slate-200">Would you like a printed invoice with your order? A digital copy is sent automatically.</span>
            </label>

            <button className="btn-primary w-full mt-2" disabled={busy}>
              {busy ? "Placing…" : "Place Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
