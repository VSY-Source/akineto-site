"""用 dulwich 在本地初始化 Git 仓库并提交（环境里没有 git 命令）。"""
import os
from dulwich import porcelain
from dulwich.repo import Repo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

if not os.path.isdir(".git"):
    porcelain.init(".")

repo = Repo(".")
paths = []
for base, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d != ".git"]
    for name in files:
        if name in {".DS_Store", "Thumbs.db"}:
            continue
        paths.append(os.path.relpath(os.path.join(base, name), ".").replace("\\", "/"))

porcelain.add(repo, paths)
message = "Initial commit: 秋音棠（Akineto）声库配布站"
try:
    porcelain.commit(
        repo,
        message=message.encode("utf-8"),
        author=b"Akineto <akineto@example.com>",
        committer=b"Akineto <akineto@example.com>",
    )
except Exception as exc:  # 没有变化时 commit 会失败
    print("commit skipped:", exc)

head = repo.head().decode()
print("HEAD:", head)
print("files:", len(paths))
