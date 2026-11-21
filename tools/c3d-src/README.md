# Cartoon 3D engine (source)

The engine behind the Cartoons tab's 3D look: 2D bean-head characters in a painted 3D world with ink
lines, lens blur and a colour grade. It is the `templates/bridge/` code of the cartoon-3d-short skill
(claude-animated-shorts, MIT, see LICENSE), unchanged except:

- `src/driver.ts` replaces `Bridge.tsx`: the same post chain (ink, lens blur pre + main, bloom,
  NEUTRAL tone mapping, grade, MSAA 4) without React or Remotion.
- `src/shim/remotion.ts` stands in for Remotion's `staticFile` (world.ts loads optional Kenney models).

Build: `npm install && npm run build` writes `cartoon/js/c3d/cartoon3d.js` (three.js stays external;
the page's import map supplies it). Test: `tools/tests/c3d/` renders any frame of the bridge short.
The skill's reference frames are style study only and are not part of Loomy.
