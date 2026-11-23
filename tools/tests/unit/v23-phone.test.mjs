// 2.3 phones: one section in memory at a time (a busy one is kept), 16 px inputs, 720p and light engine settings on
// a phone, and the screen kept awake while a video is made.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
export const tests = [
  { name: 'the home page closes idle sections on a phone, never one that is making a video', fn: () => {
    const html = read('index.html');
    assert.match(html, /pointer: coarse\)'\)\.matches && Math\.min\(screen\.width, screen\.height\) < 600/);
    assert.match(html, /busy = !!w\?\.loomyWorking \|\| !!w\?\.loomyBusy\?\.\(\)/);
    assert.match(html, /if \(!busy\) \{ f\.src = 'about:blank'; f\.remove\(\); delete frames\[k\]; \}/);
  } },
  { name: 'every tab marks itself busy (and keeps the screen awake) while it works', fn: () => {
    for (const f of ['cartoon/js/app.js', 'explainer/js/app.js', 'clip/js/app.js', 'editor/js/app.js']) assert.match(read(f), /markBusy\(/, f);
    const busy = read('shared/busy.js');
    assert.match(busy, /wakeLock\?\.request\('screen'\)/); assert.match(busy, /window\.loomyWorking/);
    assert.doesNotMatch(busy, /window\.loomyBusy =/, 'the apps\' own loomyBusy function is left alone');
  } },
  { name: 'phones: 16 px inputs (no zoom on tap), at most 720p, light engine settings', fn: () => {
    assert.match(read('theme.css'), /@media \(pointer: coarse\) \{\n  input, select, textarea \{ font-size: 16px !important; \}/);
    for (const f of ['cartoon/js/pipeline.js', 'explainer/js/pipeline.js']) assert.match(read(f), /isPhone\(\) \? Math\.min\(720, n\) : n/, f);
    assert.match(read('cartoon/js/town.js'), /perf: isPhone\(\) \? \{ msaa: 0, shadow: 1024, cardMax: 720 \}/);
    assert.match(read('explainer/js/drawn.js'), /if \(isPhone\(\)\) perf = \{ msaa: 0, shadowMax: 1024, aoSamples: 6, \.\.\.perf \}/);
  } },
];
