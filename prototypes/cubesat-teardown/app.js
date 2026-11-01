'use strict';
const $=id=>document.getElementById(id),T=CubeTeardown,root=$('app'),canvas=$('model'),stage=document.querySelector('.stage'),viewBox=$('view');
const renderMode=new URLSearchParams(location.search).get('render')==='1';
const osMotion=matchMedia('(prefers-reduced-motion: reduce)');
let scene=null,ready=false,disposed=false,forced=false,localReduced=false,raf=null,idleTimer=null,last=0,focusId=null,drag=null,scrubbing=false,viewMode='auto',userYaw=0,userPitch=0,modeText='';
const shown={yaw:null,pitch:null},PRESETS={front:{yaw:0,pitch:4},side:{yaw:90,pitch:4},top:{yaw:0,pitch:72}};
const firstPart=Object.fromEntries(T.GROUPS.map(g=>[g.id,T.PARTS.find(p=>p.group===g.id).id]));
const clock=T.createClock({reduced:osMotion.matches});
if(parent!==window)document.body.classList.add('embedded');
if(renderMode)document.body.classList.add('render');
const reduced=()=>forced||localReduced||osMotion.matches;
const now=()=>performance.now();
function notify(type,extra={}){if(parent!==window&&location.origin!=='null')parent.postMessage({channel:'orbit-teardown',type,...extra},location.origin);}

// Controls are built from the model's own part list.
const partButtons=new Map();
T.GROUPS.forEach((g,i)=>{
 const b=document.createElement('button'),n=document.createElement('span');b.type='button';b.dataset.part=g.id;b.setAttribute('aria-pressed','false');
 n.className='n';n.textContent=String(i+1).padStart(2,'0');b.append(n,g.name);$('parts').append(b);partButtons.set(g.id,b);
});
const gaugeRows=new Map();
for(const g of T.stateAt(0).gauges){
 const li=document.createElement('li'),label=document.createElement('span'),value=document.createElement('strong'),unit=document.createElement('small'),track=document.createElement('div'),fill=document.createElement('div');
 label.textContent=g.label;unit.textContent=g.unit;value.append(document.createTextNode('0'),unit);track.className='bar-track';fill.className='bar-fill';track.append(fill);li.append(label,value,track);$('gauges').append(li);
 gaugeRows.set(g.id,{li,text:value.firstChild,fill});
}

function targetView(s){
 const preset=PRESETS[viewMode];
 return {yaw:(preset?preset.yaw:s.camera.yaw)+userYaw,pitch:Math.max(-85,Math.min(85,(preset?preset.pitch:s.camera.pitch)+userPitch)),distance:s.camera.distance,lookY:s.camera.lookY};
}
function smoothView(target,instant){
 if(instant||shown.yaw===null){shown.yaw=target.yaw;shown.pitch=target.pitch;return {...target};}
 const turn=((target.yaw-shown.yaw+540)%360)-180;shown.yaw+=turn*.22;shown.pitch+=(target.pitch-shown.pitch)*.22;
 return {...target,yaw:shown.yaw,pitch:shown.pitch};
}
function pointerSpot(id){
 const base=stage.getBoundingClientRect();
 if(id==='rest'){const r=viewBox.getBoundingClientRect();return {x:r.left-base.left+r.width*.5,y:r.top-base.top+r.height*.88};}
 const r=partButtons.get(id).getBoundingClientRect();return {x:r.left-base.left+r.width*.5,y:r.top-base.top+r.height*.55};
}
function setStatus(text){if(modeText!==text){modeText=text;$('status').textContent=text;}}

function updateUI(s,instant){
 const c=clock.state,tour=renderMode||c.mode==='tour';
 const group=focusId?T.GROUPS.find(g=>g.id===focusId):null,label=group?{title:group.name,text:group.role}:s.label;
 $('label-title').textContent=label.title;$('label-text').textContent=label.text;
 $('headline').setAttribute('aria-live',tour?'off':'polite');
 for(const g of s.gauges){const row=gaugeRows.get(g.id),v=Math.round(g.value*10)/10;row.text.nodeValue=(v>0&&g.id==='power'?'+':'')+v.toFixed(1);row.fill.style.width=Math.max(0,Math.min(100,(g.value-g.min)/(g.max-g.min)*100))+'%';row.li.dataset.low=String((g.id==='power'&&g.value<0)||(g.id!=='power'&&g.id!=='temp'&&g.value<20));}
 for(const [id,b]of partButtons){b.setAttribute('aria-pressed',String(focusId===id));b.classList.toggle('pressed',tour&&s.pointer.to===id&&s.pointer.press>.5);}
 if(!scrubbing)$('scrub').value=String(s.t);
 $('clock').textContent=`${s.t.toFixed(1)} / ${T.DURATION} 秒`;
 const playing=c.playing||renderMode,play=$('play');play.textContent=playing?'❚❚ 一時停止':'▶ 再生';play.setAttribute('aria-label',playing?'一時停止':'再生');play.setAttribute('aria-pressed',String(playing));play.disabled=reduced();
 root.dataset.mode=tour?'tour':'manual';viewBox.dataset.space=String(s.space>.5);$('scene-tag').textContent=s.space>.5?'軌道（イメージ）':'スタジオ';
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===viewMode));
 setStatus(reduced()?'動きを少なくしています。部品ボタンか「つぎ」で、ひとつずつ見られます。':tour?'自動で再生中です。さわると、あなたの操作に切り替わります。':'あなたの操作中です。25秒さわらないと、自動再生にもどります。');
 // Pointer: the tour's hand walks to each button and presses it.
 const pointer=$('pointer');
 if(tour&&!reduced()&&s.pointer.alpha>0){
  const a=pointerSpot(s.pointer.from),b=pointerSpot(s.pointer.to),x=a.x+(b.x-a.x)*s.pointer.move-4,y=a.y+(b.y-a.y)*s.pointer.move-2;
  pointer.style.opacity=String(s.pointer.alpha);pointer.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1-.18*s.pointer.press).toFixed(3)})`;
 }else pointer.style.opacity='0';
}
function updateCallout(s){
 const id=focusId||s.active,callout=$('callout'),line=$('leader-line'),dot=$('leader-dot');
 const spot=id&&scene?scene.anchor(firstPart[id]):null;
 if(!id||!spot||!spot.visible||s.space>.5){callout.hidden=true;line.style.display=dot.style.display='none';return;}
 const g=T.GROUPS.find(x=>x.id===id);callout.hidden=false;$('callout-name').textContent=g.name;
 const detached=s.parts[firstPart[id]].detached;$('callout-badge').textContent=detached?'分離中':'とりつけ';
 const vr=viewBox.getBoundingClientRect(),cr=callout.getBoundingClientRect();
 line.style.display=dot.style.display='';line.setAttribute('x1',cr.left-vr.left+cr.width/2);line.setAttribute('y1',cr.bottom-vr.top);line.setAttribute('x2',spot.x);line.setAttribute('y2',spot.y);dot.setAttribute('cx',spot.x);dot.setAttribute('cy',spot.y);
}
function frame(instant=false){
 const s=T.stateAt(clock.state.t);
 scene.render(s,smoothView(targetView(s),instant||reduced()||renderMode),focusId);
 updateUI(s,instant);updateCallout(s);return s;
}
function draw(time){
 raf=null;if(!ready||disposed||document.hidden)return;
 const dt=last?time-last:16;last=time;clock.tick(dt,now());
 frame();
 const c=clock.state,animating=c.playing||c.seek||Math.abs(((targetView(T.stateAt(c.t)).yaw-shown.yaw+540)%360)-180)>.05;
 if(animating)raf=requestAnimationFrame(draw);else last=0;
}
function requestDraw(){if(raf===null&&!disposed&&ready&&!document.hidden)raf=requestAnimationFrame(draw);}
function handOver(){clock.interact(now());}
function go(id){focusId=id;clock.goTo(T.holdTime(id),now());requestDraw();}
function currentIndex(){const t=clock.state.t;let i=-1;T.GROUPS.forEach((g,k)=>{if(t>=T.beatStart(k))i=k;});return t>=T.BACK0?-1:i;}

for(const [id,b] of partButtons)b.addEventListener('click',()=>go(id));
$('prev').addEventListener('click',()=>{const i=currentIndex();go(T.GROUPS[i<=0?T.GROUPS.length-1:i-1].id);});
$('next').addEventListener('click',()=>{const i=currentIndex();go(T.GROUPS[(i+1)%T.GROUPS.length].id);});
$('play').addEventListener('click',()=>{if(clock.state.playing)clock.pause(now());else{focusId=null;viewMode='auto';userYaw=userPitch=0;clock.play(now());}requestDraw();});
$('scrub').addEventListener('input',e=>{focusId=null;scrubbing=true;clock.scrub(Number(e.target.value),now());requestDraw();});
$('scrub').addEventListener('change',()=>{scrubbing=false;});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{viewMode=b.dataset.view;userYaw=userPitch=0;if(clock.state.mode==='tour')clock.pause(now());requestDraw();});
canvas.addEventListener('pointerdown',e=>{if(!ready||!e.isPrimary||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);canvas.style.cursor='grabbing';});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved){drag.moved=true;handOver();}userYaw-=(e.clientX-drag.x)*.4;userPitch+=(e.clientY-drag.y)*.3;userPitch=Math.max(-60,Math.min(60,userPitch));drag.x=e.clientX;drag.y=e.clientY;requestDraw();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null;canvas.style.cursor='';});
canvas.addEventListener('keydown',e=>{
 const turn={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,8],ArrowDown:[0,-8]}[e.key];
 if(turn){e.preventDefault();handOver();userYaw+=turn[0];userPitch=Math.max(-60,Math.min(60,userPitch+turn[1]));requestDraw();}
 else if(e.key===' '&&!e.repeat){e.preventDefault();$('play').click();}else if(e.key===' ')e.preventDefault();
});
function syncMotion(){const r=reduced();$('reduce').checked=r;$('reduce').disabled=forced||osMotion.matches;clock.setReduced(r);if(ready)requestDraw();}
$('reduce').addEventListener('change',()=>{localReduced=$('reduce').checked;syncMotion();if(ready)requestDraw();});
osMotion.addEventListener('change',syncMotion);
function pause(){drag=null;clock.pause(now());if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;if(ready&&!disposed)frame();}
window.addEventListener('message',e=>{
 if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='orbit-teardown')return;
 if(e.data.type==='motion'&&typeof e.data.reduced==='boolean'){forced=e.data.reduced;syncMotion();}
 if(e.data.type==='pause')pause();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;}else requestDraw();});
const resize=new ResizeObserver(()=>{if(scene){const r=viewBox.getBoundingClientRect();scene.resize(r.width,r.height);requestDraw();if(renderMode&&ready)frame(true);}notify('height',{height:Math.ceil(root.getBoundingClientRect().height)+4});});resize.observe(root);resize.observe(viewBox);
function dispose(){disposed=true;if(raf!==null)cancelAnimationFrame(raf);raf=null;clearInterval(idleTimer);resize.disconnect();osMotion.removeEventListener('change',syncMotion);scene?.dispose();scene=null;}
window.addEventListener('pagehide',dispose);window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
function fail(message){ready=false;root.dataset.ready='error';$('loading').hidden=true;$('error').hidden=false;$('error-message').textContent=message;notify('height',{height:Math.ceil(root.getBoundingClientRect().height)+4});}
$('reload').addEventListener('click',()=>location.reload());
syncMotion();notify('ready');
import('./scene.js').then(({createScene})=>{
 if(disposed)return;
 try{scene=createScene({canvas,coreParts:T.PARTS,pixelRatio:renderMode?3:1.5,onContextLost:()=>fail('3Dの描画が止まりました。読み直してください。')});}
 catch(error){fail('この端末では3Dを表示できませんでした。読み直すか、いつもの写真体験をお試しください。');return;}
 ready=true;root.dataset.ready='true';$('loading').hidden=true;
 const r=viewBox.getBoundingClientRect();scene.resize(r.width,r.height);
 if(renderMode){
  window.__teardown={duration:T.DURATION,renderAt(t){clock.scrub(t,0);shown.yaw=null;return frame(true).t;}};frame(true);
 }else{
  idleTimer=setInterval(()=>{if(disposed||document.hidden||!ready)return;const before=clock.state.mode;clock.tick(0,now());if(before!=='tour'&&clock.state.mode==='tour'){focusId=null;viewMode='auto';userYaw=userPitch=0;requestDraw();}},1000);
  frame();requestDraw();
 }
}).catch(()=>fail('3Dの部品を読み込めませんでした。読み直してください。'));
