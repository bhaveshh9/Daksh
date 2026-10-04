// animated "data network" background
const c=document.getElementById('bg'),x=c.getContext('2d');let W,H,P=[];
function rs(){W=c.width=innerWidth;H=c.height=innerHeight;P=Array.from({length:Math.min(60,W/22|0)},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:2+Math.random()*3}))}
function draw(){x.clearRect(0,0,W,H);
 P.forEach((a,i)=>{a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
  x.beginPath();x.arc(a.x,a.y,a.r,0,7);x.fillStyle='rgba(23,71,166,.25)';x.fill();
  for(let j=i+1;j<P.length;j++){const b=P[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<130){x.strokeStyle=`rgba(23,71,166,${.18*(1-d/130)})`;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}});
 requestAnimationFrame(draw)}
addEventListener('resize',rs);rs();draw();
