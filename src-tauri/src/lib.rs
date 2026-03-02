use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationData {
    pub event_type: String,
    pub title: String,
    pub body: String,
    pub prompt_text: String,
    pub dismiss_seconds: u32,
}

pub struct NotificationState(pub Mutex<Option<NotificationData>>);

#[tauri::command]
async fn show_notification(
    app: AppHandle,
    state: State<'_, NotificationState>,
    event_type: String,
    title: String,
    body: String,
    prompt_text: String,
    dismiss_seconds: u32,
) -> Result<(), String> {
    // Store data so the popup page can fetch it via get_notification_data (used in prod builds)
    *state.0.lock().unwrap() = Some(NotificationData {
        event_type: event_type.clone(),
        title: title.clone(),
        body: body.clone(),
        prompt_text: prompt_text.clone(),
        dismiss_seconds,
    });

    // Close any existing notification window first
    if let Some(existing) = app.get_webview_window("notification") {
        let _ = existing.close();
    }

    // WebviewUrl::App only works for static builds; dev mode needs External with the full URL.
    // Pass data via URL query params so the popup doesn't need IPC just to display content.
    #[cfg(debug_assertions)]
    let popup_url = {
        let mut u = url::Url::parse("http://localhost:3000/popup").map_err(|e| e.to_string())?;
        u.query_pairs_mut()
            .append_pair("eventType", &event_type)
            .append_pair("title", &title)
            .append_pair("body", &body)
            .append_pair("promptText", &prompt_text)
            .append_pair("dismissSeconds", &dismiss_seconds.to_string());
        WebviewUrl::External(u)
    };
    #[cfg(not(debug_assertions))]
    let popup_url = WebviewUrl::App("popup/index.html".into());

    WebviewWindowBuilder::new(&app, "notification", popup_url)
        .title("MindfulPrompter")
        .inner_size(480.0, 340.0)
        .always_on_top(true)
        .center()
        .resizable(false)
        .build()
        .map_err(|e| e.to_string())?;
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
