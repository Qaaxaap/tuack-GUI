// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use path_clean::PathClean;
use portable_pty::{Child, CommandBuilder, PtySize};
use serde_json::Value;
use tauri::ipc::Channel;
use tauri::Manager;

/// 窗口图标：深色主题用白描边版、浅色主题用黑描边版
const ICON_LIGHT: &[u8] = include_bytes!("../icons/icon-light.png");
const ICON_DARK: &[u8] = include_bytes!("../icons/icon-dark.png");

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
    /// PTY 原始输出（stdout/stderr 已合并，含 ANSI/光标控制序列）
    Output {
        data: String,
    },
    Exited {
        code: Option<i32>,
    },
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

struct RunningProcess {
    child: Box<dyn Child + Send + Sync>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    /// Windows ConPTY：stdin 写入端必须保活到进程结束（提前丢会杀子进程）
    #[allow(dead_code)]
    stdin_writer: Option<Box<dyn std::io::Write + Send>>,
}

struct AppState {
    tuack_path: Mutex<Option<PathBuf>>,
    children: Arc<Mutex<HashMap<u64, RunningProcess>>>,
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

/// 探测候选二进制：运行 --version，成功且输出含 "tuack" 才视为有效
fn probe_tuack(exe: &Path) -> bool {
    let mut cmd = std::process::Command::new(exe);
    cmd.arg("--version");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW，探测时避免闪黑窗
    }
    match cmd.output() {
        Ok(o) => {
            o.status.success()
                && String::from_utf8_lossy(&o.stdout)
                    .to_lowercase()
                    .contains("tuack")
        }
        Err(_) => false,
    }
}

#[tauri::command]
fn set_tuack_path(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err("文件不存在".to_string());
    }
    if !probe_tuack(&p) {
        return Err("所选文件不是有效的 tuack-ng 可执行文件".to_string());
    }
    *state.tuack_path.lock().unwrap() = Some(p);
    Ok(())
}

fn binary_info(exe: PathBuf, source: Source) -> BinaryInfo {
    let assets = exe.parent().map(|d| d.join("assets")).unwrap_or_default();
    BinaryInfo {
        exe,
        assets,
        source,
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

fn sidecar_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()?
        .parent()
        .map(|p| p.to_path_buf())
}

fn resolve_tuack(state: &AppState) -> Option<(PathBuf, Source)> {
    // 1. 用户手动指定
    if let Some(p) = state.tuack_path.lock().unwrap().clone() {
        if p.is_file() {
            return Some((p, Source::External));
        }
    }
    // 2. 内置 sidecar（与可执行文件同目录，发布版布局）
    if let Some(dir) = sidecar_dir() {
        let exe = dir.join(format!("tuack-ng{}", std::env::consts::EXE_SUFFIX));
        if exe.is_file() {
            return Some((exe, Source::Bundled));
        }
    }
    // 2b. 开发模式：scripts/fetch-binaries.py 下载到 src-tauri/binaries/
    #[cfg(debug_assertions)]
    if let Ok(target) = tauri::utils::platform::target_triple() {
        let dev = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(format!("tuack-ng-{target}{}", std::env::consts::EXE_SUFFIX));
        if dev.is_file() {
            return Some((dev, Source::Bundled));
        }
    }
    // 3. 系统 PATH
    find_in_path("tuack-ng").map(|p| (p, Source::Bundled))
}

#[tauri::command]
fn clear_tuack_path(state: tauri::State<AppState>) -> Result<(), String> {
    *state.tuack_path.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
fn detect_tuack(state: tauri::State<AppState>) -> Result<BinaryInfo, String> {
    match resolve_tuack(&state) {
        Some((p, source)) if probe_tuack(&p) => Ok(binary_info(p, source)),
        Some(_) => Err("所选文件不是有效的 tuack-ng 可执行文件".to_string()),
        None => Err("未找到 tuack-ng，请点「设置」指定路径".to_string()),
    }
}

/// 增量 UTF-8 解码：把 data 追加到 pending，完整字符立即输出，结尾不完整的
/// 多字节序列保留在 pending 等后续数据。
fn push_utf8(pending: &mut Vec<u8>, data: &[u8], out: &mut Vec<String>) {
    pending.extend_from_slice(data);
    let len = pending.len();
    let lead_width = |b: u8| -> usize {
        match b {
            0xf0..=0xf7 => 4,
            0xe0..=0xef => 3,
            0xc0..=0xdf => 2,
            _ => 1,
        }
    };
    let mut cut = len;
    // 结尾有续字节：回退到前导字节
    let mut i = len;
    while i > 0 && pending[i - 1] & 0b1100_0000 == 0b1000_0000 {
        i -= 1;
    }
    if i < len {
        if i > 0 && pending[i - 1] & 0b1100_0000 == 0b1100_0000 {
            let need = lead_width(pending[i - 1]);
            if len - (i - 1) < need {
                cut = i - 1; // 序列不完整，保留
            }
        } else {
            cut = i; // 孤儿续字节，丢弃
        }
    } else if len > 0 && pending[len - 1] & 0b1100_0000 == 0b1100_0000 {
        cut = len - 1; // 结尾恰是前导字节，序列未收完
    }
    if cut > 0 {
        out.push(String::from_utf8_lossy(&pending[..cut]).into_owned());
        pending.drain(..cut);
    }
}

#[tauri::command]
async fn run_command(
    cmd: Command,
    cwd: String,
    on_event: Channel<ProcessEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let exe = resolve_tuack(&state)
        .map(|(exe, _)| exe)
        .ok_or_else(|| "未找到 tuack-ng，请先「设置 tuack-ng」".to_string())?;

    let id = state.next_id.fetch_add(1, Ordering::Relaxed);

    // 用 PTY 运行 tuack-ng：其进度条（indicatif）只在检测到 TTY 时才绘制，
    // 管道会被它判定为非终端而静默隐藏。
    let pty_system = portable_pty::native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("创建伪终端失败：{e}"))?;

    // Windows ConPTY（portable-pty 0.9 带 PSEUDOCONSOLE_INHERIT_CURSOR）：
    // 子进程挂接控制台时 conhost 会向输出管道发 DSR（\x1b[6n）并阻塞等待
    // 主机在 stdin 上回应光标位置报告。立即应答，否则子进程永远卡在
    // 控制台初始化（表现为无输出、gen 不生成文件、不退出）。
    // 写入端需保活到进程结束（Windows 上丢 ConPTY stdin 会杀死子进程）。
    #[cfg(windows)]
    let stdin_writer = {
        let mut w = pair
            .master
            .take_writer()
            .map_err(|e| format!("获取伪终端写入端失败：{e}"))?;
        use std::io::Write;
        let _ = w.write_all(b"\x1b[1;1R");
        let _ = w.flush();
        Some(w)
    };
    #[cfg(not(windows))]
    let stdin_writer = None;

    let mut builder = CommandBuilder::new(&exe);
    builder.args(build_argv(&cmd));
    builder.cwd(&cwd);
    builder.env("CLICOLOR_FORCE", "1");
    #[cfg(unix)]
    builder.env("TERM", "xterm-256color");
    // Linux：让子进程 tuack-ng 读应用专属数据目录里的 assets（与独立安装隔离）
    #[cfg(unix)]
    if let Some(dir) = tuack_data_dir() {
        builder.env("XDG_DATA_HOME", dir);
    }
    // 把 sidecar 目录加进 PATH，让 tuack-ng 能找到同捆的 typst
    if let Some(dir) = sidecar_dir() {
        let existing = std::env::var("PATH").unwrap_or_default();
        let sep = if cfg!(windows) { ";" } else { ":" };
        builder.env("PATH", format!("{}{}{}", dir.display(), sep, existing));
    }

    let child = pair
        .slave
        .spawn_command(builder)
        .map_err(|e| format!("启动 tuack-ng 失败：{e}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("读取伪终端失败：{e}"))?;

    // 读取线程：原始字节 → 增量 UTF-8 解码 → Output 事件
    let ev = on_event.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut pending: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let mut chunks: Vec<String> = Vec::new();
                    push_utf8(&mut pending, &buf[..n], &mut chunks);
                    for c in chunks {
                        let _ = ev.send(ProcessEvent::Output { data: c });
                    }
                }
            }
        }
        if !pending.is_empty() {
            let _ = ev.send(ProcessEvent::Output {
                data: String::from_utf8_lossy(&pending).into_owned(),
            });
        }
    });

    state.children.lock().unwrap().insert(
        id,
        RunningProcess {
            child,
            master: pair.master,
            stdin_writer,
        },
    );

    // 退出轮询
    let children = state.children.clone();
    let ev = on_event.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            let code = {
                let mut map = children.lock().unwrap();
                match map.get_mut(&id) {
                    Some(r) => match r.child.try_wait() {
                        Ok(Some(status)) => {
                            map.remove(&id);
                            Some(status.exit_code() as i32)
                        }
                        Ok(None) => None,
                        Err(_) => {
                            map.remove(&id);
                            None
                        }
                    },
                    None => Some(-1),
                }
            };
            if let Some(code) = code {
                let _ = ev.send(ProcessEvent::Exited { code: Some(code) });
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
    });

    Ok(id)
}

#[tauri::command]
fn cancel_command(id: u64, state: tauri::State<AppState>) -> Result<(), String> {
    if let Some(r) = state.children.lock().unwrap().get_mut(&id) {
        let _ = r.child.kill();
    }
    Ok(())
}

/// 从父级 conf.json 的 subdir 中移除条目（不删除磁盘上的文件夹，避免误操作）
#[tauri::command]
fn remove_node(parent_dir: String, name: String) -> Result<(), String> {
    let conf_path = Path::new(&parent_dir).join("conf.json");
    let text = fs::read_to_string(&conf_path).map_err(|e| format!("读取 conf.json 失败：{e}"))?;
    let mut value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("解析 conf.json 失败：{e}"))?;
    let arr = value
        .get_mut("subdir")
        .and_then(|v| v.as_array_mut())
        .ok_or_else(|| "conf.json 中没有 subdir 字段".to_string())?;
    let before = arr.len();
    arr.retain(|v| v.as_str() != Some(name.as_str()));
    if arr.len() == before {
        return Err(format!("subdir 中不存在条目「{name}」"));
    }
    let pretty = serde_json::to_string_pretty(&value).map_err(|e| format!("序列化失败：{e}"))?;
    fs::write(&conf_path, pretty).map_err(|e| format!("写入 conf.json 失败：{e}"))
}

#[tauri::command]
fn resize_pty(id: u64, cols: u16, rows: u16, state: tauri::State<AppState>) -> Result<(), String> {
    if cols == 0 || rows == 0 {
        return Ok(());
    }
    if let Some(r) = state.children.lock().unwrap().get(&id) {
        let _ = r.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
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
    ui_font: Option<String>,
    mono_font: Option<String>,
    theme: Option<String>,
    /// ren 全局默认模板
    ren_template: Option<String>,
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

#[derive(serde::Serialize)]
struct PathStat {
    exists: bool,
    is_dir: bool,
}

/// 探测路径类型（文件选择器用于支持直接输入完整文件路径）
#[tauri::command]
fn stat_path(path: String) -> PathStat {
    match fs::metadata(&path) {
        Ok(m) => PathStat {
            exists: true,
            is_dir: m.is_dir(),
        },
        Err(_) => PathStat {
            exists: false,
            is_dir: false,
        },
    }
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

#[derive(serde::Serialize)]
struct FontPrefs {
    ui_font: String,
    mono_font: String,
}

#[tauri::command]
fn get_fonts(app: tauri::AppHandle) -> FontPrefs {
    let s = load_settings(&app);
    FontPrefs {
        ui_font: s.ui_font.unwrap_or_default(),
        mono_font: s.mono_font.unwrap_or_default(),
    }
}

#[tauri::command]
fn set_fonts(app: tauri::AppHandle, ui_font: String, mono_font: String) -> Result<(), String> {
    let mut settings = load_settings(&app);
    let norm = |s: String| {
        let t = s.trim().to_string();
        if t.is_empty() {
            None
        } else {
            Some(t)
        }
    };
    settings.ui_font = norm(ui_font);
    settings.mono_font = norm(mono_font);
    save_settings(&app, &settings)
}

/// 让原生标题栏、窗口底色与窗口图标跟随主题（前端负责内容区配色）
fn apply_window_theme(app: &tauri::AppHandle, theme: &str) {
    if let Some(win) = app.get_webview_window("main") {
        let light = theme == "light";
        let t = if light {
            Some(tauri::Theme::Light)
        } else {
            Some(tauri::Theme::Dark)
        };
        let _ = win.set_theme(t);
        let bg = if light { "#ffffff" } else { "#161616" };
        let _ = win.set_background_color(bg.parse::<tauri::utils::config::Color>().ok());
        let icon = if light { ICON_LIGHT } else { ICON_DARK };
        if let Ok(img) = tauri::image::Image::from_bytes(icon) {
            let _ = win.set_icon(img);
        }
    }
}

#[tauri::command]
fn get_theme(app: tauri::AppHandle) -> String {
    load_settings(&app)
        .theme
        .unwrap_or_else(|| "dark".to_string())
}

#[tauri::command]
fn set_theme(app: tauri::AppHandle, theme: String) -> Result<(), String> {
    let theme = theme.trim().to_string();
    apply_window_theme(&app, &theme);
    let mut settings = load_settings(&app);
    settings.theme = Some(theme);
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

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if from.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            std::fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

/// 应用专属的 tuack-ng 数据根目录（隔离独立安装的 tuack-ng，避免资产版本冲突）
fn tuack_data_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("tuack-gui"))
}

/// 捆绑 assets 的源目录（与 ensure_assets 使用的源一致）
#[cfg(debug_assertions)]
fn bundled_assets_dir(_app: &tauri::AppHandle) -> Option<PathBuf> {
    Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets"))
}

#[cfg(not(debug_assertions))]
fn bundled_assets_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().map(|d| d.join("assets"))
}

#[derive(serde::Serialize)]
struct RenDefaults {
    global: Option<String>,
    project: Option<String>,
}

/// 项目级 GUI 配置：存于项目根目录 .tuack-gui.json
#[derive(serde::Serialize, serde::Deserialize, Default)]
struct ProjectConfig {
    ren_template: Option<String>,
}

fn project_config_path(project_root: &str) -> PathBuf {
    Path::new(project_root).join(".tuack-gui.json")
}

fn load_project_config(project_root: &str) -> ProjectConfig {
    fs::read_to_string(project_config_path(project_root))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

fn save_project_config(project_root: &str, cfg: &ProjectConfig) -> Result<(), String> {
    let path = project_config_path(project_root);
    let text = serde_json::to_string_pretty(cfg).map_err(|e| format!("序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("写入 .tuack-gui.json 失败：{e}"))
}

#[tauri::command]
fn get_ren_defaults(app: tauri::AppHandle, project_root: String) -> RenDefaults {
    let s = load_settings(&app);
    RenDefaults {
        global: s.ren_template.clone(),
        project: if project_root.trim().is_empty() {
            None
        } else {
            load_project_config(project_root.trim()).ren_template
        },
    }
}

#[tauri::command]
fn set_ren_global(app: tauri::AppHandle, template: String) -> Result<(), String> {
    let mut s = load_settings(&app);
    let t = template.trim().to_string();
    s.ren_template = if t.is_empty() { None } else { Some(t) };
    save_settings(&app, &s)
}

#[tauri::command]
fn set_ren_project(project_root: String, template: String) -> Result<(), String> {
    let root = project_root.trim().to_string();
    if root.is_empty() {
        return Ok(());
    }
    let mut cfg = load_project_config(&root);
    let t = template.trim().to_string();
    cfg.ren_template = if t.is_empty() { None } else { Some(t) };
    save_project_config(&root, &cfg)
}

/// 首次启动时，把捆绑的 assets 放到 tuack-ng 能读到的地方
fn ensure_assets(app: &tauri::AppHandle) {
    // Windows：assets 作为 resources 打进安装目录（与 tuack-ng.exe 同级），
    // tuack-ng 原生从 exe 同目录 assets/ 读取，无需运行时复制、不碰 LocalAppData。
    #[cfg(windows)]
    {
        let _ = app;
        return;
    }

    // Linux/macOS：复制到应用专属数据目录，运行时通过 XDG_DATA_HOME
    // 让子进程 tuack-ng 读这里（而不是共享的 ~/.local/share/tuack-ng）
    let Some(src) = bundled_assets_dir(app) else {
        return;
    };
    if !src.exists() {
        return;
    }
    let Some(dst) = tuack_data_dir().map(|d| d.join("tuack-ng")) else {
        return;
    };
    // 已存在则跳过（简化：不做版本同步）
    if dst.join("langs.json").exists() {
        return;
    }
    let _ = copy_dir_recursive(&src, &dst);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            ensure_assets(app.handle());
            let theme = load_settings(app.handle()).theme.unwrap_or_default();
            if !theme.is_empty() {
                apply_window_theme(app.handle(), &theme);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            open_project,
            set_tuack_path,
            clear_tuack_path,
            detect_tuack,
            run_command,
            cancel_command,
            resize_pty,
            get_last_project,
            save_last_project,
            list_dir,
            stat_path,
            home_dir,
            read_config,
            write_config,
            remove_node,
            open_in_file_manager,
            get_file_manager,
            set_file_manager,
            get_fonts,
            set_fonts,
            get_theme,
            set_theme,
            get_ren_defaults,
            set_ren_global,
            set_ren_project,
            read_file_base64,
            read_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
