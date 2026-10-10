/* grownups-view.js — the grown-ups' page's heavy half: each child's report card, the daily goal's three
   targets and the contest day, and the goal's week day by day. Loaded with the grown-ups' page
   (views.js goalView), never with Home — the first-load budget (test/family-ui.mjs). */
import { R } from './runtime.js';
import { esc } from './ui.js';
import * as DL from './daylog.js';
import { av } from './views.js';
import { goalsReport } from './views2.js';
import { rankOf } from './model.js';
import { TRICKS } from './tricks.js';
import { parseKey, state as fstate, text as ftext } from './facts.js';
import { reportCard } from './report.js';
import { Family } from './store.js';
import { icon, glyph } from './icons.js';

/* The daily goal's three targets (Bizzing Bee's "Your three daily targets") and the coach's contest day.
   Chips only — nothing to type. Until a grown-up picks, the age band's defaults hold (daylog.js). */
export function goalSettings(k) {
  const t = DL.targets(k), set = (k.prefs.targets && 'app' in k.prefs.targets) ? k.prefs.targets : {};
  const row = (key, unit, hint) => `<div class="set"><span>Daily goal: ${DL.LABEL[key].toLowerCase()} <span class="muted small">${hint}${set[key] == null ? ' · the age band’s default' : ''}</span></span><span class="chips">${DL.CHOICES[key].map((n) => `<button class="chip-btn small${t[key] === n ? ' on' : ''}" data-act="setTarget" data-arg="${key}|${n}" aria-pressed="${t[key] === n}">${n}${unit}</button>`).join('')}</span></div>`;
  const cd = k.prefs.contest, wk = [2, 4, 6, 8, 12];
  return row('app', 'm', 'minutes on the app with the page open and someone there')
    + row('prac', 'm', 'minutes with a question up — the clock stops between them')
    + row('right', '', 'right answers anywhere in the app')
    + `<div class="set"><span>Contest day <span class="muted small">optional. The coach plans backwards from it: new things first, then fixing what trips, then papers against the clock${cd ? ` · set for ${esc(new Date(cd + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}` : ''}</span></span><span class="chips"><button class="chip-btn small${cd ? '' : ' on'}" data-act="setContest" data-arg="0" aria-pressed="${!cd}">None</button>${wk.map((w) => `<button class="chip-btn small" data-act="setContest" data-arg="${w}">in ${w} weeks</button>`).join('')}</span></div>`;
}

/* The daily goal, day by day for the week — the same three numbers as the child's ring, from the same
   record (daylog.js). Time is TIME: shown beside the answers, never instead of them. */
export function goalWeek(c) {
  const w = DL.week(c), t = DL.targets(c);
  const day = (d) => new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' });
  const cell = (v, goal, txt) => `<td class="${v >= goal ? 'met' : ''}">${txt}</td>`;
  return `<div class="rc-goal"><p class="kicker">Daily goal · this week, day by day</p>
    <div class="rc-gscroll"><table class="rc-gt"><thead><tr><th scope="col"></th>${w.map((m) => `<th scope="col">${esc(day(m.day))}</th>`).join('')}</tr></thead><tbody>
      <tr data-goal-row="app"><th scope="row"><i style="background:${DL.RING_COL.app[0]}"></i>App time <small>/ ${t.app}m</small></th>${w.map((m) => cell(m.app, t.app * 60, DL.fmtMins(m.app))).join('')}</tr>
      <tr data-goal-row="prac"><th scope="row"><i style="background:${DL.RING_COL.prac[0]}"></i>Practise time <small>/ ${t.prac}m</small></th>${w.map((m) => cell(m.prac, t.prac * 60, DL.fmtMins(m.prac))).join('')}</tr>
      <tr data-goal-row="right"><th scope="row"><i style="background:${DL.RING_COL.right[0]}"></i>Right answers <small>/ ${t.right}</small></th>${w.map((m) => cell(m.right, t.right, String(m.right))).join('')}</tr>
    </tbody></table></div>
    <p class="muted small">A bold number met that day's target. Days with maths in the last two weeks: ${DL.daysWithMaths(c)} of 14 — a count, never a chain, and a day off costs nothing. Time never moves a rank, a medal, a goal or a coin.</p></div>`;
}


/* The report card, in the family's three measures (report.js): TIME, PROGRESS,
   MASTERY — then the detail a grown-up can act on. Weekly bars for the trend,
   one bar per strand for where the learning is. Never usage as achievement. */
export function report(c) {
  const rc = reportCard(c, c.sampleFeed || Family.feed());
  const learned = TRICKS.filter((t) => (c.tricks[t.id] || {}).stars >= 2);
  const lapsed = Object.entries(c.facts).filter(([, r]) => r.lapsed).map(([k2]) => parseKey(k2)).filter(Boolean);
  const traps = Object.entries(c.facts).filter(([, r]) => fstate(r) === 'trap').map(([k2]) => parseKey(k2)).filter(Boolean);
  const wk = rc.weeks, maxM = Math.max(10, ...wk.map((w) => w.minutes)), maxF = Math.max(5, ...wk.map((w) => w.fluent || 0));
  const bars = (vals, max, cls) => `<span class="rc-bars ${cls}">${vals.map((v, i) => `<i style="height:${Math.round(100 * (v || 0) / max)}%" title="${v || 0}"${i === vals.length - 1 ? ' class="now"' : ''}></i>`).join('')}</span>`;
  const day = (t) => new Date(t + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const whenTot = rc.time.when.morning + rc.time.when.afternoon + rc.time.when.evening;
  return `<div class="card report rc" data-report='${esc(JSON.stringify({ v: rc.v, app: rc.app, who: rc.who, time: rc.time.week, progress: rc.progress.stations, mastery: rc.mastery.fluent }))}'>
    <div class="row gap">${av(c.avatar, 48, '')}<div><h2>${esc(c.name)}${c.sample ? ' <span class="chip-s">Sample</span>' : ''}</h2><p class="muted">Age ${esc(c.band.replace('-', '–'))} · rank ${esc(rankOf(c.xp).n)}</p></div></div>
    <div class="rc-three">
      <div class="rc-cell"><p class="kicker">Time</p><b class="rc-big">${rc.time.week}<small> min this week</small></b>
        ${bars(wk.map((w) => w.minutes), maxM, 'time')}<span class="rc-axis"><span>${day(wk[0].wk)}</span><span>this week</span></span>
        <p class="muted small">${whenTot ? `Mostly in the ${Object.entries(rc.time.when).sort((x, y) => y[1] - x[1])[0][0]}. ` : ''}Active minutes only — the app stops counting when nobody is touching it.</p></div>
      <div class="rc-cell"><p class="kicker">Progress</p><b class="rc-big">${rc.progress.level ? `Level ${rc.progress.level}` : '—'}<small>${rc.progress.level ? ` · ${rc.progress.stations} of ${rc.progress.total} stops` : ''}</small></b>
        ${rc.progress.total ? `<span class="meter"><i style="width:${Math.round(100 * rc.progress.stations / rc.progress.total)}%"></i></span>` : ''}
        <p class="muted small">${esc(rc.progress.label)}. ${rc.progress.lands} land test${rc.progress.lands === 1 ? '' : 's'} and ${rc.progress.levels} level test${rc.progress.levels === 1 ? '' : 's'} passed.</p></div>
      <div class="rc-cell"><p class="kicker">Mastery</p><b class="rc-big">${rc.mastery.fluent}<small> facts fluent</small></b>
        ${bars(wk.map((w) => w.fluent), maxF, 'mast')}<span class="rc-axis"><span>${day(wk[0].wk)}</span><span>this week</span></span>
        <p class="muted small">${rc.mastery.mastered} stops mastered · ${rc.mastery.goals} of ${rc.mastery.goalsTotal} goals. Fluent means still fast after a gap of days.</p></div>
    </div>
    <div class="rc-strands"><p class="kicker">Where the learning is — goals met, by strand</p>
      ${rc.mastery.strands.map((st) => `<div class="rc-st"><span>${glyph(st.glyph, 16)} ${esc(st.name)}</span><span class="bar"><i style="width:${st.total ? Math.round(100 * st.met / st.total) : 0}%"></i></span>${st.started ? `<b class="mono">${st.met}/${st.total}</b>` : '<b class="rc-none muted small">not started yet</b>'}</div>`).join('')}</div>
    <div class="rep-grid">
      <div><p class="kicker">Tricks mastered</p><p>${learned.length ? learned.map((t) => esc(t.title)).join(' · ') : 'None yet.'}</p></div>
      <div><p class="kicker">Worth a hand with</p><p>${traps.length ? traps.slice(0, 8).map((f) => `<span class="mono">${esc(ftext(f))}</span>`).join(', ') : 'Nothing is tripping them up right now.'}</p>
        ${lapsed.length ? `<p class="muted small">Slipped since they were fluent: ${lapsed.slice(0, 8).map((f) => esc(ftext(f))).join(', ')}. That is normal — it comes back quickly.</p>` : ''}</div>
    </div>
    ${goalWeek(c)}
    ${goalsReport(c)}
    ${timerReport(c)}
    <p class="muted small">Talk about it: ask ${esc(c.name)} to show you one trick and explain <i>why</i> it works. Explaining it is the best practice there is.</p>
  </div>`;
}

/* Beat the Timer, for a grown-up: theme · level · best · target per window, in words (games spec §3.7).
   The grade is a curriculum setting the child picks, so it is never reported as theirs; time is never a score. */
let TT = null, ttLoading = false;   // the catalogue loads with the first report that needs it, never with Home
function timerReport(c) {
  if (!c.timer || !Object.keys({ ...c.timer.lv, ...c.timer.best }).length) return '';
  if (!TT) { if (!ttLoading) { ttLoading = true; import('./timer-themes.js').then((m) => { TT = m; R.render && R.render(); }, () => { ttLoading = false; }); } return ''; }
  const ls = TT.parentLines(c);
  return ls.length ? `<div class="rc-timer"><p class="kicker">${icon('timer', 16)} Beat the Timer</p>${ls.map((l) => `<p class="small">${esc(l)}</p>`).join('')}</div>` : '';
}

