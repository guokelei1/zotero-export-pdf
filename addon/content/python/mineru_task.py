# -*- coding: utf-8 -*-
"""MinerU 转换任务的远端执行器（在 Zotero 里被 JS 按阶段调用）。

用法:
  python mineru_task.py upload  <task> <json文件>
  python mineru_task.py convert <task>
  python mineru_task.py collect <task>

约定:
- task 是形如 202608291957 的时间戳目录名；
- PDF 在 /home/gkl/mineru/data/input/<task>/，
  转换结果在 /home/gkl/mineru/data/markdown/<task>/ 下同名 .md；
- stdout 最后输出一行 JSON，成功 {"ok": true, ...}，失败 {"ok": false, "error": "..."}。
"""
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

HOST = "202"
INPUT_DIR = "/home/gkl/mineru/data/input"
MARKDOWN_DIR = "/home/gkl/mineru/data/markdown"
MINERU_SH = "/home/gkl/mineru/mineru.sh"

# PATH 上第一个 ssh 可能是 Git 自带的（处理不了配置里的 ProxyCommand），
# 所以绝对路径优先，最后才退回 PATH 查找。
SSH_CANDIDATES = [
    r"C:\Windows\System32\OpenSSH\ssh.exe",
    "/usr/bin/ssh",
    "ssh",
]
SCP_CANDIDATES = [
    r"C:\Windows\System32\OpenSSH\scp.exe",
    "/usr/bin/scp",
    "scp",
]

SSH_OPTS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=20"]


def find_executable(candidates):
    for candidate in candidates:
        if os.path.isabs(candidate) and not os.path.exists(candidate):
            continue
        return candidate
    raise RuntimeError(f"executable not found: {candidates[0]}")


def run_ssh(remote_command, timeout):
    completed = subprocess.run(
        [find_executable(SSH_CANDIDATES), *SSH_OPTS, HOST, remote_command],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return completed


def emit(payload):
    print(json.dumps(payload, ensure_ascii=True))
    sys.stdout.flush()


def fail(message):
    emit({"ok": False, "error": message})
    return 1


def cmd_upload(task, json_path):
    with open(json_path, encoding="utf-8") as handle:
        entries = json.load(handle)

    remote_dir = f"{INPUT_DIR}/{task}"
    completed = run_ssh(f"mkdir -p {remote_dir}", timeout=60)
    if completed.returncode != 0:
        return fail(f"mkdir failed: {completed.stderr.strip()}")

    scp = find_executable(SCP_CANDIDATES)
    for entry in entries:
        remote_target = f"{HOST}:{remote_dir}/{entry['name']}"
        completed = subprocess.run(
            [scp, *SSH_OPTS, entry["local"], remote_target],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
        )
        if completed.returncode != 0:
            return fail(
                f"upload failed for {entry['name']}: {completed.stderr.strip()}"
            )
    emit({"ok": True})
    return 0


def cmd_convert(task):
    try:
        completed = run_ssh(
            f"{MINERU_SH} batch {INPUT_DIR}/{task}", timeout=1800
        )
    except subprocess.TimeoutExpired:
        return fail("mineru.sh timed out after 1800s")
    if completed.returncode != 0:
        # batch 对部分失败的 PDF 也返回非零，已成功的不受影响，
        # 交由 collect 阶段按实际生成的 .md 处理。
        return fail(completed.stderr.strip()[-800:] or "mineru.sh failed")
    emit({"ok": True})
    return 0


def cmd_collect(task):
    remote_dir = f"{MARKDOWN_DIR}/{task}"
    completed = run_ssh(
        f"find {remote_dir} -type f -name '*.md'", timeout=60
    )
    if completed.returncode != 0:
        return fail(f"list markdown failed: {completed.stderr.strip()}")

    remote_paths = [
        line.strip() for line in completed.stdout.splitlines() if line.strip()
    ]
    if not remote_paths:
        return fail(f"no markdown generated in {remote_dir}")

    download_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "downloads", task
    )
    os.makedirs(download_dir, exist_ok=True)

    scp = find_executable(SCP_CANDIDATES)
    files = []
    for remote_path in remote_paths:
        name = os.path.basename(remote_path.replace("\\", "/"))
        local_path = os.path.join(download_dir, name)
        completed = subprocess.run(
            [scp, *SSH_OPTS, f"{HOST}:{remote_path}", local_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
        )
        if completed.returncode != 0:
            return fail(f"download failed for {name}: {completed.stderr.strip()}")
        files.append({"name": name, "local": local_path})

    emit({"ok": True, "files": files})
    return 0


def main() -> int:
    argv = sys.argv[1:]
    if not argv:
        return fail("usage: mineru_task.py upload|convert|collect <task> [json]")
    action = argv[0]
    try:
        if action == "upload" and len(argv) == 3:
            return cmd_upload(argv[1], argv[2])
        if action == "convert" and len(argv) == 2:
            return cmd_convert(argv[1])
        if action == "collect" and len(argv) == 2:
            return cmd_collect(argv[1])
        return fail(f"invalid arguments: {argv}")
    except FileNotFoundError as error:
        return fail(f"failed to launch ssh/scp: {error}")
    except subprocess.TimeoutExpired as error:
        return fail(f"ssh command timed out: {error}")
    except Exception as error:  # 兜底：任何异常都以 JSON 汇报
        return fail(f"{type(error).__name__}: {error}")


if __name__ == "__main__":
    sys.exit(main())
