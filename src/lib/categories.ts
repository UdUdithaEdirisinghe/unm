// Centralized category normalization

export const CATEGORY_MAP: Record<string, string> = {
  "power bank": "power-banks",
  "powerbank": "power-banks",
  "power banks": "power-banks",
  "power-banks": "power-banks",

  "adapter": "chargers",
  "adaptor": "chargers",
  "adapters": "chargers",
  "charger": "chargers",
  "chargers": "chargers",

  "cable": "cables",
  "cables": "cables",
  "usb": "cables",
  "type c": "cables",
  "type-c": "cables",
  "lightning": "cables",
  "micro usb": "cables",

  "bag": "bags",
  "bags": "bags",
  "backpack": "bags",
  "sleeve": "bags",
  "case": "bags",

  "earbud": "audio",
  "earbuds": "audio",
  "headphone": "audio",
  "headphones": "audio",
  "headset": "audio",
  "speaker": "audio",
  "speakers": "audio",
  "audio": "audio",
};

export function normalizeCategory(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return CATEGORY_MAP[key] ?? key; // fallback → lowercase key
}