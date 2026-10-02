/* STUB — replaced by the real bank on integration. Synthetic templates so the engine and screens can be built. */
import { int } from '../rand.js';
export const TEMPLATES = [3, 4, 5].flatMap((tier) => Array.from({ length: 14 }, (_, i) => ({
  id: 'stub-young-' + tier + '-' + i, bands: ['g12', 'g34'], tier, topic: ['number', 'counting', 'geometry', 'logic', 'patterns'][i % 5], strategy: 'work-backwards',
  make(r) { const a = int(2, 9, r) * tier, b = int(2, 9, r) + i; return { text: 'I think of a number, add ' + b + ' and get ' + (a + b) + '. What was it?', ans: a, wrong: [a + 1, a - 1, a + b, b, a + 2], why: 'Work backwards: take ' + b + ' away.', params: { a, b } }; },
  solve(p) { const out = []; for (let x = 0; x < 200; x++) if (x + p.b === p.a + p.b) out.push(x); return out; },
})));
