import * as THREE from 'three';
import {Tree} from './node_modules/@dgreenheck/ez-tree/src/lib/tree.js';
import RNG from './node_modules/@dgreenheck/ez-tree/src/lib/rng.js';
import {Branch} from './node_modules/@dgreenheck/ez-tree/src/lib/branch.js';

// The library's generation order is preserved, but branch work yields to input.
export async function createTreeAsync(options){
 const tree=new Tree();tree.options.copy(options);
 tree.branches={verts:[],normals:[],indices:[],uvs:[],windFactor:[]};
 tree.leaves={verts:[],normals:[],indices:[],uvs:[]};
 tree.rng=new RNG(tree.options.seed);
 tree.branchQueue.push(new Branch(new THREE.Vector3(),new THREE.Euler(),tree.options.branch.length[0],tree.options.branch.radius[0],0,tree.options.branch.sections[0],tree.options.branch.segments[0]));
 let until=performance.now()+8;
 while(tree.branchQueue.length){
  tree.generateBranch(tree.branchQueue.shift());
  if(performance.now()>=until){await new Promise(resolve=>setTimeout(resolve,0));until=performance.now()+8;}
 }
 for(const stage of ['createBranchesGeometry','createLeavesGeometry','createTrellis']){
  await new Promise(resolve=>setTimeout(resolve,0));tree[stage]();
 }
 return tree;
}
