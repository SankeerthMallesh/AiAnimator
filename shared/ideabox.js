// The ideas panel under each composer: search, pick a category, shuffle, and click an idea to use it.
import { IDEAS, IDEA_COUNT, findIdeas, shuffled } from './ideas.js';

export function attachIdeas(mount, onPick, { show = 8 } = {}) {
  if (!mount) return null;
  const st = { cat: 'All', q: '', seed: (Date.now() % 997) + 1, shown: show };
  mount.classList.remove('ideas'); // the old example list's card styles do not apply here
  mount.classList.add('ideabox');
  mount.innerHTML = `
    <div class="ib-head">
      <span class="ib-title">💡 ${IDEA_COUNT} video ideas</span>
      <input class="ib-search" type="search" placeholder="Search ideas" aria-label="Search video ideas">
      <button type="button" class="ib-btn" data-k="shuffle" title="Show different ideas">🔀 Shuffle</button>
    </div>
    <div class="ib-cats" role="tablist" aria-label="Idea categories"></div>
    <div class="ib-list"></div>
    <button type="button" class="ib-more" data-k="more">More ideas</button>`;
  const $ = (s) => mount.querySelector(s);
  const cats = ['All', ...Object.keys(IDEAS)];
  $('.ib-cats').replaceChildren(...cats.map(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ib-cat'; b.textContent = c; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { st.cat = c; st.shown = show; render(); });
    return b;
  }));
  function render() {
    mount.querySelectorAll('.ib-cat').forEach(b => { const on = b.textContent === st.cat; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    const all = shuffled(findIdeas(st.cat, st.q), st.seed);
    $('.ib-list').replaceChildren(...all.slice(0, st.shown).map(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ib-idea'; b.textContent = t;
      b.addEventListener('click', () => onPick(t));
      return b;
    }));
    if (!all.length) { const p = document.createElement('p'); p.className = 'ib-none'; p.textContent = 'No ideas match. Try another word.'; $('.ib-list').append(p); }
    $('.ib-more').classList.toggle('hidden', all.length <= st.shown);
  }
  $('.ib-search').addEventListener('input', (e) => { st.q = e.target.value; st.shown = show; render(); });
  $('[data-k="shuffle"]').addEventListener('click', () => { st.seed += 7; render(); });
  $('[data-k="more"]').addEventListener('click', () => { st.shown += show; render(); });
  render();
  return { render, state: st };
}
