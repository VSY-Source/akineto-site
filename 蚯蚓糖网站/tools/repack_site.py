# -*- coding: utf-8 -*-
"""把站点目录打包成可分发的 zip（排除 .git / __pycache__ 等）

用法：
    python tools/repack_site.py                 # 输出到上级目录的 akineto-site.zip
    python tools/repack_site.py -o out.zip      # 指定输出路径
"""
from __future__ import annotations

import argparse
import os
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_DIRS = {".git", "__pycache__", ".vscode", "node_modules", ".pytest_cache", ".edge-test", ".acl-recovery", "previews"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db"}


def collect(root: Path) -> list[tuple[Path, str]]:
    entries: list[tuple[Path, str]] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDE_DIRS)
        for fn in filenames:
            if fn in EXCLUDE_FILES:
                continue
            full = Path(dirpath) / fn
            entries.append((full, full.relative_to(root).as_posix()))
    entries.sort(key=lambda x: x[1])
    return entries


def main() -> None:
    ap = argparse.ArgumentParser(description="打包 UTAU 声库配布站为 zip")
    ap.add_argument("-o", "--output", default=str(ROOT.parent / "akineto-site.zip"))
    ap.add_argument("--root", default=str(ROOT))
    args = ap.parse_args()

    root = Path(args.root).resolve()
    out = Path(args.output).resolve()
    entries = collect(root)

    if out.exists():
        out.unlink()

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for full, rel in entries:
            z.write(full, rel)

    size_mb = out.stat().st_size / 1024 / 1024
    print(f"{out} <- {len(entries)} files, {size_mb:.2f} MB")
    for _, rel in entries:
        print("  ", rel)


if __name__ == "__main__":
    main()
