/* lines.js — the fixed sentences the app says to a child, in one place.

   They live here rather than inline in a view because each one is also a
   recording (tools/voice/clips.mjs reads this file to know what to record, and
   test/voice.mjs fails if a recording outlives its sentence). Change a line and
   its clip is re-recorded on the next tools/voice/tts.py run; nothing else to do.

   A line that would carry the child's name is split around it: the screen shows
   the name, the narrator does not pretend to know it. */

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
