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

  // Promo / Store credit
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<PromoResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Errors/loading
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Shortages from server
  const [shortages, setShortages] = useState<Shortage[] | null>(null);

  // Refs for auto-scroll
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

  /** Apply code */
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
    const r = await fetch("/api/upload", { method: "POST", body: fd });
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
          promoCode: applied?.code,
          bankSlipUrl,
          shipping,
          customer: bill,
          shipDifferent,
          shippingAddress,
        }),
      });

      if (r.status === 409) {
        const data = await r.json().catch(() => ({}));
        const arr = Array.isArray(data?.shortages) ? data.shortages : [];
        if (arr.length) setShortages(arr as Shortage[]);
        setErr(data?.error || "Some items are not available in the requested quantity.");
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

  /* --- Show toast + scroll when err changes --- */
  useEffect(() => {
    if (err) {
      toast.error(err);
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [err]);

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

      {/* Form */}
      <form onSubmit={place} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* LEFT */}
        <div className="md:col-span-2 space-y-4">
          {/* name, email, phone, etc. — unchanged */}
          {/* ... keep your same fields here ... */}
        </div>

        {/* RIGHT (order summary) */}
        <div className="md:col-span-1 md:sticky md:top-24 self-start">
          {/* order summary, promo code, totals, payment, terms, place order button — unchanged */}
        </div>
      </form>
    </div>
  );
}