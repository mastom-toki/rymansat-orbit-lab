import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {cameraQuaternion} from '../prototypes/cubesat-3d/scene.js';
const earth=new THREE.Vector3(0,0,0),camera=new THREE.PerspectiveCamera(54,16/9,.1,50);camera.position.set(0,0,4.5);
function project(pose){camera.quaternion.copy(cameraQuaternion(pose));camera.updateMatrixWorld(true);return earth.clone().project(camera);}
const center=project({yaw:0,pitch:0});assert.ok(Math.abs(center.x)<1e-8&&Math.abs(center.y)<1e-8);
const left=project({yaw:-20,pitch:0}),right=project({yaw:20,pitch:0});assert.ok(left.x<-.3&&right.x>.3);assert.ok(Math.abs(left.x+right.x)<1e-8);
const up=project({yaw:0,pitch:20}),down=project({yaw:0,pitch:-20});assert.ok(up.y<-.5&&down.y>.5);
const back=new THREE.Vector3(0,0,-1).applyQuaternion(cameraQuaternion({yaw:180,pitch:0}));assert.ok(back.z>.99);
for(let yaw=-180;yaw<180;yaw+=15)for(let pitch=-70;pitch<=70;pitch+=10){const q=cameraQuaternion({yaw,pitch});assert.ok(Math.abs(q.length()-1)<1e-8);const bodyDirection=new THREE.Vector3(0,0,-1).applyQuaternion(q);camera.quaternion.copy(q);const lensDirection=camera.getWorldDirection(new THREE.Vector3());assert.ok(bodyDirection.distanceTo(lensDirection)<1e-8);}
console.log('PASS actual Three.js camera projection, front/back, pitch/yaw, and 360 matching body/lens orientations');
