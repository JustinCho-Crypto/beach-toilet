(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function n(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(a){if(a.ep)return;a.ep=!0;const s=n(a);fetch(a.href,s)}})();const D="fbe0e96c2a0cf53eb16af5781b0bb2ec",lt={banner:"ait.v2.live.__REPLACE_AT_M3__"},q=[{amount:100,p:.994},{amount:500,p:.004},{amount:1e3,p:.002}],Q=10,ct=200,H={lat:35.1587,lng:129.1604},dt=5;function ut(){return new Promise(t=>{if(!("geolocation"in navigator)){t({pos:H,isFallback:!0});return}navigator.geolocation.getCurrentPosition(e=>t({pos:{lat:e.coords.latitude,lng:e.coords.longitude},isFallback:!1}),()=>t({pos:H,isFallback:!0}),{enableHighAccuracy:!0,timeout:8e3,maximumAge:3e4})})}function G(t,e){try{const n=localStorage.getItem(t);return n===null?e:JSON.parse(n)}catch{return e}}function K(t,e){try{localStorage.setItem(t,JSON.stringify(e))}catch{}}const m=[{id:"haeundae",type:"beach",name:"해운대해수욕장",region:"부산 해운대구",lat:35.1587,lng:129.1604,openStart:"6.1",openEnd:"8.31",note:"작년 이용객 1위"},{id:"gwangalli",type:"beach",name:"광안리해수욕장",region:"부산 수영구",lat:35.1532,lng:129.1187,openStart:"6.1",openEnd:"8.31"},{id:"sokcho",type:"beach",name:"속초해수욕장",region:"강원 속초시",lat:38.1901,lng:128.6035,openStart:"6.28",openEnd:"8.25"},{id:"eurwangni",type:"beach",name:"을왕리해수욕장",region:"인천 중구",lat:37.4485,lng:126.3728,openStart:"6.20",openEnd:"8.31"},{id:"yongchu",type:"valley",name:"용추계곡",region:"경기 가평군",lat:37.8859,lng:127.5217,risk:"caution"},{id:"baegundong",type:"valley",name:"백운동계곡",region:"경기 포천시",lat:38.0182,lng:127.4235,risk:"danger"}],g=[{id:"hd-t1",spotId:"haeundae",type:"toilet",name:"중앙 공중화장실",lat:35.1594,lng:129.1598,fee:"free"},{id:"hd-s1",spotId:"haeundae",type:"shower",name:"해변 샤워장 (탈의실)",lat:35.1589,lng:129.1617,fee:"paid",feeAmount:2e3,hotWater:!0},{id:"hd-t2",spotId:"haeundae",type:"toilet",name:"서편 주차장 화장실",lat:35.1598,lng:129.1573,fee:"free"},{id:"hd-t3",spotId:"haeundae",type:"toilet",name:"동편 광장 화장실",lat:35.1585,lng:129.1645,fee:"free"},{id:"hd-s2",spotId:"haeundae",type:"shower",name:"구남로 샤워장",lat:35.1601,lng:129.1608,fee:"paid",feeAmount:1e3},{id:"hd-t4",spotId:"haeundae",type:"toilet",name:"미포 방면 화장실",lat:35.1576,lng:129.1672,fee:"free"},{id:"ga-t1",spotId:"gwangalli",type:"toilet",name:"광안리 중앙 화장실",lat:35.1536,lng:129.1181,fee:"free"},{id:"ga-s1",spotId:"gwangalli",type:"shower",name:"광안리 해변 샤워장",lat:35.1528,lng:129.1199,fee:"paid",feeAmount:2e3},{id:"sc-t1",spotId:"sokcho",type:"toilet",name:"속초해변 동편 화장실",lat:38.1907,lng:128.6041,fee:"free"},{id:"sc-s1",spotId:"sokcho",type:"shower",name:"속초해변 샤워장",lat:38.1896,lng:128.6029,fee:"paid",feeAmount:1500},{id:"ew-t1",spotId:"eurwangni",type:"toilet",name:"을왕리 공중화장실",lat:37.4488,lng:126.3735,fee:"free"},{id:"yc-t1",spotId:"yongchu",type:"toilet",name:"용추계곡 입구 화장실",lat:37.8853,lng:127.5211,fee:"free"},{id:"bu-t1",spotId:"baegundong",type:"toilet",name:"백운동 주차장 화장실",lat:38.0176,lng:127.4229,fee:"free"}];function J(t){return m.find(e=>e.id===t)}function pt(t){return g.filter(e=>e.spotId===t)}function U(t){return g.find(e=>e.id===t)}function A(t,e,n,i){const s=l=>l*Math.PI/180,r=s(n-t),c=s(i-e),d=Math.sin(r/2)**2+Math.cos(s(t))*Math.cos(s(n))*Math.sin(c/2)**2;return 2*6371e3*Math.asin(Math.sqrt(d))}function k(t){return t<1e3?`${Math.round(t)}m`:`${(t/1e3).toFixed(t<1e4?1:0)}km`}const X="bt.reports",z="bt.rewardDaily";function F(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function w(){return G(X,[])}function tt(){const t=G(z,{date:"",count:0});return t.date===F()?t.count:0}function B(){return Math.max(0,Q-tt())}function ft(t){const e=F();return w().some(n=>{if(n.facilityId!==t)return!1;const i=new Date(n.ts);return`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-${String(i.getDate()).padStart(2,"0")}`===e})}function ht(){const t=Math.random();let e=0;for(const{amount:n,p:i}of q)if(e+=i,t<e)return n;return q[0].amount}function gt(t,e){let n=0;e&&B()>0&&(n=ht(),K(z,{date:F(),count:tt()+1}));const i={...t,ts:Date.now(),reward:n},a=w();return a.unshift(i),K(X,a),i}function vt(){return w().reduce((t,e)=>t+e.reward,0)}function T(t){var d;const e=w().filter(l=>l.facilityId===t);if(e.length===0)return{count:0,avgStars:0,clean:null,fee:null,hotWater:null,lastTs:null};const n=e.slice(0,10),i=n.reduce((l,u)=>l+u.stars,0)/n.length,a={clean:0,normal:0,dirty:0};n.forEach(l=>{a[l.clean]+=1});const s=Object.entries(a).sort((l,u)=>u[1]-l[1])[0][0],r=n[0].fee,c=((d=n.find(l=>l.hotWater!==void 0))==null?void 0:d.hotWater)??null;return{count:e.length,avgStars:i,clean:s,fee:r,hotWater:c,lastTs:e[0].ts}}function et(t){const e=Date.now()-t,n=864e5;return e<n?"오늘":e<2*n?"어제":`${Math.floor(e/n)}일 전`}function mt(t){t.innerHTML=`
    <div class="ad-thumb">AD</div>
    <div class="ad-body">
      <div class="ad-t1">배너 광고 영역</div>
      <div class="ad-t2">앱인토스 광고 SDK · ${lt.banner}</div>
    </div>
    <div class="ad-mark">광고</div>`}function yt(){return new Promise(t=>{var i,a;const e=document.getElementById("interstitial");if(!e){t(!1);return}e.hidden=!1,e.innerHTML=`
      <div class="inter-card">
        <div class="inter-label">보상형 전면 광고 지면</div>
        <div class="inter-sub">개발 플레이스홀더 · M3에서 실제 광고로 교체<br>시청 완료 시에만 포인트가 지급돼요</div>
        <button class="inter-close" id="inter-done">광고 시청 완료 (개발용)</button>
        <button class="inter-skip" id="inter-skip">닫기 (시청 중단)</button>
      </div>`;const n=s=>{e.hidden=!0,e.innerHTML="",t(s)};(i=document.getElementById("inter-done"))==null||i.addEventListener("click",()=>n(!0)),(a=document.getElementById("inter-skip"))==null||a.addEventListener("click",()=>n(!1))})}let Z;function f(t){const e=document.getElementById("toast");e&&(e.textContent=t,e.hidden=!1,window.clearTimeout(Z),Z=window.setTimeout(()=>{e.hidden=!0},2200))}function E(t,e){return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="${e}">
    <circle cx="6" cy="3.6" r="2.3"/><rect x="3.6" y="6.7" width="4.8" height="8" rx="2.4"/>
    <rect x="4.2" y="14.4" width="1.7" height="6.4" rx="0.85"/><rect x="6.4" y="14.4" width="1.7" height="6.4" rx="0.85"/>
    <rect x="11.4" y="2" width="1.2" height="20" rx="0.6" opacity=".45"/>
    <circle cx="18" cy="3.6" r="2.3"/><rect x="16.7" y="6.4" width="2.6" height="3.4" rx="1.3"/>
    <path d="M18 7.6 L13.9 15.4 a.7.7 0 0 0 .62 1.02 h6.96 a.7.7 0 0 0 .62-1.02 Z"/>
    <rect x="16.2" y="15.6" width="1.6" height="5.4" rx="0.8"/><rect x="18.3" y="15.6" width="1.6" height="5.4" rx="0.8"/>
  </svg>`}function L(t,e){return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="${e}">
    <path d="M5.5 10.5 V5.4 A3.4 3.4 0 0 1 8.9 2 h1.7 a3.2 3.2 0 0 1 3.1 2.4" fill="none" stroke="${e}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M9.2 8.6 a5.3 3.6 0 0 1 10.6 0 Z"/>
    <circle cx="10.6" cy="12.6" r="1.25"/><circle cx="14.5" cy="13.4" r="1.25"/><circle cx="18.4" cy="12.6" r="1.25"/>
    <circle cx="12.2" cy="16.8" r="1.25"/><circle cx="16.8" cy="17" r="1.25"/><circle cx="14.5" cy="20.6" r="1.25"/>
  </svg>`}function wt(t,e){return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="${e}">
    <path d="M12 2.2 C6.2 2.2 2.6 7.6 2.4 11.4 a.8.8 0 0 0 .8.85 h17.6 a.8.8 0 0 0 .8-.85 C21.4 7.6 17.8 2.2 12 2.2 Z"/>
    <path d="M11.1 12.2 h1.8 V20 a.9.9 0 0 1-1.8 0 Z"/><circle cx="12" cy="21" r="1.15"/>
    <rect x="11.3" y="1" width="1.4" height="2.4" rx="0.7"/>
  </svg>`}function bt(t,e){return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="${e}">
    <path d="M8.2 4.6 a1.1 1.1 0 0 1 1.9 0 L15.6 14 H2.7 Z"/>
    <path d="M15.1 8.2 a1.05 1.05 0 0 1 1.8 0 L21.4 14 H11.6 Z" opacity=".75"/>
    <path d="M2.5 17.2 q2.4-1.7 4.8 0 t4.8 0 t4.8 0 t4.6 0" fill="none" stroke="${e}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M2.5 20.6 q2.4-1.7 4.8 0 t4.8 0 t4.8 0 t4.6 0" fill="none" stroke="${e}" stroke-width="1.9" stroke-linecap="round" opacity=".55"/>
  </svg>`}function b(t,e){return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="${e}">
    <path d="M12 2.6 l2.8 5.9 6.4.8 -4.7 4.4 1.2 6.3 L12 16.9 6.3 20 l1.2-6.3 L2.8 9.3 l6.4-.8 Z"/>
  </svg>`}function N(t,e){return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="${e}">
    <path d="M12 1.8 a7.6 7.6 0 0 0-7.6 7.6 c0 5.4 6.3 11.9 7 12.6 a.85.85 0 0 0 1.2 0 c.7-.7 7-7.2 7-12.6 A7.6 7.6 0 0 0 12 1.8 Z m0 10.3 a2.8 2.8 0 1 1 0-5.6 a2.8 2.8 0 0 1 0 5.6 Z"/>
  </svg>`}const C={clean:"깨끗해요",normal:"보통",dirty:"더러워요"},y={clean:"g",normal:"y",dirty:"r"};function P(){const t=document.getElementById("points-root");if(!t)return;const e=w(),n=B(),i=e.length===0?`<div class="empty">
         아직 제보가 없어요.<br>물놀이 가서 화장실·샤워실을 제보하면<br><b>토스포인트</b>를 드려요!
       </div>`:e.slice(0,30).map(a=>{const s=U(a.facilityId);if(!s)return"";const r=J(s.spotId),c=s.type==="shower"?L(20,"#1B9CF0"):E(20,"#1B9CF0"),d=[et(a.ts),`<span class="dot ${y[a.clean]}"></span> <span class="${y[a.clean]}">${C[a.clean]}</span>`,`<span class="staric">${b(11,"#FFB331")}</span><b class="star">${a.stars}</b>`,a.fee==="free"?"무료":"유료"];return a.hotWater&&d.push("온수"),`<div class="hrow">
          <div class="fic">${c}</div>
          <div class="fbody">
            <div class="fname">${r?`${r.name} `:""}${s.name}</div>
            <div class="fmeta">${d.join(" · ")}</div>
          </div>
          <span class="hreward">${a.reward>0?`+${a.reward.toLocaleString()}원`:"—"}</span>
        </div>`}).join("");t.innerHTML=`
    <div class="pagehead">
      <h2>포인트</h2>
      <div class="sub">제보하고 모은 토스포인트</div>
    </div>

    <div class="pointcard">
      <div class="pc-label">이번 여름에 모은 토스포인트</div>
      <div class="pc-amount">${vt().toLocaleString()}원</div>
      <div class="pc-stats">
        <div class="pc-stat"><div class="k">오늘 남은 보상</div><div class="v">${n} / ${Q}</div></div>
        <div class="pc-sep"></div>
        <div class="pc-stat"><div class="k">내 제보</div><div class="v">${e.length}건</div></div>
      </div>
    </div>

    <div class="hhead">내 제보 이력</div>
    <div class="hlist">${i}</div>
    <div class="disclaimer">현장 200m 이내에서 제보하면 토스포인트를 드려요 · 지급은 광고 시청 완료 기준</div>
  `}let p={stars:4,clean:null,fee:null,hotWater:null},$=null,x=!1;function O(t,e){const n=U(t);if(!n)return;const i=A(e.lat,e.lng,n.lat,n.lng),a=i<=ct;if(ft(t)){f("이 시설은 오늘 이미 제보했어요. 내일 다시 제보할 수 있어요");return}$=t,p={stars:4,clean:null,fee:n.fee??null,hotWater:n.type==="shower"?n.hotWater??null:null};const s=document.getElementById("report-sheet"),r=n.type==="shower"?L(20,"#1B9CF0"):E(20,"#1B9CF0"),c=a?`<span class="badge gps">${N(11,"#1FA85C")} 현장 인증 완료 · ${k(i)} 거리</span>`:`<span class="badge devgps">${N(11,"#D9730D")} 개발 모드 · GPS 인증 생략 (${k(i)})</span>`,d=n.type==="shower"?`
    <div class="fcol">
      <div class="flabel">온수 <span class="fsub">(샤워실)</span></div>
      <div class="segrow" id="seg-hot">
        <button type="button" class="seg" data-hot="true">나와요</button>
        <button type="button" class="seg" data-hot="false">안 나와요</button>
      </div>
    </div>`:"";s.innerHTML=`
    <div class="grab"></div>
    <div class="rhead">
      <div class="fic">${r}</div>
      <span class="rtitle">${n.name} 제보하기</span>
    </div>
    <div class="rgps">${c}</div>

    <div class="flabel mt20">전체적으로 어땠나요?</div>
    <div class="starrow" id="starrow">
      ${[1,2,3,4,5].map(l=>`<button type="button" class="starbtn" data-star="${l}">${b(32,l<=p.stars?"#FFB331":"#E5E8EB")}</button>`).join("")}
    </div>

    <div class="flabel mt20">청결 상태</div>
    <div class="segrow" id="seg-clean">
      ${["clean","normal","dirty"].map(l=>`
        <button type="button" class="seg" data-clean="${l}"><span class="dot ${y[l]}"></span>${C[l]}</button>`).join("")}
    </div>

    <div class="fgrid">
      <div class="fcol">
        <div class="flabel">요금</div>
        <div class="segrow" id="seg-fee">
          <button type="button" class="seg" data-fee="free">무료</button>
          <button type="button" class="seg" data-fee="paid">유료</button>
        </div>
      </div>
      ${d}
    </div>

    <button type="button" class="cta" id="btn-submit">제보하고 토스 포인트 받기</button>
    <div class="ctasub">광고를 보면 100~1,000원 토스포인트를 드려요 · 오늘 남은 보상 ${B()}회</div>
  `,s.hidden=!1,document.getElementById("report-dim").hidden=!1,kt(n.type==="shower"),v()}function nt(){document.getElementById("report-sheet").hidden=!0,document.getElementById("report-dim").hidden=!0,$=null}function kt(t){document.querySelectorAll("#starrow .starbtn").forEach(e=>{e.addEventListener("click",()=>{p.stars=Number(e.dataset.star),v()})}),document.querySelectorAll("#seg-clean .seg").forEach(e=>{e.addEventListener("click",()=>{p.clean=e.dataset.clean,v()})}),document.querySelectorAll("#seg-fee .seg").forEach(e=>{e.addEventListener("click",()=>{p.fee=e.dataset.fee,v()})}),t&&document.querySelectorAll("#seg-hot .seg").forEach(e=>{e.addEventListener("click",()=>{p.hotWater=e.dataset.hot==="true",v()})}),document.getElementById("btn-submit").addEventListener("click",$t),document.getElementById("report-dim").addEventListener("click",nt)}function v(){document.querySelectorAll("#starrow .starbtn").forEach(e=>{const n=Number(e.dataset.star);e.innerHTML=b(32,n<=p.stars?"#FFB331":"#E5E8EB")}),document.querySelectorAll("#seg-clean .seg").forEach(e=>{e.classList.toggle("on",e.dataset.clean===p.clean)}),document.querySelectorAll("#seg-fee .seg").forEach(e=>{e.classList.toggle("on",e.dataset.fee===p.fee)}),document.querySelectorAll("#seg-hot .seg").forEach(e=>{e.classList.toggle("on",p.hotWater!==null&&e.dataset.hot===String(p.hotWater))});const t=document.getElementById("btn-submit");t&&t.classList.toggle("disabled",p.clean===null||p.fee===null)}async function $t(){if(x||!$)return;if(p.clean===null||p.fee===null){f("청결 상태와 요금을 선택해 주세요");return}x=!0;const t=$;try{const e=await yt(),n=gt({facilityId:t,stars:p.stars,clean:p.clean,fee:p.fee,...p.hotWater!==null?{hotWater:p.hotWater}:{}},e);nt(),n.reward>0?f(`제보 완료! 토스포인트 ${n.reward.toLocaleString()}원이 지급됐어요`):f(e?"제보 완료! 오늘 보상 횟수를 모두 사용했어요":"제보가 저장됐어요 (광고 시청을 완료하면 포인트를 드려요)"),Lt(),P()}finally{x=!1}}let o=null;function at(t,e){const n=t.type==="valley",i=`pin spot${n?" valley":""}${e?" selected":""}`,a=n?bt(20,"#fff"):wt(22,"#fff"),s=t.risk==="danger"?'<div class="dbadge">위험</div>':"";return`<button type="button" class="${i}" data-spot="${t.id}" aria-label="${t.name}">
    <div class="pbody"><div class="pbubble">${a}</div>${s}</div>
    <div class="plabel">${t.name}</div>
  </button>`}function st(t,e){const n=T(t.id),a=`pin fac ${n.clean==="clean"?"ring-g":n.clean==="normal"?"ring-y":n.clean==="dirty"?"ring-r":"ring-n"}`,s=t.type==="shower"?L(17,"#1B9CF0"):E(17,"#4E5968");return`<button type="button" class="${a}" data-fac="${t.id}" aria-label="${t.name}">
    <div class="pbody"><div class="fbubble">${s}</div></div>
  </button>`}function R(){return o?o.filter==="beach"?m.filter(t=>t.type==="beach"):o.filter==="valley"?m.filter(t=>t.type==="valley"):m:[]}function it(){if(!o)return[];if(o.filter==="toilet")return g.filter(t=>t.type==="toilet");if(o.filter==="shower")return g.filter(t=>t.type==="shower");if(o.filter==="beach"||o.filter==="valley"){const t=new Set(R().map(e=>e.id));return g.filter(e=>t.has(e.spotId))}return g}function Et(t,e){const n=T(t.id),i=k(A(e.lat,e.lng,t.lat,t.lng)),a=t.type==="shower"?L(20,"#1B9CF0"):E(20,"#1B9CF0");let s;if(n.count===0)s=`${i} · 아직 제보 없음 · <b class="first">첫 제보 포인트 2배</b>`;else{const r=[i,`<span class="dot ${y[n.clean]}"></span> <span class="${y[n.clean]}">${C[n.clean]}</span>`,`<span class="staric">${b(11,"#FFB331")}</span><b class="star">${n.avgStars.toFixed(1)}</b>`],c=n.fee??t.fee;c&&r.push(c==="free"?"무료":`유료${t.feeAmount?` ${t.feeAmount.toLocaleString()}원`:""}`),t.type==="shower"&&(n.hotWater??t.hotWater)&&r.push("온수"),n.lastTs&&r.push(`제보 ${et(n.lastTs)}`),s=r.join(" · ")}return`<button type="button" class="frow" data-fac="${t.id}">
    <div class="fic">${a}</div>
    <div class="fbody"><div class="fname">${t.name}</div><div class="fmeta">${s}</div></div>
    <svg width="15" height="15" viewBox="0 0 24 24" class="fchev"><path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`}function _(t){if(!o)return;const e=J(t);if(!e)return;o.selectedSpotId=t;const n=document.getElementById("spot-sheet"),i=pt(t),a=i.filter(u=>u.type==="toilet").length,s=i.filter(u=>u.type==="shower").length,r=i.map(u=>T(u.id)).filter(u=>u.count>0),c=r.length?(r.reduce((u,h)=>u+h.avgStars,0)/r.length).toFixed(1):"-",d=e.type==="beach"?'<span class="badge open">개장중</span>':e.risk==="danger"?'<span class="badge danger">위험지역</span>':e.risk==="caution"?'<span class="badge caution">중점관리</span>':'<span class="badge open">일반지역</span>',l=[e.region];e.openStart&&l.push(`개장 ${e.openStart} ~ ${e.openEnd}`),e.note&&l.push(e.note),e.type==="valley"&&l.push("생활안전지도 물놀이관리지역"),n.innerHTML=`
    <div class="grab"></div>
    <div class="srow1"><span class="sname">${e.name}</span>${d}</div>
    <div class="ssub">${l.join(" · ")}</div>
    <div class="stats">
      <div class="stat"><div class="v">${a}</div><div class="k">화장실</div></div>
      <div class="sep"></div>
      <div class="stat"><div class="v">${s}</div><div class="k">샤워실</div></div>
      <div class="sep"></div>
      <div class="stat"><div class="v"><span class="staric">${b(13,"#FFB331")}</span> ${c}</div><div class="k">평균 별점</div></div>
    </div>
    <div class="frows">${i.map(u=>Et(u,o.myPos)).join("")}</div>
  `,n.hidden=!1,n.querySelectorAll(".frow").forEach(u=>{u.addEventListener("click",()=>O(u.dataset.fac,o.myPos))}),M()}function W(){if(!o)return;o.selectedSpotId=null;const t=document.getElementById("spot-sheet");t.hidden=!0,M()}function Lt(){o&&(o.selectedSpotId?_(o.selectedSpotId):M())}const S="[kakao-map]";function Mt(){return new Promise(t=>{var s,r;if((r=(s=window.kakao)==null?void 0:s.maps)!=null&&r.Map){t(!0);return}if(D.startsWith("__REPLACE")){console.warn(`${S} JS 키 미설정 — 목업 지도로 폴백합니다. .env.local의 VITE_KAKAO_JS_KEY를 확인하세요.`),t(!1);return}let e=!1;const n=(c,d)=>{e||(e=!0,c||console.error(`${S} 로드 실패 — 목업 지도로 폴백합니다. 원인: ${d}`),t(c))},i=window.setTimeout(()=>n(!1,"script 태그 로드 타임아웃(8s) — 네트워크 또는 키 형식 확인"),8e3),a=document.createElement("script");a.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${D}&autoload=false`,a.onload=()=>{var d;if(window.clearTimeout(i),!((d=window.kakao)!=null&&d.maps)){n(!1,"script는 로드됐으나 window.kakao.maps 없음");return}const c=window.setTimeout(()=>n(!1,"kakao.maps.load() 콜백 타임아웃(6s) — Web 플랫폼에 현재 도메인이 등록됐는지 확인 (개발자센터 > 플랫폼)"),6e3);try{window.kakao.maps.load(()=>{window.clearTimeout(c),n(!0)})}catch(l){window.clearTimeout(c),n(!1,`kakao.maps.load() 호출 중 예외: ${l}`)}},a.onerror=()=>{window.clearTimeout(i),n(!1,"script 태그 로드 에러(네트워크/404) — appkey 값 확인")},document.head.appendChild(a)})}function j(t,e){const n=document.createElement("div");n.innerHTML=t;const i=n.firstElementChild;return i.addEventListener("click",a=>{a.stopPropagation(),e()}),i}function xt(t){if(!o)return;const{kakao:e}=window,n=new e.maps.Map(t,{center:new e.maps.LatLng(o.myPos.lat,o.myPos.lng),level:dt});o.kakaoMap=n,e.maps.event.addListener(n,"click",()=>W()),ot();const i=document.createElement("div");i.className="mydot",new e.maps.CustomOverlay({position:new e.maps.LatLng(o.myPos.lat,o.myPos.lng),content:i,map:n,zIndex:5})}function ot(){if(!(o!=null&&o.kakaoMap))return;const{kakao:t}=window;o.kakaoOverlays.forEach(e=>e.setMap(null)),o.kakaoOverlays=[];for(const e of it()){const n=j(st(e),()=>O(e.id,o.myPos)),i=new t.maps.CustomOverlay({position:new t.maps.LatLng(e.lat,e.lng),content:n,map:o.kakaoMap,yAnchor:1,zIndex:10});o.kakaoOverlays.push(i)}for(const e of R()){const n=j(at(e,o.selectedSpotId===e.id),()=>_(e.id)),i=new t.maps.CustomOverlay({position:new t.maps.LatLng(e.lat,e.lng),content:n,map:o.kakaoMap,yAnchor:1,zIndex:20});o.kakaoOverlays.push(i)}}const Y={lat:.007,lng:.011};function V(t,e){if(!o)return{x:0,y:0};const n=t.clientWidth,i=t.clientHeight,a=(e.lng-o.myPos.lng)/Y.lng*(n/2)+n/2,s=(o.myPos.lat-e.lat)/Y.lat*(i/2)+i/2;return{x:a,y:s}}function St(t){if(!o)return;t.classList.add("mockmap"),t.innerHTML=`
    <svg class="basemap" width="100%" height="100%" viewBox="0 0 390 700" preserveAspectRatio="xMidYMid slice">
      <rect width="390" height="700" fill="#F1F3EE"/>
      <g fill="#E7EAE3">
        <rect x="-20" y="10" width="120" height="90" rx="6"/><rect x="115" y="-10" width="150" height="110" rx="6"/>
        <rect x="280" y="20" width="130" height="80" rx="6"/><rect x="-30" y="115" width="105" height="120" rx="6"/>
        <rect x="90" y="115" width="80" height="70" rx="6"/><rect x="185" y="115" width="120" height="95" rx="6"/>
        <rect x="320" y="115" width="90" height="95" rx="6"/><rect x="90" y="200" width="80" height="85" rx="6"/>
        <rect x="-30" y="250" width="105" height="60" rx="6"/><rect x="185" y="225" width="60" height="60" rx="6"/>
      </g>
      <g fill="#DCEBD1"><rect x="250" y="230" width="100" height="70" rx="14"/></g>
      <g stroke="#FFFFFF" fill="none" stroke-linecap="round">
        <path d="M82 -10 L82 420" stroke-width="12"/>
        <path d="M-10 105 L400 105" stroke-width="12"/>
        <path d="M175 -10 L175 420" stroke-width="10"/>
        <path d="M-10 292 L400 292" stroke-width="10"/>
        <path d="M310 -10 L312 420" stroke-width="9"/>
      </g>
      <path d="M-5 430 Q195 405 395 435" stroke="#FFD98E" stroke-width="9" fill="none"/>
      <path d="M0 440 Q195 416 390 445 L390 545 Q195 575 0 532 Z" fill="#F9E7BA"/>
      <path d="M0 532 Q195 575 390 545 L390 700 L0 700 Z" fill="#7CC8F8"/>
      <path d="M0 566 Q195 605 390 578 L390 700 L0 700 Z" fill="#57B7F6" opacity=".65"/>
      <path d="M0 620 Q195 650 390 632 L390 700 L0 700 Z" fill="#3AA6F3" opacity=".55"/>
      <g stroke="#FFFFFF" opacity=".55" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M34 590 q19 -9 38 0 t38 0"/><path d="M216 630 q19 -9 38 0 t38 0"/><path d="M96 668 q19 -9 38 0 t38 0"/>
      </g>
    </svg>
    <div class="mock-badge">지도 미리보기 · 카카오맵 연동 전</div>
    <div class="mock-layer"></div>`;const e=t.querySelector(".mock-layer");e.addEventListener("click",()=>W()),I(t,e),new ResizeObserver(()=>I(t,e)).observe(t)}function I(t,e){if(!o||t.clientWidth===0||t.clientHeight===0)return;e.innerHTML="";const n=document.createElement("div");n.className="mydot";const i=V(t,o.myPos);n.style.left=`${i.x}px`,n.style.top=`${i.y}px`,e.appendChild(n);const a=(s,r,c)=>{const{x:d,y:l}=V(t,r);if(d<12||d>t.clientWidth-12||l<24||l>t.clientHeight-24)return;const u=document.createElement("div");u.innerHTML=s;const h=u.firstElementChild;h.style.left=`${d}px`,h.style.top=`${l}px`,h.addEventListener("click",rt=>{rt.stopPropagation(),c()}),e.appendChild(h)};for(const s of it())a(st(s),{lat:s.lat,lng:s.lng},()=>O(s.id,o.myPos));for(const s of R())a(at(s,o.selectedSpotId===s.id),{lat:s.lat,lng:s.lng},()=>_(s.id))}function M(){if(o)if(o.kakaoMap)ot();else{const t=document.getElementById("map-container"),e=t.querySelector(".mock-layer");e&&I(t,e)}}function It(){document.querySelectorAll("#chiprow .fchip").forEach(t=>{t.addEventListener("click",()=>{o&&(o.filter=t.dataset.filter,document.querySelectorAll("#chiprow .fchip").forEach(e=>{e.classList.toggle("on",e===t)}),M())})})}async function At(t){o={myPos:t,filter:"all",selectedSpotId:null,kakaoMap:null,kakaoOverlays:[]};const e=document.getElementById("map-container"),n=await Mt();let i=!1;if(n)try{xt(e),i=!0}catch(c){console.error(`${S} 지도 초기화 중 예외 — 목업 지도로 폴백합니다:`,c)}i||St(e),It();const a=document.getElementById("map-chip"),s=document.getElementById("map-chip-text"),r=m.map(c=>({s:c,d:A(t.lat,t.lng,c.lat,c.lng)})).sort((c,d)=>c.d-d.d)[0];s.textContent=r.d<=3e3?`${r.s.name} 근처예요`:`가까운 물놀이 스팟 ${k(r.d)}`,a.hidden=!1,document.getElementById("btn-locate").addEventListener("click",()=>{o!=null&&o.kakaoMap?o.kakaoMap.setCenter(new window.kakao.maps.LatLng(t.lat,t.lng)):f("현재 위치 기준으로 표시 중이에요")})}function Ft(t){document.getElementById("view-map").hidden=t!=="map",document.getElementById("view-points").hidden=t!=="points",document.querySelectorAll("#tabbar .tab").forEach(e=>{e.classList.toggle("active",e.dataset.tab===t)}),t==="points"&&(W(),P())}async function Bt(){mt(document.getElementById("ad-banner")),document.querySelectorAll("#tabbar .tab").forEach(n=>{n.addEventListener("click",()=>Ft(n.dataset.tab))}),P();const{pos:t,isFallback:e}=await ut();await At(t),e&&f("위치 권한이 없어 해운대 기준으로 표시해요")}Bt().catch(t=>{console.error(t),f("불러오지 못했어요. 잠시 후 다시 시도해 주세요.")});
