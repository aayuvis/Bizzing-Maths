/* stories.js — a short story for every stop. The Bee books' treatment, for maths.

   Before a child meets a trick as steps, they meet it as a small story: two of
   the Bee's ten rivals, an ordinary place, a real-life sum, and one of them
   showing the other the shortcut. The characters are the SAME children the
   Bee's mock bee and this app's Mock Contest field, and each teaches the trick
   that already fits them — Rafi takes numbers apart, Mira knows her squares,
   Theo checks everything with nines, Ines does percentages, Kwame lives near a
   hundred, Vesper says very little and is right. Nothing is invented twice.

   Every story is fiction and says so ("A story"), the badge rule Bizzing India
   keeps: a thing told as a story is never presented as fact.

   THE NOTEPAD IS CHECKED. A beat may `add` a line to the notepad — `t` is the
   sum as written, `v` its value. test/stories.mjs evaluates every `t` and fails
   the build if it does not equal `v`. A story that did its own arithmetic
   wrong would undo the chapter it introduces.

   Beat shape: { who: <rival id> | null (narrator), say: 'line', add?: {t, v} }.
   `scene` names a painted plate in public/art/ (s-<scene>.webp). */



/* The stories load on first need (story-data.js is its own chunk). STORIES is a live
   binding: {} until loadStories() resolves, then every story. A screen that tells one
   asks for them in render(); openStop waits for them so a first visit opens on its story. */
export let STORIES = {};
let loading = null, ready = false;
export const storiesReady = () => ready;
export function loadStories() {
  return loading || (loading = import('./story-data.js').then((m) => { STORIES = m.STORIES; ready = true; return STORIES; }));
}
export const SCENES = ['garden', 'festival', 'bus', 'library', 'cricket', 'market', 'hall', 'train', 'kitchen', 'fair', 'pond', 'night', 'stadium', 'harbour', 'shop', 'room',
  'bakery', 'clock', 'city', 'forest', 'palace', 'carnival', 'beach'];

/* Evaluate a notepad sum as plain arithmetic — the test's route, and the one
   the view never needs (it prints `v`, which the test proved). */
export function evalSum(t) {
  const js = String(t)
    .replace(/(\d+(?:\.\d+)?)% of (\d+(?:\.\d+)?)/g, '($1*$2/100)')
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
  if (!/^[\d\s+\-*/().]+$/.test(js)) throw new Error('not a sum: ' + t);
  return Function(`return (${js})`)();
}
