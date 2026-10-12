import * as THREE from 'three';
import {createPanelModule} from '../../public/hero-system/source/panel-module.js';
import {insidePolygon} from '../../lib/region-perspektive';
export type SolarFootprint={id:string;ring:[number,number][]};

/** Schematic south-facing modules, constrained to the actual mapped row footprints. */
export function solarPanelPositions(fields:SolarFootprint[],scale:number){
  const positions:[number,number][]=[];
  for(const field of fields){
    const xs=field.ring.map(p=>p[0]),zs=field.ring.map(p=>p[1]);
    const west=Math.min(...xs),east=Math.max(...xs),north=Math.min(...zs),south=Math.max(...zs);
    for(let x=west+.9*scale;x<east;x+=1.8*scale)for(let z=north+.6*scale;z<south;z+=1.3*scale){
      if([[-.88,-.57],[.88,-.57],[.88,.57],[-.88,.57]].every(([dx,dz])=>insidePolygon([x+dx*scale,z+dz*scale],[field.ring])))positions.push([x,z]);
    }
  }
  return positions;
}
/** Modules smaller than two screen pixels use their surveyed footprint instead. */
export function solarDetailVisible(camera:THREE.Camera,sphere:THREE.Sphere,metres:number,height:number,previous=false){
 if(!(camera instanceof THREE.PerspectiveCamera))return true;
 const distance=Math.max(.001,camera.position.distanceTo(sphere.center)-sphere.radius);
 const pixels=1.76*metres*height/(2*Math.tan(camera.fov*Math.PI/360)*distance);
 return pixels>(previous?1.5:2);
}
/** Retain measured footprints; optional modules are explicitly a visual reconstruction. */
export function addSolarLayer(scene:THREE.Scene,fields:SolarFootprint[],ground:(x:number,z:number)=>number,unitsPerMetre:number,color:THREE.Color,renderer?:THREE.WebGLRenderer){
  const positions:number[]=[];
  const slices:{start:number;end:number}[]=[];
  type Point=[number,number];
  function triangle(a:Point,b:Point,c:Point,depth=0){
    const points=[a,b,c],lengths=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%3][0],p[1]-points[(i+1)%3][1]));
    const longest=Math.max(...lengths);
    if(longest>2*unitsPerMetre&&depth<12){const i=lengths.indexOf(longest),p=points[i],q=points[(i+1)%3],r=points[(i+2)%3],m:Point=[(p[0]+q[0])/2,(p[1]+q[1])/2];triangle(p,m,r,depth+1);triangle(m,q,r,depth+1);return;}
    for(const [x,z] of points)positions.push(x,ground(x,z)+.15*unitsPerMetre,z);
  }
  for(const field of fields){
    const start=positions.length;
    const shape=new THREE.Shape(field.ring.map(p=>new THREE.Vector2(...p)));
    const geometry=new THREE.ShapeGeometry(shape),expanded=geometry.toNonIndexed(),p=expanded.getAttribute('position');
    for(let i=0;i<p.count;i+=3)triangle([p.getX(i),p.getY(i)],[p.getX(i+1),p.getY(i+1)],[p.getX(i+2),p.getY(i+2)]);
    geometry.dispose();expanded.dispose();slices.push({start,end:positions.length});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.55,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='solar-footprints';scene.add(mesh);
  let panels:{update:(camera:THREE.Camera,height:number)=>void;dispose:()=>void}|null=null;
  if(renderer){
    const module=createPanelModule(renderer,{overview:true});
    // Landscape modules use the scene palette without photographic cell textures.
    module.glass.map=null;module.glass.roughnessMap=null;
    module.glass.color.copy(color);module.glass.roughness=.9;
    module.glass.clearcoat=0;module.glass.specularIntensity=.08;
    module.aluminum.color.copy(color).multiplyScalar(.86);
    module.aluminum.metalness=0;module.aluminum.roughness=1;
    module.backing.color.copy(color).multiplyScalar(.8);
    let count=0;
    const groups=fields.map((field,index)=>{
      const placements=solarPanelPositions([field],unitsPerMetre);count+=placements.length;
      const frames=new THREE.InstancedMesh(module.geometry,module.aluminum,placements.length);
      const glass=new THREE.InstancedMesh(module.glassGeometry,module.glass,placements.length);
      const dummy=new THREE.Object3D(),tilt=25*Math.PI/180;
      dummy.rotation.x=tilt;dummy.scale.setScalar(unitsPerMetre);
      placements.forEach(([x,z],i)=>{
        const highest=Math.max(...[[-.88,-.57],[.88,-.57],[.88,.57],[-.88,.57]].map(([dx,dz])=>ground(x+dx*unitsPerMetre,z+dz*unitsPerMetre)));
        dummy.position.set(x,highest+(.35+.57*Math.sin(tilt))*unitsPerMetre,z);dummy.updateMatrix();frames.setMatrixAt(i,dummy.matrix);
        dummy.translateY(.0185*unitsPerMetre);dummy.updateMatrix();glass.setMatrixAt(i,dummy.matrix);
      });
      frames.computeBoundingSphere();glass.computeBoundingSphere();
      frames.name='solar-panel-frames';glass.name='solar-panel-glass';scene.add(frames,glass);
      const farGeometry=new THREE.BufferGeometry();
      farGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions.slice(slices[index].start,slices[index].end),3));
      farGeometry.computeVertexNormals();farGeometry.computeBoundingSphere();
      const far=new THREE.Mesh(farGeometry,material);far.name='solar-footprints';scene.add(far);
      return {frames,glass,far,count:placements.length,detail:false};
    });
    mesh.visible=false;
    renderer.domElement.dataset.solarModules=String(count);
    renderer.domElement.dataset.solarAzimuth='180';renderer.domElement.dataset.solarTilt='25';
    panels={
      update(camera,height){
        let detailed=0;
        for(const group of groups){
          group.detail=solarDetailVisible(camera,group.far.geometry.boundingSphere!,unitsPerMetre,height,group.detail);
          group.frames.visible=group.glass.visible=group.detail;group.far.visible=!group.detail;
          if(group.detail)detailed+=group.count;
        }
        renderer.domElement.dataset.solarDetailedModules=String(detailed);
      },
      dispose(){
        for(const group of groups){scene.remove(group.frames,group.glass,group.far);group.frames.dispose();group.glass.dispose();group.far.geometry.dispose();}
        module.geometry.dispose();module.glassGeometry.dispose();module.aluminum.dispose();module.glass.dispose();module.backing.dispose();module.texture.dispose();module.roughnessMap.dispose();
      }
    };
  }
  return {mesh,update(camera:THREE.Camera,height:number){panels?.update(camera,height);},dispose(){panels?.dispose();scene.remove(mesh);geometry.dispose();material.dispose();}};
}
