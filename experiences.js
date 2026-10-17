/* Recommended photo mission and continuous, browser-local wish-card journey. */
'use strict';
const experienceInputGate=OrbitPhoto.primaryActionGate(350);
let photoMission,experienceTimer=null,experienceGeneration=0,frameDrag=null;
function freshPhotoMission(){return {phase:'attach',camera:false,frame:{x:0,y:0},photo:null,groundSrc:null,recorded:false};}
photoMission=freshPhotoMission();
function reducedMotion(){return state.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function cancelExperience(){
 if(experienceTimer!==null)clearTimeout(experienceTimer);experienceTimer=null;experienceGeneration++;frameDrag=null;pausePostFlow();
 if(photoMission.phase==='attaching')photoMission.phase='frame';
 if(photoMission.phase==='sending')photoMission.phase='review';
}
function laterExperience(callback,ms){
 if(experienceTimer!==null)clearTimeout(experienceTimer);
 const generation=++experienceGeneration;
 if(reducedMotion()){callback();return;}
 experienceTimer=setTimeout(()=>{experienceTimer=null;if(generation===experienceGeneration)callback();},ms);
}
function craftSvg(camera){return `<svg viewBox="0 0 320 200" role="img" aria-label="${camera?'カメラが取り付いた':'カメラ取り付け前の'}模擬衛星"><g stroke="#173c60" stroke-width="2"><path d="M32 68h86v74H32zM202 68h86v74h-86z" fill="#30658d"/><path d="M54 68v74m21-74v74m22-74v74M224 68v74m21-74v74m22-74v74M32 92h86m-86 26h86m84-26h86m-86 26h86" stroke="#91b9d0"/><path d="M118 50h84v110h-84z" fill="#d4e3eb"/><path d="m118 50 18-16h84l-18 16m0 0 18-16v110l-18 16" fill="#a7c4d5"/>${camera?'<rect x="142" y="80" width="38" height="36" rx="3" fill="#173c60"/><circle cx="161" cy="98" r="12" fill="#d9edf4"/><circle cx="161" cy="98" r="7" fill="#112838"/>':'<rect x="140" y="78" width="42" height="40" rx="3" fill="none" stroke-dasharray="4 4"/>'}</g></svg>`;}
function guidedMission(){
 const m=photoMission,phase=m.phase;const step=phase==='attach'||phase==='attaching'?0:phase==='frame'||phase==='review'?1:2;
 let title='',scene='',status='',actions='';
 if(phase==='attach'||phase==='attaching'){
  title=phase==='attach'?'まず、カメラを衛星に載せよう。':'カメラが衛星に取り付きました。';
  scene=`<div class="ex-scene attach-scene ${phase==='attaching'?'attaching':''}" data-camera-attached="${m.camera}">${craftSvg(m.camera)}<div class="complete-example">完成例：地上に届く写真<img src="${OrbitPhoto.capture({x:-18,y:8}).src}" alt="完成例の模擬写真"></div><button class="camera-chip" data-exp="attach-camera" ${phase==='attaching'?'disabled':''}>${icon('camera',25)}カメラ</button>${m.camera?'<span class="attach-check">✓ 取り付け完了</span>':''}</div>`;
  status=phase==='attach'?'カメラをタップすると、撮影できるようになります。':'レンズが付き、撮影画面が開きます。';
  actions=phase==='attach'?'<button class="btn primary-action" data-exp="attach-camera">カメラを載せて、撮影へ</button>':'<button class="btn primary-action" data-exp="skip-photo-motion">撮影画面へスキップ</button>';
 }
 if(phase==='frame'){
  title='地球を動かして、構図を決めよう。';
  scene=`<div class="ex-scene framing-pad" data-framepad tabindex="0" role="group" aria-label="撮影する地球。指で動かすか、矢印キーで構図を調整"><div id="framing-art">${OrbitPhoto.photoSvg(m.frame)}</div><div class="frame-corners" aria-hidden="true"></div></div><div class="framing-controls"><button data-exp="frame-left" aria-label="地球を左へ">←</button><label>左右の構図<input id="framing-x" data-frame-axis="x" type="range" min="-90" max="90" step="5" value="${m.frame.x}" aria-label="左右の構図"></label><button data-exp="frame-right" aria-label="地球を右へ">→</button></div>`;
  status='指で地球を動かす。左右ボタン・矢印キーでも調整できます。';
  actions='<button class="btn primary-action" data-exp="shutter">この構図で撮る</button>';
 }
 if(phase==='review'){
  title='今の構図が、模擬写真になりました。';
  scene=`<figure class="photo-review"><img data-photo="satellite" src="${m.photo.src}" alt="今の構図で撮った模擬写真"><figcaption>衛星のカメラに残った写真。まだ地上には届いていません。</figcaption></figure>`;
  status='この写真を送ると、同じ画像が地上に届きます。';
  actions='<button class="btn primary-action" data-exp="send-photo">地上へ送る</button><button class="btn secondary secondary-action" data-exp="retake">撮り直す</button>';
 }

 if(phase==='sending'){
  title='この写真を、衛星から地上へ送っています。';
  scene=`<div class="ex-scene transfer-board"><div class="transfer-end">${craftSvg(true)}<p>衛星の中</p><img data-photo="satellite" src="${m.photo.src}" alt="送っている模擬写真"></div><div class="transfer-end">${icon('radio',35)}<p>地上局</p><div class="ground-wait">画像を受信中…</div></div><div class="transfer-line" aria-hidden="true"></div><div class="moving-photo" aria-hidden="true"><img src="${m.photo.src}" alt=""></div></div>`;
  status='写真の複製が、衛星から地上局へ移動します。';
  actions='<button class="btn primary-action" data-exp="skip-photo-motion">送信の演出をスキップ</button>';
 }
 if(phase==='complete'){
  title='✓ あなたの写真が、地上に届きました。';
  scene=`<div class="received-photo"><img data-photo="ground" src="${m.groundSrc}" alt="地上局に届いた同じ模擬写真"><div class="received-caption">地上局で受信した写真 / 撮った画像と同じデータ</div></div>`;
  status='撮り直すと、違う構図の写真も届けられます。';
  actions='<button class="btn primary-action" data-exp="retake">別の構図で、もう一度撮る</button><button class="btn secondary secondary-action" data-go="post">願いの旅へ</button>';
 }
 return `<div class="ex-wrap" data-photo-phase="${phase}"><header class="ex-head"><h1 tabindex="-1">地球の写真を、地上へ届けよう。</h1><p>カメラを載せる → 自分で撮る → 同じ写真を届ける</p></header><ol class="ex-progress" aria-label="写真ミッションの進行">${['カメラ','撮影','地上へ送信'].map((p,i)=>`<li class="${i===step?'current':''}" ${i===step?'aria-current="step"':''}>${i+1} ${p}</li>`).join('')}</ol><section class="ex-stage"><h2>${title}</h2>${scene}<p class="ex-status" role="status">${status}</p><div class="ex-actions">${actions}</div><p class="ex-meta">地球・写真・通信は模擬体験です。実際の衛星や地上局には接続していません。</p></section><div class="ex-secondary"><button class="link-button" data-action="open-advanced">もっと工夫する：部品・電力コース</button><button class="link-button" data-go="home">ホームへ</button></div></div>`;
}
function finishPhotoMotion(){
 const m=photoMission;if(state.page!=='mission'||state.course!=='guided')return;
 const next=OrbitPhoto.nextPhase(m.phase,'finish');if(next===m.phase)return;
 m.phase=next;
 if(next==='complete'){m.groundSrc=m.photo.src;if(!m.recorded){m.recorded=true;state.counts.satellites++;}}
 render();
}
function setFraming(x,y,message){
 if(state.page!=='mission'||state.course!=='guided'||photoMission.phase!=='frame')return;
 photoMission.frame=OrbitPhoto.framing({x,y});
 const art=document.getElementById('framing-art');if(art)art.innerHTML=OrbitPhoto.photoSvg(photoMission.frame);
 const slider=document.getElementById('framing-x');if(slider)slider.value=String(photoMission.frame.x);
 const statusEl=main.querySelector('.ex-status');if(statusEl&&message)statusEl.textContent=message;
}
function experienceAction(name){
 const m=photoMission;
 if(state.page!=='mission'||state.course!=='guided')return;
 if(name==='frame-left'||name==='frame-right'){setFraming(m.frame.x+(name==='frame-left'?-20:20),m.frame.y,name==='frame-left'?'地球を左へ動かしました。':'地球を右へ動かしました。');return;}
 if(name==='skip-photo-motion'){if(m.phase==='attaching'||m.phase==='sending'){if(experienceTimer!==null)clearTimeout(experienceTimer);experienceTimer=null;experienceGeneration++;finishPhotoMotion();}return;}
 const event={"attach-camera":"attach",shutter:'capture',"send-photo":"send",retake:'retake'}[name];
 if(!event)return;const next=OrbitPhoto.nextPhase(m.phase,event);if(next===m.phase)return;
 if(event==='attach')m.camera=true;
 if(event==='capture')m.photo=OrbitPhoto.capture(m.frame);
 if(event==='retake'){m.photo=null;m.groundSrc=null;}
 m.phase=next;render();
 if(next==='attaching'||next==='sending')laterExperience(finishPhotoMotion,next==='attaching'?700:1100);
}
function wishCard(){
 return `<div class="continuity-card post-wish-paper" data-card-id="wish-${state.wishIndex}" aria-label="例文の短冊：${esc(WISHES[state.wishIndex])}"><span class="wish-star" aria-hidden="true">★</span><p>${esc(WISHES[state.wishIndex])}</p></div>`;
}
function recommendedPostIntro(){return `<div class="ex-wrap"><header class="ex-head"><h1 tabindex="-1">願いの画像を、宇宙へ。</h1><p>例文を選んで、短冊から流れ星までを見てみよう。</p></header><section class="ex-stage" style="margin-top:12px"><div class="ex-scene post-choice-scene">${wishCard()}</div><div class="compact-wishes" role="group" aria-label="体験用の願いを選ぶ">${WISHES.map((w,i)=>`<button class="wish-option" id="wish-${i}" data-wish="${i}" aria-pressed="${state.wishIndex===i}"><span class="wish-check">${icon('check',12)}</span>${esc(w)}</button>`).join('')}</div><div class="ex-actions"><button class="btn orange primary-action" data-action="start-journey">この短冊で旅を始める ${icon('arrow',17)}</button></div><p class="ex-meta">例文の模擬体験です。実際の受付・送信・衛星への搭載は行いません。</p></section></div>`;}
function recommendedJourney(){
 const wish=Number.isInteger(state.wishIndex)&&state.wishIndex>=0&&state.wishIndex<WISHES.length?state.wishIndex:0;
 return `<div class="post-flow-shell"><h1 tabindex="-1">願いの画像を、宇宙へ。</h1><iframe class="post-flow-frame" title="選んだ短冊の画像を追う、宇宙ポストの8場面" src="./animations/spacepost-flow/deck.html?embed=1&amp;wish=${wish}&amp;reduce=${reducedMotion()?1:0}"></iframe><div class="post-flow-footer"><button class="link-button" data-action="select-wish">願いを選び直す</button><button class="link-button" data-go="mission">地球の写真体験へ</button></div></div>`;
}
function currentPostFrame(){return main.querySelector('.post-flow-frame');}
function sendPostFlow(type,extra={}){
 const frame=currentPostFrame();if(!frame?.contentWindow)return;
 frame.contentWindow.postMessage({channel:'orbit-spacepost',type,...extra},location.origin==='null'?'*':location.origin);
}
function pausePostFlow(){sendPostFlow('pause');}
function syncPostMotion(){sendPostFlow('motion',{reduced:reducedMotion()});}
window.addEventListener('message',event=>{
 const frame=currentPostFrame();
 if(state.page!=='post'||state.postStage<0||!frame||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.channel!=='orbit-spacepost')return;
 if(event.data.type==='ready')syncPostMotion();
 if(event.data.type==='restart')state.postRecorded=false;
 if(event.data.type==='complete'&&!state.postRecorded){state.postRecorded=true;state.counts.journeys++;}
});

document.addEventListener('pointerdown',e=>{
 const pad=e.target.closest('[data-framepad]');if(!pad||photoMission.phase!=='frame')return;
 frameDrag={id:e.pointerId,x:e.clientX,y:e.clientY,frame:photoMission.frame,pad};pad.setPointerCapture(e.pointerId);pad.focus({preventScroll:true});
});
document.addEventListener('pointermove',e=>{
 if(!frameDrag||frameDrag.id!==e.pointerId)return;
 const r=frameDrag.pad.getBoundingClientRect();
 setFraming(frameDrag.frame.x+(e.clientX-frameDrag.x)*320/r.width,frameDrag.frame.y+(e.clientY-frameDrag.y)*180/r.height,'構図が変わりました。この構図で撮れます。');
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,()=>{frameDrag=null;});
document.addEventListener('input',e=>{if(e.target.dataset.frameAxis==='x')setFraming(Number(e.target.value),photoMission.frame.y,'構図が変わりました。この構図で撮れます。');});
document.addEventListener('keydown',e=>{
 if(!e.target.closest('[data-framepad]'))return;
 const moves={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};const v=moves[e.key];if(!v)return;e.preventDefault();setFraming(photoMission.frame.x+v[0],photoMission.frame.y+v[1],'矢印キーで構図を変えました。');
});
