/* lines.js — the fixed sentences the app says to a child, in one place.

   They live here rather than inline in a view because each one is also read
   aloud, and test/voice.mjs checks every one turns into words a voice can say.

   A line that would carry the child's name is split around it: the screen shows
   the name, the voice does not pretend to know it. */

export const GUIDE = {
  nameFirst: 'Hello! I am Nova. I will walk the first road with you. What shall I call you?',
  nameMore: 'Another mathematician! What shall I call this one?',
  bandHi: 'Good to meet you',          // the screen adds ", <name>." — the voice says it with a full stop
  bandAsk: 'How old are you? It decides where your first road starts.',
  face: 'Pick a face to walk the roads with. There are twenty-five more on your page, whenever you want a change.',
  world: 'Last one. Which world should the app wear? You can swap it — there are four more — on your page any time.',
};
export const guideSay = (k) => (k === 'band' ? `${GUIDE.bandHi}. ${GUIDE.bandAsk}` : GUIDE[k]);

/* The runner's reply to a wrong answer, spoken as parts: the answer is composed. */
export const FEEDBACK = { wrong: 'Not this time.', late: 'Out of time.', itIs: 'It is' };
