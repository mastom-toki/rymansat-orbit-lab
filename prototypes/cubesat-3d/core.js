/* Browser-local mission state. Rendering and timers are injected for testing. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CubeMission=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 function pose(input={}){
  const finite=n=>Number.isFinite(Number(n))?Number(n):0;
  const yaw=((finite(input.yaw)+180)%360+360)%360-180;
  return Object.freeze({yaw:Math.round(yaw*10)/10,pitch:Math.round(Math.max(-70,Math.min(70,finite(input.pitch)))*10)/10});
 }
 function create({capture,changed=()=>{},schedule=setTimeout,cancel=clearTimeout,now=()=>performance.now()}={}){
  const s={phase:'attach',pose:pose(),attached:false,photo:null,ground:null,reduced:false,error:''};
  let timer=null,generation=0,lastAction=-Infinity;
  function clear(){if(timer!==null)cancel(timer);timer=null;generation++;}
  function emit(){changed(s);}
  function guard(){const t=now();if(!Number.isFinite(t)||t-lastAction<350)return false;lastAction=t;return true;}
  function finish(){clear();if(s.phase==='attaching'){s.attached=true;s.phase='aim';}else if(s.phase==='sending'){s.ground=s.photo.src;s.phase='complete';}emit();}
  function later(ms){if(s.reduced){finish();return;}const ticket=generation;timer=schedule(()=>{if(ticket!==generation)return;timer=null;finish();},ms);}
  return {state:s,
   rotate(input){if(!['attach','aim'].includes(s.phase))return false;s.pose=pose(input);emit();return true;},
   attach(){if(s.phase!=='attach'||!guard())return false;clear();s.phase='attaching';emit();later(480);return true;},
   shutter(){if(s.phase!=='aim'||!s.attached||!guard())return false;
    try{const src=capture(s.pose);if(typeof src!=='string'||!src.startsWith('data:image/png;base64,')||src.length<40)throw Error('Invalid capture');s.photo=Object.freeze({src,pose:s.pose});s.ground=null;s.phase='review';emit();return true;}catch(_){this.fail('撮影できませんでした。3Dを読み直してください。');return false;}
   },
   send(){if(s.phase!=='review'||!s.photo||!guard())return false;clear();s.phase='sending';emit();later(850);return true;},
   retake(){if(!['review','complete'].includes(s.phase)||!guard())return false;clear();s.photo=null;s.ground=null;s.phase='aim';emit();return true;},
   skip(){if(!['attaching','sending'].includes(s.phase))return false;finish();return true;},
   pause(){clear();if(s.phase==='attaching'){s.attached=true;s.phase='aim';}else if(s.phase==='sending'){s.ground=null;s.phase='review';}emit();},
   setReduced(value){s.reduced=Boolean(value);if(s.reduced&&['attaching','sending'].includes(s.phase))finish();else emit();},
   fail(message){clear();s.error=message;s.phase='error';emit();},
   dispose(){clear();changed=()=>{};}
  };
 }
 return Object.freeze({pose,create});
});
