// The timeline under the preview: a ruler, the video track (parts with thumbnails, trim handles at
// both ends, drag to reorder) and a playhead. Pointer events, so it works with a mouse, a pen or a
// finger. Edits are reported to the app, which owns the project and the undo history.

import { timeline, duration, segLen, fmtTime } from './model.js';

const HANDLE = 14;

export class Timeline {
  constructor(root, opts) {
    this.root = root; this.o = opts; this.pps = 48; this.t = 0;
    root.innerHTML = `
      <div class="tl-bar">
        <div class="tl-time" aria-live="off"><b data-now>0:00.0</b> / <span data-total>0:00.0</span></div>
        <div class="tl-zoom"><button class="icon-btn" data-zoom="-1" type="button" aria-label="Zoom the timeline out">−</button><button class="icon-btn" data-zoom="1" type="button" aria-label="Zoom the timeline in">+</button></div>
      </div>
      <div class="tl-scroll" data-scroll>
        <div class="tl-inner" data-inner>
          <div class="tl-ruler" data-ruler></div>
          <div class="tl-track tl-video" data-track="video" aria-label="Video track"></div>
          <div class="tl-lane tl-text" data-track="text" aria-label="Text track"></div>
          <div class="tl-lane tl-music" data-track="music" aria-label="Music track"></div>
          <div class="tl-head" data-head><span></span></div>
        </div>
      </div>`;
    this.$ = (s) => root.querySelector(s);
    this.scroll = this.$('[data-scroll]'); this.inner = this.$('[data-inner]'); this.ruler = this.$('[data-ruler]');
    this.track = this.$('[data-track="video"]'); this.head = this.$('[data-head]');
    this.textLane = this.$('[data-track="text"]'); this.musicLane = this.$('[data-track="music"]');
    root.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => this.zoom(Number(b.dataset.zoom))));
    // Click or drag on the ruler or an empty part of a track: move the playhead.
    const scrub = (e) => {
      if (e.target.closest('.seg')) return;
      const go = (ev) => this.o.onSeek(this.timeAt(ev.clientX));
      go(e);
      const mv = (ev) => go(ev), up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
    this.ruler.addEventListener('pointerdown', scrub);
    this.track.addEventListener('pointerdown', scrub);
    this.head.addEventListener('pointerdown', scrub);
  }

  timeAt(clientX) {
    const r = this.inner.getBoundingClientRect();
    return Math.max(0, Math.min(duration(this.o.get()), (clientX - r.left - 12) / this.pps));
  }

  zoom(dir) {
    this.pps = Math.max(8, Math.min(240, this.pps * (dir > 0 ? 1.5 : 1 / 1.5)));
    this.render();
  }

  // Fits the whole video into the visible width (used after the first video is added).
  fit() {
    const total = duration(this.o.get());
    if (total > 0) this.pps = Math.max(8, Math.min(240, (this.scroll.clientWidth - 48) / total));
    this.render();
  }

  render() {
    const p = this.o.get(), total = duration(p), pps = this.pps;
    this.inner.style.width = `${Math.max(this.scroll.clientWidth, total * pps + 120)}px`;
    this.$('[data-total]').textContent = fmtTime(total);
    // Ruler: a tick every second (or every 5 / 10 s when zoomed out), labelled every few.
    const every = pps >= 40 ? 1 : pps >= 12 ? 5 : 10, label = pps >= 40 ? 2 : pps >= 12 ? 5 : 10;
    let ticks = '';
    for (let s = 0; s <= total + 0.001; s += every) {
      const big = s % label === 0, x = 12 + s * pps;
      ticks += `<i style="left:${x}px"${big ? ' class="big"' : ''}></i>${big ? `<em style="left:${x + 3}px">${fmtTime(s).replace(/\.0$/, '')}</em>` : ''}`;
    }
    this.ruler.innerHTML = ticks;
    // Video track.
    this.track.replaceChildren(...timeline(p).map(e => this.block(e)));
    if (!p.segments.length) this.track.innerHTML = '<p class="tl-empty">Add a video to start. Drop files anywhere on this page.</p>';
    // E2: text boxes on their own lane (tap to select, drag to move in time); E3: the music.
    this.textLane.replaceChildren(...p.texts.map(x => this.textBlock(x)));
    this.textLane.hidden = !p.texts.length;
    this.musicLane.innerHTML = p.music ? `<div class="lane-block music" style="left:12px;width:${Math.max(6, total * pps)}px"><span>♪ ${escapeHtml(p.music.name)}</span></div>` : '';
    this.musicLane.hidden = !p.music;
    this.setTime(this.t);
  }

  textBlock(x) {
    const el = document.createElement('div');
    el.className = 'lane-block text' + (this.o.selected() === x.id ? ' on' : '');
    el.dataset.id = x.id; el.tabIndex = 0; el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Text: ${x.text}`);
    el.style.left = `${12 + x.start * this.pps}px`;
    el.style.width = `${Math.max(6, (x.end - x.start) * this.pps)}px`;
    el.innerHTML = `<span>T ${escapeHtml(x.text)}</span>`;
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.o.onSelect(x.id); } });
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const x0 = ev.clientX; let moved = false;
      const mv = (m) => { const dx = m.clientX - x0; if (!moved && Math.abs(dx) < 6) return; moved = true; el.style.transform = `translateX(${dx}px)`; };
      const up = (m) => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        if (!moved) { this.o.onSelect(x.id); return; }
        this.o.onMoveText?.(x.id, (m.clientX - x0) / this.pps);
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    return el;
  }

  block(e) {
    const { seg } = e, p = this.o.get(), media = this.o.media.get(seg.src);
    const el = document.createElement('div');
    el.className = 'seg' + (this.o.selected() === seg.id ? ' on' : '');
    el.dataset.id = seg.id;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${p.sources[seg.src]?.name || 'Video'}, ${fmtTime(segLen(seg))}`);
    el.style.left = `${12 + e.start * this.pps}px`;
    el.style.width = `${Math.max(6, (e.end - e.start) * this.pps)}px`;
    const thumbs = (media?.thumbs || []).filter(x => x.t >= seg.in - 0.5 && x.t <= seg.out + 0.5);
    const shown = thumbs.length ? thumbs : (media?.thumbs || []).slice(0, 1);
    el.innerHTML = `<div class="seg-thumbs">${shown.map(x => `<img src="${x.url}" alt="" draggable="false">`).join('')}</div>
      <span class="seg-label">${escapeHtml(p.sources[seg.src]?.name || 'Video')}${seg.speed !== 1 ? ` · ${seg.speed}×` : ''}</span>
      <span class="seg-len">${fmtTime(segLen(seg))}</span>
      <b class="grip in" aria-hidden="true"></b><b class="grip out" aria-hidden="true"></b>`;
    el.addEventListener('pointerdown', (ev) => this.press(ev, e, el));
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.o.onSelect(seg.id); } });
    return el;
  }

  // Press on a part: drag an end to trim, drag the middle to reorder, or tap to select.
  press(ev, e, el) {
    ev.preventDefault();
    const { seg } = e;
    const r = el.getBoundingClientRect();
    const edge = ev.clientX - r.left < HANDLE ? 'in' : r.right - ev.clientX < HANDLE ? 'out' : null;
    const x0 = ev.clientX;
    let moved = false;
    if (edge) {
      const start = seg[edge];
      el.classList.add('trimming');
      // The window listens (not the block): the timeline redraws while trimming, replacing the block.
      const mv = (m) => { moved = true; this.o.onTrim(seg.id, edge, start + (m.clientX - x0) / this.pps * seg.speed, false); };
      const up = (m) => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        if (moved) this.o.onTrim(seg.id, edge, start + (m.clientX - x0) / this.pps * seg.speed, true); else this.o.onSelect(seg.id); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
      return;
    }
    const blocks = [...this.track.querySelectorAll('.seg')];
    const mv = (m) => {
      const dx = m.clientX - x0;
      if (!moved && Math.abs(dx) < 6) return;
      moved = true;
      el.classList.add('dragging');
      el.style.transform = `translateX(${dx}px)`;
      const at = this.dropIndex(blocks, el, m.clientX);
      blocks.forEach((b, i) => b.classList.toggle('drop-before', i === at && b !== el));
      this.track.classList.toggle('drop-end', at === blocks.length);
    };
    const up = (m) => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      this.track.classList.remove('drop-end');
      blocks.forEach(b => b.classList.remove('drop-before'));
      if (!moved) { this.o.onSelect(seg.id, this.timeAt(m.clientX)); return; }
      let to = this.dropIndex(blocks, el, m.clientX);
      const from = blocks.indexOf(el);
      if (to > from) to -= 1;
      if (to !== from) this.o.onMove(seg.id, to); else this.render();
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  // Index of the part the dragged one would go before (blocks.length = the end).
  dropIndex(blocks, dragged, x) {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] === dragged) continue;
      const r = blocks[i].getBoundingClientRect();
      if (x < r.left + r.width / 2) return i;
    }
    return blocks.length;
  }

  setTime(t, follow = false) {
    this.t = t;
    const x = 12 + t * this.pps;
    this.head.style.transform = `translateX(${x}px)`;
    this.$('[data-now]').textContent = fmtTime(t);
    if (follow) {
      const s = this.scroll, pad = 60;
      if (x < s.scrollLeft + pad || x > s.scrollLeft + s.clientWidth - pad) s.scrollLeft = Math.max(0, x - s.clientWidth / 3);
    }
  }

  select(id) {
    this.track.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    this.textLane.querySelectorAll('.lane-block').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
