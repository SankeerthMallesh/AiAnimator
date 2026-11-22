// E2-E4: text boxes, captions that follow the video through edits, the music track and its
// settings, speed, zoom and transitions in the editor's project model.
import assert from 'node:assert/strict';
import { newProject, addSource, addSegment, split, move, remove, update, duration, addText, textsAt, setCaptions, captionAt, setMusic, setAudio, setSpeed, setZoom, setTransition, transitionK, timeline, History } from '../../../editor/js/model.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);
function twoVideos() {
  let p = newProject();
  p = addSource(p, 'A', { name: 'a.mp4', duration: 10 });
  p = addSource(p, 'B', { name: 'b.mp4', duration: 6 });
  p = addSegment(p, 'A').project;
  return addSegment(p, 'B').project;
}
const words = [{ text: 'Bees', start: 1, end: 1.3 }, { text: 'make', start: 1.35, end: 1.6 }, { text: 'honey.', start: 1.65, end: 2 }, { text: 'Lots', start: 5, end: 5.3 }, { text: 'of', start: 5.35, end: 5.45 }, { text: 'it', start: 5.5, end: 5.7 }];

export const tests = [
  { name: 'a text box sits where it was put, shows only in its time, and undo takes it away', fn: () => {
    const p = twoVideos(), h = new History(p);
    const { project: q, id } = addText(p, { text: 'Hello', start: 2 });
    h.push(q);
    assert.equal(q.texts.length, 1); near(q.texts[0].start, 2, 'start'); near(q.texts[0].end, 5, 'end (3 s long)');
    assert.equal(textsAt(q, 3)[0].id, id); assert.equal(textsAt(q, 6).length, 0);
    assert.equal(h.undo().texts.length, 0);
  } },
  { name: 'a text box stays put on the output timeline when the video is cut', fn: () => {
    const { project: q } = addText(twoVideos(), { text: 'Hi', start: 12 });
    const r = split(q, 4).project;
    near(r.texts[0].start, 12, 'unchanged');
  } },
  { name: 'deleting a text removes only it', fn: () => {
    const { project: q, id } = addText(twoVideos(), { text: 'Hi', start: 1 });
    const r = remove(q, id);
    assert.equal(r.texts.length, 0); assert.equal(r.segments.length, 2);
  } },
  { name: 'captions are grouped 1-3 words and split at punctuation and pauses', fn: () => {
    const q = setCaptions(twoVideos(), 'A', words);
    assert.deepEqual(q.captions.map(c => c.text), ['Bees make honey.', 'Lots of it'].map(t => t.replace(/\.$/, '')));
  } },
  { name: 'captions follow their video through a reorder', fn: () => {
    const q = setCaptions(twoVideos(), 'A', words);
    near(timeline(q)[0].start, 0, 'A first');
    assert.equal(captionAt(q, 1.5)?.text, 'Bees make honey');
    const r = move(q, q.segments[0].id, 1); // A now plays after B (6 s)
    assert.equal(captionAt(r, 1.5), null);
    assert.equal(captionAt(r, 6 + 1.5)?.text, 'Bees make honey');
  } },
  { name: 'captions follow a trim: a cut-away caption never shows', fn: () => {
    let q = setCaptions(twoVideos(), 'A', words);
    q = update(q, q.segments[0].id, { in: 3 });
    assert.equal(captionAt(q, 2.2)?.text, 'Lots of it'); // source 5.2 s
    assert.ok(!timeline(q).some(() => captionAt(q, 0.1)?.text === 'Bees make honey'));
  } },
  { name: 'captions off hides them', fn: () => {
    const q = setCaptions(twoVideos(), 'A', words); q.captionStyle.look = 'off';
    assert.equal(captionAt(q, 1.5), null);
  } },
  { name: 'music is set and removed; its settings are clamped', fn: () => {
    let q = setMusic(twoVideos(), 'M', { name: 'beat.mp3', duration: 30 });
    assert.equal(q.music.name, 'beat.mp3');
    q = setAudio(q, { musicVol: 3, fadeIn: -1, fadeOut: 9, duck: false });
    assert.deepEqual([q.audio.musicVol, q.audio.fadeIn, q.audio.fadeOut, q.audio.duck], [1, 0, 5, false]);
    assert.equal(setMusic(q, null).music, null);
  } },
  { name: 'speed changes a part\'s length (2x halves it) and is clamped to 0.25-4x', fn: () => {
    const p = twoVideos(), id = p.segments[0].id;
    near(duration(setSpeed(p, id, 2)), 5 + 6, 'A at 2x');
    assert.equal(setSpeed(p, id, 10).segments[0].speed, 4);
    assert.equal(setSpeed(p, id, 0.01).segments[0].speed, 0.25);
  } },
  { name: 'zoom presets and transitions are stored; unknown ones fall back', fn: () => {
    const p = twoVideos(), id = p.segments[1].id;
    assert.deepEqual(setZoom(p, id, 'push-in').segments[1].zoom, { from: 1, to: 1.18, x: 0.5, y: 0.5, kind: 'push-in' });
    assert.equal(setZoom(p, id, 'spin').segments[1].zoom.kind, 'none');
    assert.equal(setTransition(p, id, 'fade').segments[1].transition.kind, 'fade');
    assert.equal(setTransition(p, id, 'star-wipe').segments[1].transition.kind, 'cut');
  } },
  { name: 'a transition runs over its length into a part, never into the first part', fn: () => {
    const base = twoVideos();
    const p = setTransition(base, base.segments[0].id, 'fade');
    const q = setTransition(base, base.segments[1].id, 'fade', 0.5);
    const tl = timeline(q);
    near(transitionK(tl[1], 0.25), 0.5, 'half way'); near(transitionK(tl[1], 1), 1, 'done');
    near(transitionK(timeline(p)[0], 0), 1, 'first part');
  } },
];
