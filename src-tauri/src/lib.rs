mod api;
mod config;

use api::{ApiError, Balance, KeyList, Quota, UsageDaily, UsageLogPage, UsageSummary};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

fn client() -> Result<api::Client, ApiError> {
    let (key, _source) =
        config::resolve_key().ok_or_else(|| ApiError::local("API key belum diatur"))?;
    Ok(api::Client::new(key))
}

#[derive(Serialize)]
struct KeyStatus {
    configured: bool,
    source: Option<String>,
    masked: Option<String>,
}

fn status() -> KeyStatus {
    match config::resolve_key() {
        Some((key, source)) => KeyStatus {
            configured: true,
            source: Some(source.to_string()),
            masked: Some(config::mask_key(&key)),
        },
        None => KeyStatus {
            configured: false,
            source: None,
            masked: None,
        },
    }
}

#[tauri::command]
fn api_key_status() -> KeyStatus {
    status()
}

#[tauri::command]
async fn save_api_key(key: String) -> Result<KeyStatus, ApiError> {
    let key = key.trim().to_string();
    if !key.starts_with("kn-") || key.len() < 20 {
        return Err(ApiError::local(
            "Format API key tidak valid (harus diawali kn-)",
        ));
    }
    api::Client::new(key.clone()).usage("today", None).await?;
    config::save_key(&key).map_err(ApiError::local)?;
    Ok(status())
}

#[tauri::command]
async fn clear_api_key() -> Result<KeyStatus, ApiError> {
    config::clear_key().map_err(ApiError::local)?;
    Ok(status())
}

#[tauri::command]
async fn fetch_balance() -> Result<Balance, ApiError> {
    client()?.balance().await
}

#[tauri::command]
async fn fetch_quota() -> Result<Quota, ApiError> {
    client()?.quota().await
}

#[tauri::command]
async fn fetch_keys() -> Result<KeyList, ApiError> {
    client()?.keys().await
}

#[tauri::command]
async fn fetch_usage(
    range: Option<String>,
    model: Option<String>,
) -> Result<UsageSummary, ApiError> {
    let range = range.unwrap_or_else(|| "30d".to_string());
    client()?.usage(&range, model.as_deref()).await
}

#[tauri::command]
async fn fetch_usage_daily(
    range: Option<String>,
    model: Option<String>,
) -> Result<UsageDaily, ApiError> {
    let range = range.unwrap_or_else(|| "30d".to_string());
    client()?.usage_daily(&range, model.as_deref()).await
}

#[tauri::command]
async fn fetch_usage_log(
    range: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
    billing_kind: Option<String>,
    model: Option<String>,
    api_key_id: Option<String>,
) -> Result<UsageLogPage, ApiError> {
    let range = range.unwrap_or_else(|| "30d".to_string());
    let page = page.unwrap_or(0);
    let limit = limit.unwrap_or(50).clamp(1, 200);
    client()?
        .usage_log(
            &range,
            page,
            limit,
            billing_kind.as_deref(),
            model.as_deref(),
            api_key_id.as_deref(),
        )
        .await
}

const COMPACT_CIRCLE: (f64, f64) = (88.0, 88.0);
const COMPACT_CARD: (f64, f64) = (340.0, 200.0);
const COMPACT_MARGIN: f64 = 20.0;
const COMPACT_COLLAPSE_GRACE: Duration = Duration::from_millis(400);

static COMPACT_DRAGGING: AtomicBool = AtomicBool::new(false);

#[derive(Default)]
struct CompactRuntime {
    anchor: Mutex<Option<tauri::PhysicalPosition<i32>>>,
}

fn default_anchor(app: &tauri::AppHandle) -> tauri::PhysicalPosition<i32> {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor();
        let margin = (COMPACT_MARGIN * scale) as i32;
        let pos = monitor.position();
        let size = monitor.size();
        return tauri::PhysicalPosition::new(
            pos.x + size.width as i32 - margin,
            pos.y + size.height as i32 - margin,
        );
    }
    tauri::PhysicalPosition::new(1280, 720)
}

fn monitor_bounds(
    app: &tauri::AppHandle,
    point: tauri::PhysicalPosition<i32>,
) -> Option<(i32, i32, i32, i32)> {
    if let Ok(monitors) = app.available_monitors() {
        for monitor in &monitors {
            let pos = monitor.position();
            let size = monitor.size();
            let (left, top) = (pos.x, pos.y);
            let (right, bottom) = (pos.x + size.width as i32, pos.y + size.height as i32);
            if point.x >= left && point.x < right && point.y >= top && point.y < bottom {
                return Some((left, top, right, bottom));
            }
        }
    }
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let pos = monitor.position();
        let size = monitor.size();
        return Some((
            pos.x,
            pos.y,
            pos.x + size.width as i32,
            pos.y + size.height as i32,
        ));
    }
    None
}

fn clamp_anchor(
    app: &tauri::AppHandle,
    anchor: tauri::PhysicalPosition<i32>,
) -> tauri::PhysicalPosition<i32> {
    let Some((left, top, right, bottom)) = monitor_bounds(app, anchor) else {
        return anchor;
    };
    let margin = 10;
    tauri::PhysicalPosition::new(
        anchor.x.clamp(left + margin, (right - margin).max(left + margin)),
        anchor.y.clamp(top + margin, (bottom - margin).max(top + margin)),
    )
}

fn clamp_window_pos(
    app: &tauri::AppHandle,
    pos: tauri::PhysicalPosition<i32>,
    width: i32,
    height: i32,
) -> tauri::PhysicalPosition<i32> {
    let Some((left, top, right, bottom)) = monitor_bounds(app, pos) else {
        return pos;
    };
    let margin = 6;
    tauri::PhysicalPosition::new(
        pos.x.clamp(left + margin, (right - width - margin).max(left + margin)),
        pos.y.clamp(top + margin, (bottom - height - margin).max(top + margin)),
    )
}

fn resolve_anchor(app: &tauri::AppHandle) -> tauri::PhysicalPosition<i32> {
    let state = app.state::<CompactRuntime>();
    let mut guard = state.anchor.lock().unwrap();
    if let Some(anchor) = *guard {
        return anchor;
    }
    let anchor = default_anchor(app);
    *guard = Some(anchor);
    anchor
}

fn place_compact(
    app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
    anchor: tauri::PhysicalPosition<i32>,
    size: (f64, f64),
    scale: f64,
) {
    let width = (size.0 * scale) as i32;
    let height = (size.1 * scale) as i32;
    let pos = clamp_window_pos(
        app,
        tauri::PhysicalPosition::new(anchor.x - width, anchor.y - height),
        width,
        height,
    );
    let _ = window.set_position(pos);
}

fn show_compact(app: &tauri::AppHandle) {
    COMPACT_DRAGGING.store(false, Ordering::Relaxed);
    let anchor = resolve_anchor(app);

    if app.get_webview_window("compact").is_none() {
        let built = WebviewWindowBuilder::new(app, "compact", WebviewUrl::App("compact.html".into()))
            .title("Kenari Usage")
            .inner_size(COMPACT_CIRCLE.0, COMPACT_CIRCLE.1)
            .decorations(false)
            .resizable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .transparent(true)
            .shadow(false)
            .visible(false)
            .build();
        if built.is_err() {
            return;
        }
    }

    if let Some(window) = app.get_webview_window("compact") {
        let _ = window.set_size(tauri::LogicalSize::new(COMPACT_CIRCLE.0, COMPACT_CIRCLE.1));
        let scale = window.scale_factor().unwrap_or(1.0);
        place_compact(app, &window, anchor, COMPACT_CIRCLE, scale);
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("compact-shown", ());
    }
}

#[tauri::command]
fn set_compact_dragging(dragging: bool) {
    COMPACT_DRAGGING.store(dragging, Ordering::Relaxed);
}

fn compact_tick(
    app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
    unhovered_since: &mut Option<Instant>,
) {
    let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return;
    };
    let scale = window.scale_factor().unwrap_or(1.0);

    let anchor = clamp_anchor(
        app,
        tauri::PhysicalPosition::new(pos.x + size.width as i32, pos.y + size.height as i32),
    );
    let runtime = app.state::<CompactRuntime>();
    match runtime.anchor.lock() {
        Ok(mut guard) => *guard = Some(anchor),
        Err(_) => {}
    }

    let hovered = match window.cursor_position() {
        Ok(cursor) => {
            cursor.x >= pos.x as f64
                && cursor.x < (pos.x + size.width as i32) as f64
                && cursor.y >= pos.y as f64
                && cursor.y < (pos.y + size.height as i32) as f64
        }
        Err(_) => return,
    };

    if COMPACT_DRAGGING.load(Ordering::Relaxed) {
        if !hovered {
            COMPACT_DRAGGING.store(false, Ordering::Relaxed);
        }
        *unhovered_since = None;
        let clamped = clamp_window_pos(app, pos, size.width as i32, size.height as i32);
        if clamped.x != pos.x || clamped.y != pos.y {
            let _ = window.set_position(clamped);
        }
        return;
    }

    let expanded = size.width as f64 > 150.0 * scale;

    if hovered {
        *unhovered_since = None;
        if !expanded {
            let _ = window.set_size(tauri::LogicalSize::new(COMPACT_CARD.0, COMPACT_CARD.1));
            place_compact(app, window, anchor, COMPACT_CARD, scale);
            let _ = window.emit("compact-expand", ());
        }
        return;
    }

    if !expanded {
        *unhovered_since = None;
        return;
    }

    match *unhovered_since {
        None => *unhovered_since = Some(Instant::now()),
        Some(since) => {
            if Instant::now().duration_since(since) >= COMPACT_COLLAPSE_GRACE {
                *unhovered_since = None;
                let _ = window.set_size(tauri::LogicalSize::new(COMPACT_CIRCLE.0, COMPACT_CIRCLE.1));
                place_compact(app, window, anchor, COMPACT_CIRCLE, scale);
                let _ = window.emit("compact-collapse", ());
            }
        }
    }
}

fn spawn_compact_watcher(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut unhovered_since: Option<Instant> = None;
        loop {
            let mut interval = Duration::from_millis(200);
            match app.get_webview_window("compact") {
                Some(window) if window.is_visible().unwrap_or(false) => {
                    compact_tick(&app, &window, &mut unhovered_since);
                    interval = Duration::from_millis(140);
                }
                _ => unhovered_since = None,
            }
            if COMPACT_DRAGGING.load(Ordering::Relaxed) {
                interval = Duration::from_millis(40);
            }
            std::thread::sleep(interval);
        }
    });
}

#[tauri::command]
fn open_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
    if let Some(compact) = app.get_webview_window("compact") {
        let _ = compact.hide();
    }
}

#[tauri::command]
fn enter_compact(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    show_compact(&app);
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

pub fn run() {
    tauri::Builder::default()
        .manage(CompactRuntime::default())
        .setup(|app| {
            spawn_compact_watcher(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api_key_status,
            save_api_key,
            clear_api_key,
            fetch_balance,
            fetch_quota,
            fetch_keys,
            fetch_usage,
            fetch_usage_daily,
            fetch_usage_log,
            set_compact_dragging,
            open_main_window,
            enter_compact,
            quit_app
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    "main" => {
                        api.prevent_close();
                        let _ = window.hide();
                        show_compact(window.app_handle());
                    }
                    "compact" => {
                        api.prevent_close();
                        window.app_handle().exit(0);
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Kenari Usage");
}
