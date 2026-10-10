import{k,R as c,e as r,a as x,p as S,g as h,w as d,t as f,i as y,b as p}from"./index-CaOJYatV.js";import{LETTERS as A,bandFor as T,practiseNext as F}from"./engine-Bew105Zv.js";import{B as b,a as P,F as g}from"./bands-CDWXAZ9x.js";import"./kit-DXxu8GKb.js";const $={"yc-hens-and-rabbits":"fangcheng","old-wheels":"fangcheng","yc-sum-and-difference":"sutra-equations","old-egg-remainders":"sunzi-multipliers","old-crt-above":"sunzi-multipliers","yc-half-squares-area":"out-in","old-grid-area":"out-in","old-cut-corners":"out-in","old-rect-point":"out-in","yc-ways-to-pay":"hundred-fowls","old-sum-product":"quadratic-split"},v=["strategy","logic","figures"],m=(e,t)=>(e.tricks[t]||{}).stars||0;function B(e,t){const s=f(t),i=s.filter(o=>m(e,o.id)>=2).length;return{ts:s,passed:i,n:s.length}}function C(e){const t=v.filter(i=>d(i)).map(i=>{const o=d(i),n=B(e,i);return{kind:"world",id:i,label:o.name,glyph:o.glyph,blurb:o.blurb,s:n,done:n.n&&n.passed===n.n}}),s=(e.papers||{}).log||[];return[...t,{kind:"papers",id:"papers",label:"The Paper Hall",glyph:"📝",blurb:"Contest-style papers against the clock: three sections, worth 3, 4 and 5 points.",done:s.length>0}]}function G(){const e=k(c.h),t=C(e),s=t.findIndex(u=>!u.done),i=c.ui.hsel!=null&&t[c.ui.hsel]?c.ui.hsel:Math.max(0,s),o=`<img class="av" src="avatars/${r(x(e.avatar))}.webp" width="34" height="34" alt="">`,n=S({img:"j-contest",here:s,sel:i,me:o,minWidth:980,aspect:"1920/640",band:[76,6,1.1],stops:t.map((u,w)=>({label:u.label,state:u.done?"done":"open",act:"hallPick",arg:String(w),badge:`<em class="hall-g" aria-hidden="true">${h(u.glyph,24)}</em>`}))}),a=t[i],l=a.kind==="world"?`<div class="pick-t"><p class="kicker">${a.s.passed} of ${a.s.n} strategies passed</p><h2 class="hall-h">${h(a.glyph,26)} ${r(a.label)}</h2><p class="pick-hook">${r(a.blurb||"")}</p></div>
       <div class="pick-go"><button class="btn primary big" data-act="openWorld" data-arg="${a.id}">Go in</button></div>`:`<div class="pick-t"><p class="kicker">${((e.papers||{}).log||[]).length} papers sat</p><h2 class="hall-h">${h("📝",26)} The Paper Hall</h2><p class="pick-hook">${r(a.blurb)}</p></div>
       <div class="pick-go"><button class="btn primary big" data-act="hallPapers">Choose a paper</button></div>`;return`<section class="hall">
    <div class="hall-head"><h1 class="hall-t">The Contest Hall</h1><span class="muted small">Contest-style practice · every problem proved to have one answer</span></div>
    ${n}
    <div class="card pick">${l}</div>
    ${D(e)}
    ${E(e)}
  </section>`}function D(e){const t=c.ui.pband||T(e),s=b[t],i=(e.papers||{}).best||{},o=e.paperDraft;return`<div class="card papers" id="papers">
    <div class="papers-top"><p class="kicker">Contest-style papers</p>
      <div class="seg" role="tablist" aria-label="Grade band">${P.map(n=>`<button role="tab" aria-selected="${n===t}" class="${n===t?"on":""}" data-act="pband" data-arg="${n}">${b[n].label}</button>`).join("")}</div></div>
    ${o?`<div class="paper-resume"><span>You were part-way through <b>${o.no==="fresh"||typeof o.no=="string"?"a fresh paper":"Paper "+o.no}</b> (${r(b[o.band].label)}).</span><button class="btn" data-act="paperResume">Carry on</button></div>`:""}
    <p class="muted small">${s.label} · ${s.per*3} questions · ${s.per} each worth 3, 4 and 5 points · ${s.mins} minutes. You start with ${s.per*3} points; a wrong answer loses a quarter of its points, a blank loses nothing.</p>
    <div class="paper-grid">${Array.from({length:g},(n,a)=>a+1).map(n=>{const a=i[`${t}:${n}`],l=s.per*3+s.per*12;return`<button class="pg${a!=null?" sat":""}" data-act="paperStart" data-arg="${t}|${n}" aria-label="Paper ${n}${a!=null?`, best ${Math.round(a)} of ${l}`:""}"><b>${n}</b>${a!=null?`<i>${Math.round(100*a/l)}%</i>`:""}</button>`}).join("")}</div>
    <div class="row gap"><button class="btn" data-act="paperStart" data-arg="${t}|fresh">A fresh paper</button><button class="btn" data-act="nav" data-arg="contest">The mock contest</button></div>
  </div>`}function E(e){return`<div class="card hall-index"><p class="kicker">The thirty ways in</p>
    ${v.filter(t=>d(t)).map(t=>`<div class="hi-w"><b class="hall-h">${h(d(t).glyph,20)} ${r(d(t).name)}</b>
      <div class="hi-s">${f(t).map(s=>`<button class="hi-stop${m(e,s.id)>=2?" done":""}" data-act="openStop" data-arg="${s.id}">${m(e,s.id)>=2?y("check",14)+" ":""}${r(s.title)}</button>`).join("")}</div></div>`).join("")}
  </div>`}const H=e=>{const t=Math.max(0,Math.ceil(e/1e3));return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`};function Q(){const e=c.paper;if(!e)return"";if(e.over)return M(e);const t=e.p,s=e.i,i=t.items[s],o=b[t.band],n=e.answers.filter(a=>a!=null).length;return`<section class="paper">
    <div class="paper-bar">
      <button class="play-x" data-act="paperQuit" aria-label="Leave the paper (it is kept)">✕</button>
      <span class="paper-name"><b>${typeof t.no=="number"?`Paper ${t.no}`:"A fresh paper"}</b> · ${r(o.label)}</span>
      <span class="chip">${i.pts}-point question</span>
      <span class="paper-time mono" id="ptime" aria-live="off">${H(e.endsAt-Date.now())}</span>
      <button class="btn small" data-act="paperFinish">Finish</button>
    </div>
    <nav class="paper-nav" aria-label="Questions">${t.items.map((a,l)=>`<button class="pn${l===s?" on":""}${e.answers[l]!=null?" ans":""} t${a.tier}" data-act="paperGo" data-arg="${l}" aria-label="Question ${l+1}${e.answers[l]!=null?", answered":""}">${l+1}</button>`).join("")}</nav>
    <div class="card paper-q">
      <p class="kicker">Question ${s+1} of ${t.items.length} · ${n} answered</p>
      <p class="pq-text">${r(i.text)}</p>
      ${i.fig?`<div class="pq-fig">${i.fig}</div>`:""}
      <div class="pq-choices" role="radiogroup" aria-label="Answers">${i.choices.map((a,l)=>`<button class="pc${e.answers[s]===a?" on":""}" role="radio" aria-checked="${e.answers[s]===a}" data-act="paperPick" data-arg="${r(a)}"><b>${A[l]}</b><span>${r(a)}</span></button>`).join("")}</div>
      <div class="pq-go">
        <button class="btn" data-act="paperGo" data-arg="${s-1}" ${s?"":"disabled"}>← Back</button>
        ${e.answers[s]!=null?'<button class="btn small linkish" data-act="paperClear">Leave it blank</button>':""}
        <button class="btn" data-act="paperGo" data-arg="${s+1}" ${s<t.items.length-1?"":"disabled"}>${e.answers[s]==null?"Skip →":"Next →"}</button>
      </div>
      <p class="muted small pq-keys">Keys: A–E choose · ← → move · Backspace leaves it blank</p>
    </div>
  </section>`}function M(e){const t=e.p,s=e.sc,i=b[t.band],o=F(s).filter(n=>p[n.id]).slice(0,4);return`<section class="paper-end">
    <div class="card pe-head">
      <p class="kicker">${typeof t.no=="number"?`Paper ${t.no}`:"A fresh paper"} · ${r(i.label)}</p>
      <h1 class="pe-score">${+s.points.toFixed(2)} <small>of ${s.max} points</small></h1>
      <p>${s.right} right · ${s.wrong} wrong · ${s.blank} left blank${e.timeUp?" · the time ran out":""}</p>
      <div class="pe-tiers">${[3,4,5].map(n=>{const a=s.tiers[n]||{right:0,n:0};return`<div><b>${a.right}/${a.n}</b><span>${n}-point questions</span></div>`}).join("")}</div>
      ${e.pay?`<p class="c-pay">${y("coin",18)} <span>${r(e.pay.line)}</span></p>`:""}
      ${s.wrong?`<p class="muted small">${s.wrong} wrong answer${s.wrong>1?"s":""} cost ${+t.items.filter((n,a)=>e.answers[a]!=null&&e.answers[a]!==n.ans).reduce((n,a)=>n+a.pts/4,0).toFixed(2)} points. A blank costs nothing — guess only when you can rule some answers out.</p>`:""}
      ${o.length?`<p class="pe-next"><b>Practise next:</b> ${o.map(n=>`<button class="hi-stop" data-act="openStop" data-arg="${n.id}">${r(p[n.id].title)} <i>×${n.n}</i></button>`).join("")}</p>`:""}
      <div class="row gap"><button class="btn primary" data-act="paperStart" data-arg="${t.band}|${typeof t.no=="number"&&t.no<g?t.no+1:"fresh"}">${typeof t.no=="number"&&t.no<g?`Paper ${t.no+1}`:"A fresh paper"}</button><button class="btn" data-act="nav" data-arg="hall">The Contest Hall</button></div>
    </div>
    ${s.missed.length?'<h2 class="pe-rh">Every one to look at again</h2>':'<p class="card">Every question right. That is a perfect paper.</p>'}
    ${s.missed.map(({i:n,q:a,given:l})=>`<div class="card pe-item">
      <p class="kicker">Question ${n+1} · ${a.pts} points · ${l==null?"left blank":`you chose ${r(l)}`}</p>
      <p class="pq-text">${r(a.text)}</p>${a.fig?`<div class="pq-fig">${a.fig}</div>`:""}
      <p><b>The answer is ${r(a.ans)}.</b> ${r(a.why)}</p>
      ${p[a.strategy]?`<button class="hi-stop" data-act="openStop" data-arg="${a.strategy}">The way in: ${r(p[a.strategy].title)} →</button>`:""}
      ${p[$[a.tid]]?`<button class="hi-stop hi-method" data-act="openStop" data-arg="${$[a.tid]}">Another way in, from ${r(d(p[$[a.tid]].world).name)}: ${r(p[$[a.tid]].title)} →</button>`:""}
    </div>`).join("")}
  </section>`}const R=e=>v.includes(e);export{v as HALL_WORLDS,R as hallWorld,H as mmss,G as viewHall,Q as viewPaper};
