'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const T=require('../prototypes/cubesat-teardown/core.js');
const flat=s=>[...Object.values(s.parts).flatMap(p=>[...p.offset,p.rotY,p.e,p.glow]),s.space,s.camera.yaw/180,s.camera.pitch/180,s.camera.distance,s.camera.lookY,...s.gauges.map(g=>(g.value-g.min)/(g.max-g.min))];

// Pure function of t: same input, same output; no hidden state between calls.
const a=T.stateAt(9.37),b=(T.stateAt(1),T.stateAt(24),T.stateAt(9.37));
assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
assert.equal(T.stateAt(T.DURATION+3).t,T.stateAt(3).t);
for(const bad of [NaN,undefined,null,'x',Infinity,-Infinity])assert.equal(T.stateAt(bad).t,0);
assert.ok(T.stateAt(-1).t>=0&&T.stateAt(-1).t<T.DURATION);
console.log('PASS stateAt(t) is pure, wraps, and rejects non-finite input');

// Loop seam and amount range.
const start=flat(T.stateAt(0)),end=flat(T.stateAt(T.DURATION-1e-9));
start.forEach((v,i)=>assert.ok(Math.abs(v-end[i])<1e-5,`loop seam ${i}`));
for(const p of Object.values(T.stateAt(0).parts))assert.equal(p.e,0);
let previous=flat(T.stateAt(0)),worst=0;
for(let t=.02;t<=T.DURATION;t+=.02){
 const s=T.stateAt(t),f=flat(s);
 for(const part of Object.values(s.parts)){assert.ok(part.e>=0&&part.e<=1+1e-9);assert.ok(part.offset.every(Number.isFinite));}
 f.forEach((v,i)=>{assert.ok(Number.isFinite(v));worst=Math.max(worst,Math.abs(v-previous[i]));});
 previous=f;
}
assert.ok(worst<.25,`no jump larger than 0.25 (gauges as a fraction of their range) per 20 ms (worst ${worst.toFixed(3)})`);
console.log('PASS 1300 samples at 20 ms: finite, bounded amounts, seamless loop, worst step',worst.toFixed(3));

// A part comes off every 2-3 s, and each one is announced by the label.
for(let i=1;i<T.GROUPS.length;i++){const gap=T.beatStart(i)-T.beatStart(i-1);assert.ok(gap>=2&&gap<=3,`beat gap ${gap}`);}
for(const [i,g] of T.GROUPS.entries()){
 const s=T.stateAt(T.holdTime(g.id));assert.equal(s.active,g.id);assert.equal(s.label.title,g.name);
 assert.ok(s.parts[T.PARTS.find(p=>p.group===g.id).id].detached,`${g.id} detached at hold`);
 for(const p of T.PARTS.filter(p=>T.GROUPS.findIndex(x=>x.id===p.group)>i))assert.ok(s.parts[p.id].e<1e-9,`${p.id} still attached while ${g.id} is shown`);
}
console.log('PASS 7 beats 2.4 s apart; label, active part and detached state agree');

// No two parts overlap at any time (axis-aligned boxes; spin is capped so it cannot reach the frame).
const eps=1e-6,sizes=T.PARTS.map(p=>p.boxes);
const overlap=(x,y)=>[0,1,2].every(k=>Math.abs(x.c[k]-y.c[k])<(x.s[k]+y.s[k])/2-eps);
let pairs=0;
for(let t=0;t<T.DURATION;t+=.05){
 const s=T.stateAt(t),placed=T.PARTS.map((p,i)=>sizes[i].map(b=>({id:p.id,c:b.c.map((v,k)=>v+s.parts[p.id].offset[k]),s:b.s})));
 for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)for(const x of placed[i])for(const y of placed[j]){pairs++;assert.ok(!overlap(x,y),`${x.id} intersects ${y.id} at t=${t.toFixed(2)}`);}
}
for(const p of T.PARTS)assert.ok(Math.abs(p.spin)<=.3+1e-9,`${p.id} spin stays small enough to clear the rails`);
console.log('PASS no part intersects another across the whole loop (',pairs,'box pairs )');

// Gauges follow the pose: removing a part changes what it feeds.
const whole=T.stateAt(1).gauges,g=id=>s=>s.gauges.find(x=>x.id===id).value;
assert.ok(g('link')(T.stateAt(1))>99&&g('link')(T.stateAt(T.holdTime('antenna')))<5);
assert.ok(g('power')(T.stateAt(T.holdTime('panels')))<g('power')(T.stateAt(1)));
assert.ok(g('battery')(T.stateAt(T.holdTime('battery')))<1);
assert.equal(whole.length,4);
console.log('PASS gauges are derived from the pose (antenna off: link lost, panels off: power drops, battery off: 0%)');

// Dark scene only in the orbit finale; the studio is used everywhere else.
assert.equal(T.stateAt(5).space,0);assert.equal(T.stateAt(24).space,1);assert.equal(T.stateAt(0).space,0);
console.log('PASS space scene is limited to the orbit finale');

// Pointer walks to the next button before each press.
for(const [i,gr] of T.GROUPS.entries()){const p=T.stateAt(T.beatStart(i)).pointer;assert.equal(p.to,gr.id);assert.ok(p.press<1e-9||p.press>0);assert.equal(p.alpha,1);}
{const p=T.stateAt(T.beatStart(2)-1);assert.equal(p.pointer.from,'antenna');assert.equal(p.pointer.to,'camera');assert.ok(p.pointer.move>0&&p.pointer.move<1);}
assert.equal(T.stateAt(20).pointer.alpha,0);
console.log('PASS tour pointer targets each button and hides while reassembling');

// Clock: auto tour, hand-over on input, 25 s of quiet gives control back, reduced motion never auto-plays.
{
 const c=T.createClock();let now=0;
 for(let i=0;i<10;i++){now+=100;c.tick(100,now);}assert.ok(c.state.t>.9&&c.state.mode==='tour');
 c.interact(now);assert.equal(c.state.mode,'manual');const frozen=c.state.t;
 now+=24000;c.tick(100,now);assert.equal(c.state.t,frozen);assert.equal(c.state.mode,'manual');
 now+=1100;c.tick(100,now);assert.equal(c.state.mode,'tour');
 for(let i=0;i<5;i++){now+=100;c.tick(100,now);}assert.ok(c.state.t>frozen);
 c.goTo(T.holdTime('camera'),now);assert.equal(c.state.mode,'manual');
 for(let i=0;i<10;i++){now+=100;c.tick(100,now);}assert.ok(Math.abs(c.state.t-T.holdTime('camera'))<1e-9);
 c.scrub(T.DURATION+2,now);assert.equal(c.state.t,2);
 c.tick(1e6,now);assert.ok(c.state.t<=2);
 const r=T.createClock({reduced:true});r.tick(5000,1e9);assert.equal(r.state.t,0);assert.equal(r.state.playing,false);
 r.goTo(T.holdTime('battery'),0);assert.equal(r.state.t,T.holdTime('battery'));r.tick(5000,1e9);assert.equal(r.state.mode,'manual');
 const m=T.createClock();m.setReduced(true);assert.equal(m.state.playing,false);
 const jump=T.createClock();jump.scrub(20,0);jump.goTo(5,0);assert.equal(jump.state.t,5);
 console.log('PASS clock: tour → input hand-over → 25 s return, long-frame cap, reduced motion stays manual');
}

// Static checks on the files that ship.
const dir=path.join(__dirname,'../prototypes/cubesat-teardown');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
assert.match(html,/default-src 'none'/);assert.match(html,/connect-src 'none'/);assert.match(html,/frame-src 'none'/);assert.ok(!/https?:\/\//.test(html.replace(/xmlns="[^"]+"/g,'')),'no external URLs in the page');
assert.match(html,/企画検討用の試作・採用未定/);assert.match(html,/実際の宇宙ポスト受付ではありません/);
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
assert.match(app,/orbit-teardown/);assert.match(app,/e\.source!==parent/);assert.match(app,/location\.origin/);
console.log('PASS page keeps the CSP, disclaimers, and exact parent-channel checks');
