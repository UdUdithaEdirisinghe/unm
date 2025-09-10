import { promises as fs } from "fs";
import path from "path";

export type Promo = {
  code: string;
  type: "percent" | "fixed" | "freeShipping";
  value?: number;          // percent (e.g. 10) or fixed LKR
  enabled: boolean;
  startsAt?: string;       // ISO
  endsAt?: string;         // ISO
};

const PROMOS_FILE = path.join(process.cwd(), "src", "data", "promos.json");
// If your data folder is at project root (not under src/), change the line above to:
// const PROMOS_FILE = path.join(process.cwd(), "data", "promos.json");

// ---------------- utils ----------------
async function safeRead(file: string, fallback: string) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, fallback, "utf8");
    return fallback;
  }
}

// ---------------- persistence ----------------
export async function readPromos(): Promise<Promo[]> {
  const raw = await safeRead(PROMOS_FILE, "[]");
  return JSON.parse(raw) as Promo[];
}

export async function writePromos(promos: Promo[]) {
  await fs.mkdir(path.dirname(PROMOS_FILE), { recursive: true });
  await fs.writeFile(PROMOS_FILE, JSON.stringify(promos, null, 2), "utf8");
}

// ---------------- logic ----------------
export const isPromoActive = (p: Promo): boolean => {
  if (!p.enabled) return false;
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return false;
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return false;
  return true;
};

export const computeDiscount = (
  p: Promo,
  subtotal: number
): { discount: number; freeShipping: boolean } => {
  if (!isPromoActive(p)) return { discount: 0, freeShipping: false };

  let discount = 0;
  let freeShipping = false;

  if (p.type === "percent" && p.value != null) {
    discount = Math.floor((Math.max(0, subtotal) * p.value) / 100);
  } else if (p.type === "fixed" && p.value != null) {
    discount = Math.min(p.value, Math.max(0, subtotal));
  } else if (p.type === "freeShipping") {
    freeShipping = true;
  }

  return { discount, freeShipping };
};