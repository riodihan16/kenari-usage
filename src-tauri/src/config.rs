use keyring::Entry;

const SERVICE: &str = "kenari-usage";
const ACCOUNT: &str = "api-key";

pub fn resolve_key() -> Option<(String, &'static str)> {
    if let Ok(value) = std::env::var("KENARI_API_KEY") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Some((trimmed.to_string(), "env"));
        }
    }
    stored_key().map(|key| (key, "keyring"))
}

fn stored_key() -> Option<String> {
    let entry = Entry::new(SERVICE, ACCOUNT).ok()?;
    match entry.get_password() {
        Ok(key) if !key.trim().is_empty() => Some(key),
        _ => None,
    }
}

pub fn save_key(key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    entry.set_password(key).map_err(|e| e.to_string())
}

pub fn clear_key() -> Result<(), String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn mask_key(key: &str) -> String {
    let count = key.chars().count();
    if count <= 12 {
        return "*".repeat(count);
    }
    let head: String = key.chars().take(9).collect();
    let tail: String = key.chars().skip(count - 6).collect();
    format!("{head}...{tail}")
}
