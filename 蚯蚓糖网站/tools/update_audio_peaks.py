# -*- coding: utf-8 -*-
"""Regenerate the real WAV peak data used by the homepage audio timeline.

Run from any directory after replacing assets/audio/demo-*.wav:
    python tools/update_audio_peaks.py

Supports uncompressed 16-bit PCM WAV files (mono or multichannel).
"""
from __future__ import annotations

import json
import re
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "assets" / "audio"
SCRIPT = ROOT / "assets" / "js" / "main.js"
BINS = 56


def read_peaks(path: Path) -> list[float]:
    with wave.open(str(path), "rb") as source:
        if source.getsampwidth() != 2:
            raise ValueError(f"{path.name}: expected 16-bit PCM WAV")
        channels = source.getnchannels()
        frame_count = source.getnframes()
        raw = source.readframes(frame_count)
    samples = struct.unpack("<" + "h" * (len(raw) // 2), raw)
    frame_count = len(samples) // channels
    if not frame_count:
        return [0.0] * BINS
    bin_size = max(1, frame_count // BINS)
    peaks: list[float] = []
    for index in range(BINS):
        start = index * bin_size
        end = (index + 1) * bin_size if index < BINS - 1 else frame_count
        # Measure the strongest sample across all channels in each time bin.
        chunk = samples[start * channels:end * channels]
        peaks.append(round(max(map(abs, chunk), default=0) / 32768, 3))
    return peaks


def main() -> None:
    files = sorted(AUDIO_DIR.glob("demo-*.wav"))
    if not files:
        raise SystemExit("No demo-*.wav files found.")
    peaks = {path.stem: read_peaks(path) for path in files}
    rows = []
    for name, values in peaks.items():
        compact = json.dumps(values, separators=(",", ":"))
        rows.append(f'    "{name}": {compact}')
    replacement = "/* AUDIO_PEAKS_START */\n  var AUDIO_PEAKS = {\n" + ",\n".join(rows) + "\n  };\n  /* AUDIO_PEAKS_END */"
    script = SCRIPT.read_text(encoding="utf-8")
    updated, count = re.subn(
        r"/\* AUDIO_PEAKS_START \*/.*?/\* AUDIO_PEAKS_END \*/",
        replacement,
        script,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise SystemExit("AUDIO_PEAKS markers were not found in assets/js/main.js")
    SCRIPT.write_text(updated, encoding="utf-8")
    print(f"Updated {len(files)} real waveform(s), {BINS} peaks each: {SCRIPT}")


if __name__ == "__main__":
    main()
