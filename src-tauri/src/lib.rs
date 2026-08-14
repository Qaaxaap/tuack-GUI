// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use path_clean::PathClean;
use serde_json::Value;
use tauri::ipc::Channel;
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Child;

// ---------- 数据结构 ----------

#[derive(serde::Serialize)]
#[allow(dead_code)] // Bundled 留给 M4 内置打包，暂时未使用
enum Source {
    Bundled,
    External,
}

#[derive(serde::Serialize)]
struct BinaryInfo {
    exe: PathBuf,
    assets: PathBuf,
    source: Source,
}

#[derive(serde::Serialize)]
struct Project {
    root: PathBuf,
    contest: ContestNode,
}

#[derive(serde::Serialize)]
struct ContestNode {
    name: String,
    title: String,
    dir: PathBuf,
    days: Vec<DayNode>,
}

#[derive(serde::Serialize)]
struct DayNode {
    name: String,
    title: String,
    dir: PathBuf,
    problems: Vec<ProblemNode>,
}

#[derive(serde::Serialize)]
struct ProblemNode {
    name: String,
    title: String,
    dir: PathBuf,
}

// ---------- 命令 ----------

#[derive(serde::Deserialize)]
#[serde(tag = "command", rename_all = "kebab-case")]
enum Command {
    Gen {
        target: GenTarget,
        names: Vec<String>,
        confirm: bool,
    },
    Test {
        target: TestTarget,
    },
    Ren {
        template: String,
        keep_tmp: bool,
        no_auto_open: bool,
    },
    Dmk {
        target: DataTarget,
        action: DmkAction,
        object: String,
        validate: Option<bool>,
    },
    Validate {
        target: DataTarget,
        object: String,
    },
    Dump {
        target: DumpTarget,
    },
    DocFormat {
        explain: Option<String>,
    },
    DocCheck {
        explain: Option<String>,
    },
    DocValidate,
    ConfTitle {
        values: Vec<String>,
    },
    ConfTime {
        values: Vec<String>,
    },
    ConfLength {
        values: Vec<String>,
    },
    ConfMigrate,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
enum GenTarget {
    Contest,
    Day,
    Problem,
    Data,
    Samples,
    Code,
    All,
    Lfs,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
enum TestTarget {
    Data,
    Sample,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
enum DataTarget {
    Data,
    Sample,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
enum DmkAction {
    Gen,
    Regen,
    Reset,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
enum DumpTarget {
    Lemon,
    Arbiter,
}

#[derive(serde::Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum ProcessEvent {
    Stdout { line: String },
    Stderr { line: String },
    Exited { code: Option<i32> },
}

fn gen_target_str(t: &GenTarget) -> &'static str {
    match t {
        GenTarget::Contest => "contest",
        GenTarget::Day => "day",
        GenTarget::Problem => "problem",
        GenTarget::Data => "data",
        GenTarget::Samples => "samples",
        GenTarget::Code => "code",
        GenTarget::All => "all",
        GenTarget::Lfs => "lfs",
    }
}

fn build_argv(cmd: &Command) -> Vec<String> {
    match cmd {
        Command::Gen {
            target,
            names,
            confirm,
        } => {
            let mut v = vec!["gen".to_string(), gen_target_str(target).to_string()];
            v.extend(names.iter().cloned());
            if *confirm {
                v.push("-y".to_string());
            }
            v
        }
        Command::Test { target } => vec![
            "test".to_string(),
            match target {
                TestTarget::Data => "data",
                TestTarget::Sample => "sample",
            }
            .to_string(),
        ],
        Command::Ren {
            template,
            keep_tmp,
            no_auto_open,
        } => {
            let mut v = vec!["ren".to_string(), template.clone()];
            if *keep_tmp {
                v.push("--keep-tmp".to_string());
            }
            if *no_auto_open {
                v.push("-s".to_string());
            }
            v
        }
        Command::Dmk {
            target,
            action,
            object,
            validate,
        } => {
            let mut v = vec![
                "dmk".to_string(),
                data_target_str(target).to_string(),
                dmk_action_str(action).to_string(),
            ];
            if !object.is_empty() && object != "all" {
                v.push(object.clone());
            }
            if let Some(val) = validate {
                v.push(format!("--validate={}", bool_str(*val)));
            }
            v
        }
        Command::Validate { target, object } => {
            let mut v = vec!["validate".to_string(), data_target_str(target).to_string()];
            if !object.is_empty() && object != "all" {
                v.push(object.clone());
            }
            v
        }
        Command::Dump { target } => vec!["dump".to_string(), dump_target_str(target).to_string()],
        Command::DocFormat { explain } => doc_cmd("format", explain),
        Command::DocCheck { explain } => doc_cmd("check", explain),
        Command::DocValidate => vec!["doc".to_string(), "validate".to_string()],
        Command::ConfTitle { values } => conf_cmd("title", values),
        Command::ConfTime { values } => conf_cmd("time", values),
        Command::ConfLength { values } => conf_cmd("length", values),
        Command::ConfMigrate => vec!["conf".to_string(), "migrate".to_string()],
    }
}

fn data_target_str(t: &DataTarget) -> &'static str {
    match t {
        DataTarget::Data => "data",
        DataTarget::Sample => "sample",
    }
}

fn dmk_action_str(a: &DmkAction) -> &'static str {
    match a {
        DmkAction::Gen => "gen",
        DmkAction::Regen => "regen",
        DmkAction::Reset => "reset",
    }
}

fn dump_target_str(t: &DumpTarget) -> &'static str {
    match t {
        DumpTarget::Lemon => "lemon",
        DumpTarget::Arbiter => "arbiter",
    }
}

fn bool_str(b: bool) -> String {
    if b {
        "true".to_string()
    } else {
        "false".to_string()
    }
}

fn doc_cmd(action: &str, explain: &Option<String>) -> Vec<String> {
    let mut v = vec!["doc".to_string(), action.to_string()];
    if let Some(e) = explain {
        if !e.is_empty() {
            v.push("--explain".to_string());
            v.push(e.clone());
        }
    }
    v
}

fn conf_cmd(target: &str, values: &[String]) -> Vec<String> {
    let mut v = vec!["conf".to_string(), target.to_string()];
    v.extend(values.iter().cloned());
    v
}

// ---------- 配置解析 ----------

fn read_conf(dir: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(dir.join("conf.json"))
        .map_err(|e| format!("读取 {} 失败：{e}", dir.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("解析 {} 失败：{e}", dir.display()))
}

fn get_str(json: &Value, key: &str) -> String {
    if let Some(s) = json.get(key).and_then(|v| v.as_str()) {
        s.to_string()
    } else {
        String::new()
    }
}

fn get_subdir(json: &Value) -> Vec<String> {
    let mut out = Vec::new();
    if let Some(arr) = json.get("subdir").and_then(|v| v.as_array()) {
        for v in arr {
            if let Some(s) = v.as_str() {
                out.push(s.to_string());
            }
        }
    }
    out
}

fn find_contest_root(start: &str) -> Result<PathBuf, String> {
    for dir in Path::new(start).ancestors() {
        if let Ok(json) = read_conf(dir) {
            if json.get("folder").and_then(|v| v.as_str()) == Some("contest") {
                return Ok(dir.to_path_buf());
            }
        }
    }
    Err("未找到工程：请选择包含 conf.json 的 contest 目录".to_string())
}

fn parse_problem(dir: &Path) -> Result<ProblemNode, String> {
    let json = read_conf(dir)?;
    Ok(ProblemNode {
        name: get_str(&json, "name"),
        title: get_str(&json, "title"),
        dir: dir.to_path_buf(),
    })
}

fn parse_day(dir: &Path) -> Result<DayNode, String> {
    let json = read_conf(dir)?;
    let mut problems = Vec::new();
    for name in get_subdir(&json) {
        problems.push(parse_problem(&dir.join(&name).clean())?);
    }
    Ok(DayNode {
        name: get_str(&json, "name"),
        title: get_str(&json, "title"),
        dir: dir.to_path_buf(),
        problems,
    })
}

// ---------- 命令 ----------

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
fn open_project(start: String) -> Result<Project, String> {
    let root = find_contest_root(&start)?;
    let json = read_conf(&root)?;

    let mut days = Vec::new();
    for name in get_subdir(&json) {
        days.push(parse_day(&root.join(&name).clean())?);
    }

    let contest = ContestNode {
        name: get_str(&json, "name"),
        title: get_str(&json, "title"),
        dir: root.clone(),
        days,
    };

    Ok(Project { root, contest })
}

// ---------- 状态 ----------

struct AppState {
    tuack_path: Mutex<Option<PathBuf>>,
    children: Arc<Mutex<HashMap<u64, Child>>>,
    next_id: Arc<AtomicU64>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            tuack_path: Mutex::new(None),
            children: Arc::new(Mutex::new(HashMap::new())),
            next_id: Arc::new(AtomicU64::new(1)),
        }
    }
}

#[tauri::command]
fn set_tuack_path(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err("文件不存在".to_string());
    }
    *state.tuack_path.lock().unwrap() = Some(p);
    Ok(())
}

fn binary_info(exe: PathBuf) -> BinaryInfo {
    let assets = exe.parent().map(|d| d.join("assets")).unwrap_or_default();
    BinaryInfo {
        exe,
        assets,
        source: Source::External,
    }
}

fn find_in_path(name: &str) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(':') {
            let candidate = Path::new(dir).join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn resolve_tuack(state: &AppState) -> Option<PathBuf> {
    if let Some(p) = state.tuack_path.lock().unwrap().clone() {
        return Some(p);
    }
    find_in_path("tuack-ng")
}

#[tauri::command]
fn detect_tuack(state: tauri::State<AppState>) -> Result<BinaryInfo, String> {
    resolve_tuack(&state)
        .map(binary_info)
        .ok_or_else(|| "未找到 tuack-ng，请点「设置」指定路径".to_string())
}

#[tauri::command]
async fn run_command(
    cmd: Command,
    cwd: String,
    on_event: Channel<ProcessEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let exe = resolve_tuack(&state)
        .ok_or_else(|| "未找到 tuack-ng，请先「设置 tuack-ng」".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::Relaxed);

    let mut child = tokio::process::Command::new(&exe)
        .args(build_argv(&cmd))
        .current_dir(&cwd)
        .env("CLICOLOR_FORCE", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 tuack-ng 失败：{e}"))?;

    let stdout = child.stdout.take().ok_or("无法捕获 stdout")?;
    let stderr = child.stderr.take().ok_or("无法捕获 stderr")?;

    let ev = on_event.clone();
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = ev.send(ProcessEvent::Stdout { line });
        }
    });

    let ev = on_event.clone();
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = ev.send(ProcessEvent::Stderr { line });
        }
    });

    state.children.lock().unwrap().insert(id, child);

    let children = state.children.clone();
    let ev = on_event.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            let code = {
                let mut map = children.lock().unwrap();
                match map.get_mut(&id) {
                    Some(c) => match c.try_wait() {
                        Ok(Some(status)) => {
                            map.remove(&id);
                            Some(status.code())
                        }
                        Ok(None) => None,
                        Err(_) => {
                            map.remove(&id);
                            None
                        }
                    },
                    None => Some(None),
                }
            };
            if let Some(code) = code {
                let _ = ev.send(ProcessEvent::Exited { code });
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
    });

    Ok(id)
}

#[tauri::command]
fn cancel_command(id: u64, state: tauri::State<AppState>) -> Result<(), String> {
    if let Some(child) = state.children.lock().unwrap().get_mut(&id) {
        let _ = child.start_kill();
    }
    Ok(())
}

// ---------- 入口 ----------

// ---------- 设置持久化 ----------

#[derive(serde::Serialize, serde::Deserialize)]
struct LastProject {
    path: String,
    name: String,
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct Settings {
    last_project: Option<LastProject>,
    file_manager: Option<String>,
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取数据目录：{e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败：{e}"))?;
    Ok(dir.join("settings.json"))
}

fn load_settings(app: &tauri::AppHandle) -> Settings {
    let path = match settings_path(app) {
        Ok(p) => p,
        Err(_) => return Settings::default(),
    };
    match fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => Settings::default(),
    }
}

fn save_settings(app: &tauri::AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let text = serde_json::to_string_pretty(settings).map_err(|e| format!("序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("写入失败：{e}"))
}

#[tauri::command]
fn get_last_project(app: tauri::AppHandle) -> Option<LastProject> {
    load_settings(&app).last_project
}

#[tauri::command]
fn save_last_project(app: tauri::AppHandle, path: String, name: String) -> Result<(), String> {
    let mut settings = load_settings(&app);
    settings.last_project = Some(LastProject { path, name });
    save_settings(&app, &settings)
}

// ---------- 目录浏览 ----------

#[derive(serde::Serialize)]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

#[derive(serde::Serialize)]
struct DirListing {
    parent: String,
    entries: Vec<DirEntry>,
}

#[tauri::command]
fn list_dir(path: String) -> Result<DirListing, String> {
    let parent = Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let mut entries = Vec::new();
    let rd = std::fs::read_dir(&path).map_err(|e| format!("读取目录失败：{e}"))?;
    for entry in rd {
        let entry = entry.map_err(|e| format!("读取条目失败：{e}"))?;
        let p = entry.path();
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: p.to_string_lossy().to_string(),
            is_dir: p.is_dir(),
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(DirListing { parent, entries })
}

#[tauri::command]
fn home_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("获取主目录失败：{e}"))
}

#[tauri::command]
fn read_config(path: String) -> Result<Value, String> {
    let text = fs::read_to_string(&path).map_err(|e| format!("读取配置失败：{e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败：{e}"))
}

#[tauri::command]
fn write_config(path: String, value: Value) -> Result<(), String> {
    let text = serde_json::to_string_pretty(&value).map_err(|e| format!("序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("写入配置失败：{e}"))
}

#[tauri::command]
fn open_in_file_manager(app: tauri::AppHandle, path: String) -> Result<(), String> {
    // 1. 用户自定义的文件管理器（命令名或绝对路径）
    if let Some(cmd) = load_settings(&app)
        .file_manager
        .as_deref()
        .filter(|c| !c.is_empty())
    {
        return std::process::Command::new(cmd)
            .arg(&path)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("启动文件管理器失败：{e}"));
    }
    // 2. 未指定：Linux 探测主流文件管理器；mac/win 用系统默认
    #[cfg(target_os = "linux")]
    {
        let exe = ["dolphin", "nautilus", "nemo", "thunar", "pcmanfm"]
            .into_iter()
            .find_map(find_in_path)
            .or_else(|| find_in_path("xdg-open"))
            .ok_or_else(|| "未找到可用的文件管理器，请在设置里指定".to_string())?;
        std::process::Command::new(exe)
            .arg(&path)
            .spawn()
            .map_err(|e| format!("启动文件管理器失败：{e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("启动失败：{e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("启动失败：{e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn get_file_manager(app: tauri::AppHandle) -> Option<String> {
    load_settings(&app).file_manager
}

#[tauri::command]
fn set_file_manager(app: tauri::AppHandle, cmd: String) -> Result<(), String> {
    let mut settings = load_settings(&app);
    settings.file_manager = if cmd.trim().is_empty() {
        None
    } else {
        Some(cmd.trim().to_string())
    };
    save_settings(&app, &settings)
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("读取文件失败：{e}"))?;
    Ok(STANDARD.encode(&bytes))
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("读取文件失败：{e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            ping,
            open_project,
            set_tuack_path,
            detect_tuack,
            run_command,
            cancel_command,
            get_last_project,
            save_last_project,
            list_dir,
            home_dir,
            read_config,
            write_config,
            open_in_file_manager,
            get_file_manager,
            set_file_manager,
            read_file_base64,
            read_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
