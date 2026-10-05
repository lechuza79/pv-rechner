import * as THREE from 'three';
import {terrainHeight,type SceneTerrain} from '../../lib/wind-terrain';

/** Intersect the original terrain triangles with horizontal planes in real metres. */
export function contourSegments(terrain:SceneTerrain,groundY:number,interval=2){
  if(!Number.isFinite(interval)||interval<=0)throw new Error('Invalid contour interval');
  const result={major:[] as number[],minor:[] as number[]};
  const surface=terrain.groundSurface;if(!surface)return result;
  const points=surface.vertices.map(([x,z])=>({x,z,h:terrainHeight(terrain,x,z)/terrain.unitsPerMetre+terrain.reference}));
  for(let i=0;i<surface.indices.length;i+=3){
    const tri=surface.indices.slice(i,i+3).map(n=>points[n]);
    const min=Math.min(...tri.map(p=>p.h)),max=Math.max(...tri.map(p=>p.h));
    for(let level=Math.ceil(min/interval)*interval;level<max;level+=interval){
      const crossings:number[][]=[];
      for(let j=0;j<3;j++){
        const a=tri[j],b=tri[(j+1)%3];
        if((a.h<=level&&b.h>level)||(b.h<=level&&a.h>level)){
          const t=(level-a.h)/(b.h-a.h);
          crossings.push([a.x+t*(b.x-a.x),groundY+(level-terrain.reference)*terrain.unitsPerMetre,a.z+t*(b.z-a.z)]);
        }
      }
      if(crossings.length===2&&Math.hypot(crossings[0][0]-crossings[1][0],crossings[0][2]-crossings[1][2])>1e-8)
        result[level%10===0?'major':'minor'].push(...crossings.flat());
    }
  }
  return result;
}

export function addTerrainContours(scene:THREE.Scene,terrain:SceneTerrain,groundY:number,color:THREE.Color){
  const segments=contourSegments(terrain,groundY);
  // An invisible depth surface hides the far side of hills. No colour or
  // bottom plate is drawn; contours no longer show through the landscape.
  const surface=terrain.groundSurface;
  const depthGeometry=new THREE.BufferGeometry();
  depthGeometry.setAttribute('position',new THREE.Float32BufferAttribute(surface?.vertices.flatMap(([x,z])=>[x,groundY+terrainHeight(terrain,x,z),z])??[],3));
  depthGeometry.setIndex(surface?.indices??[]);
  const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const depth=new THREE.Mesh(depthGeometry,depthMaterial);depth.name='terrain-occlusion';depth.castShadow=true;depth.renderOrder=-1;scene.add(depth);
  // Receive global light shadows without adding a filled terrain plate.
  depthGeometry.computeVertexNormals();
  const shadowMaterial=new THREE.ShadowMaterial({color:0x163338,opacity:.18,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const shadow=new THREE.Mesh(depthGeometry,shadowMaterial);shadow.name='terrain-shadow-receiver';shadow.receiveShadow=true;scene.add(shadow);
  const overviewRange={value:0};
  const lines=(['minor','major'] as const).map(kind=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(segments[kind],3));
    const ranges:number[]=[];
    for(let i=0;i<segments[kind].length;i+=3){
      const level=Math.round((segments[kind][i+1]-groundY)/terrain.unitsPerMetre+terrain.reference);
      ranges.push(level%50===0?6000:kind==='major'?2500:800);
    }
    geometry.setAttribute('contourRange',new THREE.Float32BufferAttribute(ranges,1));
    const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:kind==='major'?.6:.28,depthWrite:false,toneMapped:false});
    material.onBeforeCompile=shader=>{
      shader.uniforms.overviewRange=overviewRange;
      shader.vertexShader='uniform float overviewRange; attribute float contourRange; varying float contourFade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        float distanceMetres = length(mvPosition.xyz) / ${terrain.unitsPerMetre.toFixed(10)};
        float range = contourRange > 5000.0 ? max(contourRange, overviewRange) : contourRange;
        contourFade = 1.0 - smoothstep(range * 0.45, range, distanceMetres);`);
      shader.fragmentShader='varying float contourFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= contourFade;');
    };
    material.customProgramCacheKey=()=>`terrain-distance-contours-${terrain.unitsPerMetre}`;
    const line=new THREE.LineSegments(geometry,material);line.name=`terrain-contours-${kind}`;scene.add(line);return line;
  });
  return {update(camera:THREE.Camera){overviewRange.value=Math.max(0,camera.position.y-groundY)/terrain.unitsPerMetre*4;},dispose(){scene.remove(depth,shadow);shadowMaterial.dispose();depthGeometry.dispose();depthMaterial.dispose();for(const line of lines){scene.remove(line);line.geometry.dispose();line.material.dispose();}}};
}
