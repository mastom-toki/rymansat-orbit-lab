/* One button, one satellite, a different outcome for each release timing. */
'use strict';
const game=SatelliteRelease.createGame(),s=game.state;
const $=id=>document.getElementById(id),canvas=$('space'),ctx=canvas.getContext('2d');
const ui={primary:$('primary'),pause:$('pause'),skip:$('skip'),slow:$('slow'),reduce:$('reduce')};
if(parent!==window)document.body.classList.add('embedded');
const osMotion=matchMedia('(prefers-reduced-motion: reduce)');
let forcedMotion=false,localMotion=false,raf=null,phase='',lastAction=-Infinity,disposed=false;
const reduced=()=>osMotion.matches||forcedMotion||localMotion;
const point=p=>({x:130+p*450,y:423-370*p+35*p*p});
const mix=(a,b,t)=>a+(b-a)*t;
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function earth(x,y,r){
  circle(x,y,r,'#2e6b94','#99c6d6');
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
  ctx.translate(x,y);ctx.scale(r/100,r/100);
  ctx.fillStyle='#8dba9c';ctx.beginPath();ctx.moveTo(-95,-30);ctx.lineTo(-64,-62);ctx.lineTo(-33,-49);ctx.lineTo(-20,-17);ctx.lineTo(-44,9);ctx.lineTo(-35,48);ctx.lineTo(-61,67);ctx.lineTo(-70,12);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(5,-84);ctx.lineTo(54,-61);ctx.lineTo(83,-25);ctx.lineTo(46,-5);ctx.lineTo(29,26);ctx.lineTo(10,12);ctx.lineTo(23,-15);ctx.lineTo(-4,-39);ctx.closePath();ctx.fill();
  ctx.fillRect(47,49,24,12);ctx.strokeStyle='#c8e4e5';ctx.lineWidth=3;
  for(const a of [[-65,-25,12,14],[15,45,44,15],[-20,-66,25,3]]){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo((a[0]+a[2])/2,a[1]-15,a[2],a[3]);ctx.stroke();}
  ctx.restore();
}
function rocket(x,y,angle=.72,flame=true){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.lineWidth=2;ctx.strokeStyle='#17324d';
  if(flame){ctx.fillStyle='#efb642';ctx.beginPath();ctx.moveTo(-11,36);ctx.lineTo(0,80);ctx.lineTo(11,36);ctx.fill();ctx.fillStyle='#fff1be';ctx.beginPath();ctx.moveTo(-5,36);ctx.lineTo(0,62);ctx.lineTo(5,36);ctx.fill();}
  ctx.fillStyle='#b94b34';ctx.beginPath();ctx.moveTo(-15,13);ctx.lineTo(-28,42);ctx.lineTo(-12,34);ctx.lineTo(12,34);ctx.lineTo(28,42);ctx.lineTo(15,13);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f8f4e7';ctx.beginPath();ctx.moveTo(-15,35);ctx.lineTo(-15,-22);ctx.quadraticCurveTo(-14,-49,0,-65);ctx.quadraticCurveTo(14,-49,15,-22);ctx.lineTo(15,35);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#b94b34';ctx.fillRect(-15,-22,30,8);ctx.fillStyle='#17324d';ctx.fillRect(-8,2,16,19);ctx.strokeStyle='#b8d7df';ctx.strokeRect(-8,2,16,19);ctx.restore();
}
function satellite(x,y,angle=0,size=1){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);ctx.lineWidth=2;
  ctx.fillStyle='#4b86ad';ctx.strokeStyle='#adcbd9';ctx.fillRect(-45,-13,31,26);ctx.strokeRect(-45,-13,31,26);ctx.fillRect(14,-13,31,26);ctx.strokeRect(14,-13,31,26);
  ctx.beginPath();for(const a of [-35,-25,24,34]){ctx.moveTo(a,-13);ctx.lineTo(a,13);}ctx.moveTo(-45,0);ctx.lineTo(-14,0);ctx.moveTo(14,0);ctx.lineTo(45,0);ctx.stroke();
  ctx.fillStyle='#efc75c';ctx.strokeStyle='#fff2b9';ctx.fillRect(-14,-18,28,36);ctx.strokeRect(-14,-18,28,36);ctx.fillStyle='#17324d';ctx.fillRect(-8,-10,16,20);
  ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(6,-34);ctx.stroke();ctx.restore();
}
function spark(x,y,r){ctx.strokeStyle='#f7c45d';ctx.lineWidth=4;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.4,y+Math.sin(a)*r*.4);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.stroke();}}
function backdrop(){
  ctx.fillStyle='#112d47';ctx.fillRect(0,0,720,540);
  for(let i=0;i<34;i++){const x=(i*137+45)%720,y=(i*79+30)%510;circle(x,y,i%7===0?2:1,'#9cb6c6');}
}
function draw(){
  backdrop();
  const outcome=s.outcome,flight=s.phase==='flying'||s.phase==='ready'||(s.phase==='paused'&&!outcome);
  const p=s.phase==='ready'?0:s.progress,r=point(p);
  if(flight){
    earth(85,670,310);ctx.strokeStyle='#a8c8d5';ctx.lineWidth=2;ctx.setLineDash([4,9]);ctx.beginPath();ctx.moveTo(130,423);ctx.quadraticCurveTo(340,180,580,88);ctx.stroke();ctx.setLineDash([]);
    const z=point(s.zone.center);ctx.strokeStyle='#f3ca5b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(z.x,z.y,43,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff1bd';ctx.font='bold 32px system-ui';ctx.textAlign='center';ctx.fillText('★',z.x+61,z.y+10);
    const q=reduced()?point(0):r;rocket(q.x,q.y,.72,s.phase!=='ready');satellite(q.x-6,q.y+3,.72,.23);
    if(reduced()){ctx.fillStyle='#fff';ctx.font='18px system-ui';ctx.fillText('計器の針を見て、放そう',360,320);}
    return;
  }
  if(!outcome)return;
  const t=reduced()?1:Math.min(s.resultTime/SatelliteRelease.RESULT_MS,1),e=1-(1-t)**3;
  // The same small gold-and-blue satellite separates from the rocket.
  rocket(r.x+120*e,r.y-180*e,.72,true);
  if(outcome.kind==='orbit'){
    earth(300,330,125);ctx.strokeStyle='#c4dce3';ctx.lineWidth=2;ctx.setLineDash([6,6]);ctx.beginPath();ctx.ellipse(300,330,235,153,-.2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    const angle=-1.1+t*Math.PI*2,x=300+Math.cos(angle)*225,y=330+Math.sin(angle)*148;
    satellite(mix(r.x,x,e),mix(r.y,y,e),-.2,.85);
  }else if(outcome.kind==='early'){
    earth(85,670,310);const x=mix(r.x,175,e),y=mix(r.y,420,e);
    if(t<.88)satellite(x,y,t*2,.7*(1-t*.5));if(t>.55)spark(x,y,26*(1-t)+8);
  }else if(outcome.kind==='drift'||outcome.kind==='miss'){
    earth(35,640,260);satellite(mix(r.x,635,e),mix(r.y,120,e),t*1.5,mix(.8,.35,e));
    ctx.strokeStyle='#c4dce3';ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(635,120);ctx.stroke();ctx.setLineDash([]);
  }else{
    earth(-55,670,260);
    if(outcome.kind==='moon'){circle(557,172,89,'#d2d7d6','#a6b6bf');circle(530,149,18,'#adb9bf');circle(587,184,23,'#adb9bf');circle(540,210,11,'#adb9bf');}
    else{circle(557,172,98,'#e9a342','#f4d280');circle(557,172,80,'#f4ce6a');}
    const x=mix(r.x,495,e),y=mix(r.y,190,e);
    if(t<.92)satellite(x,y,t,.7);if(t>.72)spark(x,y,25);
  }
}
function updateUI(){
  document.querySelector('.game').dataset.phase=s.phase;
  $('attempt').textContent=s.attempt;$('wins').textContent=s.successes;$('best').textContent=s.attempt?s.best:'—';
  $('zone').style.left=(s.zone.low*100)+'%';$('zone').style.width=((s.zone.high-s.zone.low)*100)+'%';
  $('needle').style.left=(s.progress*100)+'%';$('mark').hidden=!s.outcome;$('mark').style.left=(s.progress*100)+'%';
  const flying=s.phase==='flying',paused=s.phase==='paused',busy=s.phase==='resolving';
  ui.primary.textContent=flying?'衛星を放つ！':paused?'つづける':busy?'衛星の行方は…':s.phase==='result'?'もう一度打ち上げる':'打ち上げる';
  ui.primary.disabled=busy;ui.pause.disabled=!flying;ui.skip.hidden=!busy;ui.slow.disabled=!['ready','result'].includes(s.phase);
  if(phase!==s.phase){
    if(flying){$('result-title').textContent='ここだ、と思ったら放つ！';$('result-hint').textContent='★の帯に入るまで待とう。';$('instruction').textContent='帯の真ん中を狙って、タップ！';$('scene-label').textContent='衛星はロケットと一緒に上昇中。';}
    if(paused){$('result-title').textContent='一時停止中';$('result-hint').textContent='「つづける」で同じところから再開。';}
    if(busy||s.phase==='result'){
      $('result-title').textContent=s.outcome.title+(s.outcome.score?' '+s.outcome.score+'点':'');$('result-hint').textContent=s.outcome.hint;
      $('instruction').textContent=s.outcome.kind==='orbit'?'✓ 衛星の放出に成功！':'もう一度、タイミングを変えてみよう。';
      $('scene-label').textContent={orbit:'放出 → 地球のまわりへ！',early:'放出 → 大気の中で燃え尽きた',drift:'放出 → 地球から離れていく',moon:'放出 → 月にごっつん（創作）',sun:'放出 → 太陽へ（創作）',miss:'衛星を放せなかった'}[s.outcome.kind];
    }
    // If a focused action becomes disabled/hidden, retain an operable focus target.
    if(busy)ui.skip.focus({preventScroll:true});
    if(s.phase==='result'&&(document.activeElement===ui.skip||document.activeElement===document.body))ui.primary.focus({preventScroll:true});
    if(flying&&document.activeElement===ui.pause)ui.primary.focus({preventScroll:true});
    phase=s.phase;
  }
  $('timing').setAttribute('aria-valuenow',String(Math.round(s.progress*100)));
  $('timing').setAttribute('aria-label',`ロケットの進み具合。今回は ${Math.round(s.zone.low*100)} から ${Math.round(s.zone.high*100)} パーセントで放す。`);
  if(flying){
    const cue=s.progress<s.zone.low?'まだ早い。★の帯まで待とう。':s.progress<=s.zone.high?'いまだ！ 衛星を放つ！':'帯を過ぎた！ いま放すと…';
    if($('instruction').textContent!==cue)$('instruction').textContent=cue;
  }
}
function tick(now){raf=null;if(disposed)return;game.advance(now);if(reduced()&&s.phase==='resolving')game.skip();updateUI();draw();if(['flying','resolving'].includes(s.phase))raf=requestAnimationFrame(tick);}
function wake(){if(raf!==null)cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);}
function guarded(){const now=performance.now();if(now-lastAction<300)return false;lastAction=now;return true;}
ui.primary.addEventListener('click',()=>{
  if(!guarded())return;const now=performance.now();
  if(s.phase==='paused')game.resume(now);
  else if(s.phase==='flying')game.release(now);
  else game.start(now,ui.slow.checked);
  wake();
});
ui.pause.addEventListener('click',()=>{if(!guarded())return;game.pause(performance.now());updateUI();draw();ui.primary.focus({preventScroll:true});});
ui.skip.addEventListener('click',()=>{if(!guarded())return;game.skip();updateUI();draw();ui.primary.focus({preventScroll:true});});
// Do not turn a held key into multiple shots/restarts. Native buttons handle one key press.
document.addEventListener('keydown',e=>{if(e.repeat&&(e.key===' '||e.key==='Enter'))e.preventDefault();});
function syncMotion(){ui.reduce.checked=reduced();ui.reduce.disabled=osMotion.matches||forcedMotion;$('motion-note').hidden=!ui.reduce.disabled;if(reduced()&&s.phase==='resolving')game.skip();updateUI();draw();}
ui.reduce.addEventListener('change',()=>{localMotion=ui.reduce.checked;syncMotion();});
osMotion.addEventListener('change',syncMotion);
window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='orbit-release')return;
  if(e.data.type==='motion'&&typeof e.data.reduced==='boolean'){forcedMotion=e.data.reduced;syncMotion();}
  if(e.data.type==='pause'){game.pause(performance.now());updateUI();draw();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.pause(performance.now());if(raf!==null)cancelAnimationFrame(raf);raf=null;updateUI();draw();}});
window.addEventListener('pagehide',()=>{disposed=true;if(raf!==null)cancelAnimationFrame(raf);raf=null;game.stop();});
window.addEventListener('pageshow',e=>{if(e.persisted){disposed=false;phase='';updateUI();draw();}});
syncMotion();
if(parent!==window)parent.postMessage({channel:'orbit-release',type:'ready'},location.origin);
if(parent!==window){
  const reportSize=()=>parent.postMessage({channel:'orbit-release',type:'height',height:Math.ceil(document.querySelector('.game').getBoundingClientRect().height)+4},location.origin);
  new ResizeObserver(reportSize).observe(document.querySelector('.game'));reportSize();
}
