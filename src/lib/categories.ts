// src/lib/categories.ts
export const CATEGORY_MAP: Record<string, string> = {
  "power bank": "power-banks",
  "powerbank": "power-banks",
  "power-banks": "power-banks",

  "adapter": "chargers",
  "adaptor": "chargers",
  "adapters": "chargers",
  "chargers": "chargers",
  "charger": "chargers",

  "cable": "cables",
  "cables": "cables",
  "usb": "cables",
  "type-c": "cables",

  "bag": "bags",
  "backpack": "bags",
  "sleeve": "bags",

  "earbuds": "audio",
  "earbud": "audio",
  "headphones": "audio",
  "headphone": "audio",
  "speaker": "audio",
};

export function normalizeCategory(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return CATEGORY_MAP[key] ?? key; // fallback → raw lowercase
}