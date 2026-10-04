// features.js – analytics layer (loaded after app.js)
const T={sort:'score',dir:-1,q:'',status:'All',sector:'All'};
function toast(m,k='ok'){let h=document.getElementById('toasts');if(!h){h=document.createElement('div');h.id='toasts';document.body.appendChild(h)}
 const e=document.createElement('div');e.className='toast '+k;e.textContent=m;h.appendChild(e);setTimeout(()=>e.classList.add('out'),2600);setTimeout(()=>e.remove(),3000)}
// composite priority score 0-100: severity 50%, growth 30%, uncovered capacity 20%
const score=r=>{const sev=Math.min(1,Math.max(0,r.gap)/r.demand/.5),gr=Math.min(1,r.growth/35),cov=r.gap>0?Math.min(1,r.seats/r.gap):1;return Math.round((sev*.5+gr*.3+(1-cov)*.2)*100)};
const lvl=s=>s>=60?'hi':s>=35?'md':'lo';
// ---- Skill Gap page with search / filter / sort ----
pages.gaps=async function(){
 const raw=await get('/api/skill-gaps?'+q());raw.forEach(r=>r.score=score(r));
 const sec=['All',...new Set(raw.map(r=>r.sector))],sts=['All','Critical Shortage','Emerging Shortage','Balanced','Oversupply'];
 const cols=[['skill','Skill'],['demand','Demand'],['supply','Supply'],['gap','Gap'],['growth','Growth'],['status','Status'],['score','Priority Score']];
 V.innerHTML=`<h2>Skill Gap Intelligence</h2><div class="toolbar"><input id="gq" placeholder="Search skill..." value="${T.q}">
 <select id="gs">${sts.map(s=>`<option ${s==T.status?'selected':''}>${s}</option>`).join('')}</select>
 <select id="gc">${sec.map(s=>`<option ${s==T.sector?'selected':''}>${s}</option>`).join('')}</select><span id="gn" class="chip"></span></div>
 <div class="grid g2"><div class="card tw"><table id="gt"></table></div><div class="card"><b>Status distribution</b><canvas id="c4"></canvas></div></div>
 <div class="card"><canvas id="c3"></canvas></div>`;
 const draw=()=>{const d=raw.filter(r=>(T.status=='All'||r.status==T.status)&&(T.sector=='All'||r.sector==T.sector)&&r.skill.toLowerCase().includes(T.q.toLowerCase()))
   .sort((a,b)=>(typeof a[T.sort]=='string'?a[T.sort].localeCompare(b[T.sort]):a[T.sort]-b[T.sort])*T.dir);
  $('#gn').textContent=`${d.length} of ${raw.length} skills · net gap ${fmt(d.reduce((s,r)=>s+Math.max(0,r.gap),0))}`;
  $('#gt').innerHTML=`<tr>${cols.map(([k,l])=>`<th class="sortable" onclick="T.dir=T.sort=='${k}'?-T.dir:-1;T.sort='${k}';gdraw()">${l}${T.sort==k?(T.dir>0?' ▲':' ▼'):''}</th>`).join('')}</tr>`+
   d.map(r=>`<tr><td><b>${r.skill}</b><div class="sev"><i style="width:${Math.min(100,Math.max(0,r.gap)/r.demand*200)}%"></i></div></td><td>${fmt(r.demand)}</td><td>${fmt(r.supply)}</td><td>${r.gap>0?'+':''}${fmt(r.gap)}</td><td>+${r.growth}%</td><td>${badge(r.status)}</td><td><span class="score ${lvl(r.score)}">${r.score}</span></td></tr>`).join('')||'<tr><td colspan="7">No skills match the filters.</td></tr>';
  chart('c3','bar',d.map(x=>x.skill),[{label:'Demand',data:d.map(x=>x.demand),backgroundColor:'#0b2a5b'},{label:'Supply',data:d.map(x=>x.supply),backgroundColor:'#14b8a6'}]);
  const cnt=sts.slice(1).map(s=>d.filter(r=>r.status==s).length);if(CH.c4)CH.c4.destroy();
  if(window.Chart)CH.c4=new Chart($('#c4'),{type:'doughnut',data:{labels:sts.slice(1),datasets:[{data:cnt,backgroundColor:['#ef4444','#f59e0b','#22c55e','#3b82f6']}]},options:{cutout:'62%',animation:{duration:900}}})};
 window.gdraw=draw;$('#gq').oninput=e=>{T.q=e.target.value;draw()};$('#gs').onchange=e=>{T.status=e.target.value;draw()};$('#gc').onchange=e=>{T.sector=e.target.value;draw()};draw()};
// ---- Dashboard: gauge, risk leaderboard, animated pipeline ----
const _dash=pages.dashboard;
pages.dashboard=async function(){await _dash();const [d,g]=await Promise.all([get('/api/dashboard?'+q()),get('/api/skill-gaps?'+q())]);
 const al=d.kpis[5].value,top=g.map(r=>({...r,score:score(r)})).sort((a,b)=>b.score-a.score).slice(0,4),steps=['Data','Cleaning','Mapping','Forecast','Gap','Recommend','Action'];
 const col=al>=90?'#22c55e':al>=70?'#f59e0b':'#ef4444';
 $('.k6').insertAdjacentHTML('afterend',`<div class="grid g3"><div class="card gauge"><b>Demand-Supply Alignment</b><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="gbg"/><circle cx="60" cy="60" r="52" class="gfg" style="--v:${al};stroke:${col}"/><text x="60" y="66" text-anchor="middle">${al}%</text></svg><small>${al>=90?'Healthy':al>=70?'Watch closely':'Action required'}</small></div>
 <div class="card"><b>Risk Leaderboard</b>${top.map((r,i)=>`<div class="rk"><span>${i+1}. ${r.skill}</span><div class="bar"><i class="${lvl(r.score)}" style="width:${r.score}%"></i></div><b>${r.score}</b></div>`).join('')}</div>
 <div class="card"><b>Intelligence Pipeline</b><div class="pipe">${steps.map((s,i)=>`<span style="--i:${i}">${s}</span>`).join('')}</div></div></div>`)};
// ---- Regional: capacity simulator ----
const _reg=pages.regional;
pages.regional=async function(){await _reg();const rows=(await get('/api/skill-gaps?'+q())).filter(r=>r.gap>0);if(!rows.length)return;
 V.insertAdjacentHTML('beforeend',`<div class="card sim"><h2>Capacity Simulator – ${S.di}</h2><div class="toolbar"><select id="ss">${rows.map((r,i)=>`<option value="${i}">${r.skill}</option>`).join('')}</select>
 <label>Extra seats: <b id="sv">0</b></label><input id="sr" type="range" min="0" max="20000" step="100" value="0"></div><div id="so" class="grid k6"></div></div>`);
 const run=()=>{const r=rows[$('#ss').value],n=+$('#sr').value,out=Math.round(n*.74),rem=Math.max(0,r.gap-out),cl=Math.min(100,Math.round(out/r.gap*100)),yrs=out?Math.ceil(r.gap/out):'∞';
  $('#sv').textContent=fmt(n);$('#so').innerHTML=[['Current gap',fmt(r.gap)],['Added graduates / yr',fmt(out)],['Remaining gap',fmt(rem)],['Gap closed',cl+'%'],['Years to close',yrs],['Est. cost (₹25k/seat)','₹'+(n*25000/1e7).toFixed(2)+' Cr']].map(([a,b])=>`<div class="card"><div class="lbl">${a}</div><div class="val">${b}</div></div>`).join('')};
 $('#ss').onchange=$('#sr').oninput=run;run()};
// ---- toasts, horizon filter, ripple ----
const _dl=dl;dl=(n,t,m)=>{_dl(n,t,m);toast('Exported '+n)};
const _sd=setDist;setDist=d=>{_sd(d);toast('District set to '+d)};
$('.filters').insertAdjacentHTML('beforeend',' Time period <select id="fh"><option value="1">1 Year</option><option value="3">3 Years</option><option value="5" selected>5 Years</option></select>');
$('#fh').onchange=e=>{S.F.h=+e.target.value;toast('Forecast horizon: '+e.target.value+' yr');if(S.page=='forecasts')go('forecasts')};
document.addEventListener('click',e=>{const b=e.target.closest('.btn,.hero button');if(!b)return;const r=document.createElement('i'),p=b.getBoundingClientRect();
 r.className='ripple';r.style.left=e.clientX-p.left+'px';r.style.top=e.clientY-p.top+'px';b.style.position='relative';b.style.overflow='hidden';b.appendChild(r);setTimeout(()=>r.remove(),600)});
