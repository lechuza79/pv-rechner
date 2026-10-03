import * as THREE from "three";
import type { ProjectedRegion } from "../../lib/region-perspektive";
import { terrainHeight, type SceneTerrain } from "../../lib/wind-terrain";

/** Clipped relief with a closed base; boundary edges are taken from the actual surface mesh. */
export function addWindTerrain(scene:THREE.Scene, terrain:SceneTerrain, shapes:ProjectedRegion[], groundY:number, color:THREE.Color,sideMaterial?:THREE.Material,shellThickness?:number){
  if(!terrain.groundSurface)throw new Error("Clipped terrain surface missing");
  const {vertices,indices}=terrain.groundSurface;
  const positions=vertices.flatMap(([x,z])=>[x,groundY+terrainHeight(terrain,x,z),z]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color,roughness:1,metalness:0});
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;scene.add(mesh);
  const edges=new Map<string,{a:number;b:number;count:number}>();
  for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){
    const a=indices[i+k],b=indices[i+(k+1)%3],key=`${Math.min(a,b)}/${Math.max(a,b)}`,edge=edges.get(key);
    if(edge)edge.count++;else edges.set(key,{a,b,count:1});
  }
  const edgePositions:number[]=[];
  for(const {a,b,count} of edges.values())if(count===1){
    const [ax,az]=vertices[a],[bx,bz]=vertices[b],ay=positions[a*3+1],by=positions[b*3+1];
    const bottomA=shellThickness===undefined?0:ay-shellThickness,bottomB=shellThickness===undefined?0:by-shellThickness;
    edgePositions.push(ax,ay,az,ax,bottomA,az,bx,by,bz,bx,by,bz,ax,bottomA,az,bx,bottomB,bz);
  }
  if(shellThickness!==undefined){
    // A thin relief sheet follows the original heights on both sides. No high
    // rectangular walls and no tapering or flattening of real terrain heights.
    for(let i=0;i<indices.length;i+=3)for(const k of [0,2,1]){
      const index=indices[i+k];edgePositions.push(positions[index*3],positions[index*3+1]-shellThickness,positions[index*3+2]);
    }
  } else for(const region of shapes)for(const rings of region.ground){
    const shape=new THREE.Shape(rings[0].map(p=>new THREE.Vector2(...p)));
    shape.holes=rings.slice(1).map(r=>new THREE.Path(r.map(p=>new THREE.Vector2(...p))));
    const base=new THREE.ShapeGeometry(shape),p=base.getAttribute("position"),idx=base.getIndex()!;
    for(let i=0;i<idx.count;i++){const index=idx.getX(i);edgePositions.push(p.getX(index),0,p.getY(index));}base.dispose();
  }
  const edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute("position",new THREE.Float32BufferAttribute(edgePositions,3));edgeGeometry.computeVertexNormals();
  const edgeMaterial=sideMaterial??new THREE.MeshBasicMaterial({color:color.clone().multiplyScalar(.6)});
  const body=new THREE.Mesh(edgeGeometry,edgeMaterial);body.name="wind-terrain-thickness";body.castShadow=true;scene.add(body);
  return {mesh,body,dispose(){scene.remove(mesh,body);geometry.dispose();material.dispose();edgeGeometry.dispose();if(!sideMaterial)edgeMaterial.dispose();}};
}
