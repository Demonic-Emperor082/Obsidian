use std::sync::Mutex;
use std::process::{Command, Child, Stdio};
use std::time::Duration;

const OPENCODE_PORT: u16 = 4097;
const OPENCODE_URL: &str = "http://127.0.0.1:4097";

pub struct OpenCodeState {
    process: Mutex<Option<Child>>,
    ready: Mutex<bool>,
}

unsafe impl Send for OpenCodeState {}
unsafe impl Sync for OpenCodeState {}

impl OpenCodeState {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
            ready: Mutex::new(false),
        }
    }
}

pub fn find_opencode_binary() -> Option<String> {
    let candidates = if cfg!(target_os = "windows") {
        vec![
            format!("{}\\npm\\opencode.cmd", std::env::var("APPDATA").unwrap_or_default()),
            format!("{}\\npm\\opencode", std::env::var("APPDATA").unwrap_or_default()),
            format!("{}\\node_modules\\.bin\\opencode", std::env::current_dir().ok()?.display()),
            "opencode".to_string(),
        ]
    } else {
        vec![
            "/usr/local/bin/opencode".to_string(),
            "/usr/bin/opencode".to_string(),
            "opencode".to_string(),
        ]
    };

    for candidate in &candidates {
        if candidate == "opencode" {
            let result = Command::new("where")
                .arg("opencode")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();
            match result {
                Ok(out) if out.status.success() => {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    if let Some(first_line) = stdout.lines().next() {
                        let path = first_line.trim().to_string();
                        if !path.is_empty() {
                            return Some(path);
                        }
                    }
                }
                _ => {}
            }
        } else if std::path::Path::new(candidate).exists() {
            return Some(candidate.clone());
        }
    }
    None
}

pub async fn start_server(state: &OpenCodeState) -> Result<bool, String> {
    if *state.ready.lock().map_err(|e| e.to_string())? {
        return Ok(true);
    }
    if state.process.lock().map_err(|e| e.to_string())?.is_some() {
        return Ok(false);
    }

    let binary = find_opencode_binary().ok_or("OpenCode binary not found".to_string())?;

    let data_dir = dirs_next::data_dir()
        .or_else(dirs_next::data_local_dir)
        .map(|d| d.join("obsidian").join("opencode-obsidian"))
        .ok_or("Cannot determine data directory")?;

    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let config_dir = data_dir.join(".config").join("opencode");
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let config_path = config_dir.join("opencode.json");
    let agent_prompt = "Eres el asistente de IA de **Obsidian**, un exploit executor para Roblox.\n\n## Qué es Obsidian\nObsidian es una aplicación de Windows con interfaz gráfica para ejecutar scripts Lua en Roblox. Utiliza Xeno como motor de inyección.\n\n## Secciones de Obsidian\n- **Home**: Dashboard con acceso rápido a Attach, Editor, Scripts, Library, AI y Kill Roblox. Muestra el estado del servidor y clientes conectados.\n- **Editor**: Editor de código Lua con pestañas, autocompletado de Roblox (500+ sugerencias), tema oscuro, importar/exportar archivos .lua.\n- **Script Hub**: Explorador de scripts de la comunidad (ScriptBlox). Buscar, filtrar, copiar, ejecutar directamente o guardar en favoritos.\n- **Library**: Gestor local de scripts guardados. Crear, renombrar, eliminar, previsualizar y cargar scripts en el editor.\n- **AI (tú)**: Chat con IA para escribir scripts de exploits.\n- **Settings**: Configuración de apariencia, Discord Rich Presence, Auto-Attach, Always on Top, Minimizar a bandeja, modo de bajo rendimiento.\n\n## Flujo de uso\n1. Abre Roblox y entra a un juego\n2. En Obsidian, haz clic en **Attach** (botón en Home o en el Editor)\n3. Escribe o selecciona un script Lua\n4. Haz clic en **Execute** o presiona Ctrl+Enter\n\n## Funciones clave\n- **Attach/Inject**: Conecta Obsidian al juego Roblox en ejecución\n- **Execute**: Envía el código Lua al juego\n- **Kill**: Termina el proceso de Roblox\n- **Auto-Attach**: Opcionalmente se conecta automáticamente al detectar Roblox\n- **Multi-client**: Puede ejecutar en múltiples instancias de Roblox\n\n## Tu rol\nLos usuarios te piden que escribas scripts Lua para trucos como aimbot, ESP, fly, speed hack, no clip, jump power, etc. Escribe el código completo y explica cómo usarlo. Usa markdown: tablas para comparar opciones, listas para pasos, bloques de código para el script. Responde en español y sé conciso.";

    let mut config_value = if config_path.exists() {
        std::fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .unwrap_or_else(|| serde_json::json!({ "$schema": "https://opencode.ai/config.json" }))
    } else {
        serde_json::json!({ "$schema": "https://opencode.ai/config.json" })
    };

    if let Some(obj) = config_value.as_object_mut() {
        let agent = obj.entry("agent").or_insert(serde_json::json!({}));
        if let Some(agent_obj) = agent.as_object_mut() {
            let build = agent_obj.entry("build").or_insert(serde_json::json!({}));
            if let Some(build_obj) = build.as_object_mut() {
                build_obj.insert("prompt".to_string(), serde_json::json!(agent_prompt));
            }
        }
    }

    std::fs::write(&config_path, serde_json::to_string_pretty(&config_value).unwrap_or_default())
        .map_err(|e| e.to_string())?;

    let data_dir_str = data_dir.to_string_lossy().to_string();

    let mut child = Command::new(&binary)
        .args(["serve", "--port", &OPENCODE_PORT.to_string(), "--hostname", "127.0.0.1"])
        .env("HOME", &data_dir_str)
        .env("USERPROFILE", &data_dir_str)
        .env("APPDATA", &data_dir_str)
        .env("LOCALAPPDATA", &data_dir_str)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(&data_dir)
        .spawn()
        .map_err(|e| format!("Failed to spawn OpenCode: {}", e))?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    for _ in 0..30 {
        tokio::time::sleep(Duration::from_secs(1)).await;
        match client.get(format!("{}/global/health", OPENCODE_URL)).send().await {
            Ok(res) if res.status().is_success() => {
                *state.ready.lock().map_err(|e| e.to_string())? = true;
                *state.process.lock().map_err(|e| e.to_string())? = Some(child);
                return Ok(true);
            }
            _ => {}
        }
    }

    let _ = child.kill();
    Err("OpenCode server did not start in time".to_string())
}

pub fn stop_server(state: &OpenCodeState) -> Result<(), String> {
    if let Some(mut child) = state.process.lock().map_err(|e| e.to_string())?.take() {
        let _ = child.kill();
    }
    *state.ready.lock().map_err(|e| e.to_string())? = false;
    Ok(())
}

pub fn is_running(state: &OpenCodeState) -> bool {
    if let Ok(ready) = state.ready.lock() {
        *ready
    } else {
        false
    }
}

async fn api_request(path: &str, method: &str, body: Option<String>, timeout_ms: u64) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}{}", OPENCODE_URL, path);

    let mut req = match method {
        "POST" => client.post(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "PUT" => client.put(&url),
        _ => client.get(&url),
    };

    req = req.header("Content-Type", "application/json");

    if let Some(body) = body {
        req = req.body(body);
    }

    let res = req.send().await.map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;

    if text.trim().is_empty() {
        return Ok(serde_json::Value::Null);
    }

    serde_json::from_str(&text).map_err(|e| format!("JSON parse error: {} (response: {})", e, &text[..text.len().min(200)]))
}

// ── API Commands (all async) ──

pub async fn create_session(state: &OpenCodeState, title: Option<String>) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    let body = serde_json::json!({ "title": title }).to_string();
    api_request("/session", "POST", Some(body), 10000).await
}

pub async fn list_sessions(state: &OpenCodeState) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request("/session", "GET", None, 10000).await
}

pub async fn delete_session(state: &OpenCodeState, id: &str) -> Result<(), String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request(&format!("/session/{}", id), "DELETE", None, 10000).await?;
    Ok(())
}

pub async fn get_messages(state: &OpenCodeState, session_id: &str) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request(&format!("/session/{}/message", session_id), "GET", None, 10000).await
}

pub async fn send_message(state: &OpenCodeState, session_id: &str, text: &str, model: Option<&str>) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }

    let mut body = serde_json::json!({
        "parts": [{ "type": "text", "text": text }]
    });

    if let Some(m) = model {
        let parts: Vec<&str> = m.splitn(2, '/').collect();
        if parts.len() == 2 {
            body["model"] = serde_json::json!({ "providerID": parts[0], "modelID": parts[1] });
        }
    }

    let url = format!("{}/session/{}/message", OPENCODE_URL, session_id);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    let mut res = client.post(&url)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status, err_body));
    }

    let mut full_text = String::new();
    let mut buffer = String::new();
    let mut last_assistant_id = String::new();
    let mut idle = false;

    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            let json_str = if let Some(rest) = line.strip_prefix("data: ") {
                rest
            } else {
                &line
            };

            if let Ok(event) = serde_json::from_str::<serde_json::Value>(json_str) {
                let event_type = event["type"].as_str().unwrap_or("");

                match event_type {
                    "message.updated" => {
                        if let Some(info) = event["properties"]["info"].as_object() {
                            if info.get("role").and_then(|r| r.as_str()) == Some("assistant") {
                                if let Some(id) = info.get("id").and_then(|i| i.as_str()) {
                                    last_assistant_id = id.to_string();
                                }
                            }
                        }
                    }
                    "message.part.updated" => {
                        if let Some(delta) = event["properties"]["delta"].as_str() {
                            full_text.push_str(delta);
                        } else if let Some(part) = event["properties"]["part"].as_object() {
                            if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                                if let Some(t) = part.get("text").and_then(|t| t.as_str()) {
                                    full_text = t.to_string();
                                }
                            }
                        }
                    }
                    "session.idle" | "session.completed" | "session.error" => {
                        idle = true;
                    }
                    _ => {}
                }
            }
        }

        if idle {
            break;
        }
    }

    if full_text.is_empty() {
        return Err("Empty response from AI".to_string());
    }

    Ok(serde_json::json!({
        "info": { "id": last_assistant_id, "role": "assistant" },
        "parts": [{ "type": "text", "text": full_text }]
    }))
}

pub async fn send_message_async(state: &OpenCodeState, session_id: &str, text: &str, model: Option<&str>) -> Result<(), String> {
    if !is_running(state) { return Err("Server not running".to_string()); }

    let mut body = serde_json::json!({
        "parts": [{ "type": "text", "text": text }]
    });

    if let Some(m) = model {
        let parts: Vec<&str> = m.splitn(2, '/').collect();
        if parts.len() == 2 {
            body["model"] = serde_json::json!({ "providerID": parts[0], "modelID": parts[1] });
        }
    }

    let url = format!("{}/session/{}/prompt_async", OPENCODE_URL, session_id);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.post(&url)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("prompt_async HTTP {}: {}", status, err_body));
    }

    Ok(())
}

pub async fn abort_session(state: &OpenCodeState, session_id: &str) -> Result<(), String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request(&format!("/session/{}/abort", session_id), "POST", None, 10000).await?;
    Ok(())
}

pub async fn get_config(state: &OpenCodeState) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request("/config", "GET", None, 10000).await
}

pub async fn get_providers(state: &OpenCodeState) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request("/config/providers", "GET", None, 10000).await
}

pub async fn set_model(state: &OpenCodeState, provider_id: &str, model_id: &str) -> Result<(), String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    let body = serde_json::json!({ "model": format!("{}/{}", provider_id, model_id) }).to_string();
    api_request("/config", "PATCH", Some(body), 10000).await?;
    Ok(())
}

pub async fn set_auth(state: &OpenCodeState, provider_id: &str, api_key: &str) -> Result<(), String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    let body = serde_json::json!({ "type": "api", "key": api_key }).to_string();
    api_request(&format!("/auth/{}", provider_id), "PUT", Some(body), 10000).await?;
    Ok(())
}

pub async fn read_file(state: &OpenCodeState, path: &str) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    let encoded = urlencoding::encode(path);
    api_request(&format!("/file/content?path={}", encoded), "GET", None, 10000).await
}

pub async fn find_files(state: &OpenCodeState, query: &str) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    let encoded = urlencoding::encode(query);
    api_request(&format!("/find/file?query={}", encoded), "GET", None, 10000).await
}

pub async fn search_text(state: &OpenCodeState, pattern: &str) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    let encoded = urlencoding::encode(pattern);
    api_request(&format!("/find?pattern={}", encoded), "GET", None, 10000).await
}

pub async fn list_agents(state: &OpenCodeState) -> Result<serde_json::Value, String> {
    if !is_running(state) { return Err("Server not running".to_string()); }
    api_request("/agent", "GET", None, 10000).await
}
