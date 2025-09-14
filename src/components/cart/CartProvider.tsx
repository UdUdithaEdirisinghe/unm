"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setQuantity: (id: string, qty: number) => void;
  setQty: (id: string, qty: number) => void;
  inc: (id: string, step?: number) => void;
  dec: (id: string, step?: number) => void;
  count: number;
  subtotal: number;
  total: number;
};

const CartContext = createContext<CartState | undefined>(undefined);
const STORAGE_KEY = "cart:v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add: CartState["add"] = (item, qty = 1) => {
    const step = Math.max(1, Math.floor(qty));
    setItems(prev => {
      const existing = prev.find(it => it.id === item.id);
      if (existing) return prev.map(it => it.id === item.id ? { ...it, quantity: it.quantity + step } : it);
      return [...prev, { ...item, quantity: step }];
    });
  };
  const remove: CartState["remove"] = (id) => setItems(prev => prev.filter(it => it.id !== id));
  const clear: CartState["clear"] = () => setItems([]);
  const setQuantity: CartState["setQuantity"] = (id, qty) => {
    const q = Math.max(0, Math.floor(Number(qty) || 0));
    setItems(prev => (q <= 0 ? prev.filter(it => it.id !== id) : prev.map(it => it.id === id ? { ...it, quantity: q } : it)));
  };
  const setQty = setQuantity;
  const inc: CartState["inc"] = (id, step = 1) => setItems(prev => prev.map(it => it.id === id ? { ...it, quantity: it.quantity + Math.max(1, Math.floor(step)) } : it));
  const dec: CartState["dec"] = (id, step = 1) =>
    setItems(prev => {
      const s = Math.max(1, Math.floor(step));
      return prev.flatMap(it => {
        if (it.id !== id) return it;
        const next = it.quantity - s;
        return next <= 0 ? [] : [{ ...it, quantity: next }];
      });
    });

  const count = useMemo(() => items.reduce((n, it) => n + (Number(it.quantity) || 0), 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0), [items]);
  const total = subtotal;

  const value = useMemo<CartState>(() => ({ items, add, remove, clear, setQuantity, setQty, inc, dec, count, subtotal, total }), [items, count, subtotal, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}