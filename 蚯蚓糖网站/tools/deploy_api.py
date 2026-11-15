# -*- coding: utf-8 -*-
"""纯 GitHub REST API 部署：不需要 git 命令、不需要 dulwich。

流程：读本地文件 → 算 git blob sha1 与远程 tree 对比 → 只上传变更的 blob →
生成新 tree / commit → 快进 main → 触发并轮询 Pages 构建。

凭据读取顺序：
    1) 环境变量 GH_TOKEN / GITHUB_TOKEN
    2) tools/.token 文件（单行）

用法：
    python tools/deploy_api.py                  # 部署（默认仓库 VSY-Source/akineto-site）
    python tools/deploy_api.py --dry-run        # 只看会改哪些文件，不写远程
    python tools/deploy_api.py --repo OWNER/NAME
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.github.com"
DEFAULT_REPO = "VSY-Source/akineto-site"

# 这些目录/文件不进仓库
EXCLUDE_DIRS = {".git", "__pycache__", ".vscode", "node_modules", ".pytest_cache"}
EXCLUDE_NAMES = {".DS_Store", "Thumbs.db", ".token", ".device.json"}
EXCLUDE_REL = {
    "tools/.token", "tools/.device.json",
    # 本地验收截图与临时产物
}


def read_token() -> str:
    for key in ("GH_TOKEN", "GITHUB_TOKEN"):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    tok_file = ROOT / "tools" / ".token"
    if tok_file.exists():
        val = tok_file.read_text(encoding="utf-8").strip()
        if val:
            return val
    sys.exit("缺少凭据：设置环境变量 GH_TOKEN，或把 PAT 单行写入 tools/.token")


def api(method: str, path: str, token: str, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "akineto-deploy-api",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
            return resp.status, (json.loads(body) if body.strip() else {})
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        try:
            parsed = json.loads(body) if body.strip() else {}
        except Exception:
            parsed = {"raw": body[:300]}
        return exc.code, parsed


def local_files() -> dict[str, Path]:
    out: dict[str, Path] = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn in EXCLUDE_NAMES:
                continue
            full = Path(dirpath) / fn
            rel = full.relative_to(ROOT).as_posix()
            if rel in EXCLUDE_REL or rel.startswith("tools/."):
                continue
            out[rel] = full
    return out


def blob_sha(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob %d\0" % len(data))
    h.update(data)
    return h.hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=DEFAULT_REPO)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-pages", action="store_true")
    ap.add_argument("--message", default="fix: 密码口径修正为「下载密码」（BowlRoll 下载密码，非解压密码）")
    args = ap.parse_args()

    token = read_token()
    owner, name = args.repo.split("/", 1)
    bp = f"/repos/{owner}/{name}"

    status, repo = api("GET", bp, token)
    if status != 200:
        sys.exit(f"仓库不可用: {status} {repo}")
    branch = repo.get("default_branch", "main")
    print(f"repo: {args.repo}  branch: {branch}  private: {repo.get('private')}")

    status, ref = api("GET", f"{bp}/git/ref/heads/{branch}", token)
    if status != 200:
        sys.exit(f"取 ref 失败: {status} {ref}")
    head_sha = ref["object"]["sha"]

    status, commit = api("GET", f"{bp}/git/commits/{head_sha}", token)
    base_tree = commit["tree"]["sha"]
    status, tree = api("GET", f"{bp}/git/trees/{base_tree}?recursive=1", token)
    remote = {e["path"]: e["sha"] for e in tree.get("tree", []) if e["type"] == "blob"}
    print(f"远程 HEAD {head_sha[:8]} / 文件 {len(remote)} 个")

    files = local_files()
    changed, added, removed = [], [], []
    entries: list[dict] = []

    for rel, full in sorted(files.items()):
        data = full.read_bytes()
        sha = blob_sha(data)
        if rel not in remote:
            added.append(rel)
            entries.append({"path": rel, "mode": "100644", "type": "blob",
                            "content": base64.b64encode(data).decode(), "encoding": "base64"})
        elif remote[rel] != sha:
            changed.append(rel)
            entries.append({"path": rel, "mode": "100644", "type": "blob",
                            "content": base64.b64encode(data).decode(), "encoding": "base64"})

    for rel in sorted(remote):
        if rel not in files:
            removed.append(rel)
            entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": None})

    print(f"新增 {len(added)} / 修改 {len(changed)} / 删除 {len(removed)}")
    for label, items in (("+", added), ("~", changed), ("-", removed)):
        for rel in items:
            print(f"  {label} {rel}")

    if not entries:
        print("远程已是最新，无需提交")
    elif args.dry_run:
        print("dry-run：未写入远程")
        return
    else:
        status, new_tree = api("POST", f"{bp}/git/trees", token,
                               {"base_tree": base_tree, "tree": entries})
        if status not in (200, 201):
            sys.exit(f"建 tree 失败: {status} {new_tree}")
        status, new_commit = api("POST", f"{bp}/git/commits", token, {
            "message": args.message,
            "tree": new_tree["sha"],
            "parents": [head_sha],
        })
        if status not in (200, 201):
            sys.exit(f"建 commit 失败: {status} {new_commit}")
        status, upd = api("PATCH", f"{bp}/git/refs/heads/{branch}", token,
                          {"sha": new_commit["sha"], "force": False})
        if status not in (200, 201):
            sys.exit(f"更新 ref 失败: {status} {upd}")
        print(f"pushed: {new_commit['sha'][:8]} -> {args.repo}@{branch}")

    if args.no_pages:
        return

    # Pages：确认开启并等构建
    status, pages = api("GET", f"{bp}/pages", token)
    if status == 200:
        print("pages:", pages.get("html_url"), "| status:", pages.get("status"))
    elif status == 404:
        status, pages = api("POST", f"{bp}/pages", token,
                            {"source": {"branch": branch, "path": "/"}})
        print("pages create:", status, pages.get("html_url") or pages)
    else:
        print("pages 查询异常:", status, pages)

    for i in range(30):
        time.sleep(10)
        status, pages = api("GET", f"{bp}/pages", token)
        if status != 200:
            print("pages 状态查询失败:", status, pages)
            return
        st = pages.get("status")
        print(f"  [{i * 10 + 10}s] pages status = {st}")
        if st in ("built", "errored"):
            print("html_url:", pages.get("html_url"))
            break

    status, builds = api("GET", f"{bp}/pages/builds/latest", token)
    if status == 200:
        print("latest build:", builds.get("status"), builds.get("updated_at"))


if __name__ == "__main__":
    main()
