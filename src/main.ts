import { Chart } from "chart.js/auto";
import "./styles.css";
import {
  apiKeyStatus,
  clearApiKey,
  enterCompact,
  errMsg,
  fetchBalance,
  fetchKeys,
  fetchQuota,
  fetchUsage,
  fetchUsageDaily,
  fetchUsageLog,
  saveApiKey,
  type AccountKey,
  type Balance,
  type KeyStatus,
  type LogFilters,
  type Quota,
  type QuotaWindow,
  type RangeKey,
  type UsageDaily,
  type UsageLogPage,
  type UsageSummary,
} from "./kenari";
import {
  fmtDateTime,
  fmtInt,
  fmtMicroRp,
  fmtNumber,
  fmtPct,
  fmtRp,
  fmtTime,
  fmtTokens,
} from "./format";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

interface UiState {
  range: RangeKey;
  page: number;
  limit: number;
  billingKind: string;
  model: string;
  apiKeyId: string;
  keys: AccountKey[];
  keyStatus: KeyStatus | null;
  chart: Chart | null;
  timer: number | null;
  refreshSecs: number;
}

const storedRaw = localStorage.getItem("kenari_refresh_secs");
const storedSecs = storedRaw === null ? 60 : Number(storedRaw);
const state: UiState = {
  range: "30d",
  page: 0,
  limit: 50,
  billingKind: "",
  model: "",
  apiKeyId: "",
  keys: [],
  keyStatus: null,
  chart: null,
  timer: null,
  refreshSecs: Number.isFinite(storedSecs) && storedSecs >= 0 ? storedSecs : 60,
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const colorProbe = document.createElement("canvas");
colorProbe.width = 1;
colorProbe.height = 1;

function tokenColor(name: string, alpha = 1): string {
  const ctx = colorProbe.getContext("2d");
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!ctx || !raw) return "transparent";
  ctx.fillStyle = "#000";
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

let toastTimer: number | undefined;

function toast(message: string, isError = false): void {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.add("hidden"), 4000);
}

function renderKeyBadge(): void {
  const badge = $("key-badge");
  const box = $("key-status");
  const status = state.keyStatus;
  if (!status || !status.configured) {
    badge.classList.add("hidden");
    box.textContent = "Belum ada API key. Simpan key untuk mulai.";
    return;
  }
  const label = `${status.masked ?? ""} (${status.source ?? "-"})`;
  badge.textContent = label;
  badge.classList.remove("hidden");
  box.textContent = `Status: aktif · sumber: ${status.source ?? "-"} · ${status.masked ?? ""}`;
}

let balanceRaf = 0;

function animateBalance(target: number): void {
  const el = $("balance-available");
  const from = Number(el.dataset.micro ?? String(target));
  el.dataset.micro = String(target);
  window.cancelAnimationFrame(balanceRaf);
  if (prefersReducedMotion.matches || from === target) {
    el.textContent = fmtMicroRp(target);
    return;
  }
  const start = performance.now();
  const duration = 400;
  const tick = (now: number): void => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmtMicroRp(from + (target - from) * eased);
    if (t < 1) balanceRaf = window.requestAnimationFrame(tick);
  };
  balanceRaf = window.requestAnimationFrame(tick);
}

function renderBalance(balance: Balance): void {
  animateBalance(balance.available_micro_idr);
  $("balance-sub").textContent = `total ${fmtMicroRp(balance.balance_micro_idr)} · tertahan ${fmtMicroRp(balance.reserved_micro_idr)}`;
}

function windowRow(label: string, window: QuotaWindow, alertPct: number): string {
  const pct = Math.min(window.used_frac * 100, 100);
  const warn = window.used_frac * 100 >= alertPct;
  return `<div class="qwin">
    <div class="qwin-head">
      <span>${label}</span>
      <span class="${warn ? "warn" : "muted"}">${fmtPct(window.used_frac)} · ${fmtRp(window.used_rp)} / ${fmtRp(window.budget_rp)}</span>
    </div>
    <div class="bar"><div class="bar-fill ${warn ? "warn" : ""}" style="--frac:${(pct / 100).toFixed(4)}"></div></div>
    <div class="sub">sisa ${fmtRp(window.remaining_rp)} · reset ${fmtDateTime(window.resets_at)}</div>
  </div>`;
}

function renderQuota(quota: Quota): void {
  $("plan-name").textContent = quota.plan?.name ? `· plan ${quota.plan.name}` : "";
  const windows = quota.plan?.windows;
  const parts: string[] = [];
  if (windows?.five_hour) parts.push(windowRow("5 jam", windows.five_hour, quota.alert_pct));
  if (windows?.week) parts.push(windowRow("Mingguan", windows.week, quota.alert_pct));
  if (windows?.month) parts.push(windowRow("Bulanan", windows.month, quota.alert_pct));
  $("quota-windows").innerHTML =
    parts.join("") || `<div class="sub">Tidak ada kuota plan aktif.</div>`;

  const coupon = $("coupon-info");
  if (quota.coupon) {
    const remaining =
      quota.coupon.remaining_rp != null ? ` · sisa ${fmtRp(quota.coupon.remaining_rp)}` : "";
    coupon.textContent = `Kupon ${quota.coupon.name}: terpakai ${fmtRp(quota.coupon.used_rp)}${remaining} · berlaku sampai ${fmtDateTime(quota.coupon.expires_at)}`;
    coupon.classList.remove("hidden");
  } else {
    coupon.classList.add("hidden");
  }

  const all = [windows?.five_hour, windows?.week, windows?.month].filter(
    (window): window is QuotaWindow => window != null,
  );
  const over = all.some((window) => window.used_frac * 100 >= quota.alert_pct);
  const banner = $("alert-banner");
  if (over) {
    banner.textContent = `Perhatian: pemakaian kuota sudah mencapai ambang peringatan akun (${quota.alert_pct}%).`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function renderUsage(usage: UsageSummary): void {
  $("usage-window").textContent = `${fmtTime(usage.start)} — ${fmtTime(usage.end)}`;
  const total = usage.total;
  const stats: Array<[string, string]> = [
    ["Request", fmtInt(total.requests)],
    ["Biaya", fmtMicroRp(total.cost_micro_idr)],
    ["Nilai katalog", fmtMicroRp(total.catalog_micro_idr)],
    ["Prompt token", fmtTokens(total.prompt_tokens)],
    ["Completion", fmtTokens(total.completion_tokens)],
    ["Cached", fmtTokens(total.cached_prompt_tokens)],
  ];
  $("totals").innerHTML = stats
    .map(
      ([label, value]) =>
        `<div class="stat"><span class="muted">${label}</span><strong>${value}</strong></div>`,
    )
    .join("");

  const rows = usage.data.map(
    (row) => `<tr>
      <td>${escapeHtml(row.model)}</td>
      <td><span class="pill ${escapeHtml(row.billing_kind)}">${escapeHtml(row.billing_kind)}</span></td>
      <td class="num">${fmtInt(row.requests)}</td>
      <td class="num">${fmtTokens(row.prompt_tokens)}</td>
      <td class="num">${fmtTokens(row.completion_tokens)}</td>
      <td class="num">${fmtTokens(row.cached_prompt_tokens)}</td>
      <td class="num">${fmtMicroRp(row.cost_micro_idr)}</td>
      <td class="num muted">${fmtMicroRp(row.catalog_micro_idr)}</td>
    </tr>`,
  );
  rows.push(
    `<tr class="total"><td colspan="2">Total</td><td class="num">${fmtInt(total.requests)}</td><td class="num">${fmtTokens(total.prompt_tokens)}</td><td class="num">${fmtTokens(total.completion_tokens)}</td><td class="num">${fmtTokens(total.cached_prompt_tokens)}</td><td class="num">${fmtMicroRp(total.cost_micro_idr)}</td><td class="num muted">${fmtMicroRp(total.catalog_micro_idr)}</td></tr>`,
  );
  $("usage-tbody").innerHTML =
    rows.join("") || `<tr><td colspan="8" class="muted">Tidak ada data.</td></tr>`;
}

function renderChart(daily: UsageDaily): void {
  const canvas = $<HTMLCanvasElement>("daily-chart");
  state.chart?.destroy();
  const tickFont = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-data")
    .trim();
  state.chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: daily.data.map((row) => row.date.slice(5)),
      datasets: [
        {
          label: "Biaya dari saldo (Rp)",
          data: daily.data.map((row) => row.cost_micro_idr / 1_000_000),
          backgroundColor: tokenColor("--color-accent", 0.85),
          hoverBackgroundColor: tokenColor("--color-accent", 1),
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tokenColor("--color-paper-3"),
          borderColor: tokenColor("--color-rule"),
          borderWidth: 1,
          cornerRadius: 12,
          padding: 10,
          displayColors: false,
          titleColor: tokenColor("--color-ink"),
          bodyColor: tokenColor("--color-ink-2"),
          callbacks: {
            label: (item) => `Rp ${fmtNumber(item.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: tokenColor("--color-muted"), font: { family: tickFont, size: 11 } },
          grid: { color: tokenColor("--color-rule-2") },
        },
        y: {
          beginAtZero: true,
          ticks: { color: tokenColor("--color-muted"), font: { family: tickFont, size: 11 } },
          grid: { color: tokenColor("--color-rule-2") },
        },
      },
    },
  });
}

function keyLabel(id?: string | null): string {
  if (!id) return "—";
  const match = state.keys.find((entry) => entry.id === id);
  if (match) return `${match.label || "(tanpa label)"} · ${match.prefix}…`;
  return `${id.slice(0, 8)}…`;
}

function renderLog(page: UsageLogPage): void {
  $("log-tbody").innerHTML =
    page.data
      .map(
        (row) => `<tr>
      <td>${fmtTime(row.created_at)}</td>
      <td>${escapeHtml(row.model)}</td>
      <td class="muted">${escapeHtml(row.vendor)}</td>
      <td class="muted">${escapeHtml(keyLabel(row.api_key_id))}</td>
      <td><span class="pill ${escapeHtml(row.billing_kind)}">${escapeHtml(row.billing_kind)}</span></td>
      <td class="num">${fmtTokens(row.prompt_tokens)}</td>
      <td class="num">${fmtTokens(row.completion_tokens)}</td>
      <td class="num">${fmtMicroRp(row.cost_micro_idr)}</td>
    </tr>`,
      )
      .join("") || `<tr><td colspan="8" class="muted">Tidak ada log pada rentang ini.</td></tr>`;

  const pages = Math.max(1, Math.ceil(page.total / page.limit));
  $("page-info").textContent = `halaman ${page.page + 1} / ${pages} · total ${fmtInt(page.total)} request`;
  $<HTMLButtonElement>("prev-page").disabled = page.page <= 0;
  $<HTMLButtonElement>("next-page").disabled = !page.has_more;
}

function logFilters(): LogFilters {
  return {
    range: state.range,
    page: state.page,
    limit: state.limit,
    billingKind: state.billingKind,
    model: state.model,
    apiKeyId: state.apiKeyId,
  };
}

let refreshing = false;

async function refreshAll(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  const errors: string[] = [];
  const settle = async <T,>(promise: Promise<T>, apply: (value: T) => void) => {
    try {
      apply(await promise);
    } catch (error) {
      errors.push(errMsg(error));
    }
  };
  await Promise.all([
    settle(fetchBalance(), renderBalance),
    settle(fetchQuota(), renderQuota),
    settle(fetchUsage(state.range, state.model), renderUsage),
    settle(fetchUsageDaily(state.range, state.model), renderChart),
    settle(fetchUsageLog(logFilters()), renderLog),
  ]);
  const banner = $("error-banner");
  if (errors.length > 0) {
    banner.textContent = [...new Set(errors)].join(" · ");
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
  refreshing = false;
}

async function loadKeyStatus(): Promise<void> {
  try {
    state.keyStatus = await apiKeyStatus();
  } catch {
    state.keyStatus = { configured: false };
  }
  renderKeyBadge();
}

async function loadKeys(): Promise<void> {
  try {
    const result = await fetchKeys();
    state.keys = result.data;
    const select = $<HTMLSelectElement>("filter-key");
    const current = state.apiKeyId;
    select.innerHTML =
      `<option value="">Semua key</option>` +
      state.keys
        .map(
          (entry) =>
            `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label || "(tanpa label)")} · ${escapeHtml(entry.prefix)}…</option>`,
        )
        .join("");
    select.value = current;
  } catch {
    state.keys = [];
  }
}

async function saveKey(): Promise<void> {
  const input = $<HTMLInputElement>("key-input");
  const value = input.value.trim();
  if (!value) {
    toast("Isi API key dulu.", true);
    return;
  }
  try {
    state.keyStatus = await saveApiKey(value);
    input.value = "";
    renderKeyBadge();
    toast("API key tersimpan dan tervalidasi.");
    await loadKeys();
    await refreshAll();
  } catch (error) {
    toast(errMsg(error), true);
  }
}

async function removeKey(): Promise<void> {
  try {
    state.keyStatus = await clearApiKey();
    renderKeyBadge();
    toast("API key tersimpan dihapus.");
  } catch (error) {
    toast(errMsg(error), true);
  }
}

function setupTimer(): void {
  if (state.timer !== null) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  if (state.refreshSecs > 0) {
    state.timer = window.setInterval(() => {
      void refreshAll();
    }, state.refreshSecs * 1000);
  }
}

function wireEvents(): void {
  $<HTMLSelectElement>("range-select").addEventListener("change", (event) => {
    state.range = (event.target as HTMLSelectElement).value as RangeKey;
    state.page = 0;
    void refreshAll();
  });
  $("refresh-btn").addEventListener("click", () => {
    void refreshAll();
  });
  $("compact-btn").addEventListener("click", () => {
    void enterCompact();
  });
  $("settings-btn").addEventListener("click", () => {
    $<HTMLDialogElement>("settings-dialog").showModal();
  });
  $("save-key-btn").addEventListener("click", () => {
    void saveKey();
  });
  $("clear-key-btn").addEventListener("click", () => {
    void removeKey();
  });
  $<HTMLSelectElement>("refresh-select").addEventListener("change", (event) => {
    state.refreshSecs = Number((event.target as HTMLSelectElement).value);
    localStorage.setItem("kenari_refresh_secs", String(state.refreshSecs));
    setupTimer();
  });
  $<HTMLSelectElement>("filter-kind").addEventListener("change", (event) => {
    state.billingKind = (event.target as HTMLSelectElement).value;
    state.page = 0;
    void refreshAll();
  });
  $<HTMLSelectElement>("filter-key").addEventListener("change", (event) => {
    state.apiKeyId = (event.target as HTMLSelectElement).value;
    state.page = 0;
    void refreshAll();
  });
  $<HTMLInputElement>("filter-model").addEventListener("change", (event) => {
    state.model = (event.target as HTMLInputElement).value.trim();
    state.page = 0;
    void refreshAll();
  });
  $("prev-page").addEventListener("click", () => {
    if (state.page > 0) {
      state.page -= 1;
      void refreshAll();
    }
  });
  $("next-page").addEventListener("click", () => {
    state.page += 1;
    void refreshAll();
  });
}

async function init(): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window)) {
    const banner = $("error-banner");
    banner.textContent =
      'Dibuka di browser: fitur API tidak tersedia. Jalankan "npm run tauri dev" dan gunakan window aplikasi Kenari Usage.';
    banner.classList.remove("hidden");
    return;
  }
  $<HTMLSelectElement>("range-select").value = state.range;
  $<HTMLSelectElement>("refresh-select").value = String(state.refreshSecs);
  wireEvents();
  await loadKeyStatus();
  if (state.keyStatus?.configured) {
    await loadKeys();
    await refreshAll();
  } else {
    $<HTMLDialogElement>("settings-dialog").showModal();
    toast("Masukkan API key Kenari untuk mulai.", true);
  }
  setupTimer();
}

void init();
