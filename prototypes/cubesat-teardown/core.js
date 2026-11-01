/* Teardown model: every part, label and gauge is a pure function of one input, the time t (seconds). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CubeTeardown=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const DURATION=26,BEAT0=2,BEAT_GAP=2.4,OUT=.9,BACK0=19,BACK_GAP=.35,BACK=.8,ORBIT0=21.4,ORBIT1=23,ORBIT_END=25,IDLE_MS=25000;
 // Order matters: each group leaves along a free corridor (outer-most first), so nothing passes through another part.
 const GROUPS=Object.freeze([
  {id:'panels',name:'太陽電池パネル',role:'光を電気に変える。外すと発電が止まる。'},
  {id:'antenna',name:'アンテナ',role:'地上と電波でやりとりする。外すとリンクが切れる。'},
  {id:'camera',name:'カメラ',role:'地球を写す目。撮った画像は通信で地上へ送る。'},
  {id:'comms',name:'通信ボード',role:'送る電波を作り、受けた電波を読み取る。'},
  {id:'memory',name:'メモリ',role:'撮った画像のデータを一時的に保存する。'},
  {id:'computer',name:'制御コンピューター',role:'全体に指令を出す司令塔。'},
  {id:'battery',name:'バッテリー',role:'日陰の間も動けるよう電気をためる。'}
 ].map(Object.freeze));
 const P=(id,group,boxes,offset,delay=0,spin=0)=>Object.freeze({id,group,boxes:Object.freeze(boxes.map(b=>Object.freeze({c:Object.freeze(b.c),s:Object.freeze(b.s)}))),offset:Object.freeze(offset),delay,spin});
 const PARTS=Object.freeze([
  P('panel-px','panels',[{c:[.52,0,0],s:[.04,.92,.92]}],[1.5,0,0],0),
  P('panel-nx','panels',[{c:[-.52,0,0],s:[.04,.92,.92]}],[-1.5,0,0],.1),
  P('panel-pz','panels',[{c:[0,0,.52],s:[.92,.92,.04]}],[0,0,1.5],.2),
  P('panel-nz','panels',[{c:[0,0,-.52],s:[.92,.92,.04]}],[0,0,-1.5],.3),
  P('antenna','antenna',[{c:[0,.53,0],s:[.9,.06,.9]},{c:[0,.8,0],s:[.04,.48,.04]}],[0,2,0],0,.25),
  P('camera','camera',[{c:[0,-.53,0],s:[.9,.06,.9]},{c:[0,-.69,0],s:[.34,.26,.34]}],[0,-2,0],0,-.25),
  P('comms','comms',[{c:[0,.3,0],s:[.8,.04,.8]},{c:[0,.34,0],s:[.5,.05,.4]}],[0,1.35,0],0,.3),
  P('memory','memory',[{c:[0,-.3,0],s:[.62,.03,.5]}],[0,-1.35,0],0,-.3),
  P('computer','computer',[{c:[0,.12,0],s:[.8,.04,.8]},{c:[0,.15,0],s:[.4,.05,.4]}],[0,.7,0],0,.25),
  P('battery','battery',[{c:[0,-.12,0],s:[.7,.14,.7]}],[0,-.7,0],0,-.2)
 ]);
 const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
 const smooth=(a,b,x)=>{const k=clamp((x-a)/(b-a));return k*k*(3-2*k);};
 const outCubic=k=>1-Math.pow(1-clamp(k),3);
 const inOut=k=>{k=clamp(k);return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;};
 const wrap=t=>{const n=Number(t);if(!Number.isFinite(n))return 0;return ((n%DURATION)+DURATION)%DURATION;};
 const gi=id=>GROUPS.findIndex(g=>g.id===id);
 const beatStart=i=>BEAT0+BEAT_GAP*i;
 const holdTime=id=>beatStart(gi(id))+OUT+.5;
 const backStart=i=>BACK0+BACK_GAP*(GROUPS.length-1-i);
 // 0 = assembled, 1 = fully pulled apart.
 function amount(part,t){
  const i=gi(part.group),out=outCubic((t-beatStart(i)-part.delay)/OUT),back=inOut((t-backStart(i)-part.delay*.5)/BACK);
  return out*(1-back);
 }
 function pointerState(t){
  const n=GROUPS.length,alpha=smooth(1,1.8,t)*(1-smooth(18.4,19.2,t));
  let i=-1;for(let k=0;k<n;k++)if(t>=beatStart(k)-1.2)i=k;
  if(i<0)return {from:'rest',to:GROUPS[0].id,move:0,press:0,alpha};
  const from=i===0?'rest':GROUPS[i-1].id,s=beatStart(i);
  return {from,to:GROUPS[i].id,move:inOut((t-(s-1.2))/1.1),press:smooth(s-.12,s,t)*(1-smooth(s+.05,s+.35,t)),alpha};
 }
 function cameraState(t,parts){
  const w=2*Math.PI*t/DURATION;let spread=0,sum=0,look=0,weight=0;
  for(const p of PARTS){const m=Math.hypot(...p.offset);sum+=m;spread+=m*parts[p.id].e;look+=parts[p.id].glow*p.offset[1]*parts[p.id].e;weight+=parts[p.id].glow;}
  spread=sum?spread/sum:0;
  const orbit=smooth(ORBIT0,ORBIT1,t)*(1-smooth(ORBIT_END,DURATION,t));
  return {yaw:-35+32*Math.sin(w)+orbit*40,pitch:16+6*Math.sin(w+1)-orbit*6,distance:4.4+8.6*spread+orbit*3,lookY:weight?look/Math.max(1,weight)*.2:0};
 }
 function describe(t,active,space){
  if(active)return {kind:'part',id:active.id,title:active.name,text:active.role};
  if(t<BEAT0)return {kind:'intro',id:null,title:'小型衛星の模型',text:'いまから中身を分解します。部品をえらぶこともできます。'};
  if(t<BACK0)return {kind:'part',id:null,title:'分解中',text:'外した部品が止まると、その役目が分かります。'};
  if(t<ORBIT0)return {kind:'assemble',id:null,title:'組み立てなおす',text:'外した順の逆に、ひとつずつ元へ戻します。'};
  if(space>.5)return {kind:'orbit',id:null,title:'軌道へ（模擬）',text:'実際の軌道・性能ではなく、イメージの演出です。'};
  return {kind:'intro',id:null,title:'小型衛星の模型',text:'いまから中身を分解します。部品をえらぶこともできます。'};
 }
 function stateAt(input){
  const t=wrap(input),parts={};
  const space=smooth(ORBIT0,ORBIT1,t)*(1-smooth(ORBIT_END,DURATION,t));
  let active=null;
  for(let i=0;i<GROUPS.length;i++){const s=beatStart(i);if(t>=s&&t<s+BEAT_GAP)active=GROUPS[i];}
  for(const p of PARTS){
   const e=amount(p,t),s=beatStart(gi(p.group));
   const glow=t<BACK0?smooth(s,s+.4,t)*(1-smooth(s+BEAT_GAP-.5,s+BEAT_GAP,t)):0;
   const turn=smooth(.4,1,e)*p.spin;
   parts[p.id]={group:p.group,e,offset:[p.offset[0]*e,p.offset[1]*e,p.offset[2]*e],rotY:turn,glow,detached:e>.6};
  }
  const mean=ids=>ids.reduce((a,id)=>a+parts[id].e,0)/ids.length;
  const eP=mean(['panel-px','panel-nx','panel-pz','panel-nz']),eA=parts.antenna.e,eC=parts.camera.e,eK=parts.comms.e,eM=parts.memory.e,eO=parts.computer.e,eB=parts.battery.e;
  const gen=5.2*(1-eP),draw=.3+.6*(1-eO)+1.4*(1-eK)+.9*(1-eC)+.2*(1-eM),net=gen-draw;
  const gauges=[
   {id:'power',label:'発電 − 消費',unit:'W',value:net,min:-4,max:5},
   {id:'battery',label:'バッテリー',unit:'%',value:clamp(60+net*6,0,100)*(1-eB),min:0,max:100},
   {id:'link',label:'地上との通信',unit:'%',value:100*(1-eA)*(1-eK),min:0,max:100},
   {id:'temp',label:'内部の温度',unit:'℃',value:14+10*(1-eP)+4*(1-eO)-6*space,min:0,max:30}
  ];
  return {t,duration:DURATION,space,active:active?active.id:null,parts,gauges,camera:cameraState(t,parts),pointer:pointerState(t),label:describe(t,active,space),phase:t<BEAT0?'intro':t<BACK0?'teardown':t<ORBIT0?'assemble':t<ORBIT_END?'orbit':'intro'};
 }
 /* Tour clock: auto-plays, hands control to the visitor on any input, takes it back after 25 s of quiet. */
 function createClock({reduced=false,idleMs=IDLE_MS}={}){
  const c={t:0,playing:!reduced,mode:reduced?'manual':'tour',reduced,lastInput:-Infinity,seek:null};
  const finish=()=>Object.freeze({...c});
  return {
   get state(){return finish();},
   setReduced(value){c.reduced=Boolean(value);if(c.reduced){c.playing=false;c.mode='manual';c.seek=null;}},
   interact(now){c.mode='manual';c.playing=false;c.lastInput=now;},
   play(now){c.lastInput=now;c.mode='tour';c.playing=!c.reduced;},
   pause(now){c.lastInput=now;c.mode='manual';c.playing=false;},
   scrub(t,now){c.lastInput=now;c.mode='manual';c.playing=false;c.seek=null;c.t=wrap(t);},
   goTo(t,now){
    c.lastInput=now;c.mode='manual';c.playing=false;const target=wrap(t);
    if(c.reduced||c.t>=BACK0||Math.abs(target-c.t)>8){c.t=target;c.seek=null;}else c.seek={from:c.t,to:target,elapsed:0,duration:700};
   },
   tick(dtMs,now){
    const dt=clamp(dtMs,0,100);
    if(c.seek){c.seek.elapsed+=dt;const k=inOut(c.seek.elapsed/c.seek.duration);c.t=c.seek.from+(c.seek.to-c.seek.from)*k;if(c.seek.elapsed>=c.seek.duration){c.t=c.seek.to;c.seek=null;}}
    else if(c.mode==='manual'&&!c.reduced&&now-c.lastInput>=idleMs){c.mode='tour';c.playing=true;}
    else if(c.playing&&!c.reduced)c.t=wrap(c.t+dt/1000);
    return c.t;
   }
  };
 }
 return Object.freeze({DURATION,BEAT0,BEAT_GAP,OUT,BACK0,ORBIT0,IDLE_MS,GROUPS,PARTS,stateAt,createClock,beatStart,backStart,holdTime,wrap});
});
