use std::process::Command;
use std::sync::Mutex;
use tauri::{Emitter, State, Manager};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use sysinfo::{System, ProcessRefreshKind, RefreshKind};

mod xeno;
mod opencode;

struct AppState {
    auto_attach: Mutex<boolean_wrapper::Bool>,
    attach_lock: Mutex<boolean_wrapper::Bool>,
    minimize_to_tray: Mutex<boolean_wrapper::Bool>,
    discord: Mutex<Option<DiscordIpcClient>>,
}

mod boolean_wrapper {
    pub struct Bool(pub bool);
}

#[tauri::command]
fn rpc_start(state: Option<String>, app: tauri::AppHandle) -> Result<(), String> {
    // App ID de Obsidian; la variable de entorno permite sobrescribirlo durante desarrollo.
    let client_id = std::env::var("LUMEX_DISCORD_CLIENT_ID")
        .unwrap_or_else(|_| "1524045806351548426".to_string());
    if client_id.is_empty() {
        log::warn!("Discord Rich Presence disabled: LUMEX_DISCORD_CLIENT_ID is not set");
        return Ok(());
    }
    let app_state = app.state::<AppState>();
    let mut client = DiscordIpcClient::new(&client_id)
        .map_err(|e| format!("Discord client failed: {e}"))?;
    client.connect().map_err(|e| format!("Discord connection failed: {e}"))?;
    let details = state.unwrap_or_else(|| "Using Obsidian".to_string());
    client.set_activity(activity::Activity::new().details(&details))
        .map_err(|e| format!("Discord activity failed: {e}"))?;
    *app_state.discord.lock().unwrap() = Some(client);
    Ok(())
}

#[tauri::command]
fn rpc_update(state: String, app: tauri::AppHandle) -> Result<(), String> {
    let app_state = app.state::<AppState>();
    if let Some(client) = app_state.discord.lock().unwrap().as_mut() {
        client.set_activity(activity::Activity::new().details(&state))
            .map_err(|e| format!("Discord activity failed: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn rpc_stop(app: tauri::AppHandle) {
    let app_state = app.state::<AppState>();
    let client = app_state.discord.lock().unwrap().take();
    if let Some(mut client) = client {
        let _ = client.close();
    }
}

#[tauri::command]
fn set_auto_attach(state: State<'_, AppState>, enabled: bool) {
    let mut auto = state.auto_attach.lock().unwrap();
    auto.0 = enabled;
}

#[tauri::command]
fn get_auto_attach(state: State<'_, AppState>) -> bool {
    state.auto_attach.lock().unwrap().0
}

#[tauri::command]
fn get_username() -> String {
    std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "User".to_string())
}

#[tauri::command]
fn get_server_status() -> String {
    "ready".to_string()
}

#[tauri::command]
fn validate_clients() -> bool {
    true
}

#[tauri::command]
fn set_attach_lock(state: State<'_, AppState>, locked: bool) {
    let mut lock = state.attach_lock.lock().unwrap();
    lock.0 = locked;
}

#[tauri::command]
fn get_attach_lock(state: State<'_, AppState>) -> bool {
    state.attach_lock.lock().unwrap().0
}

#[tauri::command]
fn mark_executed() {}

#[tauri::command]
fn is_roblox_running() -> bool {
    let s = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::new()),
    );
    for process in s.processes().values() {
        let name = process.name().to_lowercase();
        if name.contains("robloxplayerbeta") || name.contains("roblox.exe") {
            return true;
        }
    }
    false
}

#[tauri::command]
fn kill_roblox() -> bool {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "RobloxPlayerBeta.exe"])
            .output();
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "Roblox.exe"])
            .output();
    }
    true
}

#[tauri::command]
fn fetch_og_image(_url: String) -> Option<String> {
    None
}

#[tauri::command]
fn set_minimize_to_tray(state: State<'_, AppState>, enabled: bool) {
    state.minimize_to_tray.lock().unwrap().0 = enabled;
}


#[tauri::command]
fn zoom_in() {}

#[tauri::command]
fn zoom_out() {}

#[tauri::command]
fn zoom_reset() {}

#[tauri::command]
fn set_window_size(window: tauri::Window, width: f64, height: f64) {
    tauri::async_runtime::spawn(async move {
        let (sx, sy, sw, sh): (f64, f64, f64, f64) = match window.outer_position() {
            Ok(pos) => match window.outer_size() {
                Ok(size) => match window.scale_factor() {
                    Ok(scale) => (
                        pos.to_logical::<f64>(scale).x,
                        pos.to_logical::<f64>(scale).y,
                        size.to_logical::<f64>(scale).width,
                        size.to_logical::<f64>(scale).height,
                    ),
                    Err(_) => return,
                },
                Err(_) => return,
            },
            Err(_) => return,
        };

        if (sw - width).abs() < 1.0 && (sh - height).abs() < 1.0 {
            return;
        }

        let center_x = sx + sw / 2.0;
        let center_y = sy + sh / 2.0;

        let fps: f64 = 60.0;
        let duration_ms: f64 = if width < sw { 120.0 } else { 250.0 };
        let total_frames: u32 = ((duration_ms / 1000.0) * fps).round() as u32;
        let frame_delay = std::time::Duration::from_secs_f64(1.0 / fps);

        for frame in 1..=total_frames {
            let t: f64 = frame as f64 / total_frames as f64;
            let eased: f64 = 1.0 - (1.0 - t).powi(3);

            let cw: f64 = sw + (width - sw) * eased;
            let ch: f64 = sh + (height - sh) * eased;
            let cx: f64 = center_x - cw / 2.0;
            let cy: f64 = center_y - ch / 2.0;

            let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x: cx, y: cy }));
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: cw, height: ch }));

            tokio::time::sleep(frame_delay).await;
        }

        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }));
        let final_x = center_x - width / 2.0;
        let final_y = center_y - height / 2.0;
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x: final_x, y: final_y }));
    });
}

#[tauri::command]
fn clear_browser_cache() {}

#[tauri::command]
fn get_log_files() -> Vec<String> {
    Vec::new()
}

#[tauri::command]
fn read_log_file(_filename: String) -> String {
    String::new()
}

// === XENO DLL COMMANDS ===

#[tauri::command]
fn xeno_init(state: State<'_, xeno::XenoState>) -> Result<String, String> {
    xeno::init_dll(&state)
}

#[tauri::command]
fn xeno_version(state: State<'_, xeno::XenoState>) -> Result<String, String> {
    xeno::get_version(&state)
}

#[tauri::command]
fn xeno_clients(state: State<'_, xeno::XenoState>) -> Result<String, String> {
    xeno::get_clients(&state)
}

#[tauri::command]
fn xeno_attach(state: State<'_, xeno::XenoState>) -> Result<String, String> {
    xeno::attach(&state)
}

#[tauri::command]
fn xeno_execute(state: State<'_, xeno::XenoState>, script: String, pids: Vec<i32>) -> Result<String, String> {
    xeno::execute(&state, &script, &pids)
}

#[tauri::command]
fn xeno_set_setting(state: State<'_, xeno::XenoState>, id: i32, value: i32) -> Result<(), String> {
    xeno::set_setting(&state, id, value)
}

#[tauri::command]
fn xeno_stop(state: State<'_, xeno::XenoState>) -> Result<(), String> {
    xeno::stop(&state)
}

#[tauri::command]
fn xeno_downloaded(state: State<'_, xeno::XenoState>) -> bool {
    xeno::find_xeno_dll_path(&state).is_some()
}

#[tauri::command]
fn open_pastebin_bat(app: tauri::AppHandle) -> Result<(), String> {
    let bat_name = "toggle-pastebin.bat";
    let candidates: Vec<std::path::PathBuf> = [
        std::env::current_exe().ok().and_then(|e| e.parent().map(|p| p.join(bat_name))),
        app.path().resource_dir().ok().map(|p| p.join(bat_name)),
        std::env::current_dir().ok().map(|d| d.join(bat_name)),
        std::env::current_dir().ok().and_then(|d| d.parent().map(|p| p.join(bat_name))),
        std::env::current_dir().ok().and_then(|d| d.parent().and_then(|p| p.parent()).map(|p| p.join(bat_name))),
    ].into_iter().flatten().collect();

    let bat = candidates.iter().find(|p| p.exists()).ok_or("toggle-pastebin.bat not found")?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::UI::Shell::ShellExecuteW;

        let path_wide: Vec<u16> = bat.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
        let op: Vec<u16> = "open".encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                op.as_ptr(),
                path_wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1,
            );
        }
    }
    Ok(())
}

// OpenCode AI commands
#[tauri::command]
async fn opencode_start(state: State<'_, opencode::OpenCodeState>) -> Result<bool, String> {
    opencode::start_server(&state).await
}

#[tauri::command]
fn opencode_stop(state: State<'_, opencode::OpenCodeState>) -> Result<(), String> {
    opencode::stop_server(&state)
}

#[tauri::command]
fn opencode_status(state: State<'_, opencode::OpenCodeState>) -> Result<serde_json::Value, String> {
    let running = opencode::is_running(&state);
    Ok(serde_json::json!({ "running": running }))
}

#[tauri::command]
async fn opencode_session_create(state: State<'_, opencode::OpenCodeState>, title: Option<String>) -> Result<serde_json::Value, String> {
    opencode::create_session(&state, title).await
}

#[tauri::command]
async fn opencode_sessions(state: State<'_, opencode::OpenCodeState>) -> Result<serde_json::Value, String> {
    opencode::list_sessions(&state).await
}

#[tauri::command]
async fn opencode_session_delete(state: State<'_, opencode::OpenCodeState>, id: String) -> Result<(), String> {
    opencode::delete_session(&state, &id).await
}

#[tauri::command]
async fn opencode_messages(state: State<'_, opencode::OpenCodeState>, session_id: String) -> Result<serde_json::Value, String> {
    opencode::get_messages(&state, &session_id).await
}

#[tauri::command]
async fn opencode_send(state: State<'_, opencode::OpenCodeState>, session_id: String, text: String, model: Option<String>) -> Result<serde_json::Value, String> {
    opencode::send_message(&state, &session_id, &text, model.as_deref()).await
}

#[tauri::command]
async fn opencode_send_async(state: State<'_, opencode::OpenCodeState>, session_id: String, text: String, model: Option<String>) -> Result<(), String> {
    opencode::send_message_async(&state, &session_id, &text, model.as_deref()).await
}

#[tauri::command]
async fn opencode_abort(state: State<'_, opencode::OpenCodeState>, session_id: String) -> Result<(), String> {
    opencode::abort_session(&state, &session_id).await
}

#[tauri::command]
async fn opencode_config(state: State<'_, opencode::OpenCodeState>) -> Result<serde_json::Value, String> {
    opencode::get_config(&state).await
}

#[tauri::command]
async fn opencode_providers(state: State<'_, opencode::OpenCodeState>) -> Result<serde_json::Value, String> {
    opencode::get_providers(&state).await
}

#[tauri::command]
async fn opencode_models(state: State<'_, opencode::OpenCodeState>) -> Result<serde_json::Value, String> {
    opencode::get_config(&state).await
}

#[tauri::command]
async fn opencode_set_model(state: State<'_, opencode::OpenCodeState>, provider_id: String, model_id: String) -> Result<(), String> {
    opencode::set_model(&state, &provider_id, &model_id).await
}

#[tauri::command]
async fn opencode_set_auth(state: State<'_, opencode::OpenCodeState>, provider_id: String, api_key: String) -> Result<(), String> {
    opencode::set_auth(&state, &provider_id, &api_key).await
}

#[tauri::command]
async fn opencode_file_read(state: State<'_, opencode::OpenCodeState>, path: String) -> Result<String, String> {
    opencode::read_file(&state, &path).await
        .map(|v| v.as_str().unwrap_or("").to_string())
}

#[tauri::command]
async fn opencode_find_files(state: State<'_, opencode::OpenCodeState>, query: String) -> Result<Vec<String>, String> {
    opencode::find_files(&state, &query).await
        .map(|v| {
            v.as_array()
                .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default()
        })
}

#[tauri::command]
async fn opencode_search(state: State<'_, opencode::OpenCodeState>, pattern: String) -> Result<Vec<String>, String> {
    opencode::search_text(&state, &pattern).await
        .map(|v| {
            v.as_array()
                .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default()
        })
}

#[tauri::command]
async fn opencode_agents(state: State<'_, opencode::OpenCodeState>) -> Result<serde_json::Value, String> {
    opencode::list_agents(&state).await
}

#[tauri::command]
fn opencode_check() -> serde_json::Value {
    let binary = opencode::find_opencode_binary();
    serde_json::json!({
        "binaryFound": binary.is_some(),
        "binaryPath": binary.unwrap_or_default(),
    })
}

// Updater commands
#[tauri::command] fn app_get_version() -> String { env!("CARGO_PKG_VERSION").to_string() }
#[tauri::command] fn app_check_update() {}
#[tauri::command] fn app_install_update() {}

#[tauri::command]
async fn download_xeno_update(zip_url: String) -> Result<bool, String> {
    let versions_dir = dirs_next::data_local_dir()
        .or_else(dirs_next::data_dir)
        .map(|d| d.join("obsidian").join("xeno-versions"))
        .ok_or("Cannot determine data directory")?;

    std::fs::create_dir_all(&versions_dir).map_err(|e| e.to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&zip_url).send().await.map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let zip_path = versions_dir.join("update.zip");
    std::fs::write(&zip_path, &bytes).map_err(|e| e.to_string())?;

    let zip_file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive_inner = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

    let extract_dir = versions_dir.join("latest");
    if extract_dir.exists() {
        std::fs::remove_dir_all(&extract_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

    archive_inner.extract(&extract_dir).map_err(|e| e.to_string())?;

    let dll_dest = dirs_next::data_local_dir()
        .or_else(dirs_next::data_dir)
        .map(|d| d.join("obsidian").join("xeno"))
        .ok_or("Cannot determine data directory")?;

    std::fs::create_dir_all(&dll_dest).map_err(|e| e.to_string())?;

    let mut archive2 = zip::ZipArchive::new(std::fs::File::open(&zip_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;

    for i in 0..archive2.len() {
        let mut entry = archive2.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        if name.ends_with("Xeno.dll") {
            let mut out = std::fs::File::create(dll_dest.join("Xeno.dll")).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        }
    }

    let _ = std::fs::remove_file(&zip_path);
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            auto_attach: Mutex::new(boolean_wrapper::Bool(false)),
            attach_lock: Mutex::new(boolean_wrapper::Bool(false)),
            minimize_to_tray: Mutex::new(boolean_wrapper::Bool(true)),
            discord: Mutex::new(None),
        })
        .manage(xeno::XenoState::new())
        .manage(opencode::OpenCodeState::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            rpc_start,
            rpc_update,
            rpc_stop,
            set_auto_attach,
            get_auto_attach,
            get_username,
            get_server_status,
            validate_clients,
            set_attach_lock,
            get_attach_lock,
            mark_executed,
            is_roblox_running,
            kill_roblox,
            fetch_og_image,
            set_minimize_to_tray,
            zoom_in,
            zoom_out,
            zoom_reset,
            set_window_size,
            clear_browser_cache,
            get_log_files,
            read_log_file,
            xeno_init,
            xeno_version,
            xeno_clients,
            xeno_attach,
            xeno_execute,
            xeno_set_setting,
            xeno_stop,
            xeno_downloaded,
            opencode_start,
            opencode_stop,
            opencode_status,
            opencode_session_create,
            opencode_sessions,
            opencode_session_delete,
            opencode_messages,
            opencode_send,
            opencode_send_async,
            opencode_abort,
            opencode_config,
            opencode_providers,
            opencode_models,
            opencode_set_model,
            opencode_set_auth,
            opencode_file_read,
            opencode_find_files,
            opencode_search,
            opencode_agents,
            opencode_check,
            app_get_version,
            app_check_update,
            app_install_update,
            download_xeno_update,
            open_pastebin_bat
        ])
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "Mostrar Obsidian").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Salir").build(app)?;
            let tray_menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;
            let main_for_tray = app.handle().clone();
            TrayIconBuilder::with_id("main-tray")
                .menu(&tray_menu)
                .tooltip("Obsidian")
                .icon(app.default_window_icon().cloned().ok_or("Missing app icon")?)
                .on_menu_event(move |_tray, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = main_for_tray.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        if let Some(window) = main_for_tray.get_webview_window("main") {
                            let _ = window.destroy();
                        }
                        main_for_tray.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create main window (splash is embedded in index.html)
            let main_url = if cfg!(debug_assertions) {
                "http://localhost:5173".to_string()
            } else {
                "index.html".to_string()
            };

            let main_window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App(main_url.into()),
            )
            .title("Obsidian")
            .inner_size(400.0, 300.0)
            .resizable(false)
            .decorations(false)
            .transparent(false)
            .shadow(false)
            .background_color(tauri::window::Color(3, 3, 5, 255))
            .center()
            .build()?;

            let main_for_close = app.handle().clone();
            let main_window_clone = main_window.clone();
            main_window_clone.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let state = main_for_close.state::<AppState>();
                    if state.minimize_to_tray.lock().unwrap().0 {
                        api.prevent_close();
                        if let Some(main) = main_for_close.get_webview_window("main") {
                            let _ = main.hide();
                        }
                    }
                }
            });

            // After 4 seconds: animate window expansion (splash fades out via CSS)
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(4)).await;

                let start_w: f64 = 400.0;
                let start_h: f64 = 300.0;
                let end_w: f64 = 800.0;
                let end_h: f64 = 500.0;

                let (center_x, center_y) = main_window.outer_position()
                    .ok()
                    .and_then(|pos| {
                        main_window.scale_factor().ok().map(|scale| {
                            let lx = pos.to_logical::<f64>(scale).x;
                            let ly = pos.to_logical::<f64>(scale).y;
                            (lx + start_w / 2.0, ly + start_h / 2.0)
                        })
                    })
                    .unwrap_or_else(|| {
                        main_window.primary_monitor()
                            .ok()
                            .flatten()
                            .and_then(|m| {
                                let scale = m.scale_factor();
                                let size = m.size();
                                let pos = m.position();
                                Some((
                                    pos.x as f64 / scale + size.width as f64 / (2.0 * scale),
                                    pos.y as f64 / scale + size.height as f64 / (2.0 * scale),
                                ))
                            })
                            .unwrap_or((400.0, 300.0))
                    });

                let fps: f64 = 60.0;
                let duration_ms: f64 = 600.0;
                let total_frames = ((duration_ms / 1000.0) * fps).round() as u32;
                let frame_delay = std::time::Duration::from_secs_f64(1.0 / fps);

                for frame in 1..=total_frames {
                    let t = frame as f64 / total_frames as f64;
                    let eased = 1.0 - (1.0 - t).powi(4);

                    let w = start_w + (end_w - start_w) * eased;
                    let h = start_h + (end_h - start_h) * eased;
                    let x = center_x - w / 2.0;
                    let y = center_y - h / 2.0;

                    let _ = main_window.set_position(tauri::Position::Logical(
                        tauri::LogicalPosition { x, y },
                    ));
                    let _ = main_window.set_size(tauri::Size::Logical(
                        tauri::LogicalSize { width: w, height: h },
                    ));

                    tokio::time::sleep(frame_delay).await;
                }

                let _ = main_window.set_size(tauri::Size::Logical(
                    tauri::LogicalSize { width: end_w, height: end_h },
                ));
                let _ = main_window.set_resizable(true);
                let _ = main_window.set_min_size(Some(tauri::LogicalSize {
                    width: end_w,
                    height: end_h,
                }));
            });

            // Start dedicated DLL thread (all DLL calls on one thread = TLS safe)
            {
                let xeno_state = app.state::<xeno::XenoState>();
                xeno::start_dll_thread(&xeno_state);
            }

            // Spawn Roblox monitor loop
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut last_state = false;
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    let current_state = is_roblox_running();
                    if current_state != last_state {
                        last_state = current_state;
                        let _ = handle.emit("roblox-status-changed", current_state);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
