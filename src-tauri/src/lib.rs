use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationData {
    pub event_type: String,
    pub title: String,
    pub body: String,
    pub prompt_text: String,
    pub dismiss_seconds: u32,
    pub auto_close: bool,
    /// M-mode only: which prompt number this is (1-based). 0 = not applicable.
    pub session_number: u32,
    /// M-mode only: total prompts in session. None = indefinite.
    pub prompt_count_total: Option<u32>,
}

pub struct NotificationState(pub Mutex<Option<NotificationData>>);

/// Returns (active_monitor, other_monitors) by finding which monitor the main window is on.
/// Falls back to first monitor if detection fails.
fn get_monitors_split(app: &AppHandle) -> (Option<tauri::Monitor>, Vec<tauri::Monitor>) {
    let main_window = match app.get_webview_window("main") {
        Some(w) => w,
        None => return (None, vec![]),
    };

    let all = match main_window.available_monitors() {
        Ok(monitors) => monitors,
        Err(_) => return (None, vec![]),
    };

    if all.is_empty() {
        return (None, vec![]);
    }

    // Find the monitor the main window is currently displayed on
    let active_pos = main_window
        .current_monitor()
        .ok()
        .flatten()
        .map(|m| (m.position().x, m.position().y));

    let mut monitors = all;
    let active_idx = active_pos
        .and_then(|(x, y)| {
            monitors
                .iter()
                .position(|m| m.position().x == x && m.position().y == y)
        })
        .unwrap_or(0);

    let active = monitors.remove(active_idx);
    (Some(active), monitors)
}

/// Emit notification-replacing to all overlay windows, then close them.
async fn close_overlay_windows(app: &AppHandle) {
    let overlays: Vec<_> = (0..8u32)
        .filter_map(|i| app.get_webview_window(&format!("notification-overlay-{}", i)))
        .collect();

    if overlays.is_empty() {
        return;
    }

    // Signal overlays to allow close (they block close until this event)
    for w in &overlays {
        let _ = w.emit("notification-replacing", ());
    }
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    for w in &overlays {
        let _ = w.close();
    }
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;
}

#[tauri::command]
async fn show_notification(
    app: AppHandle,
    state: State<'_, NotificationState>,
    event_type: String,
    title: String,
    body: String,
    prompt_text: String,
    dismiss_seconds: u32,
    auto_close: bool,
    session_number: u32,
    prompt_count_total: Option<u32>,
) -> Result<(), String> {
    // Store data so the popup page can fetch it via get_notification_data (used in prod builds)
    *state.0.lock().unwrap() = Some(NotificationData {
        event_type: event_type.clone(),
        title: title.clone(),
        body: body.clone(),
        prompt_text: prompt_text.clone(),
        dismiss_seconds,
        auto_close,
        session_number,
        prompt_count_total,
    });

    // Close any existing notification window first.
    // Emit "notification-replacing" first so the popup's onCloseRequested guard steps aside.
    if let Some(existing) = app.get_webview_window("notification") {
        let _ = existing.emit("notification-replacing", ());
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        let _ = existing.close();
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
    }

    // Close any existing overlay windows from the previous notification
    close_overlay_windows(&app).await;

    // Find which monitor the main window is on; split remaining monitors for overlays
    let (active_monitor, other_monitors) = get_monitors_split(&app);

    // Build main popup URL (fullscreen on active monitor, card centered inside)
    #[cfg(debug_assertions)]
    let popup_url = {
        let mut u = url::Url::parse("http://localhost:3000/popup").map_err(|e| e.to_string())?;
        u.query_pairs_mut()
            .append_pair("eventType", &event_type)
            .append_pair("title", &title)
            .append_pair("body", &body)
            .append_pair("promptText", &prompt_text)
            .append_pair("dismissSeconds", &dismiss_seconds.to_string())
            .append_pair("autoClose", if auto_close { "true" } else { "false" })
            .append_pair("sessionNumber", &session_number.to_string());
        if let Some(total) = prompt_count_total {
            u.query_pairs_mut().append_pair("promptCountTotal", &total.to_string());
        }
        WebviewUrl::External(u)
    };
    #[cfg(not(debug_assertions))]
    let popup_url = WebviewUrl::App("popup/index.html".into());

    // Create main popup window — fullscreen on active monitor if known, else 480×320 centered
    let popup_builder = WebviewWindowBuilder::new(&app, "notification", popup_url)
        .title("MindfulPrompter")
        .always_on_top(true)
        .resizable(false)
        .decorations(false)
        .minimizable(false);

    let popup_builder = match &active_monitor {
        Some(m) => {
            let size = m.size();
            let pos = m.position();
            popup_builder
                .inner_size(size.width as f64, size.height as f64)
                .position(pos.x as f64, pos.y as f64)
        }
        None => popup_builder.inner_size(480.0, 320.0).center(),
    };

    popup_builder.build().map_err(|e| e.to_string())?;

    // Create dark overlay windows on every other monitor
    for (i, monitor) in other_monitors.iter().enumerate() {
        let label = format!("notification-overlay-{}", i);
        let size = monitor.size();
        let pos = monitor.position();

        #[cfg(debug_assertions)]
        let ov_url = {
            let mut u =
                url::Url::parse("http://localhost:3000/popup").map_err(|e| e.to_string())?;
            u.query_pairs_mut().append_pair("overlay", "true");
            WebviewUrl::External(u)
        };
        #[cfg(not(debug_assertions))]
        let ov_url = WebviewUrl::App("popup/index.html".into()); // JS detects overlay via window label

        let _ = WebviewWindowBuilder::new(&app, &label, ov_url)
            .title("MindfulPrompter")
            .inner_size(size.width as f64, size.height as f64)
            .position(pos.x as f64, pos.y as f64)
            .always_on_top(true)
            .resizable(false)
            .decorations(false)
            .minimizable(false)
            .build();
    }

    Ok(())
}

#[tauri::command]
fn get_notification_data(state: State<'_, NotificationState>) -> Option<NotificationData> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
async fn close_notification_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("notification") {
        window.close().map_err(|e| e.to_string())?;
    }
    close_overlay_windows(&app).await;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NotificationState(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![show_notification, get_notification_data, close_notification_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
