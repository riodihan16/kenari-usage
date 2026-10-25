const decimal2 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const plain = new Intl.NumberFormat("id-ID");
const compact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function fmtMicroRp(micro: number): string {
  return "Rp " + decimal2.format(micro / 1_000_000);
}

export function fmtRp(value: number): string {
  return "Rp " + decimal2.format(value);
}

export function fmtNumber(value: number): string {
  return decimal2.format(value);
}

export function fmtInt(value: number): string {
  return plain.format(value);
}

export function fmtTokens(value: number): string {
  return compact.format(value);
}

export function fmtPct(frac: number): string {
  return pct1.format(frac * 100) + "%";
}

export function fmtTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function pageCount(total: number, limit: number): number {
  const safeLimit = limit > 0 ? limit : total;
  return Math.max(1, Math.ceil(total / safeLimit));
}
