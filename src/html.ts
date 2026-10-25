import { fmtDateTime, fmtPct, fmtRp } from "./format";
import type { QuotaWindow } from "./kenari";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

export function quotaWindowRow(
  label: string,
  window: QuotaWindow,
  alertPct: number,
): string {
  const pct = Math.min(Math.max(window.used_frac * 100, 0), 100);
  const warn = window.used_frac * 100 >= alertPct;
  return `<div class="qwin">
    <div class="qwin-head">
      <span>${label}</span>
      <span class="${warn ? "warn" : "muted"}">${fmtPct(window.used_frac)}, ${fmtRp(window.used_rp)} dari ${fmtRp(window.budget_rp)}</span>
    </div>
    <div class="bar"><div class="bar-fill ${warn ? "warn" : ""}" style="--frac:${(pct / 100).toFixed(4)}"></div></div>
    <div class="sub">Sisa ${fmtRp(window.remaining_rp)}. Reset ${escapeHtml(fmtDateTime(window.resets_at))}.</div>
  </div>`;
}

/**
 * Satu jendela kuota sebagai cincin: cincin menyandikan fraksi terpakai,
 * teks di bawahnya menyandikan angka yang sama supaya tidak bergantung warna.
 */
export function quotaRing(
  label: string,
  window: QuotaWindow,
  alertPct: number,
  variant: "five-hour" | "week" | "month",
): string {
  const frac = Math.min(Math.max(window.used_frac, 0), 1);
  const warn = window.used_frac * 100 >= alertPct;
  const offset = (100 - frac * 100).toFixed(2);
  return `<div class="qwin">
    <div class="qring">
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle class="qring-track" cx="50" cy="50" r="45" pathLength="100" />
        <circle class="qring-fill ${variant === "week" ? "week" : variant === "month" ? "month" : ""} ${warn ? "warn" : ""}" cx="50" cy="50" r="45" pathLength="100" style="stroke-dashoffset:${offset}" />
      </svg>
      <span class="qring-pct">${fmtPct(window.used_frac)}</span>
    </div>
    <span class="qwin-name">${label}</span>
    <span class="qwin-detail"><strong>${fmtRp(window.used_rp)}</strong> dari ${fmtRp(window.budget_rp)}<br />reset ${escapeHtml(fmtDateTime(window.resets_at))}</span>
  </div>`;
}
