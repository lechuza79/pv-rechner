import * as THREE from 'three';

export const WORLD_UNITS_PER_PIXEL = 12 / 220;
export const SIGN_STEM_PIXELS = 18;

/** Keep the centrally owned HTML widget on an upright plane in the scene. */
export function projectLocationSign(camera: THREE.Camera, anchor: THREE.Vector3, width: number, height: number, viewportWidth: number, viewportHeight: number, groundHeight=anchor.y) {
  const normal = camera.position.clone().sub(anchor).setY(0).normalize();
  const right = new THREE.Vector3(normal.z, 0, -normal.x);
  const origin = anchor.clone().addScaledVector(right, -width * WORLD_UNITS_PER_PIXEL / 2);
  origin.y += (height + SIGN_STEM_PIXELS) * WORLD_UNITS_PER_PIXEL;
  const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const clip = (point: THREE.Vector3, w: number) => new THREE.Vector4(point.x, point.y, point.z, w).applyMatrix4(projection);
  const o = clip(origin, 1), x = clip(right.multiplyScalar(WORLD_UNITS_PER_PIXEL), 0);
  const y = clip(new THREE.Vector3(0, -WORLD_UNITS_PER_PIXEL, 0), 0);
  const divisor = clip(anchor, 1).w;
  const column = (v: THREE.Vector4) => [viewportWidth / 2 * (v.x + v.w) / divisor, viewportHeight / 2 * (v.w - v.y) / divisor, 0, v.w / divisor];
  const matrix = [...column(x), ...column(y), 0, 0, 1, 0, ...column(o)];
  const cssMatrix=new THREE.Matrix4().fromArray(matrix);
  const corners=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>{
    const v=new THREE.Vector4(x,y,0,1).applyMatrix4(cssMatrix);
    return new THREE.Vector2(v.x/v.w,v.y/v.w);
  });
  // CSS perspective also magnifies SVG strokes. Report the largest local
  // screen magnification so inherited chart strokes can compensate it.
  const center=new THREE.Vector4(width/2,height/2,0,1).applyMatrix4(cssMatrix);
  const originScreen=new THREE.Vector2(center.x/center.w,center.y/center.w);
  const magnification=(x:number,y:number)=>{
    const v=new THREE.Vector4(x,y,0,1).applyMatrix4(cssMatrix);
    return new THREE.Vector2(v.x/v.w,v.y/v.w).distanceTo(originScreen);
  };
  const strokeScale=Math.max(1,magnification(width/2+1,height/2),magnification(width/2,height/2+1));
  const stemPixels=SIGN_STEM_PIXELS+Math.max(0,anchor.y-groundHeight)/WORLD_UNITS_PER_PIXEL;
  const screenPoint=(x:number,y:number)=>{
    const v=new THREE.Vector4(x,y,0,1).applyMatrix4(cssMatrix);
    return `${(v.x/v.w).toFixed(3)} ${(v.y/v.w).toFixed(3)}`;
  };
  // Occlusion belongs only on the actual widget and its thin stem, never the
  // empty rectangle between them. Replaying that gap changes scenery shading.
  const panelPath=`M ${screenPoint(0,0)} L ${screenPoint(width,0)} L ${screenPoint(width,height)} L ${screenPoint(0,height)} Z`;
  const stemPath=`M ${screenPoint(width/2-.5,height)} L ${screenPoint(width/2+.5,height)} L ${screenPoint(width/2+.5,height+stemPixels)} L ${screenPoint(width/2-.5,height+stemPixels)} Z`;
  return {transform: `matrix3d(${matrix.join(',')})`, matrix, normal, strokeScale, stemPixels, occlusionPath:panelPath+' '+stemPath, top:Math.min(...corners.map(p=>p.y))};
}

/** Place the rotating panel outside all rotor sweeps, for every yaw and camera bearing. */
export function safeWindSignAnchor(origin:{x:number;z:number},turbines:{x:number;z:number;rotor:number|null}[],width:number,unitsPerMetre:number){
  const halfWidth=width*WORLD_UNITS_PER_PIXEL/2,clearance=10*unitsPerMetre;
  const obstacles=turbines.filter(t=>t.rotor!==null).map(t=>({...t,radius:t.rotor!*0.6+halfWidth+clearance}));
  const clear=(p:{x:number;z:number})=>obstacles.every(t=>Math.hypot(p.x-t.x,p.z-t.z)>=t.radius);
  if(clear(origin))return {...origin};
  const step=Math.max(unitsPerMetre*5,halfWidth/8);
  const limit=Math.max(...obstacles.map(t=>Math.hypot(t.x-origin.x,t.z-origin.z)+t.radius))+step;
  for(let radius=step;radius<=limit+step;radius+=step)for(let i=0;i<128;i++){
    const angle=i*2*Math.PI/128,candidate={x:origin.x+Math.cos(angle)*radius,z:origin.z+Math.sin(angle)*radius};
    if(clear(candidate))return candidate;
  }
  throw new Error('No clear wind sign site');
}
/** Offscreen cards stay open until they cross behind the lens. */
export function signInFrontOfCamera(camera:THREE.Camera,anchor:THREE.Vector3){
  return anchor.clone().applyMatrix4(camera.matrixWorldInverse).z < 0;
}
/** Shadow-only twin of the centrally owned HTML panel, at identical physical size. */
export function locationSignShadow(scene:THREE.Scene){
  const geometry=new THREE.PlaneGeometry(1,1);
  const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
  const depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='location-sign-shadow';mesh.castShadow=true;mesh.customDepthMaterial=depthMaterial;mesh.visible=false;scene.add(mesh);
  return {
    update(camera:THREE.Camera,anchor:THREE.Vector3|null,width=0,height=0){
      mesh.visible=Boolean(anchor&&signInFrontOfCamera(camera,anchor));
      if(!anchor||!mesh.visible)return;
      const w=width*WORLD_UNITS_PER_PIXEL,h=height*WORLD_UNITS_PER_PIXEL;
      mesh.scale.set(w,h,1);mesh.position.copy(anchor);mesh.position.y+=h/2+SIGN_STEM_PIXELS*WORLD_UNITS_PER_PIXEL;
      const normal=camera.position.clone().sub(anchor).setY(0).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);mesh.updateMatrixWorld();
    },mesh,
    dispose(){scene.remove(mesh);geometry.dispose();material.dispose();depthMaterial.dispose();}
  };
}
