#!/usr/bin/env python3
"""Count flat edge columns in a video (a column whose brightness stays within 4 levels down its
whole height in every sampled frame): the sign of a letterbox or slate bar left in the crop.
Usage: python3 edgecheck.py FILE [FILE ...]"""
import subprocess, sys
for f in sys.argv[1:]:
    w, h = 270, 480
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'fps=2,scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    n = len(raw) // (w * h)
    lo = [255] * w; hi = [0] * w
    for k in range(n):
        fr = raw[k * w * h:(k + 1) * w * h]
        for x in list(range(0, 12)) + list(range(w - 12, w)):
            col = fr[x::w]
            lo[x] = min(lo[x], min(col)); hi[x] = max(hi[x], max(col))
    flat = [x for x in list(range(0, 12)) + list(range(w - 12, w)) if hi[x] - lo[x] < 4]
    print(f"{f.split('/')[-1]}: {n} frames, flat edge columns: {len(flat)}{' ' + str(flat) if flat else ''}")
