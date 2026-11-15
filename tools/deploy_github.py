import json
import os
import subprocess
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

TOKEN = open("tools/.token", encoding="ascii").read().strip()
API = "https://api.github.com"
REPO = "akineto-site"
HEADERS = {
    "Authorization": "token " + TOKEN,
    "Accept": "application/vnd.github+json",
    "User-Agent": "akineto-site-deploy",
    "Content-Type": "application/json",
}


def api(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            return resp.status, (json.loads(body) if body.strip() else {})
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        try:
            parsed = json.loads(body) if body.strip() else {}
        except Exception:
            parsed = {"raw": body[:200]}
        return exc.code, parsed


status, user = api("GET", "/user")
if status != 200:
    raise SystemExit("auth failed: " + str(status) + " " + str(user))
login = user["login"]
print("login:", login)

# 1) 建仓库（已存在则跳过）
status, repo = api("GET", f"/repos/{login}/{REPO}")
if status != 200:
    status, repo = api("POST", "/user/repos", {
        "name": REPO,
        "description": "秋音棠（Akineto）UTAU 声库配布站",
        "private": False,
        "auto_init": False,
    })
    print("create repo:", status)
    if status not in (200, 201):
        raise SystemExit("create failed: " + str(repo))
else:
    print("repo already exists")

# 2) 清理本地凭据文件，补 .gitignore
for f in ("tools/.device.json", "tools/.token"):
    if os.path.exists(f):
        os.remove(f)
gi = open(".gitignore", encoding="utf-8").read()
for line in ("tools/.device.json", "tools/.token"):
    if line not in gi:
        gi = gi.rstrip("\n") + "\n" + line + "\n"
open(".gitignore", "w", encoding="utf-8").write(gi)

# 3) 重建索引（排除 .git 与凭据），提交并推送到 main
from dulwich import porcelain
from dulwich.repo import Repo

repo_obj = Repo(".")
paths = []
for base, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d != ".git"]
    for name in files:
        if name in {".DS_Store", "Thumbs.db"}:
            continue
        paths.append(os.path.relpath(os.path.join(base, name), ".").replace("\\", "/"))
porcelain.add(repo_obj, paths)
try:
    porcelain.commit(repo_obj, message="chore: 部署准备与凭据忽略".encode("utf-8"),
                     author=b"Akineto <akineto@example.com>",
                     committer=b"Akineto <akineto@example.com>")
except Exception as exc:
    print("commit skipped:", exc)

refs = repo_obj.get_refs()
if b"refs/heads/main" not in refs and b"refs/heads/master" in refs:
    repo_obj.refs[b"refs/heads/main"] = refs[b"refs/heads/master"]
    del repo_obj.refs[b"refs/heads/master"]

url = f"https://x-access-token:{TOKEN}@github.com/{login}/{REPO}.git"
print("pushing ...")
porcelain.push(repo_obj, url, "refs/heads/main")
print("pushed")

# 4) 开启 GitHub Pages
status, pages = api("GET", f"/repos/{login}/{REPO}/pages")
if status == 200:
    print("pages exists:", pages.get("html_url"))
else:
    status, pages = api("POST", f"/repos/{login}/{REPO}/pages",
                        {"source": {"branch": "main", "path": "/"}})
    print("pages create:", status, pages.get("html_url") if isinstance(pages, dict) else pages)

# 5) 读取最终地址
status, pages = api("GET", f"/repos/{login}/{REPO}/pages")
print("PAGES_URL:", pages.get("html_url") if isinstance(pages, dict) else pages)
print("PAGES_STATUS:", pages.get("status") if isinstance(pages, dict) else "?")
