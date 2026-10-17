/* Fictional timing rules, independent of rendering or frame rate. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SatelliteRelease=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DURATION=6800,RESULT_MS=1500,CENTERS=[.52,.61,.55,.65,.58];
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function target(attempt){const center=CENTERS[(attempt-1)%CENTERS.length];return {center,low:center-.07,high:center+.07};}
  function judge(progress,zone,missed=false){
    const p=clamp(progress,0,1);
    if(missed)return {kind:'miss',score:0,title:'あっ、放しそびれた！',hint:'次は、しま模様の帯に入ったら放してみよう。'};
    if(p<zone.low)return {kind:'early',score:0,title:'早かった！ 大気の中へ。',hint:'衛星は戻って燃え尽きた。次は、もう少し待ってみよう。'};
    if(p<=zone.high){const score=Math.round(100-40*Math.abs(p-zone.center)/.07);return {kind:'orbit',score,title:score>=95?'ぴったり！ 地球を回った！':'成功！ 地球を回った！',hint:'今度は帯の真ん中を狙って、100点に挑戦。'};}
    if(p<.78)return {kind:'drift',score:0,title:'遅かった！ 遠くへふわり。',hint:'衛星は地球から離れた。次は、少し早く放してみよう。'};
    if(p<.9)return {kind:'moon',score:0,title:'月にごっつん！',hint:'月への寄り道ルート。次は、しま模様の帯を狙おう。'};
    return {kind:'sun',score:0,title:'太陽まで行っちゃった！',hint:'熱くて燃え尽きた。次は、もっと早く放してみよう。'};
  }
  function createGame(){
    const s={phase:'ready',elapsed:0,progress:0,attempt:0,successes:0,best:0,zone:target(1),outcome:null,resultTime:0,slow:false};
    let last=null,pausedFrom=null;
    function advance(now){
      if(!Number.isFinite(now))return s;
      if(last===null){last=now;return s;}
      const dt=Math.max(0,now-last);last=Math.max(last,now);
      if(s.phase==='flying'){
        s.elapsed+=dt*(s.slow?.6:1);s.progress=clamp(s.elapsed/DURATION,0,1);
        if(s.progress>=1)finish(true);
      }else if(s.phase==='resolving'){
        s.resultTime=clamp(s.resultTime+dt,0,RESULT_MS);
        if(s.resultTime>=RESULT_MS)s.phase='result';
      }
      return s;
    }
    function finish(missed){
      s.outcome=judge(s.progress,s.zone,missed);s.resultTime=0;s.phase='resolving';
      if(s.outcome.kind==='orbit')s.successes++;
      s.best=Math.max(s.best,s.outcome.score);
    }
    return {state:s,advance,
      start(now,slow=false){if(!['ready','result'].includes(s.phase))return false;s.attempt++;s.zone=target(s.attempt);s.elapsed=0;s.progress=0;s.outcome=null;s.resultTime=0;s.slow=slow;s.phase='flying';last=now;pausedFrom=null;return true;},
      release(now){advance(now);if(s.phase!=='flying')return false;finish(false);return true;},
      pause(now){advance(now);if(!['flying','resolving'].includes(s.phase))return false;pausedFrom=s.phase;s.phase='paused';return true;},
      resume(now){if(s.phase!=='paused')return false;s.phase=pausedFrom;last=now;return true;},
      skip(){if(s.phase!=='resolving')return false;s.resultTime=RESULT_MS;s.phase='result';return true;},
      stop(){last=null;pausedFrom=null;s.phase='ready';}
    };
  }
  return {DURATION,RESULT_MS,target,judge,createGame};
});
