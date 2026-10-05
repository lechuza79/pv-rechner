import {leafRelease} from './wind-motion.js';
import {createLeafMotion,advanceLeaf,TREE_METRES_PER_UNIT} from './leaf-physics.js';
import * as THREE from 'three';
import {foliageState} from './seasonal-foliage.js';

// A bounded pool in the trees' world coordinates. Leaves start inside actual
// crowns; their velocity follows the same signed, gust-modulated scene wind.
export function createFallingLeaves(scene, trees) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -.5); shape.quadraticCurveTo(-.5, -.15, -.28, .18);
  shape.quadraticCurveTo(-.16, .42, 0, .5);
  shape.quadraticCurveTo(.45, .05, 0, -.5);
  const geometry = new THREE.ShapeGeometry(shape, 5);
  const material = new THREE.MeshLambertMaterial({color: 0xc29449, side: THREE.DoubleSide});
  const capacity = 96, mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
  scene.add(mesh);
  const dummy = new THREE.Object3D(), particles = [];
  let seed = 781, last = null, pending = 0, treeIndex = 0, next=0;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  function spawn(wind,loss) {
    const tree = trees[treeIndex++ % trees.length], positions = tree.leavesMesh.geometry.getAttribute('position');
    const stride = tree.options.leaves.billboard === 'double' ? 8 : 4;
    let i=-1;
    for(let attempt=0;attempt<20;attempt++){
      const candidate=Math.floor(random()*positions.count/stride);
      if(!tree.userData.foliage||tree.userData.foliage.detach(candidate,loss)){i=candidate*stride;break;}
    }
    if(i<0)return;
    const position = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    position.add(new THREE.Vector3().fromBufferAttribute(positions, i + 2)).multiplyScalar(.5);
    tree.updateMatrixWorld(); tree.localToWorld(position);
    particles.push({position, motion:createLeafMotion(random()*100,wind,false), phase: random() * Math.PI * 2,
      size: .18 + random() * .15, age: 0, spin: .6 + random() * 1.4});
  }
  mesh.count = 0;
  return {
    update(time, state, wind, low = false) {
      const dt = last === null ? 0 : Math.min(.1, Math.max(0, time - last)); last = time;
      const {loss} = foliageState(state), limit = low ? 40 : capacity;
      if (particles.length > limit) particles.length = limit;
      if (loss <= 0 || loss >= 1) { particles.length = 0; pending = 0; }
      else {
        const activity = 4 * loss * (1 - loss);
        pending += dt * activity * (1.5 + Math.abs(wind) * 5) * leafRelease(time,state);
        if (pending >= 1 && particles.length < limit && time>=next) { spawn(wind,loss); pending=0;next=time+.12+random()*.45; }
        pending = Math.min(pending, 1);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.age += dt;
        if (p.position.y < -8 || p.age > 22) { particles.splice(i, 1); continue; }
        const d=advanceLeaf(p.motion,time,dt,wind);
        p.position.x+=d[0]/TREE_METRES_PER_UNIT;
        p.position.y+=d[1]/TREE_METRES_PER_UNIT;
        p.position.z+=d[2]/TREE_METRES_PER_UNIT;
      }
      // Write the compact pool after removal so no stale matrix survives.
      particles.forEach((p, i) => {
        dummy.position.copy(p.position);
        dummy.rotation.set(time * p.spin + p.phase, Math.sin(time + p.phase) * .8, time * .7 + p.phase);
        dummy.scale.setScalar(p.size * Math.min(1, p.age * 4)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.count = particles.length; mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}
