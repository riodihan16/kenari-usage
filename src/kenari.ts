import { invoke } from "@tauri-apps/api/core";

export type RangeKey = "today" | "24h" | "7d" | "30d";

export interface Balance {
  object: string;
  balance_micro_idr: number;
  reserved_micro_idr: number;
  available_micro_idr: number;
  currency: string;
}

export interface QuotaWindow {
  budget_rp: number;
  used_rp: number;
  used_frac: number;
  remaining_rp: number;
  resets_at: string;
}

export interface PlanWindows {
  five_hour?: QuotaWindow | null;
  week?: QuotaWindow | null;
  month?: QuotaWindow | null;
}

export interface Plan {
  name: string;
  windows: PlanWindows;
}

export interface Coupon {
  name: string;
  used_rp: number;
  remaining_rp?: number | null;
  expires_at: string;
  scope_models: string[];
}

export interface Quota {
  alert_pct: number;
  plan?: Plan | null;
  coupon?: Coupon | null;
}

export interface UsageRow {
  model: string;
  billing_kind: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  cached_prompt_tokens: number;
  cache_write_prompt_tokens: number;
  cost_micro_idr: number;
  catalog_micro_idr: number;
}

export interface UsageTotal {
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  cached_prompt_tokens: number;
  cache_write_prompt_tokens: number;
  cost_micro_idr: number;
  catalog_micro_idr: number;
}

export interface UsageSummary {
  object: string;
  start: number;
  end: number;
  data: UsageRow[];
  total: UsageTotal;
}

export interface DailyRow {
  date: string;
  requests: number;
  cost_micro_idr: number;
}

export interface UsageDaily {
  object: string;
  start: number;
  end: number;
  data: DailyRow[];
}

export interface LogRow {
  created_at: number;
  model: string;
  vendor: string;
  api_key_id?: string | null;
  billing_kind: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_prompt_tokens: number;
  cache_write_prompt_tokens: number;
  cost_micro_idr: number;
  catalog_micro_idr: number;
}

export interface UsageLogPage {
  object: string;
  start: number;
  end: number;
  data: LogRow[];
  page: number;
  limit: number;
  has_more: boolean;
  total: number;
}

export interface AccountKey {
  id: string;
  prefix: string;
  label: string;
  created_at: number;
  last_used_at?: number | null;
}

export interface KeyList {
  object: string;
  data: AccountKey[];
}

export interface KeyStatus {
  configured: boolean;
  source?: string | null;
  masked?: string | null;
}

export interface LogFilters {
  range: RangeKey;
  page: number;
  limit: number;
  billingKind?: string;
  model?: string;
  apiKeyId?: string;
}

export function errMsg(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Terjadi kesalahan tidak dikenal";
}

export const apiKeyStatus = () => invoke<KeyStatus>("api_key_status");
export const saveApiKey = (key: string) => invoke<KeyStatus>("save_api_key", { key });
export const clearApiKey = () => invoke<KeyStatus>("clear_api_key");
export const fetchBalance = () => invoke<Balance>("fetch_balance");
export const fetchQuota = () => invoke<Quota>("fetch_quota");
export const fetchKeys = () => invoke<KeyList>("fetch_keys");
export const fetchUsage = (range: RangeKey, model?: string) =>
  invoke<UsageSummary>("fetch_usage", { range, model: model || null });
export const fetchUsageDaily = (range: RangeKey, model?: string) =>
  invoke<UsageDaily>("fetch_usage_daily", { range, model: model || null });
export const fetchUsageLog = (filters: LogFilters) =>
  invoke<UsageLogPage>("fetch_usage_log", {
    range: filters.range,
    page: filters.page,
    limit: filters.limit,
    billingKind: filters.billingKind || null,
    model: filters.model || null,
    apiKeyId: filters.apiKeyId || null,
  });

export const openMainWindow = () => invoke<void>("open_main_window");
export const enterCompact = () => invoke<void>("enter_compact");
export const setCompactDragging = (dragging: boolean) =>
  invoke<void>("set_compact_dragging", { dragging });
export const quitApp = () => invoke<void>("quit_app");
