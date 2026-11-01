import * as THREE from '../../vendor/three/three.module.js';

// Pale studio for the teardown; the space scene (dark) only fades in for the orbit finale.
const STUDIO=new THREE.Color('#edf1f3'),SPACE=new THREE.Color('#06121f'),ACCENT=new THREE.Color('#e0532f');

export function createScene({canvas,pixelRatio=1.5,onContextLost,coreParts}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,pixelRatio));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const scene=new THREE.Scene();scene.background=STUDIO.clone();
 const hemi=new THREE.HemisphereLight(0xffffff,0x9fb0ba,2.1);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(3.5,7,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
 Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:1,far:22});key.shadow.bias=-.0008;key.shadow.radius=5;scene.add(key);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.2;floor.receiveShadow=true;scene.add(floor);

 const own=[];const track=o=>{own.push(o);return o;};
 const mat=(color,roughness=.55,metalness=.25)=>track(new THREE.MeshStandardMaterial({color,roughness,metalness}));
 const ink=track(new THREE.LineBasicMaterial({color:0x1b2b3a,transparent:true,opacity:.5}));
 const solar=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#0d2a45';g.fillRect(0,0,256,256);g.strokeStyle='#6e8ea7';g.lineWidth=2;
  for(let x=0;x<3;x++)for(let y=0;y<3;y++){g.fillStyle=(x+y)%2?'#21456a':'#244d76';g.fillRect(8+x*82,8+y*82,76,76);g.strokeRect(8+x*82,8+y*82,76,76);}
  const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;return track(new THREE.MeshStandardMaterial({map:t,roughness:.45,metalness:.35}));})();
 const navy=()=>mat(0x2b4a68,.5,.35),grey=()=>mat(0xcfd8de,.6,.25),board=()=>mat(0x3d5a73,.55,.2),chip=()=>mat(0x1c2b38,.5,.2),gold=()=>mat(0xc9a24a,.45,.55);

 const model=new THREE.Group();scene.add(model);
 const groups={},materials={},anchors={};
 function box(parent,size,center,material,edges=true){
  const geometry=track(new THREE.BoxGeometry(size[0],size[1],size[2])),mesh=new THREE.Mesh(geometry,material);mesh.position.set(center[0],center[1],center[2]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  if(edges){const line=new THREE.LineSegments(track(new THREE.EdgesGeometry(geometry)),ink);line.position.copy(mesh.position);parent.add(line);}
  return mesh;
 }
 // The fixed frame: four rails and two rings. It stays put while the parts leave through its open top and bottom.
 const frame=new THREE.Group();model.add(frame);const rail=navy();
 for(const x of [-.54,.54])for(const z of [-.54,.54])box(frame,[.075,1.26,.075],[x,0,z],rail);
 for(const y of [-.6,.6]){for(const z of [-.54,.54])box(frame,[1.16,.07,.07],[0,y,z],rail);for(const x of [-.54,.54])box(frame,[.07,.07,1.16],[x,y,0],rail);}

 // Visuals read the same boxes the model tests use, so what is drawn is what is checked.
 const look={
  'panel-px':b=>[solar,false],'panel-nx':b=>[solar,false],'panel-pz':b=>[solar,false],'panel-nz':b=>[solar,false],
  antenna:i=>[i?gold():grey(),true],camera:i=>[i?chip():grey(),true],comms:i=>[i?chip():board(),true],memory:()=>[chip(),true],computer:i=>[i?chip():board(),true],battery:()=>[navy(),true]
 };
 for(const part of coreParts){
  const group=new THREE.Group();model.add(group);groups[part.id]=group;materials[part.id]=[];
  part.boxes.forEach((b,i)=>{const [m,edges]=look[part.id](i);if(m!==solar&&!materials[part.id].includes(m))materials[part.id].push(m);box(group,b.s,b.c,m,edges);});
  if(part.id.startsWith('panel-')){const m=solar.clone();m.emissive=new THREE.Color(0);materials[part.id].push(m);group.children.forEach(c=>{if(c.isMesh)c.material=m;});own.push(m);}
  anchors[part.id]=new THREE.Vector3(...part.boxes[0].c);
 }
 // Small readable details inside the existing boxes.
 const lens=new THREE.Mesh(track(new THREE.CylinderGeometry(.1,.1,.02,28)),mat(0x16222d,.2,.6));lens.position.set(0,-.81,0);groups.camera.add(lens);
 const pads=gold();for(let i=-2;i<=2;i++)box(groups.memory,[.05,.004,.1],[i*.09,-.3,.18],pads,false);
 for(let i=-1;i<=1;i++)box(groups.battery,[.18,.15,.62],[i*.22,-.12,0],mat(0x44596b,.45,.3),true).scale.set(.98,.99,.98);

 // Space finale: stars and a simple Earth below the model.
 const earthCanvas=document.createElement('canvas');earthCanvas.width=512;earthCanvas.height=256;
 {const g=earthCanvas.getContext('2d');g.fillStyle='#2b739a';g.fillRect(0,0,512,256);g.fillStyle='#8fb08a';
  for(const poly of [[[40,60],[90,40],[130,70],[110,110],[60,105]],[[150,120],[190,130],[200,190],[170,230],[150,170]],[[260,50],[330,40],[380,70],[350,100],[290,95]],[[340,130],[400,125],[430,170],[390,200],[350,170]]]){g.beginPath();poly.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=10;g.lineCap='round';for(const [x,y,l] of [[20,90,120],[200,150,150],[300,210,130],[380,60,110]]){g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+l*.3,y-12,x+l*.6,y+12,x+l,y);g.stroke();}}
 const earthTexture=track(new THREE.CanvasTexture(earthCanvas));earthTexture.colorSpace=THREE.SRGBColorSpace;
 const earth=new THREE.Mesh(track(new THREE.SphereGeometry(6,64,40)),track(new THREE.MeshStandardMaterial({map:earthTexture,roughness:1})));earth.visible=false;scene.add(earth);
 const rim=new THREE.Mesh(track(new THREE.SphereGeometry(6.18,64,40)),track(new THREE.MeshBasicMaterial({color:0x7fc8ff,transparent:true,opacity:.2,side:THREE.BackSide,depthWrite:false})));rim.visible=false;earth.add(rim);
 const starPoints=[];for(let i=0;i<220;i++){const a=i*2.3999632297,z=1-2*(i+.5)/220,r=Math.sqrt(1-z*z);starPoints.push(Math.cos(a)*r*40,Math.sin(a)*r*40,z*40);}
 const starGeometry=track(new THREE.BufferGeometry());starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));
 const stars=new THREE.Points(starGeometry,track(new THREE.PointsMaterial({color:0xffffff,size:.12,transparent:true,opacity:0})));scene.add(stars);

 const camera=new THREE.PerspectiveCamera(32,16/9,.1,80);
 let width=0,height=0,disposed=false;
 const lost=e=>{e.preventDefault();onContextLost?.();};canvas.addEventListener('webglcontextlost',lost);
 const point=new THREE.Vector3();
 function resize(w,h){w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));if(w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 // state: output of CubeTeardown.stateAt; view: camera chosen by the page; focus: group id to isolate, or null.
 function render(state,view,focus=null){
  if(disposed)return;
  const space=state.space;scene.background.copy(STUDIO).lerp(SPACE,space);
  hemi.intensity=2.1-1.2*space;hemi.color.setHex(space>.5?0xaec8ff:0xffffff);key.intensity=2.6+.4*space;floor.material.opacity=.2*(1-space);
  earth.visible=rim.visible=space>.01;earth.position.set(0,-20+12.4*space,-1);earth.rotation.y=state.t*.04;stars.material.opacity=space;
  for(const part of coreParts){
   const s=state.parts[part.id],g=groups[part.id];g.position.set(s.offset[0],s.offset[1],s.offset[2]);g.rotation.y=s.rotY;
   const dim=focus&&focus!==part.group?.12:1;
   for(const m of materials[part.id]){
    const transparent=dim<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=dim;
    if(m.emissive){m.emissive.copy(ACCENT).multiplyScalar(s.glow*.55);}
   }
   g.traverse(o=>{if(o.isLineSegments)o.visible=dim===1;});
  }
  const aspect=camera.aspect,fit=aspect<1.1?1.12/aspect:1,d=view.distance*fit,yaw=THREE.MathUtils.degToRad(view.yaw),pitch=THREE.MathUtils.degToRad(view.pitch);
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*d,view.lookY+Math.sin(pitch)*d,Math.cos(yaw)*Math.cos(pitch)*d);
  camera.lookAt(0,view.lookY,0);camera.updateMatrixWorld(true);
  model.updateMatrixWorld(true);
  renderer.render(scene,camera);canvas.dataset.frames=String((Number(canvas.dataset.frames)||0)+1);
 }
 // Screen position (CSS px inside the canvas) of a part's anchor, for the callout line.
 function anchor(id){
  const g=groups[id];if(!g||!width)return null;point.copy(anchors[id]);g.localToWorld(point);point.project(camera);
  return {x:(point.x+1)/2*width,y:(1-point.y)/2*height,visible:point.z<1};
 }
 return {render,resize,anchor,dispose(){
  if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);
  const seen=new Set();scene.traverse(o=>{if(o.geometry)seen.add(o.geometry);});for(const o of own)seen.add(o);
  for(const o of seen)o.dispose?.();earthTexture.dispose();renderer.dispose();renderer.forceContextLoss();
 }};
}
