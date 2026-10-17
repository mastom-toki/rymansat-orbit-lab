/* Player event regression under a simulated DOM; real UI tests are recorded separately. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../animations/spacepost-flow'),html=fs.readFileSync(path.join(root,'deck.html'),'utf8');
function player(){
 const nodes={},events={},docEvents={},pending=Promise.resolve();
 const context2d=new Proxy({},{get(){return ()=>{};},set(){return true;}});
 const document={activeElement:null,fonts:{ready:pending},createElement(){return node('created');},getElementById(id){return nodes[id]??=(node(id));},querySelector(){return node('slide');},addEventListener(type,fn){docEvents[type]=fn;}};
 function node(id){let disabled=false;return {id,style:{},checked:false,value:'',textContent:'',clientWidth:340,clientHeight:450,classList:{add(){}},set disabled(value){disabled=value;if(value&&document.activeElement===this)document.activeElement=null;},get disabled(){return disabled;},focus(){document.activeElement=this;},append(){},before(){},setAttribute(){},getContext(){return context2d;}};}
 document.documentElement=node('html');
 const media={matches:false,addEventListener(type,fn){this.changed=fn;}};
 const parent={postMessage(){}};
 const context={document,location:{origin:'https://example.test',search:'?embed=1&reduce=1'},parent,URLSearchParams,matchMedia(){return media;},addEventListener(type,fn){events[type]=fn;},Motion:require(path.join(root,'runtime/motion.js')),OrbitPhoto:require('../experience-core.js'),FAMILY_CONTENT:JSON.parse(fs.readFileSync(path.join(root,'content.json'),'utf8')),Image:class{constructor(){this.width=1024;this.height=1024;}decode(){return pending;}},performance:{now(){return 0;}},requestAnimationFrame(){return 1;},cancelAnimationFrame(){}};
 context.window=context;vm.createContext(context);
 const scripts=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 vm.runInContext(html.match(/<script id="family-model">([\s\S]*?)<\/script>/)[1],context);
 vm.runInContext(scripts.at(-1),context);
 const message=reduced=>events.message({source:parent,origin:context.location.origin,data:{channel:'orbit-spacepost',type:'motion',reduced}});
 return {context,document,nodes,media,message};
}
module.exports=(async()=>{
const p=player();
assert.equal(p.nodes.play.disabled,true,'controls wait for loaded assets');
await p.context.__renderReady;
assert.equal(p.nodes.play.disabled,false,'controls unlock after assets load');
assert.equal(p.nodes.reduce.checked,true);assert.equal(p.nodes.reduce.disabled,true);
p.media.matches=false;p.media.changed();assert.equal(p.nodes.reduce.checked,true,'OS off cannot clear the parent reduction');
p.message(false);assert.equal(p.nodes.reduce.disabled,false);assert.equal(p.nodes.reduce.checked,false);
p.nodes.reduce.checked=true;p.nodes.reduce.onchange();p.message(true);p.media.changed();p.message(false);assert.equal(p.nodes.reduce.checked,true,'local reduction survives forced preference changes');
p.media.matches=true;p.media.changed();assert.equal(p.nodes.reduce.disabled,true);assert.equal(p.nodes.reduce.checked,true);
p.context.seek(4.8);p.nodes.prev.focus();p.nodes.prev.onclick({timeStamp:500});assert.equal(p.document.activeElement,p.nodes.next,'focus survives Prev becoming disabled');
p.context.seek(18.2);p.nodes.next.focus();p.nodes.next.onclick({timeStamp:1000});assert.equal(p.document.activeElement,p.nodes.restart,'focus survives Next becoming disabled');
p.nodes.restart.onclick({timeStamp:1500});p.nodes.next.onclick({timeStamp:2000});p.nodes.next.onclick({timeStamp:2010});assert.equal(p.nodes.time.textContent,'4.8 / 24.0秒','rapid double tap advances one scene');p.nodes.next.onclick({timeStamp:2350});assert.equal(p.nodes.time.textContent,'7.4 / 24.0秒','controls resume after guard interval');
console.log('PASS: forced/local reduced motion, focus before disabling, rapid-tap guard, guard recovery (simulated DOM)');

})().catch(error=>{console.error(error);process.exitCode=1;});
