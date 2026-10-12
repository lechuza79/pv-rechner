import * as THREE from "three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** A tapered, cambered 3D blade; the tip is exactly one rotor radius from the axis. */
export function bladeGeometry(){
  const spans=[[.035,.024,0],[.16,.068,-.006],[.3,.073,-.012],[.55,.049,-.014],[.78,.027,-.009],[.88,.018,-.005],[.98,.005,-.001],[1,0,0]];
  const vertices:number[]=[],colors:number[]=[],indices:number[]=[];
  const sections=10;
  spans.forEach(([y,chord,sweep],j)=>{
    const twist=(1-y)*.3;
    const color=new THREE.Color(y>=.88?0xa94f44:0xf2f1e8);
    for(let k=0;k<sections;k++){
      const angle=k/sections*Math.PI*2;
      const x=Math.cos(angle)*chord/2,z=Math.sin(angle)*chord*.12;
      vertices.push(sweep+x*Math.cos(twist)-z*Math.sin(twist),y,x*Math.sin(twist)+z*Math.cos(twist));
      colors.push(color.r,color.g,color.b);
      if(j<spans.length-1){const a=j*sections+k,b=j*sections+(k+1)%sections,c=a+sections,d=b+sections;indices.push(a,c,b,b,c,d);}
    }
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Shared normalized geometry for every scene; dimensions are supplied by the registry. */
export function turbineGeometry(shell:'rounded'|'egg'|'tapered'='rounded'){
  const spinner=new THREE.LatheGeometry([new THREE.Vector2(0,-.65),new THREE.Vector2(.9,-.65),new THREE.Vector2(1,-.35),new THREE.Vector2(.85,.25),new THREE.Vector2(.5,.8),new THREE.Vector2(0,1.15)],24);
  spinner.rotateX(-Math.PI/2);
  let nacelle:THREE.BufferGeometry=new RoundedBoxGeometry(1,1,1,5,.14);
  if(shell==='egg'){nacelle.dispose();nacelle=new THREE.SphereGeometry(.5,32,20);}
  if(shell==='tapered'){
    const points=[[-.5,.29],[-.45,.45],[.15,.50],[.40,.42],[.50,.25]].map(([z,r])=>new THREE.Vector2(r,z));
    nacelle.dispose();nacelle=new THREE.LatheGeometry(points,12);nacelle.rotateX(Math.PI/2);
  }
  return {tower:new THREE.CylinderGeometry(.58,1,1,32),nacelle,blade:bladeGeometry(),hub:spinner};
}
