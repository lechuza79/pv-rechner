import * as THREE from 'three';
import type {SceneLocation} from '../../lib/building-scene';

/** Billboards participate in the same depth buffer and lens pass as the turbines. */
export function addLocationPins(scene:THREE.Scene,locations:SceneLocation[],elevation:(p:SceneLocation)=>number){
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d')!;ctx.scale(4,4);ctx.fillStyle='#163338';
  ctx.fill(new Path2D('M12 23C10 20 3 14 3 9A9 9 0 0 1 21 9C21 14 14 20 12 23Z'));
  ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(12,9,3,0,Math.PI*2);ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,alphaTest:0,depthTest:true,depthWrite:false,sizeAttenuation:false,toneMapped:false});
  const pins=locations.map(p=>{const sprite=new THREE.Sprite(material.clone());sprite.position.set(p.labelX??p.x,elevation(p),p.labelZ??p.z);sprite.center.set(.5,0);scene.add(sprite);return {id:p.id,sprite};});
  return {
    update(camera:THREE.PerspectiveCamera,height:number,active?:string,dt=1/60,reducedMotion=false){
      const size=22/Math.max(1,height)*2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      const focus=pins.find(pin=>pin.id===active);
      const visible=new Set(pins.filter(pin=>{
        const screen=pin.sprite.position.clone().project(camera);
        return pin.id!==active&&(!focus||pin.sprite.position.distanceTo(focus.sprite.position)>1)
          &&screen.z>-1&&screen.z<1&&screen.x>.05&&screen.x<.9&&screen.y>-.8&&screen.y<.6;
      }).sort((a,b)=>a.sprite.position.distanceToSquared(camera.position)-b.sprite.position.distanceToSquared(camera.position)).slice(0,3).map(pin=>pin.id));
      for(const pin of pins){
        const target=visible.has(pin.id)?1:0;
        const material=pin.sprite.material;
        material.opacity=reducedMotion?target:material.opacity+Math.sign(target-material.opacity)*Math.min(Math.abs(target-material.opacity),dt/.28);
        pin.sprite.visible=material.opacity>0;
        pin.sprite.scale.set(size,size,1);
      }
      return visible;
    },
    isFading(){return pins.some(pin=>pin.sprite.material.opacity>0&&pin.sprite.material.opacity<1);},
    dispose(){for(const pin of pins){scene.remove(pin.sprite);pin.sprite.material.dispose();}material.dispose();texture.dispose();}
  };
}
