"""Generate placeholder demo audio (soft music-box tones) for the UTAU site.

These files only exist so the <audio> players work out of the box.
Replace them with real demo songs when publishing.

Usage:  python make_demo_audio.py   (run from the site root)
"""
import wave

import numpy as np

SR = 22050
OUT = "assets/audio"
TAIL = 2.0  # 余韻


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def voice(freq, dur, amp=0.5, sr=SR):
    """Pluck / music-box like tone with exponential decay."""
    n = max(1, int(dur * sr))
    t = np.arange(n) / sr
    env = np.exp(-t * (2.6 / max(dur, 0.15))) * np.minimum(1.0, t / 0.012)
    sig = (
        np.sin(2 * np.pi * freq * t)
        + 0.34 * np.sin(2 * np.pi * freq * 2 * t)
        + 0.12 * np.sin(2 * np.pi * freq * 3 * t)
        + 0.05 * np.sin(2 * np.pi * freq * 4.02 * t)
    )
    return (sig * env * amp).astype(np.float64)


def render(notes, sr=SR):
    length = max(start + dur for start, _note, dur, _amp in notes) + TAIL
    buf = np.zeros(int(length * sr))
    for start, note, dur, amp in notes:
        sig = voice(midi(note), dur, amp, sr)
        i = int(start * sr)
        j = min(len(buf), i + len(sig))
        buf[i:j] += sig[: j - i]
    out = buf.copy()
    for delay, gain in ((0.13, 0.22), (0.27, 0.12), (0.41, 0.06)):
        d = int(delay * sr)
        out[d:] += buf[:-d] * gain
    out = out / (np.max(np.abs(out)) or 1.0) * 0.82
    fade = int(0.05 * sr)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def write_wav(path, signal, sr=SR):
    pcm = (np.clip(signal, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(path, "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(sr)
        fh.writeframes(pcm.tobytes())


def seq(pattern, start, step, dur, amp, transpose=0):
    """pattern の各音を start から step 間隔で並べる（None は休符）。"""
    return [
        (start + i * step, note + transpose, dur, amp)
        for i, note in enumerate(pattern)
        if note is not None
    ]


def chord_track(prog, bar_len, beats_per_bar, beat, bass_amp=0.30, pad_amp=0.14):
    """prog: [(root, [notes...]), ...] を 1 小節ずつ並べる。"""
    notes = []
    for bar, (root, chord) in enumerate(prog):
        start = bar * beats_per_bar * beat
        notes.append((start, root - 12, beats_per_bar * beat, bass_amp))
        notes += seq(chord, start + 0.5 * beat, beat * 1.5, bar_len, pad_amp)
    return notes


# ---------------------------------------------------------------- demo 01
# 「星を数えて」 — 80 BPM / やさしいアルペジオ
bpm = 80
beat = 60 / bpm
t1 = []
prog1 = [(60, [60, 64, 67, 72]), (57, [57, 60, 64, 69]),
         (53, [53, 57, 60, 65]), (55, [55, 59, 62, 67])]
for bar, (_root, chord) in enumerate(prog1):
    start = bar * 4 * beat
    for k in range(4):
        t1.append((start + k * beat, chord[k], 1.45 * beat, 0.26))
    t1 += seq([c + 12 for c in chord], start + 0.5 * beat, 0.5 * beat, 0.9 * beat, 0.10)
t1 += chord_track(prog1, 1.9 * beat, 4, beat)
t1 += seq([76, 79, 81, 79, 76, 74, 72, 74], 2 * beat, 1.5 * beat, 1.8 * beat, 0.30)
write_wav(f"{OUT}/demo-01.wav", render(t1))

# ---------------------------------------------------------------- demo 02
# 「雨音のワルツ」 — 132 BPM / 3拍子
bpm = 132
beat = 60 / bpm
t2 = []
prog2 = [(53, [53, 57, 60]), (48, [48, 52, 55]),
         (50, [50, 53, 57]), (55, [55, 59, 62])]
for bar, (_root, chord) in enumerate(prog2):
    start = bar * 3 * beat
    t2 += seq(chord, start, beat, 0.8 * beat, 0.18)
t2 += chord_track(prog2, 1.2 * beat, 3, beat)
t2 += seq([72, 76, 79, 77, 76, 72, 74, 77, 81, 79, 76, 72], beat * 1.5, 0.75 * beat, 1.2 * beat, 0.26)
write_wav(f"{OUT}/demo-02.wav", render(t2))

# ---------------------------------------------------------------- demo 03
# 「夜明けのうた」 — 68 BPM / ゆっくり二声
bpm = 68
beat = 60 / bpm
t3 = []
prog3 = [(48, [60, 64, 67]), (45, [57, 60, 64]),
         (41, [53, 57, 60]), (43, [55, 59, 62])]
t3 += chord_track(prog3, 2.6 * beat, 4, beat, bass_amp=0.22, pad_amp=0.12)
lead3 = [67, 72, 71, 67, 65, 64, 67, 72]
t3 += seq(lead3, beat, 1.5 * beat, 2.2 * beat, 0.30)
t3 += seq([n + 12 for n in lead3], beat * 1.5, 1.5 * beat, 1.8 * beat, 0.09)
write_wav(f"{OUT}/demo-03.wav", render(t3))

print("done")
