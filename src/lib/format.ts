// src/lib/format.ts
export function formatCurrency(n: number, currency = "LKR") {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}