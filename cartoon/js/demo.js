// A baked 20-second railroad reel. No model, no images, no voice — the animation has to carry it.

export class Demo {
  static topic() { return 'Why jointed railroad tracks leave a gap'; }
  static options() {
    return {
      mode: 'demo', format: '9:16', duration: 20, pace: 'fast', mood: 'curious',
      quality: '720', fps: 24, style: 'cartoon',
    };
  }
  static raw() {
    return {
      title: 'Why Rails Have Gaps',
      youtubeTitle: 'Why jointed railroad tracks leave a gap',
      description: 'Jointed track leaves a small gap so steel can expand in the heat. Welded track is different: it is held so tightly that a hot rail can buckle instead.',
      hashtags: ['#shorts', '#trains', '#engineering'],
      cast: [
        { id: 'a', name: 'June', color: '#2A9D8F', hat: 'cap', hair: 'brown', costume: 'vest' },
        { id: 'b', name: 'Bo', color: '#E8B931', hat: 'hardhat', hair: 'black', costume: 'vest' },
      ],
      scenes: [
        {
          id: 'd1', hold: 3.1, cam: 'push', cut: 'cut', set: 'rails', say: 'a',
          line: 'A perfect railroad can still buckle.',
          bg: 'sunny railroad tracks under an orange sky',
          who: [
            { id: 'a', x: 0.18, pose: 'walk', feel: 'neutral', face: 1 },
            { id: 'b', x: 0.74, pose: 'idle', feel: 'skeptical', face: -1 },
          ],
          props: [{ id: 'tr', kind: 'train', x: 0.95 }],
          acts: [
            { t: 0.15, id: 'a', do: 'walk', x: 0.32 },
            { t: 0.2, id: 'tr', do: 'drive', x: 0.55, dur: 2.2 },
          ],
        },
        {
          id: 'd2', hold: 3.1, cam: 'punch', cut: 'whip', set: 'rails', say: 'b',
          line: 'Summer heat makes steel expand.',
          bg: 'bright hot sky over a desert railroad',
          who: [
            { id: 'a', x: 0.32, pose: 'point', feel: 'neutral', face: 1 },
            { id: 'b', x: 0.68, pose: 'shrug', feel: 'skeptical', face: -1 },
          ],
          props: [{ id: 'sun', kind: 'sun', x: 0.5 }],
          acts: [
            { t: 0.35, id: 'b', do: 'shrug', feel: 'shocked' },
            { t: 0.7, id: 'a', do: 'point' },
          ],
        },
        {
          id: 'd3', hold: 3.2, cam: 'push', cut: 'zoom', set: 'rails', say: 'a',
          line: 'Jointed track leaves a small gap.',
          bg: 'close view of railroad gravel and rails',
          who: [
            { id: 'a', x: 0.36, pose: 'point', feel: 'happy', face: 1 },
            { id: 'b', x: 0.7, pose: 'think', feel: 'neutral', face: -1 },
          ],
          props: [],
          acts: [{ t: 0.3, id: 'a', do: 'walk', x: 0.44 }, { t: 1.3, id: 'a', do: 'point' }],
        },
        {
          id: 'd4', hold: 3.2, cam: 'punch', cut: 'whip', set: 'rails', say: 'b',
          line: 'No gap, and the hot rail bows.',
          bg: 'railroad tracks in harsh sunlight',
          who: [
            { id: 'a', x: 0.34, pose: 'idle', feel: 'shocked', face: 1 },
            { id: 'b', x: 0.66, pose: 'idle', feel: 'shocked', face: -1 },
          ],
          props: [],
          acts: [
            { t: 0.45, id: 'a', do: 'jump', feel: 'shocked' },
            { t: 0.55, id: 'b', do: 'jump', feel: 'shocked' },
          ],
        },
        {
          id: 'd5', hold: 3.2, cam: 'pan', cut: 'whip', set: 'rails', say: 'a',
          line: 'The wheel clicks across that space.',
          bg: 'railroad with a train passing',
          who: [
            { id: 'a', x: 0.24, pose: 'point', feel: 'happy', face: 1 },
            { id: 'b', x: 0.4, pose: 'wave', feel: 'happy', face: 1 },
          ],
          props: [{ id: 'tr', kind: 'train', x: 1.05 }],
          acts: [{ t: 0.1, id: 'tr', do: 'drive', x: 0.12, dur: 2.6 }],
        },
        {
          id: 'd6', hold: 3.2, cam: 'pull', cut: 'zoom', set: 'rails', say: 'b',
          line: 'That gap is what keeps the jointed track safe.',
          bg: 'sunny railroad tracks',
          who: [
            { id: 'a', x: 0.34, pose: 'cheer', feel: 'happy', face: 1 },
            { id: 'b', x: 0.66, pose: 'cheer', feel: 'happy', face: -1 },
          ],
          props: [],
          acts: [
            { t: 0.25, id: 'a', do: 'cheer', feel: 'happy' },
            { t: 0.35, id: 'b', do: 'cheer', feel: 'happy' },
          ],
        },
      ],
    };
  }
}
