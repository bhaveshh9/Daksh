const $=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('en-IN'),V=$('#view');
const S={st:'Maharashtra',di:'Pune',page:'dashboard',role:'Government',F:{sk:'AI/ML',sc:'base',h:5}};let DIST={},CH={};
const q=()=>`state=${encodeURIComponent(S.st)}&district=${encodeURIComponent(S.di)}`;
const get=u=>fetch(u).then(r=>r.json());
const post=(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());
const badge=s=>`<span class="b ${s.split(' ')[0]}">${s}</span>`;
function chart(id,type,labels,sets){if(CH[id])CH[id].destroy();if(!window.Chart)return;
 CH[id]=new Chart(document.getElementById(id),{type,data:{labels,datasets:sets},options:{animation:{duration:900},scales:{y:{ticks:{callback:v=>v/1000+'K'}}}}})}
const ds=(d)=>[{label:'Demand',data:d.map(x=>x.demand),borderColor:'#0b2a5b',backgroundColor:'#0b2a5b',tension:.3},{label:'Supply',data:d.map(x=>x.supply),borderColor:'#16a34a',backgroundColor:'#16a34a',tension:.3}];
function countUp(){document.querySelectorAll('[data-n]').forEach(e=>{const t=+e.dataset.n,s=e.dataset.s||'';let i=0;const id=setInterval(()=>{i++;e.textContent=fmt(Math.round(t*i/30))+s;if(i>=30)clearInterval(id)},25)})}
const pages={
async dashboard(){const d=await get('/api/dashboard?'+q());
 V.innerHTML=`<div class="hero"><h1>India's Labour Market Intelligence</h1><div>Understand today's workforce. Forecast tomorrow's skills.</div>
 <div class="flow">DATA → INTELLIGENCE → FORECAST → SKILL GAP → RECOMMENDATION → ACTION</div>
 <button onclick="go('forecasts')">Explore Forecasts</button><button onclick="go('gaps')">View Skill Gaps</button><button onclick="go('recs')">Generate Recommendations</button></div>
 <div class="grid k6">${d.kpis.map(k=>`<div class="card"><div class="lbl">${k.label}</div><div class="val" data-n="${k.value}" data-s="${k.label.includes('Align')?'%':''}">0</div></div>`).join('')}</div>
 <div class="grid g2"><div class="card"><h2>Labour Demand vs Workforce Supply (2026–2030)</h2><canvas id="c1"></canvas></div>
 <div class="card"><h2>Early Warnings</h2>${d.alerts.slice(0,7).map(a=>`<div class="alert"><b>${a.type}</b><br>${a.msg}</div>`).join('')}</div></div>`;
 countUp();chart('c1','line',d.series.map(x=>x.year),ds(d.series))},
async forecasts(){const sk=await get('/api/skills'),F=S.F,d=await get(`/api/forecast?${q()}&skill=${encodeURIComponent(F.sk)}&scenario=${F.sc}`),s=d.series.slice(0,F.h+1);
 V.innerHTML=`<h2>Forecasts</h2><select onchange="S.F.sk=this.value;pages.forecasts()">${sk.map(x=>`<option ${x==F.sk?'selected':''}>${x}</option>`).join('')}</select> `+
 ['optimistic','base','pessimistic'].map(x=>`<button class="btn ${F.sc==x?'on':''}" onclick="S.F.sc='${x}';pages.forecasts()">${x}</button>`).join('')+
 [1,3,5].map(x=>`<button class="btn ${F.h==x?'on':''}" onclick="S.F.h=${x};pages.forecasts()">${x} Year</button>`).join('')+
 `<div class="grid k6" style="margin-top:12px">${[['Current Demand',fmt(d.current_demand)],['Forecast Demand',fmt(d.forecast_demand)],['Current Supply',fmt(d.current_supply)],['Projected Gap',fmt(d.projected_gap)],['Growth Rate',d.growth_rate+'%']].map(([a,b])=>`<div class="card"><div class="lbl">${a}</div><div class="val">${b}</div></div>`).join('')}</div>
 <div class="card"><canvas id="c2"></canvas></div>`;chart('c2','line',s.map(x=>x.year),ds(s))},
async gaps(){const d=await get('/api/skill-gaps?'+q());
 V.innerHTML=`<h2>Skill Gap Intelligence</h2><div class="card tw"><table><tr><th>Skill</th><th>Demand</th><th>Supply</th><th>Gap</th><th>Growth</th><th>Status</th><th>Priority</th></tr>
 ${d.map(r=>`<tr><td><b>${r.skill}</b></td><td>${fmt(r.demand)}</td><td>${fmt(r.supply)}</td><td>${fmt(r.gap)}</td><td>+${r.growth}%</td><td>${badge(r.status)}</td><td>${r.priority}</td></tr>`).join('')}</table></div>
 <div class="card" style="margin-top:12px"><canvas id="c3"></canvas></div>`;
 chart('c3','bar',d.map(x=>x.skill),[{label:'Demand',data:d.map(x=>x.demand),backgroundColor:'#0b2a5b'},{label:'Supply',data:d.map(x=>x.supply),backgroundColor:'#16a34a'}])},
async regional(){const r=await get('/api/regional-insights?'+q());
 V.innerHTML=`<h2>India → ${S.st} → ${S.di} → Sector → Skill</h2><p>Click a state or district:</p>
 ${Object.keys(DIST).map(s=>`<button class="btn ${S.st==s?'on':''}" onclick="setState('${s}')">${s}</button>`).join('')}<br>
 ${Object.keys(DIST[S.st]).map(d=>`<button class="btn ${S.di==d?'on':''}" onclick="setDist('${d}')">${d}</button>`).join('')}
 <div class="grid k6" style="margin-top:12px">${[['Job Demand',r.demand],['Workforce Supply',r.supply],['Training Capacity',r.training_capacity],['Skill Gap',r.skill_gap]].map(([a,b])=>`<div class="card"><div class="lbl">${a}</div><div class="val" data-n="${b}">0</div></div>`).join('')}</div>
 <div class="grid g3"><div class="card"><b>Top Growing Skills</b><ul>${r.top_skills.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="card"><b>Priority Sectors</b><ul>${r.sectors.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="card"><b>Recommended Actions</b><ul>${r.actions.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;countUp()},
async recs(){const [d,t]=await Promise.all([get(`/api/recommendations?${q()}`),get(`/api/training-capacity?${q()}`)]);
 V.innerHTML=`<h2>AI Recommendations: ${S.di}</h2>${['Government','Institute','Industry','Student'].map(x=>`<button class="btn ${S.role==x?'on':''}" onclick="S.role='${x}';pages.recs()">${x}</button>`).join('')}
 <div class="grid gh">${d.map(x=>`<div class="card"><b>${x.sector} · ${x.skill}</b> <span class="b Critical">${x.priority}</span><p class="lbl">Demand ${fmt(x.demand)} · Supply ${fmt(x.supply)} · Gap ${fmt(x.gap)}</p><p><b>${x.headline}</b></p><ul>${x[S.role].map(a=>`<li>${a}</li>`).join('')}</ul></div>`).join('')}</div>
 <h2>Training Capacity</h2><div class="card tw"><table><tr><th>District</th><th>Sector</th><th>Trade</th><th>Seats</th><th>Enrolled</th><th>Completed</th><th>Placement</th><th>Demand</th><th>Gap</th><th>Recommended</th></tr>
 ${t.map(r=>`<tr><td>${r.district}</td><td>${r.sector}</td><td>${r.trade}</td><td>${fmt(r.seats)}</td><td>${fmt(r.enrolments)}</td><td>${fmt(r.completions)}</td><td>${r.placement}%</td><td>${fmt(r.demand)}</td><td>${fmt(r.gap)}</td><td><b>${fmt(r.recommended)}</b></td></tr>`).join('')}</table></div>`},
student(){V.innerHTML=`<h2>Student / Job Seeker</h2><div class="grid gh"><div class="card"><b>Profile</b><p>Current skills (comma separated)<br><input id="sk" value="Python, SQL" style="width:100%"></p>
 <p>Target role<br><select id="tg"><option>Data Analyst</option><option>ML Engineer</option><option>Security Analyst</option><option>Solar Technician</option></select></p><button class="btn pri" onclick="prof()">Build Roadmap</button><div id="pr"></div></div>
 <div class="card"><b>Job Description Analyzer</b><textarea id="jd" rows="6" style="width:100%" placeholder="Paste a job description here..."></textarea><button class="btn pri" onclick="analyze()">Analyze Job</button><div id="ar"></div></div></div>`;prof()},
async reports(){const d=await get('/api/skill-gaps?'+q());window.RD=d;
 V.innerHTML=`<h2>Reports</h2><div class="card"><p>Skill Gap Report (DEMO DATA) – ${S.st}, ${S.di}</p><button class="btn" onclick="window.print()">Export PDF</button><button class="btn" onclick="dl('skill-gap.csv',csv(),'text/csv')">Export Excel (CSV)</button><button class="btn" onclick="dl('skill-gap.json',JSON.stringify(RD,null,2),'application/json')">Export JSON</button></div>
 <div class="card" style="margin-top:12px"><h2>Methodology</h2><p>Sources (planned): NCS, e-Shram, PLFS, NCO, NSQF, training institutes, industry hiring and job-market data.</p>
 <p>Pipeline: Collection → Cleaning → Standardization → Skill Mapping → Geo-Referencing → Feature Engineering → Forecasting → Skill Gap → Recommendations.</p>
 <p>Skill Gap = Forecast Demand − Expected Supply. Demand Index = Job Demand + Hiring Growth + Industry Growth. Supply Index = Workforce Availability + Training Capacity.</p></div>`}};
const skills=()=>$('#sk').value.split(',').map(s=>s.trim()).filter(Boolean);
async function prof(){const p=await post('/api/skill-profile',{skills:skills(),target:$('#tg').value});
 $('#pr').innerHTML=`<p><b>Missing:</b> ${p.missing.join(', ')||'None'}</p><div class="road">${p.roadmap.map((s,i)=>`<span style="animation-delay:${i*.2}s">${s}${i<p.roadmap.length-1?' →':''}</span>`).join('')}</div>`}
async function analyze(){const a=await post('/api/analyze-job',{text:$('#jd').value,skills:skills()});
 $('#ar').innerHTML=`<p><b>Detected Skills:</b> ${a.detected.join(', ')}</p><p><b>Skill Match:</b> ${a.match}%</p><p><b>Missing:</b> ${a.missing.join(', ')}</p><p><b>Recommended:</b> ${a.recommended.join(', ')}</p>`}
const csv=()=>Object.keys(RD[0]).join(',')+'\n'+RD.map(r=>Object.values(r).join(',')).join('\n');
function dl(n,t,m){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()}
function go(p){S.page=p;document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.p==p));$('#nav').classList.remove('open');V.innerHTML='Loading…';pages[p]().catch(e=>V.innerHTML='<p>Error loading data: '+e+'</p>');loadAlerts()}
function fill(){$('#fs').innerHTML=Object.keys(DIST).map(s=>`<option ${s==S.st?'selected':''}>${s}</option>`).join('');$('#fd').innerHTML=Object.keys(DIST[S.st]).map(d=>`<option ${d==S.di?'selected':''}>${d}</option>`).join('')}
function setState(s){S.st=s;S.di=Object.keys(DIST[s])[0];fill();go(S.page)}
function setDist(d){S.di=d;fill();go(S.page)}
$('#fs').onchange=e=>setState(e.target.value);$('#fd').onchange=e=>setDist(e.target.value);
document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>go(a.dataset.p));
function roleSwitch(r){go(r.startsWith('Student')?'student':r.startsWith('Govt')?'regional':'recs')}
function toggleBell(){$('#alerts').classList.toggle('show')}
async function loadAlerts(){const a=await get('/api/alerts?'+q());$('#alerts').innerHTML=a.slice(0,8).map(x=>`<p class="alert"><b>${x.type}:</b> ${x.msg}</p>`).join('')}
get('/api/districts').then(d=>{DIST=d;fill();go('dashboard')});
