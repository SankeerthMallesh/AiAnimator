const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://127.0.0.1:8773/cartoon/');
  const r = await p.evaluate(async () => {
    const { Script } = await import('./js/script.js');
    const cases = [
      ['The sky turns orange at sunset.', '🍊', 'Why is the sky blue but sunsets are orange'],
      ['Sunlight travels farther, so we see orange and red.', '🍊', 'Why is the sky blue but sunsets are orange'],
      ['An orange has more vitamin C than you think.', '🍊', 'Are oranges healthy'],
      ['Florida grows millions of oranges every year.', '', 'Where oranges come from'],
      ['Click the mouse to open the file.', '🐭', 'How computers work'],
      ['A mouse can squeeze through a tiny hole.', '', 'Amazing mice'],
      ['Light travels as a wave.', '🌊', 'What is light'],
      ['Surfers ride a giant wave.', '', 'Big wave surfing'],
      ['The power plant makes electricity.', '🌱', 'Energy'],
      ['Steve Jobs started Apple in a garage.', '🍎', 'The story of Apple'],
      ['Cats twist in midair.', '❓', 'Why do cats always land on their feet'],
      ['So every four years we add one extra day.', '☕', 'Why do we have leap years'],
      ['Without it, the seasons would slowly drift.', '🌾', 'Why do we have leap years'],
      ['Farmers needed the calendar to plant crops on time.', '🌾', 'Why do we have leap years'],
      ['Earth takes 365 and a quarter days to orbit the Sun.', '🌍', 'Why do we have leap years'],
      ['February 29 only shows up once every four years.', '', 'Why do we have leap years'],
      ['Every year, bees make tons of honey.', '', 'How bees make honey'],
      ['A barista pulls a perfect espresso shot.', '☕', 'How coffee is made'],
      ['That is why we pause for a moment.', '🧩', 'Why do we have leap years'],
    ];
    return cases.map(([line, icon, topic]) => {
      const s = Script.normalize({ cast: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], scenes: [{ line, icon, set: 'field' }, { line: 'Two.' }, { line: 'Three.' }] }, { topic });
      const st = s.scenes[0].props.find(x => x.kind === 'icon');
      return `${line}  [writer: ${icon || 'none'}] -> ${st?.emoji || '(no sticker)'}`;
    });
  });
  console.log(r.join('\n')); await b.close();
})();
