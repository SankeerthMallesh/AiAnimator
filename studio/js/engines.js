// Loomy Studio's three production engines. Each has its own script logic, character style, scene and camera
// grammar, visual presets, editing advice and the Loomy renderer that makes its video. They never share characters
// or presets: a project belongs to one engine.
export const ENGINES = {
  stick: {
    id: 'stick', label: '2.5D Stickman Explainers', short: 'Stickman 2.5D', tag: 'Flat stickmen · 3D worlds',
    blurb: 'Expressive stickman characters (big white round heads, thick dark outlines, thin arms and legs, period-correct outfits) acting out true stories and strange facts inside detailed 3D places with cinematic light.',
    genres: { history: 'History', facts: 'Strange facts', howitworks: 'How things work', jobs: 'Weird jobs', crime: 'True crime & heists', money: 'Money & business', science: 'Science stories', disasters: 'Disasters' },
    examples: ['How miners got tricked by salted gold mines.', 'Why cashiers kept winning the lottery.', 'The prisoner who tunneled into a bank.'],
    lengths: [30, 45, 60, 90], seconds: 60, usesCast: true, castKind: 'stickman',
    renderTab: 'cartoon', renderLabel: 'Cartoons (2.5D stickman engine)',
    system: `You write narration for vertical 2.5D stickman explainer Shorts: expressive stickman characters act out a true story or a strange fact inside detailed 3D places.
Every sentence must describe something a character visibly DOES (grabs, opens, reads, digs, runs, hands over, sits, points, reacts) so it can be animated; avoid abstract summary sentences. Real facts only: no invented names, dates or numbers presented as true.
Open with a hook in the first line; one turning point ("You see,", "But here's the thing:"); end on a consequence or a final twist, never a moral. Simple words, short sentences, written for the ear. The narrator is only a voice. Answer with JSON only.`,
    hookKinds: ['a surprising true fact', 'a question', 'a person doing something strange, mid-action'],
    places: ['a mining camp with carts on rails', 'a bank vault', 'a prison cell', 'a busy city street', 'a 1900s newspaper office', 'a factory floor', 'a kitchen', 'a courtroom', 'a battlefield', 'a laboratory', 'a small-town store counter', 'a railroad track in the desert'],
    shots: [['establishing wide', 'show the place and who is in it'], ['medium', 'show the character doing the action'], ['close-up', 'land the reaction on the face'], ['insert close-up', 'show the object being used (the newspaper, the key, the button)'], ['over-the-shoulder', 'show what the character sees'], ['low angle', 'make the moment feel big'], ['tracking side shot', 'follow the character as they move'], ['two-shot', 'show two characters interacting']],
    moves: ['slow push-in', 'pull-back reveal', 'side tracking', 'pan to follow', 'tilt up', 'gentle orbit', 'static hold', 'snap zoom on the reaction'],
    lights: ['warm golden daylight', 'cool indoor office light', 'dusty sunbeams', 'night with warm lamps', 'harsh desert noon', 'dim cell light with a window shaft'],
    style: '2.5D animation: flat illustrated stickman characters with big white circular heads, thick dark outlines, simple expressive eyes, eyebrows and mouths, thin black arms and legs, clothing and accessories fitting their role and era, standing inside a detailed dimensional 3D environment with realistic props, cinematic lighting and soft shadows, vertical 9:16',
    animStyle: 'flat stickman characters animated with clear key poses (anticipation, action, reaction), hands interacting with real 3D props, smooth cinematic camera, 2.5D parallax',
    editing: ['Hook in the first second with the most surprising part on screen.', 'One action per shot; cut on the action (as the hand reaches the object).', 'Close-up on every discovery or reaction.', 'Object sounds on contact (paper rustle, metal clink, door creak).', 'Big bold captions, 2-4 words, centred low.', 'End on the consequence shot, hold one beat.'],
    music: 'playful curious pulse, light percussion',
  },
  blocky: {
    id: 'blocky', label: 'Blocky Storyteller', short: 'Blocky stories', tag: 'Block worlds · "In this town…"',
    blurb: 'Fictional "In this town…" stories, strange town laws, secrets and suspense, played by blocky game-style characters in block-built towns. No stickmen.',
    genres: { town: '"In this town…"', law: 'Strange town law', mystery: 'Mystery', secret: 'Secret', horror: 'Suspense (all ages)', history: 'Fictional history', emotional: 'Emotional', characters: 'Unusual characters' },
    examples: ['In this town, the youngest person must protect the oldest secret.', 'In this town, nobody is allowed outside after midnight.', 'In this town, every house has a room nobody can enter.'],
    lengths: [30, 45, 60, 90], seconds: 60, usesCast: true, castKind: 'blocky',
    renderTab: 'blocky', renderLabel: 'Blocky (block-world engine)',
    system: `You write original fictional stories for vertical Shorts played by blocky game-style characters in a block-built town.
For "In this town" stories the FIRST line states the unusual law or tradition ("In this town, ..."). Build a coherent story around that premise (do not just restate it): who keeps the rule and why it seems normal, a character with a motivation who questions or breaks it, rising tension with concrete visible actions (walks to, opens, hides, discovers), a reveal and a twist that changes what the rule means, and a short final line with the consequence.
Keep the same named characters, places and time of day. Suitable for all ages: suspense, never gore. The narrator is only a voice; characters act everything out. Simple words, short sentences. Answer with JSON only.`,
    hookKinds: ['the town law itself ("In this town, ...")', 'a question about the law', 'the moment the law is broken'],
    places: ['block-built town square at dusk', 'blocky main street with lamp posts', 'the clock tower', 'a blocky house living room', 'the forbidden basement door and stairs', 'the town hall', 'the school hallway', 'the forest edge road', 'the diner at night', 'the lighthouse'],
    shots: [['establishing wide', 'show the town and the law in one picture'], ['medium', 'follow the character doing the action'], ['close-up', 'show the fear or the decision on the face'], ['over-the-shoulder', 'see the forbidden thing from behind the hero'], ['low angle', 'make the rule or the place loom'], ['high angle', 'make the hero small and alone'], ['tracking follow', 'walk with the hero toward danger'], ['insert close-up', 'show the key, the handle, the note']],
    moves: ['slow push-in', 'follow behind the character', 'crane down from the rooftops', 'pan across the street', 'pull-out reveal', 'handheld creep forward', 'static hold', 'snap zoom'],
    lights: ['golden dusk with long shadows', 'cold blue night with warm windows', 'single flickering street lamp', 'dark basement lit by one bulb', 'red warning glow', 'grey morning fog'],
    style: 'blocky game-style 3D characters with cube heads, block bodies and simple clothing and accessories (original designs, no logos), block-built town environment, cinematic lighting and shadows, vertical 9:16',
    animStyle: 'blocky characters animate with clear game-style motions (walk cycle, reach, open, look around), the camera follows them smoothly, lights change as they enter new places',
    editing: ['First second: the town law, big on screen.', 'Cut every 2-3 seconds; hold on the twist.', 'Suspense drone under everything, one silence before the reveal.', 'A hit on every law break (a bell, a door slam).', 'Same places keep the same look and time of day.', 'End on the consequence image, cut to black.'],
    music: 'suspense drone, ticking clock, music box',
  },
  cinema: {
    id: 'cinema', label: 'Full 3D Explainers', short: '3D explainers', tag: 'Cinematic 3D · education',
    blurb: 'Polished cinematic 3D explainers about history, science, technology, the human body, inventions, engineering, space and how things are made: detailed characters, realistic materials and lighting, depth of field, clear demonstrations.',
    genres: { history: 'History', science: 'Science', technology: 'Technology', biology: 'Human biology', inventions: 'Inventions', events: 'Strange historical events', howitworks: 'How everyday things work', engineering: 'Engineering', space: 'Space', ancient: 'Ancient civilizations', discoveries: 'Discoveries', howmade: 'How things are made' },
    examples: ['The first computers filled entire rooms.', 'Chocolate begins as a bitter bean inside a pod.', 'Why some lakes can suddenly explode.'],
    lengths: [30, 45, 60, 90], seconds: 50, usesCast: false, castKind: 'realistic',
    renderTab: '3d', renderLabel: '3D (cinematic engine)',
    system: `You write narration for cinematic 3D educational Shorts (history, science, technology, the human body, inventions, engineering, space, how things are made).
Every claim must be true and checkable: no invented facts, names, dates or numbers. Each sentence must be DEMONSTRABLE: a step of a process, a person operating something, a cutaway, a scale comparison, a period-accurate reconstruction. Keep objects in their correct historical period.
Hook with the most surprising true fact; one turning point ("Here's the crazy part:"); end on a consequence or a final surprising fact, never a moral. Simple words, short sentences, written for the ear. The narrator is only a voice. Answer with JSON only.`,
    hookKinds: ['a surprising true fact', 'a question the viewer cannot answer yet', 'a dramatic historical or scientific moment in action'],
    places: ['a room-sized early computer hall', 'a cocoa plantation', 'a chocolate factory', 'an anatomical cutaway of the body', 'a laboratory', 'an ancient city street', 'a workshop of an inventor', 'a cross-section of the earth or a lake', 'outer space', 'a modern factory line', 'a museum display'],
    shots: [['establishing wide', 'set the time, place and scale'], ['tracking shot', 'move with the person through the space'], ['medium', 'show the person operating or handling it'], ['macro close-up', 'show the mechanism or detail'], ['cutaway cross-section', 'reveal what happens inside'], ['scale comparison', 'make the number visible'], ['over-the-shoulder', 'see what the person sees'], ['aerial', 'show the size of the event']],
    moves: ['smooth dolly-in', 'orbit', 'fly-through into the cutaway', 'crane up for scale', 'rack focus to the detail', 'slow push', 'tracking alongside', 'static hold on the number'],
    lights: ['soft studio key with rim light', 'warm period window and candle light', 'clean lab light', 'dramatic museum spotlight', 'golden outdoor sun', 'bioluminescent glow inside the body'],
    style: 'high-quality cinematic 3D animation, detailed realistic characters and props, realistic materials, high-quality lighting and soft realistic shadows, shallow depth of field, period-accurate details, vertical 9:16',
    animStyle: 'cinematic camera move, realistic character animation operating real objects, cutaway and process animations that demonstrate each step, physically plausible motion',
    editing: ['Hook with the surprising fact and its number on screen in 1.5 s.', 'One demonstration per sentence; cut when the step completes.', 'Cutaways and scale shots for every number.', 'Label the key part with 1-3 words.', 'Whooshes on cuts, a riser before the reveal, a light documentary bed.', 'Mark simplified visual explanations as such; reconstructions stay period-accurate.'],
    music: 'documentary strings, light curious pulse, risers',
  },
};
export const engineOf = (p) => ENGINES[p?.engine] || ENGINES.stick;
