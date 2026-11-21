# Soundtracks for the 3D ("icewater") and Blocky ("snowfort") shorts, built with the cartoon-3d-short skill's
# own sound kit (dsp / instruments / sfx_gen): an original score, synthesized SFX on the picture's beats, the
# ElevenLabs voice on top, music ducked under speech, mastered to -14 LUFS with a true-peak limiter.
# usage: python3 score.py icewater|snowfort <voice.wav> <words.json> <out.wav>
import os, sys, json
import numpy as np
from scipy import signal
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "cartoon-audio", "audio"))
from dsp import (shelf, SR, TAU, ns, tt, dbg, rng, lp, hp, bp, peq, colored, smooth_noise, ramp, fades, st, pan, place,
                 make_ir, convolve_st, integrated, momentary_max, true_peak, norm_to, read_wav, write_wav, reson)
import instruments as I
import sfx_gen as G
from mix import limiter

FILM, VOICE, WORDS, OUT = sys.argv[1:5]
words = json.load(open(WORDS))
# the cues below are written on the first take's timeline; KNOTS (from the film's -time.js) move them onto the
# current voice take. Single events move with the picture; music sections move their start/end but keep tempo.
_tj = open(os.path.join("/home/user/animation-ai/explainer/js/z3d/films", FILM + "-time.js")).read()
KNOTS = json.loads(_tj.split("KNOTS = ")[1].split(";")[0])
DUR = float(_tj.split("TOTAL = ")[1].split(";")[0])


def W(t):
    ks = KNOTS
    for i in range(1, len(ks)):
        if t <= ks[i][0]:
            a0, b0 = ks[i - 1]; a1, b1 = ks[i]
            return b0 + (t - a0) * (b1 - b0) / ((a1 - a0) or 1)
    return t - ks[-1][0] + ks[-1][1]


def put(b, x, t, gain=1.0):
    place(b, x, W(t), gain)
N = ns(DUR)
m2f = I.m2f
_seed = [1000]


def R():
    """a fresh seeded generator per call (repeatable)"""
    _seed[0] += 1
    return rng(_seed[0])


def buf():
    return np.zeros((2, N))


def ev(b, x, t, lufs, p=0.0):
    """place one event, normalised to a max-momentary loudness, optionally panned"""
    x = np.asarray(x, float)
    if x.ndim == 1:
        x = pan(x, p)
    place(b, norm_to(x, lufs), W(t))


def bed(b, x, t, lufs, fin=0.4, fout=0.6):
    x = st(np.asarray(x, float))
    n = x.shape[1]
    env = np.ones(n)
    a, z = min(n // 2, ns(fin)), min(n // 2, ns(fout))
    env[:a] = ramp(a)
    env[n - z:] = ramp(z)[::-1]
    place(b, norm_to(x * env, lufs, "integrated"), W(t))


# --------------------------------------------------------------- small extra sounds (built from the kit)
def heartbeat(r, big=1.0):
    """lub-dub: two low thumps"""
    def thump(f0, d):
        t = tt(d)
        return np.sin(TAU * (f0 * t + 18 * (1 - np.exp(-t / 0.03)) * 0.03)) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.004))
    x = np.zeros(ns(0.5))
    a = thump(52, 0.35); x[:len(a)] += a
    b = thump(46, 0.35) * 0.7; i = ns(0.17); x[i:i + len(b)] += b[: len(x) - i]
    return lp(x * big, 160)


def breath(r, d=0.38, inhale=True, f=1400):
    n = ns(d)
    e = np.sin(np.linspace(0, np.pi, n)) ** (1.5 if inhale else 2.5)
    return bp(r.standard_normal(n), f * 0.5, f * 2.2, 1) * e


def gasp(r):
    n = ns(0.42)
    e = np.minimum(1, np.linspace(0, 6, n)) * np.exp(-np.linspace(0, 3, n))
    x = bp(r.standard_normal(n), 900, 4200, 2) * e
    return x


def crunch(r, d=0.16, bright=1.0):
    """a boot in snow: dense crackle under a soft squeak"""
    n = ns(d)
    t = np.arange(n) / SR
    grains = (r.random(n) < 0.08).astype(float) * r.standard_normal(n)
    x = bp(grains, 900, 5000 * bright, 2) * np.exp(-t / (d * 0.45))
    return x + lp(r.standard_normal(n), 400) * np.exp(-t / 0.03) * 0.6


def scrape(r, d=0.5, f0=700, f1=2600):
    n = ns(d)
    e = np.sin(np.linspace(0, np.pi, n)) ** 0.7
    return bp(colored(n, r, 0.0), f0, f1, 2) * e * (0.6 + 0.4 * smooth_noise(n, r, 30))


def engine(r, d, rpm=1.0):
    t = tt(d)
    f = 38 * rpm * (1 + 0.04 * np.sin(TAU * 0.7 * t))
    ph = np.cumsum(f) / SR * TAU
    saw = sum(np.sin(k * ph) / k for k in range(1, 18))
    return lp(saw, 900) * (0.85 + 0.15 * np.sin(TAU * 9 * t)) + bp(r.standard_normal(len(t)), 80, 600, 1) * 0.3


def beep(d=0.22, f=1050):
    t = tt(d)
    return np.sign(np.sin(TAU * f * t)) * 0.3 * fades(np.ones(len(t)), 0.004, 0.01)


def pop(r):
    t = tt(0.12)
    return np.sin(TAU * (500 * t + 900 * t * t)) * np.exp(-t / 0.03)


def boom(r, f=42, d=2.2):
    t = tt(d)
    return lp(np.sin(TAU * f * t * (1 - 0.15 * t / d)) * np.exp(-t / 0.7) + 0.3 * r.standard_normal(len(t)) * np.exp(-t / 0.05), 220)


def riser(r, d, f0=300, f1=3500):
    n = ns(d)
    t = np.linspace(0, 1, n)
    x = colored(n, r, 0.0)
    out = np.zeros(n)
    seg = ns(0.05)
    for i in range(0, n, seg):
        fc = f0 * (f1 / f0) ** t[i]
        out[i:i + seg] = bp(x[max(0, i - seg): i + seg], fc * 0.7, fc * 1.4, 1)[-len(out[i:i + seg]):]
    return out * t ** 2


# --------------------------------------------------------------- music helpers
def roll(t0, d, v0, v1):
    """render the kit's snare-roll stroke list into one stereo clip"""
    out = np.zeros((2, ns(d + 0.4)))
    for t, v in I.snare_roll(0, d, v0, v1, R()):
        place(out, pan(I.snare(v, R(), 0.18, 1.0, 0.9, True), 0.1), max(0.0, t))
    return out


def chord_pad(b, notes, t, d, vel=0.5, warm=900, att=0.5, rel=0.9):
    t, d = W(t), W(t + d) - W(t)
    place(b, I.pad([m2f(n) for n in notes], d, vel, R(), att, rel, warm), t)


def arp(b, notes, t0, t1, step, vel=0.5, inst="pluck", p=0.0, dur=None, pattern=None):
    t0, t1 = W(t0), W(t1)
    k, t = 0, t0
    pat = pattern or list(range(len(notes)))
    while t < t1 - 1e-6:
        n = notes[pat[k % len(pat)]]
        if inst == "pluck":
            x = I.pluck(m2f(n), vel, R(), dur or 0.9)
        elif inst == "glock":
            x = I.glock(m2f(n), vel, R(), dur or 1.2)
        elif inst == "vibes":
            x = I.vibes(m2f(n), vel, R(), dur or 1.6)
        else:
            x = I.musicbox(m2f(n), vel, R(), dur or 1.4)
        place(b, pan(x, p), t)
        k += 1
        t += step
    return b


def melody(b, notes, t0, step, inst="glock", vel=0.6, p=0.0):
    """notes: list of (midi or None, length in steps)"""
    t = W(t0)
    for n, L in notes:
        if n is not None:
            d = max(0.5, L * step * 1.6)
            x = {"glock": I.glock, "vibes": I.vibes, "musicbox": I.musicbox}[inst](m2f(n), vel, R(), d) if inst != "pluck" else I.pluck(m2f(n), vel, R(), d)
            place(b, pan(x, p), t)
        t += L * step
    return t


def drums(b, t0, t1, beat, kind="brush", vel=0.5, snare_on=(1, 3)):
    t0, t1 = W(t0), W(t1)
    t, k = t0, 0
    while t < t1 - 1e-6:
        if k % 4 in snare_on:
            place(b, pan(I.snare(vel, R(), 0.3, 1.0, 0.8) if kind == "snare" else I.brush(vel, R(), 0.3), 0.15), t)
        else:
            place(b, pan(I.brush(vel * 0.5, R(), 0.25, swish=True), -0.2), t)
        k += 1
        t += beat


# ================================================================ ICEWATER
def icewater():
    mus, sfx = buf(), buf()
    D2, A2, D3, F3, A3, Bb2, G2, C3, E3, G3 = 38, 45, 50, 53, 57, 46, 43, 48, 52, 55
    # ---- score (D minor; 96 bpm, eighth = 0.3125)
    e8 = 60 / 96 / 2
    chord_pad(mus, [D2, A2, D3, F3], 0.0, 3.4, 0.5, 700, 1.2, 0.5)                   # cold open
    put(mus, norm_to(st(I.timpani(m2f(D2), 0.9, R())), -20), 3.62)                    # impact
    chord_pad(mus, [D2, A2, D3, F3, A3], 4.2, 5.2, 0.45, 800, 0.6, 1.0)
    chord_pad(mus, [Bb2, F3, D3 + 12 - 12, Bb2 + 12], 9.38, 3.9, 0.5, 900, 0.3, 0.5)
    arp(mus, [D3, F3, A3, F3], 9.4, 13.2, e8, 0.35, "pluck", 0.2)
    chord_pad(mus, [G2, D3, G3, Bb2 + 12], 13.2, 5.8, 0.5, 1000, 0.2, 0.6)
    arp(mus, [G3, Bb2 + 12, D3 + 12, Bb2 + 12], 13.2, 19.0, e8, 0.38, "pluck", -0.2)
    chord_pad(mus, [D2, A2, D3, F3], 19.0, 5.6, 0.6, 1300, 0.3, 0.5)                  # panic: brighter, pulsing
    arp(mus, [D3, D3 + 12, A3, F3], 19.0, 24.6, e8 / 2, 0.3, "pluck", 0.3)
    put(mus, norm_to(roll(0, 1.2, 0.1, 0.6), -24), 23.4)
    # the rule: hopeful progression with an ostinato
    prog = [([D2, A2, D3, F3], [D3, F3, A3, D3 + 12]), ([Bb2 - 12 + 12, F3, Bb2 + 12, D3], [Bb2 + 12, D3, F3, D3]),
            ([F3 - 12, C3, F3, A3], [F3, A3, C3 + 12, A3]), ([C3 - 12, G2, C3, E3], [C3, E3, G3, E3])]
    t, k = 24.6, 0
    while t < 42.3 - 0.1:
        pd, ap = prog[k % 4]
        L = min(4 * 8 * e8 / 2, 42.3 - t)
        chord_pad(mus, pd, t, L, 0.42, 1100 if t < 33.2 else 750, 0.3, 0.4)
        arp(mus, ap, t, t + L, e8, 0.33 if t < 33.2 else 0.24, "pluck" if t < 37.9 else "vibes", 0.25)
        t += L
        k += 1
    put(mus, norm_to(st(I.glock(m2f(A3 + 12), 0.5, R())), -30), 28.78)
    put(mus, norm_to(st(I.glock(m2f(D3 + 24), 0.5, R())), -30), 31.71)
    chord_pad(mus, [A2, E3, A3, D3 + 12], 42.3, 4.5, 0.45, 700, 0.8, 0.8)           # suspended: dusk
    # build to the end
    for i, (pd, ap) in enumerate([([Bb2, F3, Bb2 + 12, D3 + 12], [Bb2 + 12, D3 + 12, F3 + 12]), ([C3, G3, C3 + 12, E3 + 12], [C3 + 12, E3 + 12, G3 + 12])]):
        t0 = 46.8 + i * 4.2
        chord_pad(mus, pd, t0, 4.2, 0.5, 1300, 0.2, 0.3)
        arp(mus, ap, t0, t0 + 4.2, e8, 0.4, "pluck", 0.2)
        drums(mus, t0, t0 + 4.2, 2 * e8, "snare", 0.25 + 0.15 * i)
    put(mus, norm_to(roll(0, 0.9, 0.15, 0.8), -20), 54.4)
    chord_pad(mus, [D2, A2, D3, F3, A3, D3 + 12], 55.25, 4.0, 0.6, 1500, 0.05, 0.7)
    put(mus, norm_to(st(I.timpani(m2f(D2), 1.0, R())), -16), 55.25)
    put(mus, norm_to(I.cymbal(0.7, R(), 2.4), -22), 55.25)
    put(mus, norm_to(st(I.timpani(m2f(A2 - 12 + 12), 1.0, R())), -15), 57.42)
    # ---- SFX
    bed(sfx, G.breeze(9.6, R(), 1.0, 0.2, 800), 0.0, -31, 0.3, 0.4)
    ev(sfx, G.creak(0.9, R(), 30, 70, G.WOOD, rough=0.3) if hasattr(G, "WOOD") else scrape(R(), 0.8, 200, 900), 0.55, -27, -0.3)
    ev(sfx, G.whoosh(0.95, R(), 0.85, 250, 1500, 0.9, 0.08, 0.1), 2.72, -20)
    ev(sfx, G.splash_big(R()), 3.62, -11)
    ev(sfx, boom(R(), 38, 1.8), 3.62, -16)
    ev(sfx, G.bubbles(1.6, R(), 22), 3.85, -25)
    bed(sfx, G.water_bed(15.4, R(), 0.9, 0.8), 9.3, -30, 0.3, 0.3)
    ev(sfx, gasp(R()), 14.2, -19)
    ev(sfx, G.whoosh(0.35, R(), 0.3, 600, 3000, 0.7, 0.05, 0.2), 12.95, -24)          # punch-in
    under = lp(G.water_bed(3.3, R(), 1.0, 0.4)[0] if np.ndim(G.water_bed(0.2, R(), 1.0, 0.4)) > 1 else G.water_bed(3.3, R(), 1.0, 0.4), 450)
    bed(sfx, under, 15.8, -27, 0.1, 0.2)
    ev(sfx, G.bubbles(3.0, R(), 14, 200, 1600), 15.9, -22)
    ev(sfx, boom(R(), 30, 2.5), 15.8, -24)
    k = 0
    while 19.0 + k / 2.2 < 24.5:                                                      # racing heart + fast breaths
        ev(sfx, heartbeat(R(), 1.0), 19.0 + k / 2.2, -18 + min(k, 6) * 0.3)
        k += 1
    for i in range(8):
        ev(sfx, breath(R(), 0.3, i % 2 == 0, 1300 if i % 2 == 0 else 1000), 19.15 + i * 0.7, -27, 0.1)
    bed(sfx, G.breeze(3.9, R(), 0.8, 0.15, 700), 24.6, -32)
    ev(sfx, G.whoosh(0.5, R(), 0.2, 400, 2400, 0.8, 0.13, 0.2), 24.4, -22)
    bed(sfx, G.water_bed(14.0, R(), 0.7, 0.5), 28.4, -31, 0.3, 0.6)
    for i in range(4):                                                                 # slow, calm breaths
        ev(sfx, breath(R(), 0.9, i % 2 == 0, 900), 28.5 + i * 0.95, -30)
    k = 0
    while 37.9 + k / 1.15 < 42.2:                                                       # slow heart, blood pulled in
        ev(sfx, heartbeat(R(), 0.8), 37.95 + k / 1.15, -22)
        k += 1
    bed(sfx, G.breeze(17.0, R(), 1.1, 0.2, 650), 42.3, -31, 1.0, 1.2)
    ev(sfx, G.whoosh(0.6, R(), 0.25, 300, 1800, 0.8, 0.18, 0.15), 46.55, -21)
    for i in range(7):                                                                  # kicking legs
        ev(sfx, G.bubbles(0.25, R(), 30, 400, 2400), 50.9 + i * 0.3, -27)
        ev(sfx, bp(R().standard_normal(ns(0.18)), 300, 2400, 1) * np.exp(-tt(0.18) / 0.05), 50.92 + i * 0.3, -25, 0.2)
    ev(sfx, scrape(R(), 1.9, 300, 1600), 53.05, -24)                                    # rolling across the ice
    for i in range(3):
        ev(sfx, G.push_thump(R()), 53.2 + i * 0.6, -24)
    ev(sfx, G.whoosh(0.7, R(), 0.3, 300, 1800, 0.8, 0.2, 0.15), 55.0, -20)
    ev(sfx, boom(R(), 40, 2.6), 57.42, -18)
    return mus, sfx, -8.0       # music ~8 LU under the voice before ducking (~11-12 under it while speaking)


# ================================================================ SNOWFORT
def snowfort():
    mus, sfx = buf(), buf()
    C3, D3, E3, F3, G3, A3, B3, C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, G5 = 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 79
    q = 60 / 112                     # quarter note at 112 bpm
    bars = lambda t0, t1: int(round((t1 - t0) / (4 * q)))

    def bass(t0, t1, roots, vel=0.6):
        t0, t1 = W(t0), W(t1)
        t, k = t0, 0
        while t < t1 - 1e-6:
            r_ = roots[(k // 4) % len(roots)]
            place(mus, pan(I.pluck(m2f(r_ - 12 if k % 2 == 0 else r_ - 5), vel, R(), 0.5, 0.35), -0.1), t)
            k += 1
            t += q

    def comp(t0, t1, chords, vel=0.35, inst="pluck"):
        t0, t1 = W(t0), W(t1)
        t, k = t0, 0
        while t < t1 - 1e-6:
            ch = chords[(k // 8) % len(chords)]
            if k % 2 == 1:
                for n in ch:
                    x = I.pluck(m2f(n), vel / len(ch) * 2, R(), 0.35, 0.6) if inst == "pluck" else I.vibes(m2f(n), vel / len(ch) * 2, R(), 0.6)
                    place(mus, pan(x, 0.25), t)
            k += 1
            t += q / 2

    Cm, Am, Fm, Gm = [C4, E4, G4], [A3, C4, E4], [F3, A3, C4], [G3, B3, D4]
    # A: the street (playful)
    bass(0.0, 12.9, [C3, A3 - 12 + 12, F3, G3])
    comp(0.0, 12.9, [Cm, Am, Fm, Gm])
    mel = [(E5, 1), (G5, 1), (E5, 1), (C5, 1), (D5, 2), (None, 2), (C5, 1), (E5, 1), (C5, 1), (A4, 1), (G4, 2), (None, 2),
           (A4, 1), (C5, 1), (A4, 1), (F4, 1), (G4, 2), (None, 2), (B4, 1), (D5, 1), (G5, 2), (None, 4)]
    melody(mus, mel, 0.05, q / 1, "glock", 0.45, 0.15)
    put(mus, norm_to(G.whoosh(0.5, R(), 0.4, 600, 4000, 0.8, 0.1, 0.4), -26), 12.5)
    # B: the daydream
    for i, ch in enumerate([[F3, A3, C4, E4], [G3, B3, D4, G4], [E3, G3, B3, E4], [A3, C4, E4, G4]]):
        chord_pad(mus, ch, 12.9 + i * 1.03, 1.1, 0.4, 1500, 0.15, 0.4)
    arp(mus, [C5, E5, G5, E5, C5 + 12, G5], 12.9, 17.0, q / 3, 0.35, "vibes", 0.2, 1.0)
    # C: three days of building (upbeat with drums)
    bass(17.0, 23.1, [C3, F3, G3, C3], 0.7)
    comp(17.0, 23.1, [Cm, Fm, Gm, Cm], 0.4)
    drums(mus, 17.0, 23.1, q, "snare", 0.35)
    melody(mus, [(G4, 1), (C5, 1), (E5, 1), (G5, 1), (F5 := 77, 1), (E5, 1), (D5, 2), (G4, 1), (B4, 1), (D5, 1), (F5, 1), (E5, 1), (D5, 1), (C5, 2),
                 (E5, 1), (G5, 1), (C5 + 12, 2)], 17.0, q, "glock", 0.5, 0.1)
    put(mus, norm_to(I.cymbal(0.5, R(), 2.0), -26), 22.0)
    # D: the last night (music box)
    chord_pad(mus, [C3, G3, E4, G4], 23.1, 3.6, 0.35, 700, 0.5, 0.3)
    melody(mus, [(E5, 1), (G5, 1), (C5 + 12, 2), (B4 + 12, 1), (G5, 1), (E5, 2), (D5, 1), (E5, 1), (C5, 3)], 23.15, q * 0.75, "musicbox", 0.5, 0.0)
    # (music stops dead at the cut to morning)
    # E: the pile (sad)
    for i, f in enumerate([55, 54, 53, 52]):                                       # wah-wah-wah-waah
        put(mus, pan(I.brass(m2f(f), 0.55 if i < 3 else 1.3, 0.55, R(), "tuba", -30, 0.12, -40 if i == 3 else 0), 0), 27.25 + i * 0.6)
    for i, ch in enumerate([[A3 - 12, E3, A3, C4], [F3 - 12, C3 + 12 - 12, F3, A3], [C3, G3, C4, E4], [G3 - 12, D3, G3, B3]]):
        chord_pad(mus, ch, 29.9 + i * 1.65, 1.75, 0.35, 650, 0.4, 0.5)
    arp(mus, [E4, A4, C5, A4], 30.0, 36.4, q, 0.3, "vibes", 0.2, 1.3)
    # F: Maya furious / tension
    put(mus, norm_to(st(I.timpani(m2f(A3 - 24), 0.9, R())), -21), 36.6)
    arp(mus, [A3 - 12, A3 - 12, C3, A3 - 12, E3, A3 - 12, C3, B3 - 12], 36.6, 43.4, q / 2, 0.45, "pluck", -0.1, 0.25)
    chord_pad(mus, [A3 - 12, E3, A3], 36.6, 6.8, 0.3, 500, 1.0, 0.4)
    # G: the flashback is all plow (music drops out 45.6-47.8)
    # H: dawn, tender
    for i, ch in enumerate([[F3, A3, C4, E4], [C3, G3, C4, E4], [G3 - 12, D3, G3, B3], [A3 - 12, E3, A3, C4]]):
        chord_pad(mus, ch, 47.8 + i * 1.15, 1.25, 0.38, 900, 0.3, 0.4)
    melody(mus, [(C5, 2), (E5, 1), (D5, 3), (C5, 1), (A4, 1), (G4, 4)], 47.85, q * 0.75, "vibes", 0.45, -0.1)
    # I: finale (everything)
    put(mus, norm_to(st(riser(R(), 0.8, 400, 4000)), -28), 51.6)
    bass(52.4, 58.2, [C3, F3, G3, C3], 0.75)
    comp(52.4, 58.2, [Cm, Fm, Gm, Cm], 0.45)
    drums(mus, 52.4, 58.2, q, "snare", 0.45)
    melody(mus, [(E5, 1), (G5, 1), (E5, 1), (C5, 1), (D5, 2), (G5, 2), (E5, 1), (C5, 1), (D5, 1), (B4, 1), (C5, 4)], 52.45, q, "glock", 0.55, 0.15)
    put(mus, norm_to(I.cymbal(0.8, R(), 2.6), -20), 55.8)
    chord_pad(mus, [C3, G3, C4, E4, G4, C5], 58.1, 0.5, 0.55, 1600, 0.02, 0.8)
    put(mus, norm_to(st(I.glock(m2f(C5 + 12), 0.6, R())), -22), 58.1)
    # ---- SFX
    bed(sfx, G.breeze(59.0, R(), 0.8, 0.18, 750), 0.0, -36, 0.5, 1.0)
    ev(sfx, G.flag_flutter(4.5, R()), 0.0, -32, 0.3)
    for i in range(10):                                                    # carrying blocks: crunchy steps + block thumps
        ev(sfx, crunch(R()), 17.1 + i * 0.55, -31, -0.2 if i % 2 else 0.2)
    for i in range(6):
        ev(sfx, G.push_thump(R()), 17.6 + i * 0.75, -25, 0.1)
    ev(sfx, G.whoosh(0.4, R(), 0.25, 500, 3500, 0.8, 0.08, 0.3), 21.8, -24)
    ev(sfx, pop(R()), 22.05, -24, 0.2)
    ev(sfx, G.flag_flutter(1.2, R()), 22.1, -30, 0.2)
    for j in range(2):                                                     # we cheer on the wall
        ev(sfx, G.hurrah(R(), 290 + 40 * j, 1.0, True), 23.45 + 0.25 * j, -24, -0.4 + 0.8 * j)
    bed(sfx, G.breeze(4.6, R(), 1.4, 0.3, 500), 26.8, -30, 0.2, 1.0)        # the empty morning
    ev(sfx, G.whoa(R(), 300, 0.5), 27.75, -28, -0.2)
    ev(sfx, crunch(R(), 0.25), 33.6, -30)
    for i in range(3):                                                      # Maya shaking with rage
        ev(sfx, crunch(R(), 0.12, 0.6), 36.9 + i * 0.12, -33)
    ev(sfx, crunch(R(), 0.3), 40.4, -29)                                    # Kai stands up
    ev(sfx, G.whoosh(0.7, R(), 0.35, 300, 2000, 0.9, 0.25, 0.1), 45.25, -22)  # into the flashback
    ev(sfx, engine(R(), 2.6), 45.4, -19, -0.2)
    for i in range(4):
        ev(sfx, beep(), 45.5 + i * 0.5, -27, 0.3)
    ev(sfx, G.rattle(1.2, R(), 30, heavy=True) if hasattr(G, "rattle") else scrape(R(), 1.2), 46.2, -22, 0.1)
    ev(sfx, scrape(R(), 1.3, 300, 1800), 46.0, -24)
    ev(sfx, G.whoa(R(), 330, 0.6), 46.0, -24, 0.4)
    k = 0
    while 47.8 + 0.4 + k * 1.96 < 52.3:                                      # dawn digging
        t = 47.8 + 0.45 + k * 1.96
        ev(sfx, scrape(R(), 0.45, 700, 2600), t, -27, 0.2)
        ev(sfx, crunch(R(), 0.25), t + 0.42, -28, 0.2)
        k += 1
    for i in range(6):
        ev(sfx, crunch(R()), 52.5 + i * 0.5, -32, -0.3 if i % 2 else 0.3)
    for i in range(5):
        ev(sfx, G.push_thump(R()), 52.5 + i * 0.5, -28)
    ev(sfx, G.whoosh(0.5, R(), 0.45, 400, 3000, 0.8, 0.08, 0.3), 55.3, -24)
    ev(sfx, G.push_thump(R()), 55.8, -22)
    ev(sfx, G.flag_flutter(3.0, R()), 55.85, -30, 0.3)
    for j in range(3):
        ev(sfx, G.hurrah(R(), 280 + 35 * j, 1.0, True), 55.95 + 0.2 * j, -22, -0.5 + 0.5 * j)
    return mus, sfx, -7.5


# ================================================================ mix
def polish(v):
    """voice chain: rumble cut, a little less boxiness, presence and air, then a gentle 2.5:1 compressor
    so whispered or soft words stay clear over the music"""
    v = hp(v, 75, 2)
    v = peq(v, 300, -1.5, 1.0)
    v = peq(v, 3200, 2.0, 0.9)
    v = shelf(v, 9000, 1.5, "high")
    env = np.abs(v)
    a, r = np.exp(-1 / (0.008 * SR)), np.exp(-1 / (0.18 * SR))
    e = signal.lfilter([1 - r], [1, -r], env)                       # smooth level (release)
    e = np.maximum(e, signal.lfilter([1 - a], [1, -a], env))      # fast attack
    lvl = 20 * np.log10(e + 1e-9)
    thr = np.percentile(lvl[lvl > lvl.max() - 40], 70)
    gr = np.where(lvl > thr, (thr - lvl) * (1 - 1 / 2.5), 0.0)
    return v * dbg(gr)


def main():
    mus, sfx, rel = icewater() if FILM == "icewater" else snowfort()
    v, sr = read_wav(VOICE)
    v = v.mean(0) if v.ndim > 1 else v
    if sr != SR:
        v = signal.resample_poly(v, SR, sr)
    voice = np.zeros(N)
    voice[: min(N, len(v))] = v[:N]
    voice = polish(voice)
    voice = st(voice)
    voice = norm_to(voice, -16.0, "integrated")
    # a touch of room on the score
    ir = make_ir(1.6, 7, hf=0.6)
    mus = mus + 0.18 * convolve_st(mus, ir)[:, :N]
    # music level relative to the voice, then ducked under speech
    mus = norm_to(mus, integrated(voice) + rel, "integrated")
    spans = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if spans and s - spans[-1][1] < 0.3:
            spans[-1][1] = max(spans[-1][1], e)
        else:
            spans.append([s, e])
    ctrl = 1000
    va = np.zeros(int(DUR * ctrl) + 2)
    for s, e in spans:
        va[max(0, int((s - 0.08) * ctrl)): int((e + 0.15) * ctrl)] = 1.0
    env, e_ = np.zeros_like(va), 0.0
    ka, kr = 1 - np.exp(-1 / (0.07 * ctrl)), 1 - np.exp(-1 / (0.45 * ctrl))
    for i in range(len(va)):
        e_ += (va[i] - e_) * (ka if va[i] > e_ else kr)
        env[i] = e_
    duck = dbg(np.interp(np.arange(N) / SR, np.arange(len(va)) / ctrl, -4.0 * env))
    mus = mus * duck[None, :]
    mix = voice + mus + sfx
    # master: -14 LUFS, true peak <= -1.2 dBTP
    mix = mix * dbg(-14.0 - integrated(mix))
    for _ in range(3):
        mix, _g = limiter(mix, -1.2)
        mix = mix * dbg(-14.0 - integrated(mix))
    mix, _g = limiter(mix, -1.2)
    fo = ns(0.6)
    mix[:, -fo:] *= ramp(fo)[::-1][None, :]
    write_wav(OUT, mix, 24)
    print(f"{FILM}: {DUR:.2f}s  integrated {integrated(mix):.2f} LUFS  true peak {true_peak(mix):.2f} dBTP  "
          f"voice {integrated(voice):.1f}  music {integrated(mus):.1f}  sfx {integrated(sfx):.1f}")


main()
