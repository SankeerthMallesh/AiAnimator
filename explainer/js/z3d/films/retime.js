// Re-times a film to a new voice take: KNOTS map old video times to new ones (line starts and ends),
// shots stretch with them and their animation runs at the matching rate, so the picture stays on its words.
export function warp(knots) {
  return (t) => {
    if (t <= knots[0][0]) return t - knots[0][0] + knots[0][1];
    for (let i = 1; i < knots.length; i++) {
      const [a0, b0] = knots[i - 1], [a1, b1] = knots[i];
      if (t <= a1) return b0 + (t - a0) * (b1 - b0) / (a1 - a0 || 1);
    }
    const [a, b] = knots[knots.length - 1]; return t - a + b;
  };
}
export function retime(shots, fades, knots) {
  const W = warp(knots);
  const SHOTS = shots.map((s) => {
    const start = W(s.start), end = W(s.end), k = (s.end - s.start) / (end - start);
    return { start, end, build: (ctx) => { const sh = s.build(ctx), u = sh.update; return { ...sh, update: (t, T) => u(t * k, s.start + t * k) }; } };
  });
  return { SHOTS, FADES: fades.map((f) => f.map(W)), W };
}
