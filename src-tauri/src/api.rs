use serde::{Deserialize, Serialize};
use std::time::Duration;

pub const BASE_URL: &str = "https://kenari.id/v1";

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub status: Option<u16>,
    pub code: Option<String>,
    pub message: String,
}

impl ApiError {
    pub fn new(status: Option<u16>, code: Option<String>, message: String) -> Self {
        Self {
            status,
            code,
            message,
        }
    }

    pub fn local(message: impl Into<String>) -> Self {
        Self::new(None, None, message.into())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub object: String,
    pub balance_micro_idr: i64,
    pub reserved_micro_idr: i64,
    pub available_micro_idr: i64,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaWindow {
    pub budget_rp: i64,
    pub used_rp: i64,
    pub used_frac: f64,
    pub remaining_rp: i64,
    pub resets_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlanWindows {
    #[serde(default)]
    pub five_hour: Option<QuotaWindow>,
    #[serde(default)]
    pub week: Option<QuotaWindow>,
    #[serde(default)]
    pub month: Option<QuotaWindow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub name: String,
    #[serde(default)]
    pub windows: PlanWindows,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coupon {
    pub name: String,
    pub used_rp: i64,
    #[serde(default)]
    pub remaining_rp: Option<i64>,
    pub expires_at: String,
    #[serde(default)]
    pub scope_models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quota {
    pub alert_pct: i64,
    #[serde(default)]
    pub plan: Option<Plan>,
    #[serde(default)]
    pub coupon: Option<Coupon>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRow {
    pub model: String,
    pub billing_kind: String,
    pub requests: i64,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub cached_prompt_tokens: i64,
    pub cache_write_prompt_tokens: i64,
    pub cost_micro_idr: i64,
    pub catalog_micro_idr: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageTotal {
    pub requests: i64,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub cached_prompt_tokens: i64,
    pub cache_write_prompt_tokens: i64,
    pub cost_micro_idr: i64,
    pub catalog_micro_idr: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSummary {
    pub object: String,
    pub start: i64,
    pub end: i64,
    pub data: Vec<UsageRow>,
    pub total: UsageTotal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyRow {
    pub date: String,
    pub requests: i64,
    pub cost_micro_idr: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageDaily {
    pub object: String,
    pub start: i64,
    pub end: i64,
    pub data: Vec<DailyRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogRow {
    pub created_at: i64,
    pub model: String,
    pub vendor: String,
    #[serde(default)]
    pub api_key_id: Option<String>,
    pub billing_kind: String,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub cached_prompt_tokens: i64,
    pub cache_write_prompt_tokens: i64,
    pub cost_micro_idr: i64,
    pub catalog_micro_idr: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageLogPage {
    pub object: String,
    pub start: i64,
    pub end: i64,
    pub data: Vec<LogRow>,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountKey {
    pub id: String,
    pub prefix: String,
    pub label: String,
    pub created_at: i64,
    #[serde(default)]
    pub last_used_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyList {
    pub object: String,
    pub data: Vec<AccountKey>,
}

pub struct Client {
    http: reqwest::Client,
    key: String,
}

impl Client {
    pub fn new(key: String) -> Result<Self, ApiError> {
        let http = reqwest::Client::builder()
            .user_agent(concat!("kenari-usage/", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| ApiError::local(format!("Gagal menyiapkan klien HTTP: {e}")))?;
        Ok(Self { http, key })
    }

    async fn get<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
        query: &[(&str, String)],
    ) -> Result<T, ApiError> {
        let url = format!("{BASE_URL}{path}");
        let response = self
            .http
            .get(url)
            .bearer_auth(&self.key)
            .query(query)
            .send()
            .await
            .map_err(|e| ApiError::local(format!("Gagal menghubungi Kenari: {e}")))?;
        let status = response.status().as_u16();
        let body = response
            .text()
            .await
            .map_err(|e| ApiError::local(format!("Gagal membaca respons Kenari: {e}")))?;
        if !(200..300).contains(&status) {
            return Err(parse_error(status, &body));
        }
        serde_json::from_str(&body)
            .map_err(|e| ApiError::local(format!("Respons Kenari tidak sesuai skema: {e}")))
    }

    pub async fn balance(&self) -> Result<Balance, ApiError> {
        self.get("/account/balance", &[]).await
    }

    pub async fn quota(&self) -> Result<Quota, ApiError> {
        self.get("/account/quota", &[]).await
    }

    pub async fn keys(&self) -> Result<KeyList, ApiError> {
        self.get("/account/keys", &[]).await
    }

    pub async fn usage(&self, range: &str, model: Option<&str>) -> Result<UsageSummary, ApiError> {
        let mut query = vec![("range", range.to_string())];
        if let Some(value) = model.filter(|m| !m.is_empty()) {
            query.push(("model", value.to_string()));
        }
        self.get("/usage", &query).await
    }

    pub async fn usage_daily(
        &self,
        range: &str,
        model: Option<&str>,
    ) -> Result<UsageDaily, ApiError> {
        let mut query = vec![("range", range.to_string())];
        if let Some(value) = model.filter(|m| !m.is_empty()) {
            query.push(("model", value.to_string()));
        }
        self.get("/usage/daily", &query).await
    }

    pub async fn usage_log(
        &self,
        range: &str,
        page: u32,
        limit: u32,
        billing_kind: Option<&str>,
        model: Option<&str>,
        api_key_id: Option<&str>,
    ) -> Result<UsageLogPage, ApiError> {
        let mut query = vec![
            ("range", range.to_string()),
            ("page", page.to_string()),
            ("limit", limit.to_string()),
        ];
        if let Some(value) = billing_kind.filter(|v| !v.is_empty()) {
            query.push(("billing_kind", value.to_string()));
        }
        if let Some(value) = model.filter(|v| !v.is_empty()) {
            query.push(("model", value.to_string()));
        }
        if let Some(value) = api_key_id.filter(|v| !v.is_empty()) {
            query.push(("api_key_id", value.to_string()));
        }
        self.get("/usage/log", &query).await
    }
}

fn parse_error(status: u16, body: &str) -> ApiError {
    let parsed: Option<serde_json::Value> = serde_json::from_str(body).ok();
    let mut code = None;
    let mut message = None;
    if let Some(value) = parsed.as_ref() {
        if let Some(error) = value.get("error") {
            code = error
                .get("code")
                .and_then(|v| v.as_str())
                .map(str::to_string);
            message = error
                .get("message")
                .and_then(|v| v.as_str())
                .map(str::to_string);
        } else if let Some(text) = value.get("message").and_then(|v| v.as_str()) {
            message = Some(text.to_string());
        }
    }
    let fallback = match status {
        400 => "Permintaan ditolak Kenari.",
        401 => "API key tidak valid, kedaluwarsa, atau sudah dicabut.",
        402 => "Saldo tidak mencukupi.",
        403 => "Key ini tidak punya akses ke data tersebut (restricted/shared key).",
        404 => "Endpoint Kenari tidak ditemukan.",
        429 => "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
        500..=599 => "Server Kenari sedang bermasalah. Coba lagi nanti.",
        _ => "Terjadi kesalahan saat memanggil Kenari.",
    };
    let message = message.filter(|m| !m.trim().is_empty()).unwrap_or_else(|| {
        let trimmed = body.trim();
        if !trimmed.is_empty() && trimmed.len() <= 200 && !trimmed.starts_with('{') {
            trimmed.to_string()
        } else {
            fallback.to_string()
        }
    });
    ApiError::new(Some(status), code, message)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn client_builds_without_panicking() {
        let client = Client::new("kn-test-1234567890".to_string());
        assert!(client.is_ok(), "client should build: {:?}", client.err());
    }

    #[test]
    fn parse_error_prefers_structured_message() {
        let err = parse_error(
            429,
            r#"{"error":{"code":"rate_limited","message":"Terlalu banyak"}}"#,
        );
        assert_eq!(err.status, Some(429));
        assert_eq!(err.code.as_deref(), Some("rate_limited"));
        assert_eq!(err.message, "Terlalu banyak");
    }
}
