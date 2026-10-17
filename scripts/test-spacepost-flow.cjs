'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../animations/spacepost-flow'),html=fs.readFileSync(path.join(root,'deck.html'),'utf8');
const content=JSON.parse(fs.readFileSync(path.join(root,'content.json'),'utf8'));
const sandbox={Motion:require(path.join(root,'runtime/motion.js')),FAMILY_CONTENT:content};
vm.createContext(sandbox);vm.runInContext(html.match(/<script id="family-model">([\s\S]*?)<\/script>/)[1],sandbox);
const {stateAt,timeline,duration}=sandbox.FamilyFlow;
assert.equal(duration,24);assert.equal(timeline.list.length,8);
const seen=new Set();
for(let k=0;k<=720;k++){
 const s=stateAt(k/30);seen.add(s.scene.id);assert.equal(s.index,timeline.at(k/30).index);
 if(s.index)assert.equal(s.photoId,'photo-01');
 for(const obj of[s.photo,s.satellite,s.sd,s.rocket])if(obj){for(const key of['x','y'])assert.ok(Number.isFinite(obj[key]));for(const key of['w','h','alpha','payload','open'])if(key in obj)assert.ok(Number.isFinite(obj[key]));if('alpha'in obj)assert.ok(obj.alpha>=0&&obj.alpha<=1);}
}
assert.equal(seen.size,8);
for(const [i,q] of timeline.list.entries()){
 assert.equal(stateAt(q.start).index,i);assert.equal(stateAt(q.start+q.preview).index,i);
 assert.ok(q.preview<q.dur);if(i)assert.equal(q.start,timeline.list[i-1].end);
}
assert.equal(stateAt(1.8).writing,1);
assert.equal(stateAt(4.8).photo.alpha,1);
assert.equal(stateAt(7.4).photo.x,760);
assert.equal(stateAt(9.9).satellite.payload,1);
assert.equal(stateAt(12.7).rocket.flame,1);
assert.equal(stateAt(15.6).rocket.alpha,0);
assert.equal(stateAt(23.3).takeaway,true);assert.equal(stateAt(23.3).satellite.alpha,0);
assert.notEqual(stateAt(17).satellite.x,stateAt(18).satellite.x,'satellite actually orbits');
const times=[0,.3,1.8,2.8,4.8,5.8,7.4,8.3,9.9,10.8,12.7,13.8,15.6,16.3,18.2,20.3,21.2,22.3,23.3,24];
const memo=new Map(times.map(t=>[t,JSON.stringify(stateAt(t))]));for(const t of times.reverse())assert.equal(JSON.stringify(stateAt(t)),memo.get(t));
for(const [,code] of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(code);
assert.ok(html.includes('M.scenes(C.scenes)'));assert.ok(!html.includes('workshop-space.png'),'old single background must not be used');
console.log('PASS: 8 scene boundaries/results, 721 state samples, same photo identity, finite coordinates, actual orbit, completion, seek order, runtime calls, JS syntax');

const {select}=require(path.join(root,'flow-content.js'));
const parent=fs.readFileSync(path.join(root,'../../index.html'),'utf8');
const wishes=JSON.parse(parent.match(/const WISHES=(\[[^;]+\]);/)[1].replaceAll("'",'"'));
assert.deepEqual(content.wishChoices.map(lines=>lines.join('')),wishes,'each selected example must match its animated card');
for(let i=0;i<wishes.length;i++){
 const selected=select(content,new URLSearchParams({wish:String(i)}));
 assert.equal(selected.wish.join(''),wishes[i]);
 selected.wish[0]='changed';assert.notEqual(content.wishChoices[i][0],'changed','selection must not mutate the source');
}
for(const bad of ['-1','3','NaN','Infinity','__proto__','<script>alert(1)</script>'])assert.deepEqual(select(content,new URLSearchParams({wish:bad})).wish,content.wish,'only predefined examples may enter the card');
assert.deepEqual(select(content,new URLSearchParams()).wish,content.wish);
console.log('PASS: all 3 selected examples, immutable content, invalid/query-text rejection');

require('./test-flow-controls.cjs');
