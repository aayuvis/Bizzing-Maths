import{k as f,R as l,e as p,a as k,w as d,t as v,b as $}from"./index-DsXlYyXZ.js";import{p as w}from"./board-CT-hQmdb.js";import{BANDS as b,LETTERS as y,bandFor as x,BAND_IDS as S,FIXED as u,practiseNext as A}from"./engine-DsLyLGAl.js";const g=["strategy","logic","figures"],h=(s,a)=>(s.tricks[a]||{}).stars||0;function P(s,a){const t=v(a),r=t.filter(i=>h(s,i.id)>=2).length;return{ts:t,passed:r,n:t.length}}function T(s){const a=g.filter(r=>d(r)).map(r=>{const i=d(r),n=P(s,r);return{kind:"world",id:r,label:i.name,glyph:i.glyph,blurb:i.blurb,s:n,done:n.n&&n.passed===n.n}}),t=(s.papers||{}).log||[];return[...a,{kind:"papers",id:"papers",label:"The Paper Hall",glyph:"📝",blurb:"Contest-style papers against the clock: three sections, worth 3, 4 and 5 points.",done:t.length>0}]}function I(){const s=f(l.h),a=T(s),t=a.findIndex(c=>!c.done),r=l.ui.hsel!=null&&a[l.ui.hsel]?l.ui.hsel:Math.max(0,t),i=`<img class="av" src="avatars/${p(k(s.avatar))}.webp" width="34" height="34" alt="">`,n=w({img:"j-contest",here:t,sel:r,me:i,minWidth:980,aspect:"1920/640",band:[76,6,1.1],stops:a.map((c,m)=>({label:c.label,state:c.done?"done":"open",act:"hallPick",arg:String(m),badge:`<em class="hall-g" aria-hidden="true">${c.glyph}</em>`}))}),e=a[r],o=e.kind==="world"?`<div class="pick-t"><p class="kicker">${e.s.passed} of ${e.s.n} strategies passed</p><h2>${p(e.glyph)} ${p(e.label)}</h2><p class="pick-hook">${p(e.blurb||"")}</p></div>
       <div class="pick-go"><button class="btn primary big" data-act="openWorld" data-arg="${e.id}">Go in</button></div>`:`<div class="pick-t"><p class="kicker">${((s.papers||{}).log||[]).length} papers sat</p><h2>📝 The Paper Hall</h2><p class="pick-hook">${p(e.blurb)}</p></div>
       <div class="pick-go"><button class="btn primary big" data-act="hallPapers">Choose a paper</button></div>`;return`<section class="hall">
    <div class="hall-head"><h1 class="hall-t">The Contest Hall</h1><span class="muted small">Contest-style practice · every problem proved to have one answer</span></div>
    ${n}
    <div class="card pick">${o}</div>
    ${C(s)}
    ${B(s)}
  </section>`}function C(s){const a=l.ui.pband||x(s),t=b[a],r=(s.papers||{}).best||{},i=s.paperDraft;return`<div class="card papers" id="papers">
    <div class="papers-top"><p class="kicker">Contest-style papers</p>
      <div class="seg" role="tablist" aria-label="Grade band">${S.map(n=>`<button role="tab" aria-selected="${n===a}" class="${n===a?"on":""}" data-act="pband" data-arg="${n}">${b[n].label}</button>`).join("")}</div></div>
    ${i?`<div class="paper-resume"><span>You were part-way through <b>${i.no==="fresh"||typeof i.no=="string"?"a fresh paper":"Paper "+i.no}</b> (${p(b[i.band].label)}).</span><button class="btn" data-act="paperResume">Carry on</button></div>`:""}
    <p class="muted small">${t.label} · ${t.per*3} questions · ${t.per} each worth 3, 4 and 5 points · ${t.mins} minutes. You start with ${t.per*3} points; a wrong answer loses a quarter of its points, a blank loses nothing.</p>
    <div class="paper-grid">${Array.from({length:u},(n,e)=>e+1).map(n=>{const e=r[`${a}:${n}`],o=t.per*3+t.per*12;return`<button class="pg${e!=null?" sat":""}" data-act="paperStart" data-arg="${a}|${n}" aria-label="Paper ${n}${e!=null?`, best ${Math.round(e)} of ${o}`:""}"><b>${n}</b>${e!=null?`<i>${Math.round(100*e/o)}%</i>`:""}</button>`}).join("")}</div>
    <div class="row gap"><button class="btn" data-act="paperStart" data-arg="${a}|fresh">A fresh paper</button><button class="btn" data-act="nav" data-arg="contest">The mock contest</button></div>
  </div>`}function B(s){return`<div class="card hall-index"><p class="kicker">The thirty ways in</p>
    ${g.filter(a=>d(a)).map(a=>`<div class="hi-w"><b>${p(d(a).glyph)} ${p(d(a).name)}</b>
      <div class="hi-s">${v(a).map(t=>`<button class="hi-stop${h(s,t.id)>=2?" done":""}" data-act="openStop" data-arg="${t.id}">${h(s,t.id)>=2?"✓ ":""}${p(t.title)}</button>`).join("")}</div></div>`).join("")}
  </div>`}const D=s=>{const a=Math.max(0,Math.ceil(s/1e3));return`${Math.floor(a/60)}:${String(a%60).padStart(2,"0")}`};function L(){const s=l.paper;if(!s)return"";if(s.over)return E(s);const a=s.p,t=s.i,r=a.items[t],i=b[a.band],n=s.answers.filter(e=>e!=null).length;return`<section class="paper">
    <div class="paper-bar">
      <button class="play-x" data-act="paperQuit" aria-label="Leave the paper (it is kept)">✕</button>
      <span class="paper-name"><b>${typeof a.no=="number"?`Paper ${a.no}`:"A fresh paper"}</b> · ${p(i.label)}</span>
      <span class="chip">${r.pts}-point question</span>
      <span class="paper-time mono" id="ptime" aria-live="off">${D(s.endsAt-Date.now())}</span>
      <button class="btn small" data-act="paperFinish">Finish</button>
    </div>
    <nav class="paper-nav" aria-label="Questions">${a.items.map((e,o)=>`<button class="pn${o===t?" on":""}${s.answers[o]!=null?" ans":""} t${e.tier}" data-act="paperGo" data-arg="${o}" aria-label="Question ${o+1}${s.answers[o]!=null?", answered":""}">${o+1}</button>`).join("")}</nav>
    <div class="card paper-q">
      <p class="kicker">Question ${t+1} of ${a.items.length} · ${n} answered</p>
      <p class="pq-text">${p(r.text)}</p>
      ${r.fig?`<div class="pq-fig">${r.fig}</div>`:""}
      <div class="pq-choices" role="radiogroup" aria-label="Answers">${r.choices.map((e,o)=>`<button class="pc${s.answers[t]===e?" on":""}" role="radio" aria-checked="${s.answers[t]===e}" data-act="paperPick" data-arg="${p(e)}"><b>${y[o]}</b><span>${p(e)}</span></button>`).join("")}</div>
      <div class="pq-go">
        <button class="btn" data-act="paperGo" data-arg="${t-1}" ${t?"":"disabled"}>← Back</button>
        ${s.answers[t]!=null?'<button class="btn small linkish" data-act="paperClear">Leave it blank</button>':""}
        <button class="btn" data-act="paperGo" data-arg="${t+1}" ${t<a.items.length-1?"":"disabled"}>${s.answers[t]==null?"Skip →":"Next →"}</button>
      </div>
      <p class="muted small pq-keys">Keys: A–E choose · ← → move · Backspace leaves it blank</p>
    </div>
  </section>`}function E(s){const a=s.p,t=s.sc,r=b[a.band],i=A(t).filter(n=>$[n.id]).slice(0,4);return`<section class="paper-end">
    <div class="card pe-head">
      <p class="kicker">${typeof a.no=="number"?`Paper ${a.no}`:"A fresh paper"} · ${p(r.label)}</p>
      <h1 class="pe-score">${+t.points.toFixed(2)} <small>of ${t.max} points</small></h1>
      <p>${t.right} right · ${t.wrong} wrong · ${t.blank} left blank${s.timeUp?" · the time ran out":""}</p>
      <div class="pe-tiers">${[3,4,5].map(n=>{const e=t.tiers[n]||{right:0,n:0};return`<div><b>${e.right}/${e.n}</b><span>${n}-point questions</span></div>`}).join("")}</div>
      ${t.wrong?`<p class="muted small">${t.wrong} wrong answer${t.wrong>1?"s":""} cost ${+a.items.filter((n,e)=>s.answers[e]!=null&&s.answers[e]!==n.ans).reduce((n,e)=>n+e.pts/4,0).toFixed(2)} points. A blank costs nothing — guess only when you can rule some answers out.</p>`:""}
      ${i.length?`<p class="pe-next"><b>Practise next:</b> ${i.map(n=>`<button class="hi-stop" data-act="openStop" data-arg="${n.id}">${p($[n.id].title)} <i>×${n.n}</i></button>`).join("")}</p>`:""}
      <div class="row gap"><button class="btn primary" data-act="paperStart" data-arg="${a.band}|${typeof a.no=="number"&&a.no<u?a.no+1:"fresh"}">${typeof a.no=="number"&&a.no<u?`Paper ${a.no+1}`:"A fresh paper"}</button><button class="btn" data-act="nav" data-arg="hall">The Contest Hall</button></div>
    </div>
    ${t.missed.length?'<h2 class="pe-rh">Every one to look at again</h2>':'<p class="card">Every question right. That is a perfect paper.</p>'}
    ${t.missed.map(({i:n,q:e,given:o})=>`<div class="card pe-item">
      <p class="kicker">Question ${n+1} · ${e.pts} points · ${o==null?"left blank":`you chose ${p(o)}`}</p>
      <p class="pq-text">${p(e.text)}</p>${e.fig?`<div class="pq-fig">${e.fig}</div>`:""}
      <p><b>The answer is ${p(e.ans)}.</b> ${p(e.why)}</p>
      ${$[e.strategy]?`<button class="hi-stop" data-act="openStop" data-arg="${e.strategy}">The way in: ${p($[e.strategy].title)} →</button>`:""}
    </div>`).join("")}
  </section>`}const M=s=>g.includes(s);export{g as HALL_WORLDS,M as hallWorld,D as mmss,I as viewHall,L as viewPaper};
