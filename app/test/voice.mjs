/* test/voice.mjs — the narrator, held to what a child would notice.

   node test/voice.mjs          (npm test)       everything; the audio lint only if ffmpeg is here
   node test/voice.mjs --lint   (npm run voice:lint)  the audio lint is required

   1. Every clip the manifest names is on disk, and nothing else is.
   2. Every clip passes the lint: mean volume ≥ −20 dB and ≥ 0.35 s. The
      synthesiser can answer 200 OK with a silent MP3; this is where it is caught.
   3. Every question a 6–8-year-old can be asked on journey levels 1–3 (a fresh
      sample from the generators, plus the whole facts bank), and the reply to a
      wrong answer, plays ENTIRELY from recordings — no device-voice fallback.
      The check is proved by breaking it: with one number clip taken out of the
      manifest it must fail, every run.
   4. Every fixed line (guide, hooks, stories, test gates) plays whole, and every
      clip in the manifest is still asked for — a sentence edited in source
      leaves its old recording behind, and that is caught here. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { VOICE } from '../src/voice-manifest.js';
import { plan } from '../src/voice.js';
import { normalise, numPieces, keyOf, NUMBER_WORDS } from '../src/voice-text.js';
import { clipList, youngQuestions, youngLines, askSay, feedbackParts } from '../../tools/voice/clips.mjs';

const HERE = resolve(import.meta.dirname, '..');
const DIR = resolve(HERE, 'public/voice');
const LINT_REQUIRED = process.argv.includes('--lint');
let fails = 0;
const fail = (m) => { fails++; if (fails <= 25) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) fail(m); };

/* ---- the tokeniser says numbers the way a child is taught them ---- */
ok(NUMBER_WORDS.length === 101 && NUMBER_WORDS[47] === 'forty-seven' && NUMBER_WORDS[100] === 'one hundred', 'number words 0–100');
ok(numPieces(347).join(' ') === 'three hundred and forty-seven', '347');
ok(numPieces(2548).join(' ') === 'two thousand five hundred and forty-eight', '2548');
ok(numPieces(1005).join(' ') === 'one thousand and five', '1005');
ok(numPieces(124).join(' ') === 'one hundred and twenty-four', '124');
ok(normalise('1/4 = ?/16').words === 'one quarter equals how many sixteenths', 'fractions are said as fractions');
ok(normalise('7 × 8').words === 'seven times eight', 'symbols are said as words');
ok(normalise('11:30').words === 'eleven thirty' && normalise('2:05').words === 'two oh five' && normalise('6:00').words === "six o'clock", 'clock times');
ok(normalise('a sign ¤ here') === null, 'a symbol with no word is not skipped silently — it goes to the device voice');

/* ---- 1. manifest ⇔ disk ---- */
const keys = Object.keys(VOICE);
ok(keys.length > 300, `the manifest holds ${keys.length} clips`);
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.mp3')) : [];
for (const k of keys) ok(existsSync(resolve(DIR, VOICE[k].f)), `manifest names ${VOICE[k].f}, which is not on disk`);
const named = new Set(keys.map((k) => VOICE[k].f));
for (const f of files) ok(named.has(f), `public/voice/${f} is on disk but not in the manifest (rejected, stale or orphaned — tools/voice/tts.py --prune)`);
for (const k of keys) ok(VOICE[k].d >= 0.35, `${k} is ${VOICE[k].d}s in the manifest`);

/* ---- 4. every clip is still asked for; every fixed line plays whole ---- */
const { clips, problems } = clipList();
for (const p of problems) fail(p);
const wanted = new Map(clips.map((c) => [c.k, c]));
for (const k of keys) ok(wanted.has(k), `clip ${k} is no longer asked for by anything in source — its sentence changed or went (re-run tools/voice/tts.py --prune)`);
for (const c of clips) ok(VOICE[c.k], `not recorded yet: "${c.text}" (${c.kind}, ${c.from}) — run tools/voice/tts.py`);
for (const l of youngLines()) {
  const p = plan(l.text);
  ok(p && p.clips && p.clips.filter((c) => c.f).length === 1, `fixed line does not play whole (${l.from}): ${l.text}`);
}

/* ---- 3. every young question composes from recordings, no fallback ---- */
function uncovered(manifest) {
  const bad = [];
  // a fixed seed, not the one the clip list was drawn with; VOICE_SEED=random tries a fresh one
  const qs = youngQuestions(40, process.env.VOICE_SEED === 'random' ? 'voice-test:' + Date.now() : 'voice-test');
  for (const q of qs) {
    const a = plan(askSay(q), manifest);
    if (!a || !a.clips) bad.push(`${q.from}: "${askSay(q)}" (missing "${a && a.missing}")`);
    if (q.ans != null) {
      const b = plan(feedbackParts(q), manifest);
      if (!b || !b.clips) bad.push(`${q.from} reply: "${feedbackParts(q).join(' ')}" (missing "${b && b.missing}")`);
    }
  }
  return { bad, n: qs.length };
}
const cov = uncovered(VOICE);
for (const b of cov.bad.slice(0, 15)) fail('falls back to the device voice — ' + b);
if (cov.bad.length > 15) fail(`…and ${cov.bad.length - 15} more`);
// proof by breaking: without the clip for "seven" the same check must fail
const broken = { ...VOICE }; delete broken[keyOf('seven')];
const brk = uncovered(broken);
ok(brk.bad.length > 0 && brk.bad.some((b) => /missing "seven"/.test(b)), 'the coverage check still fails when a number clip is taken away');

/* ---- 2. the lint ---- */
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const py = spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
  return py.status === 0 ? py.stdout.trim() : null;
}
const FF = findFfmpeg();
let linted = 0;
if (!FF) {
  if (LINT_REQUIRED) fail('ffmpeg not found — voice:lint cannot run (install ffmpeg, set FFMPEG, or pip install imageio-ffmpeg)');
  else console.log('  · ffmpeg not here: audio lint skipped (npm run voice:lint runs it)');
} else {
  const measure = (f) => new Promise((done) => {
    const p = spawn(FF, ['-hide_banner', '-nostats', '-i', resolve(DIR, f), '-af', 'volumedetect', '-f', 'null', '-']);
    let err = ''; p.stderr.on('data', (d) => { err += d; });
    p.on('close', () => {
      const last = (re) => { const m = [...err.matchAll(re)]; return m.length ? m.at(-1)[1] : null; };
      const mean = last(/mean_volume: (-?[\d.]+) dB/g), n = last(/n_samples: (\d+)/g), hz = last(/(\d+) Hz/g);
      done({ f, mean: mean == null ? -99 : +mean, secs: n && hz ? +n / +hz : 0 });
    });
  });
  const todo = [...named]; const res = [];
  await Promise.all(Array.from({ length: 8 }, async () => { while (todo.length) res.push(await measure(todo.pop())); }));
  for (const r of res) {
    linted++;
    ok(r.mean >= -20, `${r.f}: mean volume ${r.mean} dB is under −20 dB — silent or near-silent; re-record it`);
    ok(r.secs >= 0.35, `${r.f}: ${r.secs.toFixed(2)} s is under 0.35 s — empty or truncated; re-record it`);
  }
}

const mb = files.reduce((a, f) => a + readFileSync(resolve(DIR, f)).length, 0) / 1048576;
if (fails) { console.error(`voice: ${fails} failure(s)`); process.exit(1); }
console.log(`voice: ${keys.length} clips (${mb.toFixed(2)} MB), ${cov.n} young questions all from recordings, ${linted ? `${linted} clips linted` : 'lint skipped'}; the coverage check fails when "seven" is taken away (${brk.bad.length} questions lose their voice)`);
