use libloading::{Library, Symbol};
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::path::PathBuf;
use std::sync::Mutex;

type InitializeFn = unsafe extern "C" fn(bool);
type VersionFn = unsafe extern "C" fn() -> *const c_char;
type GetClientsFn = unsafe extern "C" fn() -> *const c_char;
type AttachFn = unsafe extern "C" fn();
type ExecuteFn = unsafe extern "C" fn(*const c_char, *const i32, i32);
type SetSettingFn = unsafe extern "C" fn(i32, i32);

pub struct XenoState {
    initialized: Mutex<bool>,
    version_cache: Mutex<String>,
    clients_cache: Mutex<String>,
    dll_path_cache: Mutex<Option<PathBuf>>,
    library: Mutex<Option<Library>>,
}

unsafe impl Send for XenoState {}
unsafe impl Sync for XenoState {}

impl XenoState {
    pub fn new() -> Self {
        Self {
            initialized: Mutex::new(false),
            version_cache: Mutex::new(String::new()),
            clients_cache: Mutex::new("[]".to_string()),
            dll_path_cache: Mutex::new(None),
            library: Mutex::new(None),
        }
    }
}

fn is_roblox_running() -> bool {
    let s = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::new().with_processes(sysinfo::ProcessRefreshKind::new()),
    );
    for process in s.processes().values() {
        let name = process.name().to_string().to_lowercase();
        if name.contains("robloxplayerbeta") || name.contains("roblox.exe") {
            return true;
        }
    }
    false
}

fn find_xeno_dll() -> Option<PathBuf> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let p = dir.join("dll").join("Xeno.dll");
            if p.exists() { return Some(p); }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let p = cwd.join("dll").join("Xeno.dll");
        if p.exists() { return Some(p); }
        if let Some(parent) = cwd.parent() {
            let p = parent.join("dll").join("Xeno.dll");
            if p.exists() { return Some(p); }
        }
    }

    if let Some(local_app_data) = dirs_next::data_local_dir() {
        let obsidian = local_app_data.join("obsidian");
        let p = obsidian.join("xeno").join("Xeno.dll");
        if p.exists() { return Some(p); }

        let versions_dir = obsidian.join("xeno-versions");
        if versions_dir.is_dir() {
            if let Ok(rd) = std::fs::read_dir(&versions_dir) {
                let mut dirs: Vec<PathBuf> = rd
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| e.path())
                    .collect();
                dirs.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
                for d in dirs {
                    let p = d.join("Xeno.dll");
                    if p.exists() { return Some(p); }
                }
            }
        }
    }

    if let Some(roaming) = dirs_next::data_dir() {
        let p = roaming.join("obsidian").join("xeno").join("Xeno.dll");
        if p.exists() { return Some(p); }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let p = dir.join("Xeno.dll");
            if p.exists() { return Some(p); }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let p = cwd.join("Xeno.dll");
        if p.exists() { return Some(p); }
        if let Some(parent) = cwd.parent() {
            let p = parent.join("Xeno.dll");
            if p.exists() { return Some(p); }
        }
    }

    None
}

unsafe fn cstr_to_string(ptr: *const c_char) -> String {
    if ptr.is_null() {
        return String::new();
    }
    CStr::from_ptr(ptr).to_string_lossy().into_owned()
}

pub fn init_dll(state: &XenoState) -> Result<String, String> {
    if *state.initialized.lock().map_err(|e| e.to_string())? {
        return Ok(state.version_cache.lock().map_err(|e| e.to_string())?.clone());
    }

    if !is_roblox_running() {
        return Err("Roblox is not running".to_string());
    }

    let dll_path = find_xeno_dll()
        .ok_or_else(|| "Xeno.dll not found".to_string())?;

    log::info!("[Xeno] Loading from {:?}", dll_path);

    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        if let Some(parent) = dll_path.parent() {
            let wide: Vec<u16> = OsStr::new(parent)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            unsafe { windows_sys::Win32::System::LibraryLoader::SetDllDirectoryW(wide.as_ptr()); }
        }
    }

    let lib = unsafe {
        Library::new(&dll_path)
            .map_err(|e| format!("Failed to load Xeno.dll: {e}"))?
    };

    unsafe {
        let init_fn: Symbol<InitializeFn> = lib.get(b"Initialize\0")
            .map_err(|_| "Export 'Initialize' not found".to_string())?;
        init_fn(false);
        log::info!("[Xeno] Initialize(false) completed");

        let version_fn: Symbol<VersionFn> = lib.get(b"Version\0")
            .map_err(|_| "Export 'Version' not found".to_string())?;
        let ver = cstr_to_string(version_fn());
        log::info!("[Xeno] Version: {ver}");

        *state.library.lock().map_err(|e| e.to_string())? = Some(lib);
        *state.initialized.lock().map_err(|e| e.to_string())? = true;
        *state.version_cache.lock().map_err(|e| e.to_string())? = ver.clone();

        Ok(ver)
    }
}

pub fn get_version(state: &XenoState) -> Result<String, String> {
    if !*state.initialized.lock().map_err(|e| e.to_string())? {
        return Ok(state.version_cache.lock().map_err(|e| e.to_string())?.clone());
    }

    let lib = state.library.lock().map_err(|e| e.to_string())?;
    let lib = lib.as_ref().ok_or("Library not loaded")?;

    unsafe {
        let version_fn: Symbol<VersionFn> = lib.get(b"Version\0")
            .map_err(|_| "Export 'Version' not found".to_string())?;
        Ok(cstr_to_string(version_fn()))
    }
}

pub fn get_clients(state: &XenoState) -> Result<String, String> {
    if !*state.initialized.lock().map_err(|e| e.to_string())? {
        return Ok("[]".to_string());
    }

    let lib = state.library.lock().map_err(|e| e.to_string())?;
    let lib = lib.as_ref().ok_or("Library not loaded")?;

    unsafe {
        let get_clients_fn: Symbol<GetClientsFn> = lib.get(b"GetClients\0")
            .map_err(|_| "Export 'GetClients' not found".to_string())?;
        let json = cstr_to_string(get_clients_fn());
        if let Ok(mut cache) = state.clients_cache.lock() {
            *cache = json.clone();
        }
        Ok(json)
    }
}

pub fn attach(state: &XenoState) -> Result<String, String> {
    log::info!("[Xeno] attach called");
    if !*state.initialized.lock().map_err(|e| e.to_string())? {
        log::error!("[Xeno] attach: DLL not initialized");
        return Err("DLL not initialized".to_string());
    }
    if !is_roblox_running() {
        log::error!("[Xeno] attach: Roblox not running");
        return Err("Roblox is not running".to_string());
    }

    let lib = state.library.lock().map_err(|e| e.to_string())?;
    let lib = lib.as_ref().ok_or("Library not loaded")?;

    unsafe {
        let attach_fn: Symbol<AttachFn> = lib.get(b"Attach\0")
            .map_err(|_| "Export 'Attach' not found".to_string())?;
        log::info!("[Xeno] Calling DLL Attach...");
        attach_fn();
        log::info!("[Xeno] DLL Attach returned");

        log::info!("[Xeno] Waiting for injection (polling up to 15s)...");
        let get_clients_fn: Symbol<GetClientsFn> = lib.get(b"GetClients\0")
            .map_err(|_| "Export 'GetClients' not found".to_string())?;

        let mut json = String::new();
        for i in 0..30 {
            std::thread::sleep(std::time::Duration::from_millis(500));
            json = cstr_to_string(get_clients_fn());
            log::info!("[Xeno] Poll {i}: {json}");
            if !json.contains("Loading") && json != "[]" && !json.is_empty() {
                break;
            }
        }
        log::info!("[Xeno] Post-attach clients: {json}");
        if let Ok(mut cache) = state.clients_cache.lock() {
            *cache = json.clone();
        }
        Ok(json)
    }
}

pub fn execute(state: &XenoState, script: &str, pids: &[i32]) -> Result<String, String> {
    log::info!("[Xeno] execute called, script len={}, pids={:?}, script_preview={:.100}", script.len(), pids, script);

    if !*state.initialized.lock().map_err(|e| e.to_string())? {
        log::error!("[Xeno] execute: DLL not initialized");
        return Err("DLL not initialized".to_string());
    }
    if pids.is_empty() {
        log::error!("[Xeno] execute: no pids");
        return Err("No clients attached".to_string());
    }

    let lib = state.library.lock().map_err(|e| e.to_string())?;
    let lib = lib.as_ref().ok_or("Library not loaded")?;

    unsafe {
        let execute_fn: Symbol<ExecuteFn> = lib.get(b"Execute\0")
            .map_err(|_| "Export 'Execute' not found".to_string())?;
        let c_script = CString::new(script).map_err(|e| e.to_string())?;
        log::info!("[Xeno] Calling DLL Execute...");
        execute_fn(c_script.as_ptr(), pids.as_ptr(), pids.len() as i32);
        log::info!("[Xeno] DLL Execute returned");

        std::thread::sleep(std::time::Duration::from_millis(200));

        let get_clients_fn: Symbol<GetClientsFn> = lib.get(b"GetClients\0")
            .map_err(|_| "Export 'GetClients' not found".to_string())?;
        let json = cstr_to_string(get_clients_fn());
        log::info!("[Xeno] Post-execute clients: {json}");
        Ok(json)
    }
}

pub fn set_setting(state: &XenoState, id: i32, value: i32) -> Result<(), String> {
    if !*state.initialized.lock().map_err(|e| e.to_string())? {
        return Err("DLL not initialized".to_string());
    }

    let lib = state.library.lock().map_err(|e| e.to_string())?;
    let lib = lib.as_ref().ok_or("Library not loaded")?;

    unsafe {
        let set_setting_fn: Symbol<SetSettingFn> = lib.get(b"SetSetting\0")
            .map_err(|_| "Export 'SetSetting' not found".to_string())?;
        set_setting_fn(id, value);
    }
    Ok(())
}

pub fn stop(state: &XenoState) -> Result<(), String> {
    *state.library.lock().map_err(|e| e.to_string())? = None;
    *state.initialized.lock().map_err(|e| e.to_string())? = false;
    Ok(())
}

pub fn start_dll_thread(_state: &XenoState) {}

pub fn find_xeno_dll_path(state: &XenoState) -> Option<PathBuf> {
    if let Ok(cache) = state.dll_path_cache.lock() {
        if let Some(ref p) = *cache {
            if p.exists() {
                return Some(p.clone());
            }
        }
    }
    let found = find_xeno_dll();
    if let Ok(mut cache) = state.dll_path_cache.lock() {
        *cache = found.clone();
    }
    found
}
