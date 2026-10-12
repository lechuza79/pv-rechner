import * as THREE from 'three';
import {waterEdgeOpacity,type Point,type SceneContext} from '../../lib/wind-context';

/** Two merged meshes, draped over the existing terrain; elevation is a visual key, not building height. */
export function addWindContext(scene:THREE.Scene,data:SceneContext,ground:(x:number,z:number)=>number,settlementColor:THREE.Color,waterColor:THREE.Color,inside:(p:Point)=>boolean=()=>true,streamStyle:{widthMetres:number;liftMetres:number}={widthMetres:40,liftMetres:3}){
  const positions={settlement:[] as number[],water:[] as number[]},u=data.unitsPerMetre;
  const vertex=(out:number[],p:Point,lift:number)=>out.push(p[0],ground(...p)+lift*u,p[1]);
  const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const midpoint=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  function triangle(out:number[],a:Point,b:Point,c:Point,lift:number,depth=0){
    const edges=[distance(a,b),distance(b,c),distance(c,a)],longest=Math.max(...edges);
    if(longest>50*u&&depth<14){
      const index=edges.indexOf(longest),v=[a,b,c],p=v[index],q=v[(index+1)%3],r=v[(index+2)%3],m=midpoint(p,q);
      triangle(out,p,m,r,lift,depth+1);triangle(out,m,q,r,lift,depth+1);return;
    }
    vertex(out,a,lift);vertex(out,b,lift);vertex(out,c,lift);
  }
  for(const area of data.areas){
    const shape=new THREE.Shape(area.rings[0].map(p=>new THREE.Vector2(...p)));
    shape.holes=area.rings.slice(1).map(r=>new THREE.Path(r.map(p=>new THREE.Vector2(...p))));
    const source=new THREE.ShapeGeometry(shape),mesh=source.toNonIndexed(),p=mesh.getAttribute('position');
    const out=positions[area.kind],lift=area.kind==='settlement'?8:2;
    for(let i=0;i<p.count;i+=3)triangle(out,[p.getX(i),p.getY(i)],[p.getX(i+1),p.getY(i+1)],[p.getX(i+2),p.getY(i+2)],lift);
    source.dispose();mesh.dispose();
    if(area.kind==='settlement')for(const ring of area.rings)for(let i=1;i<ring.length;i++){
      const a=ring[i-1],b=ring[i],steps=Math.max(1,Math.ceil(distance(a,b)/(30*u)));
      for(let j=0;j<steps;j++){
        const mix=(t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],p=mix(j/steps),q=mix((j+1)/steps);
        vertex(out,p,0);vertex(out,q,0);vertex(out,q,lift);vertex(out,p,0);vertex(out,q,lift);vertex(out,p,lift);
      }
    }
  }
  // Overview ribbons remain visible; detailed building scenes use narrow, ground-level streams.
  for(const line of data.streams)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],length=distance(a,b);if(length===0)continue;
    const dx=-(b[1]-a[1])/length*streamStyle.widthMetres/2*u,dz=(b[0]-a[0])/length*streamStyle.widthMetres/2*u;
    triangle(positions.water,[a[0]+dx,a[1]+dz],[b[0]+dx,b[1]+dz],[a[0]-dx,a[1]-dz],streamStyle.liftMetres);
    triangle(positions.water,[b[0]+dx,b[1]+dz],[b[0]-dx,b[1]-dz],[a[0]-dx,a[1]-dz],streamStyle.liftMetres);
  }
  const meshes=(['settlement','water'] as const).map(kind=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions[kind],3));geometry.computeVertexNormals();
    const alphaCache=new Map<string,number>();
    const colors:number[]=[];for(let i=0;i<positions[kind].length;i+=3){const shade=inside([positions[kind][i],positions[kind][i+2]])?1:.28;const point:Point=[positions[kind][i],positions[kind][i+2]],key=point.join('/');
      let alpha=alphaCache.get(key);if(alpha===undefined){alpha=kind==='water'?waterEdgeOpacity(point,data.waterContinuation):1;alphaCache.set(key,alpha);}
      colors.push(shade,shade,shade,alpha);}
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
    const surface={vertexColors:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1};
    const material=kind==='water'
      ?new THREE.MeshBasicMaterial({...surface,color:waterColor,transparent:true,depthWrite:false,toneMapped:false})
      :new THREE.MeshStandardMaterial({...surface,color:settlementColor,roughness:1,metalness:0});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`wind-context-${kind}`;scene.add(mesh);return mesh;
  });
  const labels:THREE.Sprite[]=[];
  if(typeof document!=="undefined")for(const place of data.places){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;const ctx=canvas.getContext("2d")!;
    ctx.font="600 34px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineWidth=7;ctx.strokeStyle="rgba(0,0,0,.65)";ctx.strokeText(place.name,256,48);ctx.fillStyle=settlementColor.clone().lerp(new THREE.Color(1,1,1),.45).getStyle();ctx.fillText(place.name,256,48);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false});
    const label=new THREE.Sprite(material);label.position.set(place.point[0],ground(...place.point)+30*u,place.point[1]);label.scale.set(48,9,1);label.renderOrder=3;scene.add(label);labels.push(label);
  }
  return {meshes,dispose(){for(const label of labels){scene.remove(label);label.material.map?.dispose();label.material.dispose();}for(const mesh of meshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}}};
}
