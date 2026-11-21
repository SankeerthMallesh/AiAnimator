// E1: the editor's project model (add, split, trim, reorder, delete, undo, time mapping).
import assert from 'node:assert/strict';
import { newProject, addSource, addSegment, split, trim, move, remove, update, setFormat, History, timeline, duration, at, segLen } from '../../../editor/js/model.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);
function twoVideos() {
  let p = newProject();
  p = addSource(p, 'A', { name: 'a.mp4', duration: 10, width: 1280, height: 720 });
  p = addSource(p, 'B', { name: 'b.mp4', duration: 6, width: 1080, height: 1920 });
  p = addSegment(p, 'A').project;
  p = addSegment(p, 'B').project;
  return p;
}

export const tests = [
  { name: 'two videos make two parts in order; the length is their sum', fn: () => {
    const p = twoVideos();
    assert.deepEqual(p.segments.map(s => s.src), ['A', 'B']);
    near(duration(p), 16, 'duration');
    const tl = timeline(p);
    near(tl[1].start, 10, 'second part starts');
  } },
  { name: 'split at 4 s gives 0-4 and 4-10 of video A, same total; the old project is untouched', fn: () => {
    const p = twoVideos();
    const { project: q, id } = split(p, 4);
    assert.ok(id);
    assert.equal(q.segments.length, 3); assert.equal(p.segments.length, 2);
    near(q.segments[0].out, 4, 'first half ends'); near(q.segments[1].in, 4, 'second half starts');
    near(duration(q), 16, 'duration');
  } },
  { name: 'split right at an edge (under 0.1 s from it) does nothing', fn: () => {
    const p = twoVideos();
    assert.equal(split(p, 0.05).id, null);
    assert.equal(split(p, 9.97).id, null);
  } },
  { name: 'trim clamps to the source and keeps at least 0.1 s', fn: () => {
    let p = twoVideos(); const id = p.segments[0].id;
    p = trim(p, id, 'in', 2.5); near(p.segments[0].in, 2.5, 'in');
    p = trim(p, id, 'out', 99); near(p.segments[0].out, 10, 'out clamped to the source');
    p = trim(p, id, 'in', 50); near(p.segments[0].in, 9.9, 'in stops 0.1 s before out');
    p = trim(p, id, 'in', -3); near(p.segments[0].in, 0, 'in never below 0');
    near(duration(p), 16, 'duration');
  } },
  { name: 'reorder moves a part; at() finds the right source time', fn: () => {
    let p = twoVideos();
    p = move(p, p.segments[1].id, 0);
    assert.deepEqual(p.segments.map(s => s.src), ['B', 'A']);
    const h = at(p, 7.5);
    assert.equal(h.seg.src, 'A'); near(h.srcT, 1.5, 'source time');
  } },
  { name: 'speed 2 halves a part; source time runs twice as fast', fn: () => {
    let p = twoVideos();
    p = update(p, p.segments[0].id, { speed: 2 });
    near(segLen(p.segments[0]), 5, 'length'); near(duration(p), 11, 'duration');
    near(at(p, 2).srcT, 4, 'source time at 2 s');
  } },
  { name: 'delete removes the part and a source nothing uses any more', fn: () => {
    let p = twoVideos();
    p = remove(p, p.segments[1].id);
    assert.equal(p.segments.length, 1); assert.ok(!p.sources.B); assert.ok(p.sources.A);
  } },
  { name: 'undo and redo walk back and forward through edits', fn: () => {
    const h = new History(twoVideos());
    const a = h.now;
    h.push(split(a, 3).project); h.push(setFormat(h.now, '16:9'));
    assert.equal(h.now.format, '16:9'); assert.equal(h.now.segments.length, 3);
    h.undo(); assert.equal(h.now.format, '9:16');
    h.undo(); assert.equal(h.now, a);
    h.redo(); assert.equal(h.now.segments.length, 3);
    h.push(setFormat(h.now, '1:1')); assert.equal(h.future.length, 0, 'a new edit clears redo');
  } },
];
