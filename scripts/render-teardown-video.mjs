// Renders the teardown tour to MP4 (silent, H.264). Every frame is stateAt(t) drawn by the real page, so no screen recorder is involved.
// Needs: Node 22+, Edge or Chrome, ffmpeg. No npm packages. Output goes to --out (outside the repository).
//   node scripts/render-teardown-video.mjs --out C:\path\to\dir [--fps 30] [--portrait] [--poster 11.6] [--limit 3]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),opt=name=>{const i=args.indexOf('--'+name);return i<0?null:(args[i+1]&&!args[i+1].startsWith('--')?args[i+1]:true);};
const out=opt('out');if(!out||out===true){console.error('--out <directory> is required (keep renders outside the repository)');process.exit(2);}
const fps=Number(opt('fps')||30),portrait=Boolean(opt('portrait')),posterAt=opt('poster'),limit=opt('limit')?Number(opt('limit')):Infinity;
const [cssW,cssH,scale]=portrait?[720,1280,1.5]:[1280,720,1.5];
const browserPath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p));
if(!browserPath){console.error('Edge or Chrome was not found');process.exit(2);}
fs.mkdirSync(out,{recursive:true});

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));
 if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;

const profile=fs.mkdtempSync(path.join(os.tmpdir(),'teardown-render-'));
const debugPort=9300+Math.floor(Math.random()*500);
const browser=spawn(browserPath,[`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--headless=new','--hide-scrollbars','--mute-audio','--no-first-run','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','about:blank'],{stdio:'ignore'});
const cleanup=()=>{try{browser.kill();}catch{}server.close();try{fs.rmSync(profile,{recursive:true,force:true});}catch{}};
process.on('exit',cleanup);

async function until(fn,ms=20000){const t0=Date.now();for(;;){try{const v=await fn();if(v)return v;}catch{}if(Date.now()-t0>ms)throw new Error('timeout');await new Promise(r=>setTimeout(r,150));}}
const version=await until(async()=>(await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json());
const targets=await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const page=targets.find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad;});
let id=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {ok,bad}=pending.get(m.id);pending.delete(m.id);m.error?bad(new Error(m.error.message)):ok(m.result);}};
const send=(method,params={})=>new Promise((ok,bad)=>{const n=++id;pending.set(n,{ok,bad});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+' '+(r.exceptionDetails.exception?.description||''));return r.result.value;};

async function open(width,height,factor=scale){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:factor,mobile:false});
 await send('Page.navigate',{url:`${base}/prototypes/cubesat-teardown/index.html?render=1`});
 await until(async()=>evaluate('Boolean(window.__teardown)'),30000);
}
async function frameAt(t){
 await evaluate(`window.__teardown.renderAt(${t});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 return Buffer.from(shot.data,'base64');
}

try{
 if(posterAt){
  await open(1200,630,1);
  const t=Number(posterAt);fs.writeFileSync(path.join(out,'poster-1200x630.png'),await frameAt(t));
  console.log('poster written for t =',t);
 }else{
  await open(cssW,cssH);
  const duration=await evaluate('window.__teardown.duration'),frames=Math.min(Math.round(duration*fps),limit);
  const name=portrait?'teardown-9x16.mp4':'teardown-16x9.mp4',target=path.join(out,name);
  const ff=spawn(process.env.FFMPEG||'ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-r',String(fps),target],{stdio:['pipe','inherit','inherit']});
  const done=new Promise((ok,bad)=>{ff.on('close',code=>code===0?ok():bad(new Error('ffmpeg exited with '+code)));ff.on('error',bad);});
  const started=Date.now();
  for(let n=0;n<frames;n++){
   const png=await frameAt(n/fps);
   if(!ff.stdin.write(png))await new Promise(r=>ff.stdin.once('drain',r));
   if(n%30===0)console.log(`frame ${n}/${frames} (${((Date.now()-started)/1000).toFixed(0)} s)`);
  }
  ff.stdin.end();await done;console.log('wrote',target,frames,'frames at',fps,'fps');
 }
}finally{ws.close();cleanup();}
process.exit(0);
