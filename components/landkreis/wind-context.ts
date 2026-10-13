import * as THREE from 'three';
import {waterEdgeOpacity,type Point,type SceneContext} from '../../lib/wind-context';

/** Two merged meshes, draped over the existing terrain; elevation is a visual key, not building height. */
export function addWindContext(scene:THREE.Scene,data:SceneContext,ground:(x:number,z:number)=>number,settlementColor:THREE.Color,waterColor:THREE.Color,inside:(p:Point)=>boolean=()=>true,streamStyle:{widthMetres:number;liftMetres:number}={widthMetres:40,liftMetres:3}){
  const waterTime={value:0};
  let coastTexture:THREE.CanvasTexture|undefined;
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
    const out=positions[area.kind],lift=area.kind==='settlement'?8:data.waterStyle==='ripples'?.01:2;
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
    if(kind==='water'&&data.waterStyle==='ripples'){
      geometry.computeBoundingBox();
      const bounds=geometry.boundingBox!;
      const origin=new THREE.Vector2(bounds.min.x,bounds.min.z);
      const size=new THREE.Vector2(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z);
      // Rasterize the existing land outlines once: water never paints over land.
      const mask=document.createElement('canvas');mask.width=1024;mask.height=512;
      const ctx=mask.getContext('2d')!;
      ctx.fillStyle='white';ctx.fillRect(0,0,mask.width,mask.height);ctx.fillStyle='black';
      for(const polygon of data.waterLand??[]){
        ctx.beginPath();for(const ring of polygon){ring.forEach((p,i)=>{const x=(p[0]-origin.x)/size.x*mask.width,y=(1-(p[1]-origin.y)/size.y)*mask.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}ctx.fill('evenodd');
      }
      coastTexture=new THREE.CanvasTexture(mask);
      material.onBeforeCompile=shader=>{
        shader.uniforms.waterTime=waterTime;
        shader.uniforms.coastMask={value:coastTexture};
        shader.uniforms.waterOrigin={value:origin};shader.uniforms.waterSize={value:size};
        shader.vertexShader='varying vec2 waterPoint;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPoint=position.xz;');
        shader.fragmentShader=`varying vec2 waterPoint;
          uniform float waterTime; uniform sampler2D coastMask; uniform vec2 waterOrigin; uniform vec2 waterSize;
          float waterHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float waterNoise(vec2 p){
            vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
            return mix(mix(waterHash(i),waterHash(i+vec2(1.,0.)),f.x),mix(waterHash(i+vec2(0.,1.)),waterHash(i+vec2(1.,1.)),f.x),f.y);
          }
        `+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec2 uv=(waterPoint-waterOrigin)/waterSize;
          float landMask=texture2D(coastMask,uv).r;
          float rim=waterNoise(waterPoint*.045)*.055+waterNoise(waterPoint*.11)*.018;
          float boundary=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
          float edge=smoothstep(rim,rim+.075,boundary);
          vec2 p=waterPoint;
          float bend=sin(p.x*.045+waterTime*.08)*1.2+sin(p.x*.09-waterTime*.06)*.4;
          float swell=sin(p.y*.38+bend-waterTime*.5);
          float smallWave=sin(p.y*.67+bend*1.3-waterTime*.68);
          float interruption=smoothstep(.26,.64,waterNoise(vec2(p.x*.085,p.y*.14)+vec2(waterTime*.025,-waterTime*.018)));
          float light=(.5+.5*(swell*.75+smallWave*.25))*interruption;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.59,.62),light*.2);
          diffuseColor.a*=landMask*edge*(.42+light*.24);
        `);
      };
      material.customProgramCacheKey=()=> 'atlas-water-swell-v3';
    }
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
  return {meshes,animated:data.waterStyle==='ripples',update(seconds:number){waterTime.value=seconds;},dispose(){coastTexture?.dispose();for(const label of labels){scene.remove(label);label.material.map?.dispose();label.material.dispose();}for(const mesh of meshes){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}}};
}
