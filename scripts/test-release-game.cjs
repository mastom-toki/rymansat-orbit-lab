'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const api=require('../games/satellite-release/core.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('every target and exact success boundary is playable',()=>{for(let n=1;n<=100;n++){const z=api.target(n);assert.ok(z.low>0&&z.high<.78);for(const p of [z.low,z.center,z.high])assert.equal(api.judge(p,z).kind,'orbit');assert.equal(api.judge(z.center,z).score,100);assert.equal(api.judge(z.low-.000001,z).kind,'early');assert.equal(api.judge(z.high+.000001,z).kind,'drift');}});
test('early, orbit, drift, moon, sun and no release have distinct results',()=>{const z=api.target(1);assert.deepEqual([.1,z.center,.74,.84,.95].map(p=>api.judge(p,z).kind),['early','orbit','drift','moon','sun']);assert.equal(api.judge(1,z,true).kind,'miss');});
test('release timing uses real elapsed time, independent of frame count',()=>{for(const step of [8,16,33,250]){const g=api.createGame();g.start(100);for(let t=100;t<3636;t+=step)g.advance(t);assert.ok(g.release(3636));assert.equal(g.state.outcome.score,100);}});
test('one release only; double release cannot count twice',()=>{const g=api.createGame();g.start(0);assert.equal(g.start(0),false);g.release(3536);assert.equal(g.release(3540),false);assert.equal(g.state.successes,1);assert.equal(g.state.attempt,1);});
test('timeout does not silently deploy; it is a missed attempt',()=>{const g=api.createGame();g.start(0);assert.equal(g.release(6801),false);assert.equal(g.state.outcome.kind,'miss');g.advance(8301);assert.equal(g.state.phase,'result');});
test('pause freezes active elapsed time; resume has no catch-up jump',()=>{const g=api.createGame();g.start(10);g.pause(1010);g.advance(999999);assert.equal(g.state.elapsed,1000);g.resume(1000000);g.advance(1000100);assert.equal(g.state.elapsed,1100);});
test('result pause, skip, retry and best-score retention',()=>{const g=api.createGame();g.start(0);g.release(3536);g.pause(3636);g.advance(50000);assert.equal(g.state.resultTime,100);g.resume(50000);g.skip();assert.equal(g.state.phase,'result');g.start(51000);assert.equal(g.state.best,100);assert.equal(g.state.successes,1);assert.equal(g.state.outcome,null);assert.notEqual(g.state.zone.center,api.target(1).center);});
test('slow mode changes active time consistently',()=>{const g=api.createGame();g.start(0,true);g.release(3536/.6);assert.equal(g.state.outcome.score,100);});
test('stop discards active attempt and old frame timestamp',()=>{const g=api.createGame();g.start(0);g.stop();g.advance(100000);assert.equal(g.state.phase,'ready');assert.equal(g.state.outcome,null);});
function harness(){
 let now=0,nextId=0;const callbacks=new Map(),handlers={},messages=[];
 const ctx=new Proxy({}, {get(o,k){if(!(k in o))o[k]=()=>{};return o[k];},set(o,k,v){o[k]=v;return true;}});
 const elements={};
 function element(id){return elements[id]||= {id,textContent:'',checked:false,disabled:false,hidden:false,dataset:{},style:{},classList:{add(){}},attributes:{},setAttribute(k,v){this.attributes[k]=v;},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},focus(){document.activeElement=this;},getContext(){return ctx;},getBoundingClientRect(){return {height:620};}};}
 const document={body:element('body'),activeElement:null,hidden:false,getElementById:element,querySelector:()=>element('game'),addEventListener(type,fn){handlers[type]=fn;}};document.activeElement=document.body;
 const motion={matches:false,addEventListener(type,fn){handlers['os-'+type]=fn;}};
 const parent={postMessage(data,origin){messages.push({data,origin});}};
 const context={SatelliteRelease:api,document,location:{origin:'http://example.test'},parent,matchMedia:()=>motion,performance:{now:()=>now},requestAnimationFrame(fn){callbacks.set(++nextId,fn);return nextId;},cancelAnimationFrame(id){callbacks.delete(id);},ResizeObserver:class{observe(){}},window:{addEventListener(type,fn){handlers[type]=fn;}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../games/satellite-release/game.js'),'utf8'),context);
 function tick(t){now=t;const list=[...callbacks.values()];callbacks.clear();for(const fn of list)fn(t);}
 function click(id,t){now=t;const el=element(id);if(!el.disabled&&!el.hidden){document.activeElement=el;el.listeners.click();}tick(t);}
 function send(data,overrides={}){handlers.message({source:parent,origin:context.location.origin,data:{channel:'orbit-release',...data},...overrides});}
 return {elements,element,document,handlers,motion,parent,messages,tick,click,send};
}
test('UI debounce prevents a double tap from immediately releasing',()=>{const h=harness();h.click('primary',0);h.click('primary',50);assert.equal(h.element('game').dataset.phase,'flying');h.click('primary',3536);assert.equal(h.element('game').dataset.phase,'resolving');assert.match(h.element('result-title').textContent,/100点/);h.tick(5036);assert.equal(h.element('game').dataset.phase,'result');});
test('focus moves to skip during result animation and primary on finish',()=>{const h=harness();h.click('primary',0);h.click('primary',1000);assert.equal(h.document.activeElement,h.element('skip'));h.tick(2500);assert.equal(h.document.activeElement,h.element('primary'));});
test('skip result is immediate and cannot launch by double tap',()=>{const h=harness();h.click('primary',0);h.click('primary',1000);h.click('skip',1400);assert.equal(h.element('game').dataset.phase,'result');h.click('primary',1410);assert.equal(h.element('game').dataset.phase,'result');h.click('primary',1800);assert.equal(h.element('attempt').textContent,2);});
test('parent motion cannot be overwritten locally; wrong source/origin ignored',()=>{const h=harness();h.send({type:'motion',reduced:true},{origin:'https://wrong.test'});assert.equal(h.element('reduce').disabled,false);h.send({type:'motion',reduced:true},{source:{}});assert.equal(h.element('reduce').disabled,false);h.send({type:'motion',reduced:true});assert.equal(h.element('reduce').disabled,true);h.click('primary',0);h.click('primary',1000);assert.equal(h.element('game').dataset.phase,'result');});
test('visibility interruption waits for explicit resume',()=>{const h=harness();h.click('primary',0);h.tick(1000);h.document.hidden=true;h.handlers.visibilitychange();h.tick(20000);assert.equal(h.element('game').dataset.phase,'paused');h.click('primary',21000);h.tick(21100);assert.equal(h.element('game').dataset.phase,'flying');assert.ok(parseFloat(h.element('needle').style.left)<20);});
test('parent pause and pagehide dispose animation without stale completion',()=>{const h=harness();h.click('primary',0);h.tick(1000);h.send({type:'pause'});assert.equal(h.element('game').dataset.phase,'paused');h.handlers.pagehide();h.tick(90000);assert.equal(h.element('wins').textContent,0);});
test('held Enter and Space are ignored',()=>{const h=harness();for(const key of ['Enter',' ']){let stopped=false;h.handlers.keydown({key,repeat:true,preventDefault(){stopped=true;}});assert.equal(stopped,true);}});
test('timing states also have Japanese cues and accessible progress',()=>{const h=harness();h.click('primary',0);assert.match(h.element('instruction').textContent,/まだ早い/);h.tick(3536);assert.match(h.element('instruction').textContent,/いまだ/);assert.equal(h.element('timing').attributes['aria-valuenow'],'52');h.tick(5000);assert.match(h.element('instruction').textContent,/過ぎた/);});
function embed(){
 const source=fs.readFileSync(path.join(__dirname,'../experiences.js'),'utf8'),messages=[],handlers={};
 const frame={style:{},contentWindow:{postMessage(data,origin){messages.push({data,origin});}}};
 const state={page:'release',postStage:-1,reduceMotion:true};
 const context={state,main:{querySelector(selector){return selector==='.release-frame'?frame:null;}},location:{origin:'https://example.test'},document:{addEventListener(){}},window:{matchMedia(){return {matches:false};},addEventListener(type,fn){(handlers[type]||=[]).push(fn);}},OrbitPhoto:require('../experience-core.js')};
 vm.createContext(context);vm.runInContext(source,context);
 const send=(data,overrides={})=>handlers.message.forEach(fn=>fn({source:frame.contentWindow,origin:context.location.origin,data:{channel:'orbit-release',...data},...overrides}));
 return {frame,state,messages,send,context};
}
test('parent accepts height only from the current same-origin game',()=>{const p=embed();p.send({type:'height',height:600},{origin:'https://wrong.test'});p.send({type:'height',height:600},{source:{}});assert.equal(p.frame.style.height,undefined);p.send({type:'height',height:600});assert.equal(p.frame.style.height,'600px');for(const height of [NaN,Infinity,-1,199,10001,'900'])p.send({type:'height',height});assert.equal(p.frame.style.height,'600px');p.state.page='home';p.send({type:'height',height:900});assert.equal(p.frame.style.height,'600px');});
test('game ready receives motion policy; other player cannot receive it',()=>{const p=embed();p.send({type:'ready'});assert.equal(p.messages.length,1);assert.equal(p.messages[0].data.reduced,true);assert.equal(p.messages[0].origin,'https://example.test');p.send({type:'ready'},{data:{channel:'orbit-spacepost',type:'ready'}});assert.equal(p.messages.length,1);p.context.pauseReleaseGame();assert.equal(p.messages[1].data.type,'pause');});
console.log(`${checks} satellite-release scenarios passed (core + simulated DOM/RAF)`);
