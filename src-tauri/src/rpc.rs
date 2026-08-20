// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// RpcRunner：通过 stdio 与 tuack-ng-rpc 子进程通信的 JSON-RPC 2.0 客户端。
// 协议见 tuack-ng 仓库 crates/tuack-ng-rpc/PROTOCOL.md（NDJSON 传输）。

use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use serde_json::{Value, json};
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, Command};
use tokio::sync::oneshot;

use crate::{AppState, sidecar_dir, tuack_data_dir};

/// 服务端发来的事件（Notification），经 Channel 转发到前端
#[derive(serde::Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RpcEvent {
    Event { method: String, params: Value },
}

/// 单个请求的响应槽：id -> 一次性返回通道（Err 为 RPC 错误或连接关闭）
type PendingReply = oneshot::Sender<Result<Value, String>>;
type PendingMap = Arc<Mutex<HashMap<u64, PendingReply>>>;

/// 一条 tuack-ng-rpc 子进程连接
pub struct RpcConnection {
    /// 写端：跨 await 加锁，避免并发请求交错写坏 NDJSON
    stdin: tokio::sync::Mutex<ChildStdin>,
    /// 子进程句柄：rpc_stop 时 kill 兜底，确保读线程收尾
    child: tokio::sync::Mutex<tokio::process::Child>,
    /// 尚未返回的请求：id -> oneshot
    pending: PendingMap,
    next_id: AtomicU64,
}

/// 定位 tuack-ng-rpc 二进制（与 tuack-ng 同分布方式）
pub fn resolve_tuack_rpc(state: &AppState) -> Option<std::path::PathBuf> {
    let name = format!("tuack-ng-rpc{}", std::env::consts::EXE_SUFFIX);
    // 1. 用户手动指定 tuack-ng 的可执行文件同目录（常与 rpc 二进制同放）
    if let Some(p) = state.tuack_path.lock().unwrap().clone() {
        let cand = p.with_file_name(&name);
        if cand.is_file() {
            return Some(cand);
        }
    }
    // 2. 内置 sidecar（与可执行文件同目录，发布版布局）
    if let Some(dir) = sidecar_dir() {
        let exe = dir.join(&name);
        if exe.is_file() {
            return Some(exe);
        }
    }
    // 3. 开发模式：scripts/fetch-binaries.py 下载到 src-tauri/binaries/
    #[cfg(debug_assertions)]
    if let Ok(target) = tauri::utils::platform::target_triple() {
        let dev = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(format!("tuack-ng-rpc-{target}{}", std::env::consts::EXE_SUFFIX));
        if dev.is_file() {
            return Some(dev);
        }
    }
    // 4. 系统 PATH
    crate::find_in_path("tuack-ng-rpc")
}

fn spawn_rpc(exe: &Path, on_event: Channel<RpcEvent>) -> Result<RpcConnection, String> {
    let mut cmd = Command::new(exe);
    cmd.stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW，避免闪黑窗
    }
    // Linux：让子进程读应用专属数据目录里的 assets（与独立安装隔离）
    #[cfg(unix)]
    if let Some(dir) = tuack_data_dir() {
        cmd.env("XDG_DATA_HOME", dir);
    }
    // 把 sidecar 目录加进 PATH，让 tuack-ng-rpc 能找到同捆的 typst
    if let Some(dir) = sidecar_dir() {
        let existing = std::env::var("PATH").unwrap_or_default();
        let sep = if cfg!(windows) { ";" } else { ":" };
        cmd.env("PATH", format!("{}{}{}", dir.display(), sep, existing));
    }
    // stdin/stdout 已由我们接管，仅靠 stdin EOF 退出子进程；防止 drop 误杀
    cmd.kill_on_drop(false);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("启动 tuack-ng-rpc 失败：{e}"))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法获取 tuack-ng-rpc 标准输入".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法获取 tuack-ng-rpc 标准输出".to_string())?;

    let pending: PendingMap =
        Arc::new(Mutex::new(HashMap::new()));

    // 读线程：逐行解析 stdout。Notification -> 事件转发；Response -> 匹配 pending。
    let reader_pending = pending.clone();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let Ok(v) = serde_json::from_str::<Value>(trimmed) else {
                continue;
            };
            if v.get("method").and_then(|m| m.as_str()).is_some() {
                // 服务端通知（事件）
                let method = v
                    .get("method")
                    .and_then(|m| m.as_str())
                    .unwrap_or_default()
                    .to_string();
                let params = v.get("params").cloned().unwrap_or(Value::Null);
                // 事件必须先于请求响应送达（协议约定）
                let _ = on_event.send(RpcEvent::Event { method, params });
            } else if let Some(id) = v.get("id").and_then(|i| i.as_u64()) {
                let result = match v.get("error") {
                    Some(err) => {
                        let code = err.get("code").and_then(|c| c.as_i64()).unwrap_or(-32000);
                        let message = err
                            .get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("未知错误");
                        Err(format!("[RPC {code}] {message}"))
                    }
                    None => Ok(v.get("result").cloned().unwrap_or(Value::Null)),
                };
                if let Some(tx) = reader_pending.lock().unwrap().remove(&id) {
                    let _ = tx.send(result);
                }
            }
        }
        // 子进程结束：唤醒所有未完成的请求，避免前端 Promise 挂死
        let dangling = std::mem::take(&mut *reader_pending.lock().unwrap());
        for (_, tx) in dangling {
            let _ = tx.send(Err("RPC 连接已关闭".to_string()));
        }
    });

    Ok(RpcConnection {
        stdin: tokio::sync::Mutex::new(stdin),
        child: tokio::sync::Mutex::new(child),
        pending,
        next_id: AtomicU64::new(1),
    })
}

/// 建立一条 RPC 连接：spawn tuack-ng-rpc 并绑定事件 Channel
#[tauri::command]
pub async fn rpc_connect(
    state: tauri::State<'_, AppState>,
    on_event: Channel<RpcEvent>,
) -> Result<u64, String> {
    let exe = resolve_tuack_rpc(&state)
        .ok_or_else(|| "未找到 tuack-ng-rpc，请先设置 tuack-ng 路径或将其加入 PATH".to_string())?;
    let conn = spawn_rpc(&exe, on_event)?;
    let id = state.rpc_next_id.fetch_add(1, Ordering::Relaxed);
    state.rpc_conns.lock().unwrap().insert(id, Arc::new(conn));
    Ok(id)
}

/// 发送一个 JSON-RPC 请求并等待响应（同步语义，judge 等阻塞请求可用）
#[tauri::command]
pub async fn rpc_request(
    state: tauri::State<'_, AppState>,
    conn: u64,
    method: String,
    params: Option<Value>,
) -> Result<Value, String> {
    let conn = state
        .rpc_conns
        .lock()
        .unwrap()
        .get(&conn)
        .cloned()
        .ok_or_else(|| "RPC 连接不存在".to_string())?;

    let id = conn.next_id.fetch_add(1, Ordering::Relaxed);
    let (tx, rx) = oneshot::channel();
    conn.pending.lock().unwrap().insert(id, tx);

    let req = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params.unwrap_or_else(|| json!({})),
    });
    let line = serde_json::to_string(&req).map_err(|e| format!("序列化请求失败：{e}"))?;

    let mut stdin = conn.stdin.lock().await;
    stdin
        .write_all(line.as_bytes())
        .await
        .map_err(|e| format!("写入请求失败：{e}"))?;
    stdin
        .write_all(b"\n")
        .await
        .map_err(|e| format!("写入请求失败：{e}"))?;
    stdin
        .flush()
        .await
        .map_err(|e| format!("写入请求失败：{e}"))?;
    drop(stdin);

    match rx.await {
        Ok(res) => res,
        Err(_) => Err("RPC 连接已关闭".to_string()),
    }
}

/// 关闭 RPC 连接：先关 stdin（EOF 等价 exit 通知），再 kill 兜底确保子进程退出
#[tauri::command]
pub async fn rpc_stop(state: tauri::State<'_, AppState>, conn: u64) -> Result<(), String> {
    let removed = state.rpc_conns.lock().unwrap().remove(&conn);
    if let Some(conn) = removed {
        {
            let mut stdin = conn.stdin.lock().await;
            let _ = stdin.shutdown().await;
        }
        let mut child = conn.child.lock().await;
        let _ = child.kill().await;
        let _ = child.wait().await;
        // 读线程在子进程退出后唤醒所有 pending，无需在此清理
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /// 定位 tuack-ng-rpc 二进制：优先 TUACK_RPC_BIN 环境变量，其次常见开发路径 / PATH
    fn rpc_bin() -> Option<PathBuf> {
        if let Ok(p) = std::env::var("TUACK_RPC_BIN") {
            let p = PathBuf::from(p);
            if p.is_file() {
                return Some(p);
            }
        }
        let home = std::env::var("HOME").ok()?;
        let dev = PathBuf::from(home).join("Projects/tuack-ng/target/debug/tuack-ng-rpc");
        if dev.is_file() {
            return Some(dev);
        }
        crate::find_in_path("tuack-ng-rpc")
    }

    /// 发送一条请求并等待响应（与 rpc_request 相同的读写路径）
    async fn send(
        conn: &RpcConnection,
        req: Value,
    ) -> Result<Value, String> {
        let id = req.get("id").and_then(|v| v.as_u64()).unwrap();
        let (tx, rx) = oneshot::channel();
        conn.pending.lock().unwrap().insert(id, tx);
        let mut stdin = conn.stdin.lock().await;
        let line = serde_json::to_string(&req).map_err(|e| e.to_string())?;
        stdin.write_all(line.as_bytes()).await.map_err(|e| e.to_string())?;
        stdin.write_all(b"\n").await.map_err(|e| e.to_string())?;
        stdin.flush().await.map_err(|e| e.to_string())?;
        drop(stdin);
        rx.await.map_err(|_| "连接已关闭")?
    }

    #[tokio::test]
    async fn rpc_roundtrip() {
        let Some(exe) = rpc_bin() else {
            eprintln!("跳过：未找到 tuack-ng-rpc 二进制（可设 TUACK_RPC_BIN 或先 cargo build -p tuack-ng-rpc）");
            return;
        };
        let channel = Channel::new(move |_| Ok(()));
        let conn = spawn_rpc(&exe, channel).expect("spawn_rpc 失败");

        // initialize
        let res = send(&conn, json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize" }))
            .await
            .expect("initialize 失败");
        assert!(res.get("serverInfo").is_some(), "缺 serverInfo: {res}");
        assert!(res.get("serverInfo").is_some(), "缺 serverInfo: {res}");

        // 未知方法 -> -32601
        let err = send(&conn, json!({ "jsonrpc": "2.0", "id": 2, "method": "nope" }))
            .await
            .expect_err("未知方法应报错");
        assert!(err.contains("-32601"), "错误码不符: {err}");

        // 未 initialize 状态下调用业务方法 -> -32600（shutdown 后）
        let _ = send(&conn, json!({ "jsonrpc": "2.0", "id": 3, "method": "shutdown" }))
            .await
            .expect("shutdown 失败");
        let err = send(&conn, json!({ "jsonrpc": "2.0", "id": 4, "method": "workspace/list" }))
            .await
            .expect_err("shutdown 后应报错");
        assert!(err.contains("-32600"), "错误码不符: {err}");

        // 关闭连接：kill 子进程 -> 读线程收尾并唤醒 pending 请求
        let (tx, rx) = oneshot::channel();
        conn.pending.lock().unwrap().insert(99, tx);
        {
            let mut stdin = conn.stdin.lock().await;
            let _ = stdin.shutdown().await;
        }
        conn.child.lock().await.kill().await.unwrap();
        let err = rx.await.unwrap().expect_err("连接关闭应唤醒 pending");
        assert_eq!(err, "RPC 连接已关闭");
    }
}
