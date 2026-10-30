import * as THREE from '../../vendor/three/three.module.js';

export function cameraQuaternion(pose){return new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(pose.pitch),THREE.MathUtils.degToRad(pose.yaw),0,'YXZ'));}

export function createScene({canvas,preview,onContextLost}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 let photoRenderer;
 try{photoRenderer=new THREE.WebGLRenderer({canvas:preview,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});}catch(e){renderer.dispose();renderer.forceContextLoss();throw e;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 photoRenderer.setPixelRatio(1);photoRenderer.setSize(640,360,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e9eef0');
 scene.add(new THREE.HemisphereLight(0xffffff,0x8b9ca6,2.4));
 const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(3,5,-4);scene.add(light);
 const observer=new THREE.OrthographicCamera(-2,2,1.25,-1.25,.1,30);observer.position.set(3,2.3,-4.5);observer.lookAt(0,0,0);
 const silver=new THREE.MeshStandardMaterial({color:0xbac8cf,metalness:.65,roughness:.36});
 const dark=new THREE.MeshStandardMaterial({color:0x1c3344,roughness:.65,metalness:.2});
 const gold=new THREE.MeshStandardMaterial({color:0xc49e49,metalness:.6,roughness:.45});
 const lens=new THREE.MeshStandardMaterial({color:0x294859,metalness:.55,roughness:.2});
 const satellite=new THREE.Group();scene.add(satellite);
 function box(w,h,d,material,x=0,y=0,z=0,parent=satellite){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 box(.98,1.08,.98,dark);
 // Structural rails and fasteners; a diagram, not a specific flight model.
 for(const x of [-.54,.54])for(const z of [-.54,.54])box(.075,1.26,.075,silver,x,0,z);
 for(const y of [-.59,.59]){box(1.16,.07,.07,silver,0,y,-.54);box(1.16,.07,.07,silver,0,y,.54);box(.07,.07,1.16,silver,-.54,y,0);box(.07,.07,1.16,silver,.54,y,0);}
 const solarCanvas=document.createElement('canvas');solarCanvas.width=256;solarCanvas.height=256;
 const p=solarCanvas.getContext('2d');p.fillStyle='#0d2a45';p.fillRect(0,0,256,256);
 p.strokeStyle='#6e8ea7';p.lineWidth=2;
 for(let x=0;x<3;x++)for(let y=0;y<4;y++){p.fillStyle=(x+y)%2?'#21456a':'#244d76';p.fillRect(8+x*82,7+y*62,76,56);p.strokeRect(8+x*82,7+y*62,76,56);}
 const solarTexture=new THREE.CanvasTexture(solarCanvas);solarTexture.colorSpace=THREE.SRGBColorSpace;
 const solar=new THREE.MeshStandardMaterial({map:solarTexture,roughness:.5,metalness:.3});
 for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(1,1.09),solar);panel.position.x=side*.581;panel.rotation.y=side*Math.PI/2;satellite.add(panel);}
 const back=new THREE.Mesh(new THREE.PlaneGeometry(1,1.09),solar);back.position.z=.583;satellite.add(back);
 box(.96,.025,.96,gold,0,.565,0);
 box(.7,.8,.035,silver,0,0,-.535);
 const mount=new THREE.Mesh(new THREE.RingGeometry(.18,.25,32),gold);mount.rotation.y=Math.PI;mount.position.set(0,.06,-.56);satellite.add(mount);
 const camera=new THREE.Group();scene.add(camera);
 box(.46,.4,.17,gold,0,0,0,camera);box(.36,.3,.04,dark,0,0,-.105,camera);
 const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.155,.155,.22,24),dark);barrel.rotation.x=Math.PI/2;barrel.position.z=-.16;camera.add(barrel);
 const glass=new THREE.Mesh(new THREE.CircleGeometry(.126,32),lens);glass.rotation.y=Math.PI;glass.position.z=-.276;camera.add(glass);
 const aperture=new THREE.Mesh(new THREE.RingGeometry(.13,.157,32),silver);aperture.rotation.y=Math.PI;aperture.position.z=-.278;camera.add(aperture);
 const detached=new THREE.Vector3(1.1,-.38,-.8),docked=new THREE.Vector3(0,.06,-.64);let attachFrom=null;
 const raycaster=new THREE.Raycaster();
 // A separate spacecraft-camera view shares the *same quaternion* as the model.
 const space=new THREE.Scene();space.background=new THREE.Color('#071724');
 space.add(new THREE.AmbientLight(0xffffff,1.5));
 const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-4,3,5);space.add(sun);
 const earthCanvas=document.createElement('canvas');earthCanvas.width=1024;earthCanvas.height=512;
 const map=earthCanvas.getContext('2d');map.fillStyle='#2b739a';map.fillRect(0,0,1024,512);
 const continents=[[[64,118],[125,70],[215,79],[261,121],[236,169],[181,182],[159,238],[113,204],[73,171]],[[220,244],[287,266],[307,328],[277,393],[250,455],[223,380],[196,315]],[[430,121],[486,90],[540,111],[582,83],[683,100],[782,144],[822,190],[733,209],[674,176],[624,231],[579,194],[548,151],[497,164]],[[483,208],[558,204],[585,263],[551,343],[511,370],[466,296],[447,239]],[[773,333],[838,310],[882,344],[868,382],[808,392]],[[865,95],[923,92],[946,147],[906,172]]];
 map.fillStyle='#90ac88';map.strokeStyle='#b7c6a3';map.lineWidth=3;
 for(const polygon of continents){map.beginPath();polygon.forEach(([x,y],i)=>i?map.lineTo(x,y):map.moveTo(x,y));map.closePath();map.fill();map.stroke();}
 map.strokeStyle='#f4f6eb';map.globalAlpha=.55;map.lineWidth=13;map.lineCap='round';
 for(const [x,y,length] of [[25,182,170],[370,300,200],[680,250,210],[260,95,150],[55,371,130],[729,100,180]]){map.beginPath();map.moveTo(x,y);map.bezierCurveTo(x+length*.3,y-20,x+length*.7,y+25,x+length,y);map.stroke();}map.globalAlpha=1;
 const earthTexture=new THREE.CanvasTexture(earthCanvas);earthTexture.colorSpace=THREE.SRGBColorSpace;
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1.65,48,32),new THREE.MeshStandardMaterial({map:earthTexture,roughness:1}));earth.rotation.y=.7;space.add(earth);
 const coordinates=[];for(let i=0;i<160;i++){const a=i*2.3999632297,z=1-2*(i+.5)/160,r=Math.sqrt(1-z*z);coordinates.push(Math.cos(a)*r*20,Math.sin(a)*r*20,z*20);}
 const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));space.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xd5e4ee,size:.045,sizeAttenuation:true})));
 const photoCamera=new THREE.PerspectiveCamera(54,16/9,.1,50);photoCamera.position.set(0,0,4.5);
 let disposed=false,frames=0,width=0,height=0;
 const lost=event=>{event.preventDefault();onContextLost();};canvas.addEventListener('webglcontextlost',lost);preview.addEventListener('webglcontextlost',lost);
 function orient(pose){const q=cameraQuaternion(pose);satellite.quaternion.copy(q);photoCamera.quaternion.copy(q);photoCamera.updateMatrixWorld(true);}
 function render(pose,phase,progress=1){
  if(disposed)return;orient(pose);
  if(phase==='attach'){
   if(camera.parent!==scene){scene.add(camera);attachFrom=null;}camera.position.copy(detached);camera.quaternion.identity();
  }else{
   if(camera.parent!==satellite){satellite.updateMatrixWorld(true);satellite.attach(camera);attachFrom=camera.position.clone();}
   camera.quaternion.identity();camera.position.lerpVectors(attachFrom||docked,docked,phase==='attaching'?progress:1);
  }
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
  if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);observer.left=-1.3*w/h;observer.right=1.3*w/h;observer.updateProjectionMatrix();}
  renderer.render(scene,observer);photoRenderer.render(space,photoCamera);canvas.dataset.frames=String(++frames);
  canvas.dataset.yaw=String(pose.yaw);canvas.dataset.pitch=String(pose.pitch);
 }
 return {
  render,
  capture(pose){if(disposed)throw Error('Disposed view');orient(pose);photoRenderer.render(space,photoCamera);return preview.toDataURL('image/png');},
  hitsCamera(x,y){const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),observer);return raycaster.intersectObject(camera,true).length>0;},
  seesEarth(pose){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(cameraQuaternion(pose));return forward.dot(new THREE.Vector3(0,0,-1))>Math.cos(THREE.MathUtils.degToRad(47));},
  dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);preview.removeEventListener('webglcontextlost',lost);const geometries=new Set(),materials=new Set(),textures=new Set();for(const world of [scene,space])world.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const m of (Array.isArray(object.material)?object.material:[object.material])){materials.add(m);if(m.map)textures.add(m.map);}});for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of textures)x.dispose();renderer.dispose();photoRenderer.dispose();renderer.forceContextLoss();photoRenderer.forceContextLoss();}
 };
}
