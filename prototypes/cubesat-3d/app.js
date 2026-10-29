'use strict';
const $=id=>document.getElementById(id),root=$('mission'),model=$('model');
const osMotion=matchMedia('(prefers-reduced-motion: reduce)');
let view=null,ready=false,disposed=false,forced=false,localReduced=false,raf=null,drag=null,previous='',attachStart=0;
if(parent!==window)document.body.classList.add('embedded');
const mission=CubeMission.create({capture:pose=>view.capture(pose),changed:update});
function notify(type,extra={}){if(parent!==window&&location.origin!=='null')parent.postMessage({channel:'orbit-cubesat',type,...extra},location.origin);}
function draw(time){raf=null;if(!ready||disposed||mission.state.phase==='error')return;const s=mission.state,p=s.phase==='attaching'&&!s.reduced?Math.min(1,(time-attachStart)/480):1;view.render(s.pose,s.phase,p);if(s.phase==='attaching'&&p<1)raf=requestAnimationFrame(draw);}
function requestDraw(){if(raf===null&&!disposed)raf=requestAnimationFrame(draw);}
function showImage(el,src){if(src){if(el.getAttribute('src')!==src)el.src=src;el.hidden=false;}else{el.hidden=true;el.removeAttribute('src');}}
function update(){
 if(disposed)return;const s=mission.state,phase=s.phase;
 root.dataset.phase=ready||phase==='error'?phase:'loading';
 const texts={attach:['カメラを取り付けよう。','カメラを取り付ける','カメラを載せたら、地球を撮ってみよう。'],attaching:['カメラが、衛星に取り付く。','取り付け中…','カメラを衛星の接続口へ移動しています。'],aim:['地球が見える向きに回そう。','この向きで撮る','指や矢印で衛星を回すと、下の構図も変わります。'],review:['この向きの写真が撮れました。','地上へ送る','構図を固定しました。この写真を地上へ届けよう。'],sending:['写真のデータが、地上へ移動する。','送信中…','衛星の写真と同じデータを、模擬の地上局へ送っています。'],complete:['✓ 同じ写真が、地上に届きました。','別の向きで、もう一度','左が撮った写真、右が受信した同じ画像です。'],error:['3Dを表示できません。','表示できません','いつもの写真体験へ進むこともできます。']};
 const [title,button,message]=texts[phase];
 $('task').textContent=ready||phase==='error'?title:'3Dの衛星を準備しています…';
 $('primary').textContent=ready?button:'読み込み中';$('primary').disabled=!ready||['attaching','sending','error'].includes(phase);
 const canRotate=ready&&['attach','aim'].includes(phase);for(const el of document.querySelectorAll('[data-turn]'))el.disabled=!canRotate;
 $('retake').hidden=phase!=='review';$('skip').hidden=!['attaching','sending'].includes(phase);
 $('no-camera').hidden=s.attached||phase==='attaching';$('preview').hidden=Boolean(s.photo);showImage($('photo'),s.photo?.src);
 $('photo-caption').textContent=s.photo?'衛星で撮った写真':'衛星カメラの眺め';
 $('photo-hint').hidden=['sending','complete'].includes(phase);$('ground-box').hidden=!['sending','complete'].includes(phase);
 $('photo-hint').textContent=s.photo?'撮影した向き\n左右 '+s.photo.pose.yaw+'° / 上下 '+s.photo.pose.pitch+'°':'衛星を回すと、\n撮れる構図も変わります。';
 showImage($('ground'),s.ground);$('waiting').hidden=Boolean(s.ground);showImage($('packet'),phase==='sending'?s.photo.src:null);
 $('loading').hidden=ready||phase==='error';$('error').hidden=phase!=='error';$('error-message').textContent=s.error;
 $('lens-tag').textContent=s.attached?'レンズの向きで撮影します':'外にある部品がカメラ';
 $('pose').textContent=`左右 ${s.pose.yaw}° / 上下 ${s.pose.pitch}°　${canRotate?'指・矢印で回せます':'撮影時の向きを保持'}`;
 const step=phase==='attach'||phase==='attaching'?0:phase==='aim'||phase==='review'?1:2;
 for(const [i,id] of ['step-attach','step-photo','step-ground'].entries())if(i===step)$(id).setAttribute('aria-current','step');else $(id).removeAttribute('aria-current');
 if(previous!==phase){
  if(phase==='attaching')attachStart=performance.now();
  $('status').textContent=message;
  if(['attaching','sending'].includes(phase)&&document.activeElement===$('primary'))$('skip').focus({preventScroll:true});
  if(['aim','review','complete'].includes(phase)&&(document.activeElement===$('skip')||document.activeElement===$('retake')))$('primary').focus({preventScroll:true});
  previous=phase;
 }
 requestDraw();
}
function rotate(yaw,pitch){if(mission.rotate({yaw,pitch})&&mission.state.phase==='aim')$('status').textContent=view.seesEarth(mission.state.pose)?'衛星の向きと構図が変わりました。この向きで撮れます。':'地球が画角の外です。「地球を向く」で戻せます。星だけの写真も撮れます。';}
const turns={left:[-10,0],right:[10,0],up:[0,10],down:[0,-10]};
for(const button of document.querySelectorAll('[data-turn]'))button.addEventListener('click',()=>{const p=mission.state.pose,v=turns[button.dataset.turn];if(v)rotate(p.yaw+v[0],p.pitch+v[1]);else rotate(0,0);});
model.addEventListener('keydown',e=>{const v={ArrowLeft:turns.left,ArrowRight:turns.right,ArrowUp:turns.up,ArrowDown:turns.down}[e.key];if(!v)return;e.preventDefault();const p=mission.state.pose;rotate(p.yaw+v[0],p.pitch+v[1]);});
model.addEventListener('pointerdown',e=>{if(!ready||!['attach','aim'].includes(mission.state.phase)||!e.isPrimary||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,pose:mission.state.pose,moved:false};model.setPointerCapture(e.pointerId);model.focus({preventScroll:true});});
model.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(dx,dy)>6;if(drag.moved)rotate(drag.pose.yaw+dx*.35,drag.pose.pitch+dy*.35);});
model.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId&&!drag.moved&&mission.state.phase==='attach'&&view.hitsCamera(e.clientX,e.clientY))mission.attach();drag=null;});
for(const name of ['pointercancel','lostpointercapture'])model.addEventListener(name,()=>{drag=null;});
$('primary').addEventListener('click',()=>{switch(mission.state.phase){case 'attach':mission.attach();break;case 'aim':mission.shutter();break;case 'review':mission.send();break;case 'complete':mission.retake();}});
$('retake').addEventListener('click',()=>mission.retake());$('skip').addEventListener('click',()=>mission.skip());$('reload').addEventListener('click',()=>location.reload());
document.addEventListener('keydown',e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault();});
function syncMotion(){const reduced=forced||localReduced||osMotion.matches;$('reduce').checked=reduced;$('reduce').disabled=forced||osMotion.matches;mission.setReduced(reduced);}
$('reduce').addEventListener('change',()=>{localReduced=$('reduce').checked;syncMotion();});osMotion.addEventListener('change',syncMotion);
function pause(){drag=null;mission.pause();if(raf!==null)cancelAnimationFrame(raf);raf=null;if(ready&&!disposed&&mission.state.phase!=='error')view.render(mission.state.pose,mission.state.phase,1);}
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='orbit-cubesat')return;if(e.data.type==='motion'&&typeof e.data.reduced==='boolean'){forced=e.data.reduced;syncMotion();}if(e.data.type==='pause')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else requestDraw();});
const resize=new ResizeObserver(()=>{requestDraw();notify('height',{height:Math.ceil(root.getBoundingClientRect().height)+4});});resize.observe(root);resize.observe(model);
function dispose(){disposed=true;mission.dispose();if(raf!==null)cancelAnimationFrame(raf);raf=null;resize.disconnect();osMotion.removeEventListener('change',syncMotion);view?.dispose();}
window.addEventListener('pagehide',dispose);window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
syncMotion();notify('ready');
import('./scene.js').then(({createScene})=>{
 if(disposed)return;
 view=createScene({canvas:model,preview:$('preview'),onContextLost:()=>mission.fail('3Dの表示が中断しました。「3Dを読み直す」で再開してください。')});
 ready=true;update();
}).catch(()=>{if(!disposed)mission.fail('この環境では3D表示を開始できませんでした。読み直すか、いつもの写真体験へ進んでください。');});
