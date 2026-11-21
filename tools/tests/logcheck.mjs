// Render-log checks per fix: node tools/tests/logcheck.mjs <fix> <file.loomy-manifest.json> [...]
// Fixes: M1, S11, S12, S13, M4, M5. Prints each rule with PASS/FAIL and the measured value.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const r2 = (v) => Math.round(v * 100) / 100;
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

// Merge log entries that are one shot (the same set-up split by a transition frame).
function shotsOf(m) { return (m.shots || []).filter(s => s.end - s.start > 0.05); }

const CHECKS = {
  M1(m) {
    const tab = m.tab, shots = shotsOf(m).filter(s => s.source === 'fallback');
    const lens = shots.map(s => s.end - s.start);
    const med = median(lens);
    const maxMed = tab === 'blocky' ? 1.3 : 1.6;
    const byScene = new Map();
    for (const s of shots) byScene.set(s.scene, [...(byScene.get(s.scene) || []), s]);
    const badScenes = [];
    for (const [sc, list] of byScene) {
      const dur = list[list.length - 1].end - list[0].start;
      const inner = list.slice(0, -1).concat(list.length > 1 ? [] : list); // the last shot of a scene runs into the transition
      if (dur >= 2.0 && list.length < 2) badScenes.push(`scene ${sc}: 1 shot in ${r2(dur)} s`);
      for (const s of list.slice(0, -1)) { const L = s.end - s.start; if (L < 1.0 - 0.05 || L > 1.8 + 0.05) badScenes.push(`scene ${sc}: shot ${r2(L)} s`); }
    }
    const withChar = shots.filter(s => (s.characterIds || []).length).length;
    const medium = shots.filter(s => s.framing === 'medium' && s.characterBox);
    const medH = medium.map(s => (s.characterBox[3] - s.characterBox[1]) * 100);
    const outside = shots.filter(s => s.framing !== 'close' && s.characterBox && (s.characterBox[0] < 0.08 || s.characterBox[2] > 0.92 || s.characterBox[1] < 0.08 || s.characterBox[3] > 0.92));
    const closeFaceOut = shots.filter(s => s.framing === 'close' && (!s.faceBox || s.faceBox[0] < 0 || s.faceBox[2] > 1 || s.faceBox[1] < 0 || s.faceBox[3] > 1));
    const framings = new Set(shots.map(s => s.framing));
    const worlds = [...new Set(shots.map(s => `${s.scene}:${s.world}`))];
    const looks = new Set((m.shots || []).filter(s => s.source === 'fallback').map(s => (s.characterIds || []).join(',')));
    return [
      [`fallback shots`, shots.length > 0, `${shots.length}`],
      [`median shot <= ${maxMed} s`, med <= maxMed, `${r2(med)} s`],
      [`every scene of 2 s or more has >= 2 shots of 1.0-1.8 s`, badScenes.length === 0, badScenes.slice(0, 6).join('; ') || 'all scenes'],
      [`character in >= 80% of shots`, withChar / Math.max(1, shots.length) >= 0.8, `${pct(withChar, shots.length)}%`],
      [`the same character all video`, looks.size === 1, [...looks].join(' | ')],
      [`medium shots: character 25-60% of frame height`, medH.length > 0 && medH.every(h => h >= 25 && h <= 60), medH.length ? `${r2(Math.min(...medH))}-${r2(Math.max(...medH))}%` : 'no medium shots'],
      [`wide and medium: whole body inside the 8% margin`, outside.length === 0, outside.length ? outside.slice(0, 3).map(s => `${s.start}s ${s.framing} [${s.characterBox}]`).join('; ') : 'all inside'],
      [`close-ups: face inside the frame`, closeFaceOut.length === 0, closeFaceOut.length ? `${closeFaceOut.length} out` : 'all inside'],
      [`framings cycle wide, medium, close`, ['wide', 'medium', 'close'].every(f => framings.has(f)), [...framings].join(', ')],
      [`world recorded for every shot`, shots.every(s => s.world), worlds.join(' ')],
    ];
  },
  M2(m) {
    const ai = shotsOf(m).filter(s => s.source === 'ai');
    const look = String(m.script?.characters?.[0]?.description || '').replace(/\s+/g, ' ').trim().replace(/[.;]+$/, '');
    const canon = look.split(' ').slice(0, 40).join(' ');
    const seeds = new Set(ai.map(s => s.seed));
    const rows = [[`AI shots`, ai.length > 0, `${ai.length}`], [`one seed for the whole video`, seeds.size === 1, [...seeds].join(', ')]];
    if (m.tab === 'blocky') {
      const withHero = ai.filter(s => (s.characterIds || []).length && s.characterBox).length;
      rows.push([`Blocky: the code-drawn hero is composited in every AI shot`, withHero === ai.length, `${withHero}/${ai.length}`]);
      rows.push([`Blocky: prompts ask for an empty place (no people)`, ai.every(s => /no people/.test(s.picturePrompt)), `${ai.filter(s => /no people/.test(s.picturePrompt)).length}/${ai.length}`]);
    } else {
      const ok = ai.filter(s => canon && s.picturePrompt.startsWith(canon)).length;
      rows.push([`the hero's description (${canon.split(' ').length} words) starts every prompt, word for word`, canon && ok === ai.length, `${ok}/${ai.length}`]);
      rows.push([`every prompt has the same-person list`, ai.every(s => /not a different person/.test(s.picturePrompt)), `${ai.filter(s => /not a different person/.test(s.picturePrompt)).length}/${ai.length}`]);
    }
    return rows;
  },
  S11(m) {
    const caps = m.captions || [];
    const blocky = m.tab === 'blocky';
    const [cy, lh, w0, w1, n0, n1] = blocky ? [23, 5.1, 500, 600, 3, 4] : [78, 4.2, 600, 700, 2, 3];
    const offY = caps.filter(c => Math.abs(c.yCenterPct - cy) > 1);
    const offH = caps.filter(c => Math.abs(c.lineHeightPct - lh) > 0.4);
    const offW = caps.filter(c => c.fontWeight < w0 || c.fontWeight > w1);
    const offN = caps.filter(c => c.words < n0 || c.words > n1);
    const rows = [
      [`captions logged`, caps.length > 0, `${caps.length}`],
      [`centre at ${cy}% ±1`, offY.length === 0, offY.length ? `${offY.length} off, e.g. ${offY[0].yCenterPct}%` : `all at ${caps[0]?.yCenterPct}%`],
      [`line height ${lh}% ±0.4`, offH.length === 0, offH.length ? `${offH.length} off, e.g. ${offH[0].lineHeightPct}%` : `all ${r2(median(caps.map(c => c.lineHeightPct)))}%`],
      [`weight ${w0}-${w1}`, offW.length === 0, offW.length ? `${offW.length} off, e.g. ${offW[0].fontWeight}` : `${caps[0]?.fontWeight}`],
      [`${n0} or ${n1} words on every caption`, offN.length === 0, offN.length ? `${offN.length} of ${caps.length} off: ${offN.slice(0, 4).map(c => `"${c.text}"`).join(', ')}` : `all ${caps.length}`],
    ];
    if (blocky) rows.push([`one key word IN CAPS on >= 90% of captions`, caps.filter(c => c.upperWords >= 1).length / Math.max(1, caps.length) >= 0.9, `${pct(caps.filter(c => c.upperWords >= 1).length, caps.length)}%`]);
    return rows;
  },
  S12(m) {
    const caps = m.captions || [];
    const offY = caps.filter(c => Math.abs(c.yCenterPct - 71) > 1), offH = caps.filter(c => Math.abs(c.lineHeightPct - 4.0) > 0.4);
    const lower = caps.filter(c => /^[a-z]/.test(c.text) && /\b[A-Z]/.test((m.script?.lines || []).join(' ')));
    return [
      [`centre at 71% ±1`, offY.length === 0, offY.length ? `${offY.length} off, e.g. ${offY[0].yCenterPct}%` : 'all'],
      [`line height 4.0% ±0.4`, offH.length === 0, offH.length ? `${offH.length} off, e.g. ${offH[0].lineHeightPct}%` : 'all'],
      [`1 or 2 words`, caps.every(c => c.words <= 2), `${caps.filter(c => c.words > 2).length} longer`],
      [`keeps capitals (names) and end punctuation`, caps.some(c => /[.?!,]$/.test(c.text)) && caps.some(c => /\b[A-Z]/.test(c.text)), caps.slice(0, 6).map(c => c.text).join(' | ')],
    ];
  },
  S13(m) {
    const out = shotsOf(m).filter(s => s.framing !== 'close' && s.characterBox && (s.characterBox[0] < 0.08 || s.characterBox[2] > 0.92 || s.characterBox[1] < 0.08 || s.characterBox[3] > 0.92));
    return [[`no character box outside the 8% margin (except close-ups)`, out.length === 0, out.length ? out.slice(0, 4).map(s => `${s.start}s [${s.characterBox}]`).join('; ') : 'all inside']];
  },
  M4(m) {
    const c = m.clip;
    if (!c) return [[`clip section in the log`, false, 'missing']];
    const d = c.sourceEnd - c.payoffEnd;
    return [[`ends 0-1.5 s after the payoff`, c.payoffEnd != null && d >= 0 && d <= 1.5, c.payoffEnd == null ? 'no payoffEnd' : `${r2(d)} s (end ${r2(c.sourceEnd)}, payoff ${r2(c.payoffEnd)})`]];
  },
  M5(m) {
    const shots = shotsOf(m);
    const lens = shots.map(s => s.end - s.start);
    const chars = new Set(shots.flatMap(s => s.characterIds || []));
    const props = shots.flatMap(s => s.props || []);
    const withProp = shots.filter(s => (s.props || []).length).length;
    return [
      [`median shot (render log) 0.8-1.6 s`, median(lens) >= 0.8 && median(lens) <= 1.6, `${r2(median(lens))} s over ${shots.length} shots`],
      [`>= 3 characters`, chars.size >= 3, [...chars].join(', ')],
      [`props tied to trigger words`, props.every(p => p.triggerWord), `${props.filter(p => p.triggerWord).length}/${props.length}`],
      [`story prop in >= 30% of shots`, withProp / Math.max(1, shots.length) >= 0.3, `${pct(withProp, shots.length)}%`],
      [`>= 4 emotions on faces`, new Set(shots.flatMap(s => s.feels || [])).size >= 4, [...new Set(shots.flatMap(s => s.feels || []))].join(', ')],
      [`>= 3 different camera set-ups besides the first`, new Set(shots.map(s => s.cut).filter(c => c && c !== 'first')).size >= 3, [...new Set(shots.map(s => s.cut))].join(', ')],
    ];
  },
};

const [fix, ...files] = process.argv.slice(2);
let bad = 0;
for (const f of files) {
  const m = JSON.parse(readFileSync(f, 'utf8'));
  console.log(`${basename(f)} (${m.tab}, ${m.duration} s) ${fix}:`);
  for (const [name, ok, val] of CHECKS[fix](m)) { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}: ${val}`); if (!ok) bad++; }
}
process.exit(bad ? 1 : 0);
