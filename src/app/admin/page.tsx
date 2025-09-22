// src/app/admin/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product, Order, OrderStatus } from "../../lib/products";
import type { Promo } from "../../lib/promos";
import type { StoreCredit } from "../../lib/storeCredits";

/* ——— utils ——— */
function fmtLKR(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(safe);
}

/* ——— product draft ——— */
type Draft = {
  id?: string;
  name: string;
  slug: string;
  images: string[];
  brand: string;
  category: string;
  shortDesc: string;
  stock: string;
  price: string;
  salePrice: string;
  specsRows: { key: string; value: string }[];
};
const EMPTY: Draft = {
  name: "",
  slug: "",
  images: [],
  brand: "",
  category: "",
  shortDesc: "",
  stock: "0",
  price: "",
  salePrice: "",
  specsRows: [{ key: "", value: "" }],
};

/* ——— promo draft ——— */
type PromoDraft = {
  code: string;
  type: "percent" | "fixed" | "freeShipping";
  value: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};
const EMPTY_PROMO: PromoDraft = {
  code: "",
  type: "percent",
  value: "",
  enabled: true,
  startsAt: "",
  endsAt: "",
};

/* ——— store credit draft ——— */
type CreditDraft = {
  code: string;
  amount: string;        // LKR
  enabled: boolean;
  minOrderTotal: string; // optional LKR
  startsAt: string;      // yyyy-mm-dd
  endsAt: string;        // yyyy-mm-dd
};
const EMPTY_CREDIT: CreditDraft = {
  code: "",
  amount: "",
  enabled: true,
  minOrderTotal: "",
  startsAt: "",
  endsAt: "",
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [credits, setCredits] = useState<StoreCredit[]>([]);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [pDraft, setPDraft] = useState<PromoDraft>(EMPTY_PROMO);
  const [pMsg, setPMsg] = useState<string | null>(null);
  const [pErr, setPErr] = useState<string | null>(null);
  const [pSaving, setPSaving] = useState(false);

  const [cDraft, setCDraft] = useState<CreditDraft>(EMPTY_CREDIT);
  const [cMsg, setCMsg] = useState<string | null>(null);
  const [cErr, setCErr] = useState<string | null>(null);
  const [cSaving, setCSaving] = useState(false);

  const [orderFilter, setOrderFilter] = useState<OrderStatus | "all">("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // product list filters
  const [productQuery, setProductQuery] = useState("");
  const [productCategory, setProductCategory] = useState<string>("all");

  /** Safe JSON fetch that always returns an array on success, [] on error */
  async function safeGetArray<T = any>(url: string): Promise<T[]> {
    try {
      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok || !Array.isArray(data)) return [];
      return data as T[];
    } catch {
      return [];
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [pr, pm, or, sc] = await Promise.all([
        safeGetArray<Product>("/api/products"),
        safeGetArray<Promo>("/api/promos"),
        safeGetArray<Order>(orderFilter === "all" ? "/api/orders" : `/api/orders?status=${orderFilter}`),
        safeGetArray<StoreCredit>("/api/store-credits"),
      ]);
      setProducts(pr);
      setPromos(pm);
      setOrders(or);
      setCredits(sc);
    } catch (e:any) {
      setErr(e?.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [orderFilter]);

  /* specs rows helpers */
  function addSpecRow() {
    setDraft(d => ({ ...d, specsRows: [...d.specsRows, { key:"", value:"" }] }));
  }
  function updateSpecRow(i:number, key:"key"|"value", v:string) {
    setDraft(d => {
      const next = d.specsRows.slice();
      next[i] = { ...next[i], [key]: v };
      return { ...d, specsRows: next };
    });
  }
  function removeSpecRow(i:number) {
    setDraft(d => {
      const next = d.specsRows.slice();
      next.splice(i,1);
      return { ...d, specsRows: next.length ? next : [{ key:"", value:"" }] };
    });
  }

  /* product handlers */
  function edit(p: Product) {
    const rows: { key:string; value:string }[] = [];
    const s:any = (p as any).specs;
    if (s && !Array.isArray(s) && typeof s === "object") {
      Object.entries(s).forEach(([k,v]) => rows.push({ key:String(k), value:String(v ?? "") }));
    }
    if (!rows.length) rows.push({ key:"", value:"" });

    setDraft({
      id: p.id,
      name: p.name,
      slug: p.slug,
      images: (p.images && p.images.length ? p.images : [p.image]).slice(),
      brand: p.brand ?? "",
      category: (p as any).category ?? "",
      shortDesc: p.shortDesc ?? "",
      stock: String(p.stock ?? 0),
      price: String(p.price),
      salePrice: p.salePrice != null ? String(p.salePrice) : "",
      specsRows: rows,
    });
    setMsg(null); setErr(null);
  }
  function reset() {
    setDraft(EMPTY); setErr(null); setMsg(null);
  }

  function bodyFromDraft(): any {
    const imgs = draft.images
      .map(s => String(s || "").trim())
      .filter(Boolean)
      .map(s => (s.startsWith("/") || /^https?:\/\//i.test(s) ? s : `/${s}`));
    const price = Number(draft.price);
    const sale = draft.salePrice.trim() ? Number(draft.salePrice) : undefined;
    const specsEntries = draft.specsRows.map(r => ({ k:r.key.trim(), v:r.value.trim() })).filter(r => r.k && r.v);
    const specs = specsEntries.length ? Object.fromEntries(specsEntries.map(r => [r.k, r.v])) : undefined;
    return {
      id: draft.id,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      image: imgs[0] || "",
      images: imgs,
      brand: draft.brand.trim(),
      category: draft.category.trim() || null,
      shortDesc: draft.shortDesc.trim(),
      specs,
      stock: Number(draft.stock) || 0,
      price,
      salePrice: sale,
    };
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true); setErr(null); setMsg(null);
    try {
      const body = bodyFromDraft();
      if (!body.name || !body.slug || !Number.isFinite(body.price) || !Array.isArray(body.images) || body.images.length === 0) {
        throw new Error("Please fill name, slug, a valid price, and add at least one image.");
      }
      const method = body.id ? "PUT" : "POST";
      const url = body.id ? `/api/products/${body.id}` : "/api/products";
      const r = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.text()) || "Save failed");
      await load();
      setMsg(body.id ? "Product updated." : "Product created.");
      if (!body.id) setDraft(EMPTY);
    } catch (e:any) {
      setErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function del(id?: string) {
    const target = id ?? draft.id;
    if (!target) return;
    if (!confirm("Delete this product?")) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      const r = await fetch(`/api/products/${target}`, { method:"DELETE" });
      if (!r.ok) throw new Error(await r.text());
      await load();
      if (draft.id === target) reset();
      setMsg("Deleted.");
    } catch (e:any) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  // MULTI upload (product images)
  async function uploadImages(files: FileList | null) {
    if (!files || !files.length) return;
    const added: string[] = [];
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload?kind=product", { method:"POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Upload failed");
      if (data.path) added.push(data.path);
    }
    if (added.length) setDraft(d => ({ ...d, images: [...d.images, ...added] }));
  }
  function removeImage(i:number) {
    setDraft(d => { const next = d.images.slice(); next.splice(i,1); return { ...d, images: next }; });
  }
  function makePrimary(i:number) {
    setDraft(d => {
      if (i <= 0 || i >= d.images.length) return d;
      const next = d.images.slice();
      const [img] = next.splice(i,1);
      next.unshift(img);
      return { ...d, images: next };
    });
  }

  async function logout() {
    await fetch("/api/admin/logout", { method:"POST" });
    location.href = "/admin/login";
  }

  const savingText = useMemo(() => (saving ? "Saving…" : "Save"), [saving]);

  /* ---------- PROMOS ---------- */
  function resetPromo() { setPDraft(EMPTY_PROMO); setPMsg(null); setPErr(null); }
  function editPromo(p: Promo) {
    setPDraft({
      code: p.code,
      type: p.type,
      value: p.value != null ? String(p.value) : "",
      enabled: p.enabled,
      startsAt: p.startsAt ? new Date(p.startsAt).toISOString().slice(0,10) : "",
      endsAt: p.endsAt ? new Date(p.endsAt).toISOString().slice(0,10) : "",
    });
    setPMsg(null); setPErr(null);
  }
  async function savePromo(e?: React.FormEvent) {
    e?.preventDefault();
    setPSaving(true); setPErr(null); setPMsg(null);
    try {
      const body = {
        code: pDraft.code.trim().toUpperCase(),
        type: pDraft.type,
        value: pDraft.type === "freeShipping" ? undefined : Number(pDraft.value || 0),
        enabled: pDraft.enabled,
        startsAt: pDraft.startsAt ? new Date(`${pDraft.startsAt}T00:00:00`).toISOString() : undefined,
        endsAt: pDraft.endsAt ? new Date(`${pDraft.endsAt}T23:59:59`).toISOString() : undefined,
      };
      const exists = promos.some(p => p.code === body.code);
      const method = exists ? "PUT" : "POST";
      const url = exists ? `/api/promos/${body.code}` : "/api/promos";
      const r = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Save failed");
      setPMsg(exists ? "Promo updated." : "Promo created.");
      setPromos(await safeGetArray<Promo>("/api/promos"));
      if (!exists) resetPromo();
    } catch (e:any) {
      setPErr(e?.message ?? "Save failed");
    } finally {
      setPSaving(false);
    }
  }
  async function deletePromo(code:string) {
    if (!confirm(`Delete promo ${code}?`)) return;
    const r = await fetch(`/api/promos/${code}`, { method:"DELETE" });
    if (r.ok) setPromos(await safeGetArray<Promo>("/api/promos"));
  }

  /* ---------- STORE CREDIT ---------- */
  function resetCredit() { setCDraft(EMPTY_CREDIT); setCMsg(null); setCErr(null); }
  function editCredit(c: StoreCredit) {
    setCDraft({
      code: c.code,
      amount: String(c.amount ?? ""),
      enabled: c.enabled,
      minOrderTotal: c.minOrderTotal != null ? String(c.minOrderTotal) : "",
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().slice(0,10) : "",
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().slice(0,10) : "",
    });
    setCMsg(null); setCErr(null);
  }
  async function saveCredit(e?: React.FormEvent) {
    e?.preventDefault();
    setCSaving(true); setCErr(null); setCMsg(null);
    try {
      const body = {
        code: cDraft.code.trim().toUpperCase(),
        amount: Number(cDraft.amount || 0),
        enabled: cDraft.enabled,
        minOrderTotal: cDraft.minOrderTotal ? Number(cDraft.minOrderTotal) : undefined,
        startsAt: cDraft.startsAt ? new Date(`${cDraft.startsAt}T00:00:00`).toISOString() : undefined,
        endsAt: cDraft.endsAt ? new Date(`${cDraft.endsAt}T23:59:59`).toISOString() : undefined,
      };
      if (!body.code || !Number.isFinite(body.amount) || body.amount <= 0) {
        throw new Error("Enter a code and a positive amount.");
      }
      const exists = credits.some(c => c.code === body.code);
      const method = exists ? "PUT" : "POST";
      const url = exists ? `/api/store-credits/${body.code}` : "/api/store-credits";
      const r = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Save failed");
      setCMsg(exists ? "Store credit updated." : "Store credit created.");
      setCredits(await safeGetArray<StoreCredit>("/api/store-credits"));
      if (!exists) resetCredit();
    } catch (e:any) {
      setCErr(e?.message ?? "Save failed");
    } finally {
      setCSaving(false);
    }
  }
  async function deleteCredit(code:string) {
    if (!confirm(`Delete store credit ${code}?`)) return;
    const r = await fetch(`/api/store-credits/${code}`, { method:"DELETE" });
    if (r.ok) setCredits(await safeGetArray<StoreCredit>("/api/store-credits"));
  }

  /* ---------- Orders helpers ---------- */
  async function setOrderStatus(id: string, status: OrderStatus) {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)));
    const r = await fetch(`/api/orders/${id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      const text = await r.text();
      setErr(text || "Failed to update order status.");
      await load();
    } else {
      await load();
    }
  }

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim();
    if (!q) return orders;
    return orders.filter(o => o.id.toLowerCase().includes(q.toLowerCase()));
  }, [orders, orderQuery]);

  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      const c = (p as any).category?.toString().trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a,b) => a.localeCompare(b));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const cat = productCategory;
    return products.filter(p => {
      const matchesText = !q
        || p.name.toLowerCase().includes(q)
        || (p.brand ?? "").toLowerCase().includes(q)
        || (p.slug ?? "").toLowerCase().includes(q);
      const c = (p as any).category?.toString() ?? "";
      const matchesCat = cat === "all" || c === cat;
      return matchesText && matchesCat;
    });
  }, [products, productQuery, productCategory]);

  /* ——— UI ——— */
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </div>

      {err && <div className="mb-3 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">{err}</div>}
      {msg && <div className="mb-3 rounded border border-emerald-800/50 bg-emerald-900/30 px-3 py-2 text-emerald-100">{msg}</div>}

      {/* PRODUCTS FORM */}
      <h2 className="mb-2 text-lg font-semibold">Products</h2>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 md:grid-cols-2">
        <input className="field" placeholder="Accessory name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/>
        <input className="field" placeholder="Slug (e.g. powerbank-10k)" value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })}/>
        {/* Images */}
        <div className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-slate-200">Images</div>
            <label className="btn-secondary cursor-pointer">Upload
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadImages(e.target.files).catch(er => setErr(er.message))}/>
            </label>
          </div>
          {draft.images.length === 0 ? (
            <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-3 text-sm text-slate-400">
              No images yet. Upload one or more (first image becomes the product’s primary image).
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {draft.images.map((src,i) => (
                <div key={i} className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`img-${i}`} className="h-28 w-full object-contain rounded bg-slate-900/40"/>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" className="btn-ghost text-rose-300 hover:text-rose-200" onClick={() => removeImage(i)}>Remove</button>
                    {i !== 0 ? (
                      <button type="button" className="btn-secondary" onClick={() => makePrimary(i)}>Make primary</button>
                    ) : <span className="text-xs text-emerald-300">Primary</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <input className="field" placeholder="Brand (e.g. Baseus, Anker)" value={draft.brand} onChange={e => setDraft({ ...draft, brand: e.target.value })}/>
        <input className="field" placeholder="Category (e.g. Power Banks)" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/>
        <textarea className="textarea md:col-span-2" placeholder="Short description" value={draft.shortDesc} onChange={e => setDraft({ ...draft, shortDesc: e.target.value })}/>

        {/* Dynamic specs */}
        <div className="md:col-span-2 rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-slate-200">Specifications</div>
            <button type="button" className="btn-secondary" onClick={addSpecRow}>+ Add spec</button>
          </div>
          <div className="space-y-2">
            {draft.specsRows.map((row,i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1fr,auto]">
                <input className="field" placeholder="Label (e.g. Capacity)" value={row.key} onChange={e => updateSpecRow(i,"key", e.target.value)}/>
                <input className="field" placeholder="Value (e.g. 10,000 mAh)" value={row.value} onChange={e => updateSpecRow(i,"value", e.target.value)}/>
                <button type="button" className="btn-ghost text-rose-300 hover:text-rose-200" onClick={() => removeSpecRow(i)}>Remove</button>
              </div>
            ))}
            <p className="text-xs text-slate-400">Tip: Capacity, Output, Color, Ports, Warranty…</p>
          </div>
        </div>

        <input className="field" placeholder="Stock" inputMode="numeric" value={draft.stock} onChange={e => setDraft({ ...draft, stock: e.target.value })}/>
        <input className="field" placeholder="Price (LKR)" inputMode="numeric" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })}/>
        <input className="field" placeholder="Sale price (optional)" inputMode="numeric" value={draft.salePrice} onChange={e => setDraft({ ...draft, salePrice: e.target.value })}/>

        <div className="md:col-span-2 mt-2 flex items-center justify-end gap-2">
          {draft.id && <button type="button" className="btn-ghost" onClick={reset}>New</button>}
          <button type="submit" className="btn-primary" disabled={saving}>{savingText}</button>
        </div>
      </form>

      {/* PRODUCTS LIST + filters */}
      <div className="mt-6 rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-semibold">Products</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input className="field w-full sm:w-60" placeholder="Search name / brand / slug" value={productQuery} onChange={e => setProductQuery(e.target.value)}/>
            <select className="field w-full sm:w-56" value={productCategory} onChange={e => setProductCategory(e.target.value)} title="Filter by category">
              <option value="all">All categories</option>
              {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn-ghost" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          </div>
        </div>

        {visibleProducts.length === 0 ? (
          <p className="text-sm text-slate-400">No products.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleProducts.map(p => {
              const onSale = p.salePrice && p.salePrice > 0 && p.salePrice < p.price;
              const cat = (p as any).category || "";
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-slate-400 truncate">{p.slug}{cat ? ` • ${cat}` : ""}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {onSale ? (
                        <>
                          <span className="text-xs text-slate-400 line-through">{fmtLKR(p.price)}</span>
                          <span className="inline-flex items-center rounded-full bg-indigo-800 px-2 py-0.5 text-xs text-indigo-100">{fmtLKR(p.salePrice!)}</span>
                        </>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">{fmtLKR(p.price)}</span>
                      )}
                      <span className="text-xs text-slate-400">• Stock {p.stock ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button className="btn-secondary" onClick={() => edit(p)}>Edit</button>
                    <button className="btn-ghost text-rose-400 hover:text-rose-300" onClick={() => del(p.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROMOTIONS */}
      <h2 className="mt-10 mb-2 text-lg font-semibold">Promotions</h2>
      {pErr && <div className="mb-3 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">{pErr}</div>}
      {pMsg && <div className="mb-3 rounded border border-emerald-800/50 bg-emerald-900/30 px-3 py-2 text-emerald-100">{pMsg}</div>}

      <form onSubmit={savePromo} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 md:grid-cols-4">
        <input className="field md:col-span-1" placeholder="CODE (UPPERCASE)" value={pDraft.code} onChange={e => setPDraft({ ...pDraft, code: e.target.value.toUpperCase() })}/>
        <select className="field" value={pDraft.type} onChange={e => setPDraft({ ...pDraft, type: e.target.value as any })}>
          <option value="percent">Percent %</option>
          <option value="fixed">Fixed (LKR)</option>
          <option value="freeShipping">Free shipping</option>
        </select>
        <input className="field" placeholder={pDraft.type === "percent" ? "% (e.g. 10)" : pDraft.type === "fixed" ? "Amount (LKR)" : "N/A"} value={pDraft.value} onChange={e => setPDraft({ ...pDraft, value: e.target.value })} disabled={pDraft.type === "freeShipping"}/>
        <label className="field flex items-center gap-2">
          <input type="checkbox" checked={pDraft.enabled} onChange={e => setPDraft({ ...pDraft, enabled: e.target.checked })}/>
          <span>Enabled</span>
        </label>
        <input type="date" className="field" value={pDraft.startsAt} onChange={e => setPDraft({ ...pDraft, startsAt: e.target.value })}/>
        <input type="date" className="field" value={pDraft.endsAt} onChange={e => setPDraft({ ...pDraft, endsAt: e.target.value })}/>
        <div className="md:col-span-4 flex items-center justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={resetPromo}>New</button>
          <button type="submit" className="btn-primary" disabled={pSaving}>{pSaving ? "Saving…" : "Save promo"}</button>
        </div>
      </form>

      <div className="mt-4 rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
        {promos.length === 0 ? <p className="text-sm text-slate-400">No promotions.</p> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {promos.map(pm => (
              <div key={pm.code} className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] p-3">
                <div className="min-w-0">
                  <div className="font-medium">{pm.code}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {pm.type === "percent" && `Discount: ${pm.value}%`}
                    {pm.type === "fixed" && `Discount: LKR ${pm.value}`}
                    {pm.type === "freeShipping" && `Free shipping`}
                    {pm.startsAt && ` • From ${new Date(pm.startsAt).toLocaleDateString()}`}
                    {pm.endsAt && ` • Until ${new Date(pm.endsAt).toLocaleDateString()}`}
                    {pm.enabled ? " • Enabled" : " • Disabled"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="btn-secondary" onClick={() => editPromo(pm)}>Edit</button>
                  <button className="btn-ghost text-rose-400 hover:text-rose-300" onClick={() => deletePromo(pm.code)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STORE CREDIT */}
      <h2 className="mt-10 mb-2 text-lg font-semibold">Store Credit</h2>
      {cErr && <div className="mb-3 rounded border border-rose-800/50 bg-rose-900/30 px-3 py-2 text-rose-100">{cErr}</div>}
      {cMsg && <div className="mb-3 rounded border border-emerald-800/50 bg-emerald-900/30 px-3 py-2 text-emerald-100">{cMsg}</div>}

      <form onSubmit={saveCredit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4 md:grid-cols-5">
        <input className="field" placeholder="CODE (UPPERCASE)" value={cDraft.code} onChange={e => setCDraft({ ...cDraft, code: e.target.value.toUpperCase() })}/>
        <input className="field" inputMode="numeric" placeholder="Amount (LKR)" value={cDraft.amount} onChange={e => setCDraft({ ...cDraft, amount: e.target.value })}/>
        <input className="field" inputMode="numeric" placeholder="Min order total (optional)" value={cDraft.minOrderTotal} onChange={e => setCDraft({ ...cDraft, minOrderTotal: e.target.value })}/>
        <input type="date" className="field" value={cDraft.startsAt} onChange={e => setCDraft({ ...cDraft, startsAt: e.target.value })}/>
        <input type="date" className="field" value={cDraft.endsAt} onChange={e => setCDraft({ ...cDraft, endsAt: e.target.value })}/>
        <label className="field flex items-center gap-2 md:col-span-5">
          <input type="checkbox" checked={cDraft.enabled} onChange={e => setCDraft({ ...cDraft, enabled: e.target.checked })}/>
          <span>Enabled</span>
        </label>
        <div className="md:col-span-5 flex items-center justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={resetCredit}>New</button>
          <button type="submit" className="btn-primary" disabled={cSaving}>{cSaving ? "Saving…" : "Save store credit"}</button>
        </div>
      </form>

      <div className="mt-4 rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
        {credits.length === 0 ? <p className="text-sm text-slate-400">No store credits.</p> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {credits.map(sc => (
              <div key={sc.code} className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] p-3">
                <div className="min-w-0">
                  <div className="font-medium">{sc.code}</div>
                  <div className="text-xs text-slate-400 truncate">
                    Amount: {fmtLKR(sc.amount)}
                    {sc.minOrderTotal ? ` • Min: ${fmtLKR(sc.minOrderTotal)}` : ""}
                    {sc.startsAt && ` • From ${new Date(sc.startsAt).toLocaleDateString()}`}
                    {sc.endsAt && ` • Until ${new Date(sc.endsAt).toLocaleDateString()}`}
                    {sc.enabled ? " • Enabled" : " • Disabled"}
                    {sc.usedAt ? ` • Used ${new Date(sc.usedAt).toLocaleDateString()} (#${sc.usedOrderId || "-"})` : " • Unused"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!sc.usedAt && <button className="btn-secondary" onClick={() => editCredit(sc)}>Edit</button>}
                  <button className="btn-ghost text-rose-400 hover:text-rose-300" onClick={() => deleteCredit(sc.code)} disabled={!!sc.usedAt}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ORDERS */}
      <h2 className="mt-10 mb-2 text-lg font-semibold">Orders</h2>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-300">Filter:</span>
        <select className="field" value={orderFilter} onChange={e => setOrderFilter(e.target.value as any)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input className="field w-48" placeholder="Search order #" value={orderQuery} onChange={e => setOrderQuery(e.target.value)}/>
        <button className="btn-ghost" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-4">
        {filteredOrders.length === 0 ? (
          <p className="text-sm text-slate-400">No orders.</p>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(o => {
              const open = expanded === o.id;
              return (
                <div key={o.id} className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">#{o.id}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(o.createdAt).toLocaleString()} • {o.customer.firstName} {o.customer.lastName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">{fmtLKR(o.total)}</span>
                      <select className="field" value={o.status} onChange={e => setOrderStatus(o.id, e.target.value as any)}>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="shipped">Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Link className="btn-secondary" href={`/admin/orders/${o.id}`}>Details</Link>
                      <button className="btn-ghost" onClick={() => setExpanded(open ? null : o.id)}>{open ? "Hide" : "Quick view"}</button>
                    </div>
                  </div>

                  {open && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
                        <div className="font-semibold mb-1">Customer</div>
                        <div className="text-sm text-slate-300">
                          {o.customer.firstName} {o.customer.lastName}<br/>
                          {o.customer.email}<br/>
                          {o.customer.phone || "No phone"}<br/>
                          {o.customer.address}, {o.customer.city} {o.customer.postal || ""}
                        </div>
                        {(o.customer as any).shipToDifferent && (
                          <div className="mt-3">
                            <div className="font-semibold mb-1">Ship to (different)</div>
                            <div className="text-sm text-slate-300">
                              {(() => {
                                const s:any = (o.customer as any).shipToDifferent;
                                const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(" ");
                                return (<>
                                  {name}<br/>{s.phone}<br/>{s.address}, {s.city} {s.postal || ""}
                                </>);
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.3)] p-3">
                        <div className="font-semibold mb-1">Items</div>
                        <ul className="text-sm text-slate-300 list-disc pl-5">
                          {o.items.map((it:any) => <li key={it.id}>{it.name} × {it.quantity}</li>)}
                        </ul>
                        <div className="mt-2 text-sm text-slate-300">
                          Subtotal: {fmtLKR(o.subtotal)}<br/>
                          {o.promoCode && (
                            <>Discount ({o.promoCode}): −{fmtLKR(o.promoDiscount ?? 0)}<br/></>
                          )}
                          Shipping: {fmtLKR(o.shipping)}{o.freeShipping ? " (free)" : ""}<br/>
                          <span className="font-semibold">Total: {fmtLKR(o.total)}</span>
                        </div>
                        {o.paymentMethod === "BANK" && (
                          <div className="mt-2 text-sm text-slate-300">
                            Payment: Direct bank transfer<br/>
                            {o.bankSlipUrl ? (
                              <a className="text-brand-accent hover:underline" href={o.bankSlipUrl} target="_blank" rel="noreferrer">View bank slip</a>
                            ) : <>Bank slip: {o.bankSlipName || "—"}</>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}