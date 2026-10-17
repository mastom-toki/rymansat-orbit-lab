import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const content=JSON.parse(fs.readFileSync(path.join(root,'content.json'),'utf8'));
const runtime=fs.readFileSync(path.join(root,'runtime/motion.js'),'utf8');
const core=fs.readFileSync(path.join(root,'../../experience-core.js'),'utf8');
const duration=content.scenes.reduce((n,s)=>n+s.dur,0);
const html=fs.readFileSync(path.join(root,'deck.template.html'),'utf8')
 .replace('/* EXPERIENCE_CORE */',core)
 .replace('/* MOTION_RUNTIME */','/* @runtime:begin motion.js */\n'+runtime+'\n/* @runtime:end */')
 .replace('/* CONTENT_JSON */',JSON.stringify(content).replaceAll('<','\\u003c'));
fs.writeFileSync(path.join(root,'deck.html'),html.replaceAll('\r\n','\n'));
fs.writeFileSync(path.join(root,'deck.json'),JSON.stringify({title:content.title,kind:'motion',created:'2026-10-17',source:'ORBIT LAB / 家族向けの8場面。個別素材＋Motion.scenes／seg／ease／lerp',duration,size:content.size,intent:'8場面の独立配置。冒頭から動き、写真を同じ画像のまま追う。場面境界はカット。撮影の白フラッシュなし。仕組みの模式図。無音。'},null,2)+'\n');
console.log(`Built ${duration}s / ${content.scenes.length} scenes`);
