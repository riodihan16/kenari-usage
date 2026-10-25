import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { $ } from "./dom";
import {
  errMsg,
  fetchQuota,
  openMainWindow,
  quitApp,
  setCompactDragging,
  type Quota,
  type QuotaWindow,
} from "./kenari";
import { fmtPct, fmtRp } from "./format";

const bubble = $("bubble");
const ringFill = document.querySelector<SVGCircleElement>("#ring-fill");
// Outside a Tauri window (a browser preview) there is no app window to drag.
const appWindow = "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null;

function pop(): void {
  bubble.classList.remove("pop");
  void bubble.offsetWidth;
  bubble.classList.add("pop");
}

function setExpanded(expanded: boolean): void {
  document.body.classList.toggle("expanded", expanded);
}

function attachDrag(el: HTMLElement): void {
  el.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select")) return;
    event.preventDefault();
    setCompactDragging(true).catch(() => undefined);
    appWindow?.startDragging().catch(() => undefined);
  });
}

function windowRow(label: string, window: QuotaWindow, alertPct: number): string {
  const pct = Math.min(window.used_frac * 100, 100);
  const warn = window.used_frac * 100 >= alertPct;
  return `<div class="cc-win">
    <div class="cc-win-head">
      <span>${label}</span>
      <span class="${warn ? "warn" : "muted"}">${fmtPct(window.used_frac)}</span>
    </div>
    <div class="cc-bar"><div class="cc-bar-fill ${warn ? "warn" : ""}" style="--frac:${(pct / 100).toFixed(4)}"></div></div>
    <div class="muted small">${fmtRp(window.used_rp)} dari ${fmtRp(window.budget_rp)}. Sisa ${fmtRp(window.remaining_rp)}.</div>
  </div>`;
}

function render(quota: Quota): void {
  const week = quota.plan?.windows?.week ?? null;
  const frac = week ? Math.max(0, Math.min(week.used_frac, 1)) : 0;
  $("ring-pct").textContent = week ? `${Math.round(frac * 100)}%` : "…";
  if (ringFill) ringFill.style.strokeDashoffset = String(100 - frac * 100);
  bubble.classList.toggle(
    "warn",
    week != null && week.used_frac * 100 >= quota.alert_pct,
  );

  $("cc-plan").textContent = quota.plan?.name ? `(${quota.plan.name})` : "";
  const parts: string[] = [];
  const windows = quota.plan?.windows;
  if (windows?.week) parts.push(windowRow("Mingguan", windows.week, quota.alert_pct));
  if (windows?.month) parts.push(windowRow("Bulanan", windows.month, quota.alert_pct));
  $("cc-windows").innerHTML =
    parts.join("") || `<div class="muted small">Tidak ada kuota plan aktif.</div>`;
}

async function refresh(): Promise<void> {
  try {
    render(await fetchQuota());
    $("cc-updated").textContent = `Diperbarui ${new Date().toLocaleTimeString("id-ID", { timeStyle: "short" })}`;
  } catch (error) {
    $("cc-updated").textContent = errMsg(error);
  }
}

attachDrag($("ring-view"));
attachDrag($("cc-head"));

window.addEventListener("mouseup", () => {
  setCompactDragging(false).catch(() => undefined);
});
$("cc-open").addEventListener("click", () => {
  void openMainWindow();
});
$("cc-quit").addEventListener("click", () => {
  void quitApp();
});
// The ring is the window's button: once the card is showing it is hidden, so a
// click can only land before hover expands it, and it opens the dashboard.
$("ring-view").addEventListener("click", () => {
  void openMainWindow();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refresh();
});

const inTauri = "__TAURI_INTERNALS__" in window;
if (inTauri) {
  void listen("compact-expand", () => setExpanded(true)).catch(() => undefined);
  void listen("compact-collapse", () => setExpanded(false)).catch(() => undefined);
  void listen("compact-shown", () => {
    setExpanded(false);
    setCompactDragging(false).catch(() => undefined);
    pop();
    void refresh();
  }).catch(() => undefined);
}

pop();
void refresh();
window.setInterval(() => {
  void refresh();
}, 60000);
