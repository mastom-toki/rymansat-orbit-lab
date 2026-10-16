'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../animations/spacepost-flow/deck.html'),'utf8');
const code=html.match(/<script id="flow-model">([\s\S]*?)<\/script>/)[1];
const sandbox={};vm.createContext(sandbox);vm.runInContext(code,sandbox);
const {stateAt,SCENES,duration}=sandbox.OrbitFlow;
assert.equal(duration,40);assert.equal(SCENES.length,8);
for(let i=0;i<SCENES.length;i++){
 assert.equal(stateAt(SCENES[i].start).step,i);
 if(i)assert.equal(SCENES[i-1].end,SCENES[i].start);
}
const initial=stateAt(0);
for(let n=0;n<=1200;n++){
 const s=stateAt(n/30);
 assert.deepEqual(s.paper,initial.paper,'paper must remain on the ground');
 assert.equal(s.image.id,'image-01');
 assert.equal(s.image.content,s.paper.content);
 for(const o of[s.image,s.sd,s.satellite,s.rocket]){
  for(const k of['x','y','s','alpha'])assert.ok(Number.isFinite(o[k]),`${s.t}:${k}`);
  assert.ok(o.alpha>=0&&o.alpha<=1);assert.ok(o.s>0);
 }
 if(s.t>=16){assert.equal(s.image.x,s.satellite.x);assert.equal(s.image.y,s.satellite.y);}
}
assert.equal(stateAt(0).image.alpha,0);
assert.equal(stateAt(7).image.alpha,1);
assert.equal(stateAt(SCENES[1].previewAt).image.alpha,1,'photo step preview shows its completed copy');
assert.equal(stateAt(SCENES[7].previewAt).ended,true,'reduced-motion step preview reaches the final result');
for(let i=0;i<8;i++)assert.equal(stateAt(SCENES[i].previewAt).step,i);
assert.notEqual(stateAt(7).image.x,stateAt(12).image.x,'image must move to SD');
assert.notEqual(stateAt(7).image.s,stateAt(12).image.s,'image must shrink into SD');
assert.notDeepEqual(stateAt(27).satellite,stateAt(29).satellite,'satellite must orbit');
assert.equal(stateAt(40).satellite.alpha,0);assert.equal(stateAt(40).ended,true);
for(const boundary of[17,18,22,26,34]){
 const before=stateAt(boundary-0.00001).satellite,after=stateAt(boundary).satellite;
 assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1,`position continuity at ${boundary}`);
 assert.ok(Math.abs(before.s-after.s)<.01,`size continuity at ${boundary}`);
}
assert.equal(stateAt(22).satellite.fold,1);
assert.ok(stateAt(23.5).satellite.fold<1&&stateAt(23.5).satellite.fold>0);
assert.equal(stateAt(25).satellite.fold,0);
const times=[0,7,12,16,19,23,29,36,40];
const records=new Map(times.map(t=>[t,JSON.stringify(stateAt(t))]));
for(const t of [...times].reverse())assert.equal(JSON.stringify(stateAt(t)),records.get(t),'seek must be order independent');
assert.equal(stateAt(-1).t,0);assert.equal(stateAt(100).t,40);assert.equal(stateAt(NaN).t,0);
const scripts=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
for(const [,s] of scripts)new vm.Script(s);
assert.ok(!/https?:\/\/[^'"\s]+\.js/.test(html),'no external runtime requests');
console.log('PASS: 8 scene boundaries, 1201 state samples, paper/image identity, SD transfer, orbit, completion, continuous launch/deployment, seek order, JS syntax');
