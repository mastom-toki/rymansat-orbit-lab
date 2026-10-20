/* Integration contract: only the active same-origin player may update the journey. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../experiences.js'),'utf8');
function player(){
 const messages=[],handlers={};
 const frame={contentWindow:{postMessage(data,origin){messages.push({data,origin});}}};
 const state={page:'post',postStage:0,wishIndex:1,postRecorded:false,counts:{journeys:0},reduceMotion:false};
 const main={querySelector(){return frame;}};
 const context={state,main,location:{origin:'https://example.test'},document:{addEventListener(){}},window:{matchMedia(){return {matches:false};},addEventListener(type,fn){(handlers[type]||=[]).push(fn);}},OrbitPhoto:require('../experience-core.js')};
 vm.createContext(context);vm.runInContext(source,context);
 function send(type,overrides={}){handlers.message.forEach(fn=>fn({source:frame.contentWindow,origin:context.location.origin,data:{channel:'orbit-spacepost',type},...overrides}));}
 return {context,frame,state,messages,send};
}
let checks=0;function test(name,run){run();checks++;console.log('PASS '+name);}
test('a different origin cannot complete a journey',()=>{const p=player();p.send('complete',{origin:'https://other.test'});assert.equal(p.state.counts.journeys,0);});
test('another frame cannot complete or restart the current journey',()=>{const p=player();p.send('complete',{source:{}});assert.equal(p.state.counts.journeys,0);p.state.postRecorded=true;p.send('restart',{source:{}});assert.equal(p.state.postRecorded,true);});
test('completion is counted once and explicit replay starts a new attempt',()=>{const p=player();p.send('complete');p.send('complete');assert.equal(p.state.counts.journeys,1);p.send('restart');p.send('complete');assert.equal(p.state.counts.journeys,2);});
test('late messages after leaving the experience are ignored',()=>{const p=player();p.state.page='mission';p.send('complete');assert.equal(p.state.counts.journeys,0);p.state.page='post';p.state.postStage=-1;p.send('complete');assert.equal(p.state.counts.journeys,0);});
test('ready syncs reduced motion to the active player with an exact target origin',()=>{const p=player();p.state.reduceMotion=true;p.send('ready');assert.equal(p.messages.length,1);assert.equal(p.messages[0].data.reduced,true);assert.equal(p.messages[0].origin,p.context.location.origin);});
test('screen navigation sends pause to the active player',()=>{const p=player();p.context.pausePostFlow();assert.equal(p.messages[0].data.type,'pause');});
test('unknown channels cannot update the counter',()=>{const p=player();p.send('complete',{data:{channel:'other',type:'complete'}});assert.equal(p.state.counts.journeys,0);});
console.log(`${checks} embedded-player scenarios passed`);
