/* Recommended photo mission and continuous, browser-local wish-card journey. */
'use strict';
const experienceInputGate=OrbitPhoto.primaryActionGate(350);
let photoMission,postMotion=null,experienceTimer=null,experienceGeneration=0,frameDrag=null;
function freshPhotoMission(){return {phase:'attach',camera:false,frame:{x:0,y:0},photo:null,groundSrc:null,recorded:false};}
photoMission=freshPhotoMission();
function reducedMotion(){return state.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function cancelExperience(){
 if(experienceTimer!==null)clearTimeout(experienceTimer);experienceTimer=null;experienceGeneration++;frameDrag=null;postMotion=null;
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
 if(name==='skip-post-motion'){if(state.page==='post'&&postMotion){if(experienceTimer!==null)clearTimeout(experienceTimer);experienceTimer=null;experienceGeneration++;finishPostMotion();}return;}
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
function advanceJourney(back=false){
 if(state.page!=='post'||state.postStage<0||(!back&&postMotion))return;
 cancelExperience();
 if(back){state.postStage=Math.max(-1,state.postStage-1);render();return;}
 if(state.postStage===4){state.postStage=-1;state.quizAnswer=null;state.postRecorded=false;render();return;}
 state.postStage++;postMotion=state.postStage===1?'scan':state.postStage===2?'load':null;
 if(state.postStage===4&&!state.postRecorded){state.postRecorded=true;state.counts.journeys++;}
 render();
 if(postMotion)laterExperience(finishPostMotion,800);
}

function finishPostMotion(){
 if(state.page!=='post')return;postMotion=null;
 const skip=main.querySelector('[data-exp="skip-post-motion"]'),restoreFocus=skip&&document.activeElement===skip;
 main.querySelectorAll('.scan-motion,.load-motion').forEach(el=>el.classList.remove('scan-motion','load-motion'));
 main.querySelector('.scan-line')?.remove();skip?.remove();
 const next=main.querySelector('[data-action="journey-next"]');if(next){next.disabled=false;if(restoreFocus)next.focus({preventScroll:true});}
}
function wishCard(kind='paper'){
 return `<div class="continuity-card" data-card-id="wish-${state.wishIndex}" data-card-kind="${kind}" aria-label="${kind==='paper'?'紙':'同じ願いの画像'}：${esc(WISHES[state.wishIndex])}"><span class="card-address">宇宙ポスト / 体験用カード</span><span class="card-stamp">${icon('satellite',16)}</span><p>${esc(WISHES[state.wishIndex])}</p></div>`;
}
function recommendedPostIntro(){return `<div class="ex-wrap"><header class="ex-head"><h1 tabindex="-1">同じ願いのカードで、宇宙へ。</h1><p>例文を選ぶと、そのカードの旅が始まります。</p></header><section class="ex-stage" style="margin-top:12px"><div class="ex-scene post-choice-scene">${wishCard()}</div><div class="compact-wishes" role="group" aria-label="体験用の願いを選ぶ">${WISHES.map((w,i)=>`<button class="wish-option" id="wish-${i}" data-wish="${i}" aria-pressed="${state.wishIndex===i}"><span class="wish-check">${icon('check',12)}</span>${esc(w)}</button>`).join('')}</div><div class="ex-actions"><button class="btn orange primary-action" data-action="start-journey">このカードで旅を始める ${icon('arrow',17)}</button></div><p class="ex-meta">例文の模擬体験です。実際の受付・送信・衛星への搭載は行いません。</p></section></div>`;}
const POST_STEPS=[
 {name:'紙',title:'願いの紙を、机に置きました。',status:'写真にすると、画像の複製ができます。',button:'写真にする'},
 {name:'画像',title:'紙は残り、画像の複製ができました。',status:'宇宙へ運ぶのは、右側の画像データです。',button:'画像を衛星に載せる'},
 {name:'衛星の中',title:'同じ画像が、衛星の中に入りました。',status:'メモリの中のカードを見てみよう。',button:'衛星と地球を回る'},
 {name:'周回',title:'このカードが、衛星と地球を回ります。',status:'紙は地上に残り、画像が衛星と旅をしています。',button:'旅のおわりを見る'},
 {name:'おわり',title:'最後は、再突入のイメージへ。',status:'同じカードの画像が、この旅をたどりました。',button:'もう一度、願いを選ぶ'}
];
function postOrbitSvg(){return `<svg viewBox="0 0 320 230" aria-hidden="true"><ellipse cx="186" cy="120" rx="120" ry="75" fill="none" stroke="#7fbbd2" stroke-dasharray="5 6"/><circle cx="205" cy="125" r="64" fill="#226994"/><path d="m163 99 30-28 22 13-8 25 20 21-16 25-11-15-17-10-5-18z" fill="#92b789"/></svg>`;}
function recommendedJourney(){
 const n=state.postStage,s=POST_STEPS[n];let scene='';
 if(n===0)scene=`<div class="ex-scene post-desk"><div><p class="card-copy-label">地上の机 / 元の紙</p>${wishCard('paper')}</div></div>`;
 if(n===1)scene=`<div class="ex-scene post-copy-scene ${postMotion==='scan'?'scan-motion':''}"><div><p class="card-copy-label">机に残る紙</p>${wishCard('paper')}</div><div class="image-copy"><p class="card-copy-label">できた画像の複製</p>${wishCard('image')}</div>${postMotion==='scan'?'<div class="scan-line" aria-hidden="true"></div>':''}</div>`;
 if(n===2)scene=`<div class="ex-scene ${postMotion==='load'?'load-motion':''}"><div class="satellite-memory"><p>衛星の中 / メモリ</p>${wishCard('image')}</div><p class="paper-kept">元の紙は、地上の机に残っています。</p></div>`;
 if(n===3)scene=`<div class="ex-scene orbit-story">${postOrbitSvg()}<div class="satellite-memory"><p>衛星の中にある同じ画像</p>${wishCard('image')}</div><p class="paper-kept">地球を回る模擬体験 / 実際の軌道ではありません</p></div>`;
 if(n===4)scene=`<div class="ex-scene post-end-scene">${wishCard('image')}<p class="paper-kept">再突入のイメージ。実際の時期・見え方は再現していません。</p></div>`;
 const supplement=n===1?`<details class="optional-quiz"><summary>補足：衛星に載るのはどっち？（回答は任意）</summary><div class="quiz-options"><button data-quiz="paper">元の紙</button><button data-quiz="data">画像の複製</button></div><p class="quiz-feedback" role="status">${quizText()}</p></details>`:'';
 return `<div class="ex-wrap" data-post-stage="${n}"><header class="ex-head"><h1 tabindex="-1">同じ願いのカードを、宇宙へ。</h1><p>今いる場所と、画像の移動を見てみよう。</p></header><ol class="ex-progress" aria-label="願いの旅の進行">${POST_STEPS.map((p,i)=>`<li class="${i===n?'current':''}" ${i===n?'aria-current="step"':''}>${i+1} ${p.name}</li>`).join('')}</ol><section class="ex-stage"><h2>${s.title}</h2>${scene}<p class="post-wish-caption">選んだカード：${esc(WISHES[state.wishIndex])}</p><p class="ex-status" role="status">${s.status}</p><div class="ex-actions"><button class="btn orange primary-action" data-action="journey-next" ${postMotion?'disabled':''}>${s.button} ${icon('arrow',17)}</button><button class="btn secondary secondary-action" data-action="journey-back">${n===0?'選び直す':'ひとつ戻る'}</button>${postMotion?'<button class="link-button" data-exp="skip-post-motion">演出をスキップ</button>':''}</div>${supplement}<p class="ex-meta">実際の宇宙ポスト受付・送信・搭載ではありません。</p></section><div class="ex-secondary"><button class="link-button" data-go="home">ホームへ</button><button class="link-button" data-go="mission">地球の写真体験へ</button></div></div>`;
}
function quizText(){return state.quizAnswer==='data'?'そうです。元の紙は地上に残り、画像データを衛星に載せます。':state.quizAnswer==='paper'?'衛星に載るのは画像の複製です。元の紙は地上に残ります。':'どちらを選んでも、旅は先へ進めます。';}

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
