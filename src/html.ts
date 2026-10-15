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
      <span class="${warn ? "warn" : "muted"}">${fmtPct(window.used_frac)} · ${fmtRp(window.used_rp)} / ${fmtRp(window.budget_rp)}</span>
    </div>
    <div class="bar"><div class="bar-fill ${warn ? "warn" : ""}" style="--frac:${(pct / 100).toFixed(4)}"></div></div>
    <div class="sub">sisa ${fmtRp(window.remaining_rp)} · reset ${escapeHtml(fmtDateTime(window.resets_at))}</div>
  </div>`;
}
