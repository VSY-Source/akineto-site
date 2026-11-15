import os
import sys

from dulwich import porcelain
from dulwich.repo import Repo

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TOKEN = sys.argv[1]
LOGIN = "VSY-Source"
REPO = "akineto-site"

repo = Repo(".")
index = repo.open_index()
target = b"tools/.device.json"
if target in index:
    del index[target]
    index.write()
    print("removed from index")
else:
    print("not in index")

porcelain.commit(
    repo,
    message="chore: 移除误提交的本地设备授权缓存".encode("utf-8"),
    author=b"Akineto <akineto@example.com>",
    committer=b"Akineto <akineto@example.com>",
)

refs = repo.get_refs()
if b"refs/heads/main" not in refs and b"refs/heads/master" in refs:
    repo.refs[b"refs/heads/main"] = refs[b"refs/heads/master"]
    del repo.refs[b"refs/heads/master"]

url = f"https://x-access-token:{TOKEN}@github.com/{LOGIN}/{REPO}.git"
porcelain.push(repo, url, "refs/heads/main")
print("pushed cleanup")
