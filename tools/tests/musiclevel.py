#!/usr/bin/env python3
"""Music level under the voice, from two renders of the same video: one voice only, one music only
(made with ?stem=voice and ?stem=music, which keep the full mix's master gain).

    python3 tools/tests/musiclevel.py VOICE.mp4 MUSIC.mp4

Momentary loudness (BS.1770, 400 ms) every 0.1 s from ffmpeg's ebur128 filter. Speech is where the
voice-only render is within 10 dB of its own integrated loudness. Reports how far the music sits
below the voice during speech (energy average and median), and the music level in the gaps.
Target: music 15-20 dB below the voice during speech.
"""
import math, re, subprocess, sys, json

TARGET = (15.0, 20.0)


def momentary(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-v", "verbose", "-i", path, "-af", "ebur128=framelog=verbose", "-f", "null", "-"],
                         capture_output=True, text=True, stdin=subprocess.DEVNULL).stderr
    rows = [(float(t), float(m)) for t, m in re.findall(r"t:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+|-inf)", err.replace("-inf", "-120"))]
    integ = re.search(r"Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS", err)
    return rows, float(integ.group(1)) if integ else float("nan")


def energy_db(vals):
    return 10 * math.log10(sum(10 ** (v / 10) for v in vals) / len(vals)) if vals else float("nan")


def main(voice, music):
    v, vi = momentary(voice)
    m, mi = momentary(music)
    mm = {round(t, 1): x for t, x in m}
    speech = [(t, x, mm[round(t, 1)]) for t, x in v if x >= vi - 10 and round(t, 1) in mm]
    gaps = [mm[round(t, 1)] for t, x in v if x < vi - 20 and round(t, 1) in mm]
    diffs = sorted(x - y for _, x, y in speech)
    under = energy_db([x for _, x, _ in speech]) - energy_db([y for _, _, y in speech])
    med = diffs[len(diffs) // 2] if diffs else float("nan")
    out = {
        "voice_file": voice, "music_file": music,
        "voice_integrated_lufs": vi, "music_integrated_lufs": mi,
        "speech_seconds": round(len(speech) * 0.1, 1),
        "voice_during_speech_lufs": round(energy_db([x for _, x, _ in speech]), 1),
        "music_during_speech_lufs": round(energy_db([y for _, _, y in speech]), 1),
        "music_below_voice_db": round(under, 1),
        "median_music_below_voice_db": round(med, 1),
        "p10_p90_music_below_voice_db": [round(diffs[len(diffs) // 10], 1), round(diffs[len(diffs) * 9 // 10], 1)] if diffs else None,
        "music_in_gaps_lufs": round(energy_db(gaps), 1) if gaps else None,
        "gap_seconds": round(len(gaps) * 0.1, 1),
    }
    print(json.dumps(out))
    ok = TARGET[0] <= under <= TARGET[1]
    print(f"  {'PASS' if ok else 'FAIL'}  music {TARGET[0]:.0f}-{TARGET[1]:.0f} dB below the voice during speech: {under:.1f} dB (median {med:.1f} dB)")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2]))
