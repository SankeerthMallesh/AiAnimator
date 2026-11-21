#!/usr/bin/env python3
"""Measure Loomy outputs against the owner's reference targets.
Usage: python3 tools/tests/refcheck.py --tab cartoons|3d|blocky|clips FILE [FILE ...]
Needs only ffmpeg on PATH (set FFMPEG=/path/to/ffmpeg to override). Exit code 1 if any check fails."""
import argparse, json, os, re, statistics, subprocess, sys

FF = os.environ.get("FFMPEG", "ffmpeg")

# Targets measured from the owner's reference videos. Do not loosen these.
TARGETS = {
    "cartoons": {"median_shot": (0.8, 1.6), "min_len": 45, "max_len": 90},
    "3d":       {"median_shot": (0.8, 1.6), "min_len": 25, "max_len": 75},
    "blocky":   {"median_shot": (0.7, 1.3), "min_len": 55, "max_len": 120},
    "clips":    {"median_shot": None,       "min_len": 10, "max_len": 40},
}
COMMON = {"width": 1080, "height": 1920, "lufs": (-14.5, -12.5), "true_peak_max": -1.0,
          "lead_silence_max": 0.15, "tail_silence_max": 0.6, "dup_frame_pct_max": 1.0}


def err(args):
    return subprocess.run([FF, "-hide_banner", "-nostats", *args], capture_output=True, text=True).stderr


def measure(f):
    info = err(["-i", f])
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
    dur = int(d[1]) * 3600 + int(d[2]) * 60 + float(d[3])
    v = re.search(r"Video:.*?(\d{2,5})x(\d{2,5}).*?([\d.]+) fps", info)
    w, h, fps = int(v[1]), int(v[2]), float(v[3])

    e = err(["-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"])
    s = e[e.rfind("Summary"):]
    lufs = float(re.search(r"I:\s+(-?[\d.]+)", s)[1])
    tp = float(re.search(r"Peak:\s+(-?[\d.]+)", s)[1])

    sd = err(["-i", f, "-af", "silencedetect=n=-45dB:d=0.1", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", sd)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", sd)]
    lead = ends[0] if starts and starts[0] <= 0.02 and ends else 0.0
    tail = 0.0
    if starts and (len(ends) < len(starts) or ends[-1] >= dur - 0.06):
        tail = max(0.0, dur - starts[-1])

    sc = err(["-i", f, "-an", "-vf", "fps=15,scale=180:320,scdet=threshold=4", "-f", "null", "-"])
    cuts = []
    for t in (float(x) for x in re.findall(r"lavfi\.scd\.time: ([\d.]+)", sc)):
        if not cuts or t - cuts[-1] > 0.4:
            cuts.append(t)
    shots = [b - a for a, b in zip([0.0] + cuts, cuts + [dur]) if b - a > 0.05]

    total = len(re.findall(r"pts_time", err(["-i", f, "-an", "-vf", "showinfo", "-f", "null", "-"])))
    uniq = len(re.findall(r"pts_time", err(["-i", f, "-an", "-vf", "mpdecimate=hi=256:lo=128:frac=0.1,showinfo", "-f", "null", "-"])))
    dup_pct = 100.0 * (total - uniq) / max(1, total)

    return {"file": os.path.basename(f), "width": w, "height": h, "fps": fps, "duration": round(dur, 2),
            "lufs": lufs, "true_peak": tp, "lead_silence": round(lead, 2), "tail_silence": round(tail, 2),
            "shots": len(shots), "median_shot": round(statistics.median(shots), 2) if shots else None,
            "dup_frame_pct": round(dup_pct, 1)}


def check(m, tab):
    t = TARGETS[tab]
    res = {
        "size 1080x1920": m["width"] == COMMON["width"] and m["height"] == COMMON["height"],
        f"loudness {COMMON['lufs'][0]}..{COMMON['lufs'][1]} LUFS": COMMON["lufs"][0] <= m["lufs"] <= COMMON["lufs"][1],
        f"true peak <= {COMMON['true_peak_max']} dBTP": m["true_peak"] <= COMMON["true_peak_max"],
        f"lead silence <= {COMMON['lead_silence_max']} s": m["lead_silence"] <= COMMON["lead_silence_max"],
        f"tail silence <= {COMMON['tail_silence_max']} s": m["tail_silence"] <= COMMON["tail_silence_max"],
        f"duplicate frames <= {COMMON['dup_frame_pct_max']}%": m["dup_frame_pct"] <= COMMON["dup_frame_pct_max"],
        f"length {t['min_len']}..{t['max_len']} s": t["min_len"] <= m["duration"] <= t["max_len"],
    }
    if t["median_shot"]:
        lo, hi = t["median_shot"]
        res[f"median shot {lo}..{hi} s"] = m["median_shot"] is not None and lo <= m["median_shot"] <= hi
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tab", required=True, choices=TARGETS)
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()
    failed = False
    for f in a.files:
        m = measure(f)
        r = check(m, a.tab)
        failed |= not all(r.values())
        print(json.dumps(m))
        for name, ok in r.items():
            print(f"  {'PASS' if ok else 'FAIL'}  {name}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
