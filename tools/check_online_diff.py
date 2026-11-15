# -*- coding: utf-8 -*-
"""比对线上 GitHub Pages 与本地工作副本，输出差异清单（无需凭据，线上是公开可读的）"""
import difflib
import urllib.request
from pathlib import Path

BASE = "https://vsy-source.github.io/akineto-site/"
ROOT = Path(r"D:\大肥鱼\utau-site")
FILES = [
    "index.html", "character.html", "voicebank.html", "download.html",
    "terms.html", "guide.html", "credits.html", "news.html", "README.md",
    "data/voicebank.json", "data/character.json",
]


def fetch(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "akineto-diff"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", "replace")
    except Exception as exc:
        print(f"  ! {url} -> {exc}")
        return None


changed = []
for rel in FILES:
    remote = fetch(BASE + rel)
    local = (ROOT / rel).read_text(encoding="utf-8")
    if remote is None:
        changed.append((rel, "本地有 / 线上取不到"))
        continue
    if remote == local:
        print(f"  = {rel} 相同")
        continue
    d = [l for l in difflib.unified_diff(remote.splitlines(), local.splitlines(),
                                         fromfile="online/" + rel, tofile="local/" + rel, n=0)]
    adds = sum(1 for l in d if l.startswith("+") and not l.startswith("+++"))
    dels = sum(1 for l in d if l.startswith("-") and not l.startswith("---"))
    changed.append((rel, f"差异 +{adds} / -{dels}"))

print("\n=== 需要推送的文件 ===")
for rel, note in changed:
    print(f"  {rel}: {note}")
print(f"\n共 {len(changed)} 个文件需要更新")
