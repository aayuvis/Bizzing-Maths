import{U as $,V as b}from"./index-D9YKtW2X.js";const k=(n,e=80,o=5,d=1.2)=>e+o*Math.sin(n/100*Math.PI*2*d+.6);function M({img:n,stops:e,here:o=-1,sel:d=-1,me:r="",minWidth:g=980,band:x=[80,5,1.2],aspect:m="1920/815"}){const p=e.length,s=e.map((t,a)=>6+88*a/Math.max(1,p-1)),c=t=>k(t,...x);let l="";for(let t=0;t<=100;t+=2)l+=`${t?"L":"M"}${t},${c(t).toFixed(2)} `;const h=e.filter(t=>t.state==="done").length,u=h?s[Math.min(h,p-1)]:0;let i="";for(let t=0;t<=u;t+=2)i+=`${t?"L":"M"}${t},${c(t).toFixed(2)} `;const v=d>=0?d:Math.max(0,o);return`<div class="board-scroll" data-autoscroll="${s[v]||0}">
    <div class="board" style="min-width:${g}px;aspect-ratio:${m}">
      <img src="art/${$(n)}.webp" alt="" width="1920" height="815" style="object-position:50% 70%">
      <svg class="road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="${l}" class="rd-edge"/><path d="${l}" class="rd"/>${i?`<path d="${i}" class="rd-walk"/>`:""}
      </svg>
      ${e.map((t,a)=>`<button class="bpin${t.state==="done"?" done":""}${t.state==="locked"?" shut":""}${a===o?" cur":""}${a===d?" sel":""}" style="left:${s[a]}%;top:${c(s[a])}%"
          data-act="${t.act}" data-arg="${$(t.arg)}" aria-label="${$(t.label)}${t.state==="locked"?", not reached yet":t.state==="done"?", passed":""}">
          <span>${t.state==="done"?b("check",16):t.state==="locked"?b("lock",16):a+1}</span>${t.badge||""}${a===o&&r?`<i class="me">${r}</i>`:""}</button>`).join("")}
    </div>
  </div>`}export{M as p};
