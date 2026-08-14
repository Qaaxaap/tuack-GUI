#!/usr/bin/env python3
"""下载 tuack-ng + typst 二进制及 tuack-ng 的 assets，放到 src-tauri/binaries/。

用法：python3 scripts/fetch-binaries.py <target-triple>
支持：x86_64-unknown-linux-gnu, x86_64-pc-windows-msvc
"""

import io
import os
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

TYPST_VERSION = "0.15.1"
TUACK_VERSION = "1.0.2"

TARGETS = {
    "x86_64-unknown-linux-gnu": ("typst-x86_64-unknown-linux-musl", "tuack-ng-linux-x86_64", ""),
    "x86_64-pc-windows-msvc": ("typst-x86_64-pc-windows-msvc", "tuack-ng-windows-x86_64", ".exe"),
}


def download(url: str) -> bytes:
    with urllib.request.urlopen(url) as resp:
        return resp.read()


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else ""
    if target not in TARGETS:
        print(f"Unsupported target: {target} (available: {', '.join(TARGETS)})", file=sys.stderr)
        sys.exit(1)
    typst_asset, tuack_asset, exe = TARGETS[target]

    bin_dir = Path(__file__).resolve().parent.parent / "src-tauri" / "binaries"
    assets_dir = bin_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    # ---- typst ----
    if exe:
        url = f"https://github.com/typst/typst/releases/download/v{TYPST_VERSION}/{typst_asset}.zip"
        with zipfile.ZipFile(io.BytesIO(download(url))) as z:
            name = next(n for n in z.namelist() if n.endswith("typst.exe"))
            (bin_dir / f"typst-{target}{exe}").write_bytes(z.read(name))
    else:
        url = f"https://github.com/typst/typst/releases/download/v{TYPST_VERSION}/{typst_asset}.tar.xz"
        with tarfile.open(fileobj=io.BytesIO(download(url)), mode="r:xz") as t:
            member = next(m for m in t.getmembers() if m.name.endswith("/typst"))
            data = t.extractfile(member)
            assert data is not None
            (bin_dir / f"typst-{target}").write_bytes(data.read())

    # ---- tuack-ng（zip 内含二进制 + assets/）----
    url = f"https://github.com/tuack-ng/tuack-ng/releases/download/{TUACK_VERSION}/{tuack_asset}.zip"
    with zipfile.ZipFile(io.BytesIO(download(url))) as z:
        for name in z.namelist():
            base = os.path.basename(name.rstrip("/"))
            if base == f"tuack-ng{exe}":
                (bin_dir / f"tuack-ng-{target}{exe}").write_bytes(z.read(name))
            elif name.startswith("assets/") and not name.endswith("/"):
                dest = assets_dir / name[len("assets/"):]
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(z.read(name))

    print(f"Done: {bin_dir}")


if __name__ == "__main__":
    main()
