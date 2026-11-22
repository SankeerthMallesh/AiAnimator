// The Feedback card in each video tab's inspector: an overall letter grade, one row per section with
// its grade, a bar and the most useful tip, and "Fix it for me" when the video could do better.
export function attachFeedback({ before, onFix }) {
  const el = document.createElement('section');
  el.className = 'feedback hidden';
  el.setAttribute('aria-label', 'Feedback');
  el.innerHTML = `
    <div class="fb-head">
      <div><p class="sect-title">Feedback</p><p class="fb-sub fine">How good this video will be</p></div>
      <div class="fb-grade" data-k="grade" aria-live="polite">–</div>
    </div>
    <ol class="fb-rows" data-k="rows"></ol>
    <button type="button" class="btn small primary fb-fix hidden" data-k="fix">✨ Fix it for me</button>
    <p class="fine fb-note" data-k="note"></p>`;
  before?.parentElement?.insertBefore(el, before);
  const $ = (k) => el.querySelector(`[data-k="${k}"]`);
  const tone = (g) => (g.startsWith('A') ? 'a' : g.startsWith('B') ? 'b' : g.startsWith('C') ? 'c' : 'd');
  let last = null;
  $('fix').addEventListener('click', () => { if (last) onFix?.(last); });
  return {
    update(report, { stage = 'script' } = {}) {
      last = report;
      el.classList.remove('hidden');
      const g = report.overall.grade;
      $('grade').textContent = g; $('grade').className = `fb-grade g-${tone(g)}`;
      $('grade').title = `${report.overall.score} / 100`;
      $('rows').replaceChildren(...report.sections.map(s => {
        const li = document.createElement('li');
        li.className = 'fb-row';
        li.innerHTML = `<span class="fb-name"></span><span class="fb-pill g-${tone(s.grade)}"></span><span class="fb-bar"><i style="width:${s.score}%"></i></span><span class="fb-tip fine"></span>`;
        li.querySelector('.fb-name').textContent = s.name;
        li.querySelector('.fb-pill').textContent = s.grade;
        li.querySelector('.fb-tip').textContent = s.tips[0] || 'Looks good.';
        return li;
      }));
      const weak = report.overall.score < 85;
      $('fix').classList.toggle('hidden', !weak);
      $('note').textContent = stage === 'script'
        ? 'Checked from the script. It updates when the video is made.'
        : weak ? 'Press "Fix it for me" and the AI rewrites the weak parts, then makes the video again.' : 'Ready to post.';
    },
    busy(on) { const b = $('fix'); b.disabled = on; b.textContent = on ? 'Fixing…' : '✨ Fix it for me'; },
    hide() { el.classList.add('hidden'); },
    el,
  };
}
