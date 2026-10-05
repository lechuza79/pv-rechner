import {leafRelease,treeWindResponse} from './wind-motion.js';
import * as THREE from 'three';
import {prepareSeasonalLeaves} from './seasonal-leaves.js';
import {createLeafGeometry,createLeafTexture,treeSpecies} from './tree-species.js';
import {createForegroundLeafFall,pointAtDepth} from './foreground-leaf-fall.js';

// A near-camera branch rendered through the panel camera. Thin-lens circle of
// confusion sets a Gaussian blur approximation; focus stays on the roof at five metres.
export function createForegroundBranch(baseRenderer, camera, options={}) {
 // In the homepage study the near foliage also occludes the HTML reading card.
 // Keep the same 3D camera; a transparent foreground canvas supplies that layer.
 let renderer=baseRenderer,overlay=null;
 if(options.foregroundOverlay===true){
  try{overlay=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});overlay.setClearColor(0,0);overlay.setPixelRatio(Math.min(devicePixelRatio,1.5));overlay.domElement.className='hs-foreground-layer';overlay.domElement.setAttribute('aria-hidden','true');options.stage.append(overlay.domElement);renderer=overlay;}catch{overlay?.dispose();overlay=null;}
 }
 const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
 const bark=new THREE.MeshStandardMaterial({color:0x302d23,roughness:.95});
 const texture=createLeafTexture('maple');
 const leaf=new THREE.MeshStandardMaterial({map:texture,color:treeSpecies.maple.green,roughness:.75,emissive:0x63734b,emissiveIntensity:.32,side:THREE.DoubleSide});
 const falling=createForegroundLeafFall(camera);
 const light=new THREE.HemisphereLight(0xdce6ee,0x263023,2);scene.add(light);
 const geometries=[],leafMeshes=[],seasonalMaterials=[];
 function point(x,y,depth){return pointAtDepth(camera,x,y,depth);}
 let nextRelease=0,releaseIndex=0,lastSeason=null;
 function rebuild(){
  falling.clear();
  group.clear();leafMeshes.length=0;geometries.splice(0).forEach(g=>g.dispose());seasonalMaterials.splice(0).forEach(m=>m.dispose());
  // Frame-edge anchors place the actual 3D geometry without covering the claim.
  function twig(path,radius){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),20,radius,6,false);geometries.push(g);group.add(new THREE.Mesh(g,bark));}
  const crown=[[[1.12,-1.16],[1.02,-.78],[.97,-.43],[.90,-.22]],[[1.13,-1.13],[.96,-.94],[.78,-.82],[.59,-.77]],[[1.17,-1.08],[1.04,-.84],[.98,-.66],[.84,-.52]]];
  const leafGeometry=createLeafGeometry('maple');geometries.push(leafGeometry);
  crown.forEach((branch,k)=>{
   const points=branch.map(([x,y],i)=>point(x-.12,y+.16,1.08-i*.035));twig(points,.00065-k*.0001);
   for(let i=1;i<4;i++){
    const anchor=points[i],screen=branch[i],tip=point(screen[0]-.12-(i%2?.07:-.035),screen[1]+.205,1.07-i*.035);
    twig([anchor,anchor.clone().lerp(tip,.55),tip],.00024);
    // Opposite maple leaves, with short petioles and open gaps.
    for(let j=0;j<4;j++){
     const geometry=leafGeometry.clone(),material=leaf.clone();geometries.push(geometry);seasonalMaterials.push(material);
     const m=new THREE.Mesh(geometry,material),side=j%2?1:-1;
     m.userData.foliage=prepareSeasonalLeaves(m,geometry.getAttribute('position').count,leafMeshes.length+700,'maple');
     const size=.0096+((i*3+j+k)%4)*.0009;
     const junction=anchor.clone().lerp(tip,.3+Math.floor(j/2)*.45);
     m.rotation.set(.18+(i+k)%3*.22,side*(.25+j*.08),side*(.7+j*.15)+k*.18);
     m.scale.setScalar(size);
     const axis=new THREE.Vector3(0,1,0).applyEuler(m.rotation);
     const base=junction.clone().addScaledVector(axis,.0022);
     twig([junction,junction.clone().lerp(base,.5),base],.00010);
     m.position.copy(base).addScaledVector(axis,size*.48);m.userData.stem=base;m.userData.rest=m.rotation.clone();m.userData.length=size*.48;group.add(m);leafMeshes.push(m);
    }
   }
  });

 }
 const target=new THREE.WebGLRenderTarget(1,1),blurTarget=new THREE.WebGLRenderTarget(1,1);
 const uniforms={surface:{value:target.texture},direction:{value:new THREE.Vector2(1,0)},finalPass:{value:false},pixel:{value:new THREE.Vector2()},near:{value:camera.near},far:{value:camera.far},cocScale:{value:1},focus:{value:5}};
 const material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 uniform sampler2D surface;uniform vec2 pixel,direction;uniform float cocScale;uniform bool finalPass;varying vec2 vUv;
 void main(){vec4 total=vec4(0.);float weight=0.;
  // Smooth separable kernel, with transparent samples retained in the average.
  // Central branch distance is 1 m; the roof focus is 5 m.
  float sigma=clamp(cocScale*4.,1.,32.)*.48;
  for(int i=-16;i<=16;i++){
   float t=float(i)/16.,w=exp(-4.5*t*t);
   total+=texture2D(surface,vUv+direction*pixel*t*sigma*3.)*w;weight+=w;
  }
  total/=weight;
  if(!finalPass){gl_FragColor=total;return;}
  total.rgb/=max(total.a,.0001);gl_FragColor=total;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),composite=new THREE.Scene();composite.add(quad);const screenCamera=new THREE.Camera();let width=1,height=1;
 return {async prepare(){const previous=renderer.getRenderTarget();try{renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera);renderer.setRenderTarget(blurTarget);await renderer.compileAsync(composite,screenCamera);renderer.setRenderTarget(null);await renderer.compileAsync(composite,screenCamera);}finally{renderer.setRenderTarget(previous);}},resize(w,h){width=w;height=h;overlay?.setPixelRatio(Math.min(devicePixelRatio,w<700?1:1.5));overlay?.setSize(w,h,false);const scale=w<700?.5:.75;target.setSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));blurTarget.setSize(target.width,target.height);uniforms.pixel.value.set(1/w,1/h);
  const sensorHeight=camera.getFilmHeight()/1000,f=sensorHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV())/2)),aperture=f/28;
  uniforms.cocScale.value=aperture*f/(5-f)/sensorHeight*h*.5;rebuild();
 },update(time,state){
 const season=JSON.stringify(state.foliage);
 if(lastSeason!==season){falling.clear();leafMeshes.forEach(m=>m.userData.detached=false);lastSeason=season;}
 falling.update(time,state,width);const response=treeWindResponse(state.windMotion??(state.wind||0)*(state.direction??1)),wind=response.leaf;leafMeshes.forEach((m,i)=>{m.userData.foliage.update(state);if(m.userData.detached){m.visible=false;return;}m.material.emissiveIntensity=state.phase==='night'?.025:.32;const rest=m.userData.rest,phase=i*2.39996;const flutter=Math.sin(time*(2+i%4*.17)+phase)*.20+Math.sin(time*4.4+phase*1.7)*.055;m.rotation.set(rest.x+flutter*wind,rest.y+Math.sin(time*1.1+phase)*.18*wind,rest.z+Math.sin(time*.8+phase)*.08*wind);m.position.set(0,m.userData.length,0).applyEuler(m.rotation).add(m.userData.stem);});light.intensity=state.phase==='night'?.16:1.7;group.rotation.z=-response.trunk*(.65+Math.sin(time*.85)*.35)+Math.sin(time*.85)*.009*wind;
 if(time>nextRelease&&state.foliage?.color>.1&&state.foliage?.loss<.95&&leafRelease(time,state)>1){
  nextRelease=time+2.5+(Math.sin(releaseIndex*17.1)+1)*2;
  group.updateMatrixWorld(true);
  for(let n=0;n<leafMeshes.length;n++){
   const m=leafMeshes[(releaseIndex++)%leafMeshes.length],seed=m.geometry.getAttribute('seasonSeed').getX(0);
   if(!m.userData.detached&&m.visible&&state.foliage.loss<.025+seed*.95&&falling.release(m,state.windMotion??0)){
    m.userData.detached=true;m.visible=false;break;
   }
  }
 }
 },render(){const auto=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.render(falling.branchScene,camera);
  uniforms.surface.value=target.texture;uniforms.direction.value.set(1,0);uniforms.finalPass.value=false;material.blending=THREE.NoBlending;
  renderer.setRenderTarget(blurTarget);renderer.clear();renderer.render(composite,screenCamera);
  uniforms.surface.value=blurTarget.texture;uniforms.direction.value.set(0,1);uniforms.finalPass.value=true;material.blending=THREE.NormalBlending;
  renderer.setRenderTarget(null);if(overlay)renderer.clear();renderer.setViewport(0,0,width,height);renderer.render(composite,screenCamera);renderer.clearDepth();renderer.render(falling.scene,camera);renderer.autoClear=auto;if(overlay)overlay.domElement.dataset.ready='true';},dispose(){overlay?.domElement.remove();overlay?.dispose();geometries.forEach(g=>g.dispose());seasonalMaterials.forEach(m=>m.dispose());falling.dispose();bark.dispose();leaf.dispose();texture.dispose();target.dispose();blurTarget.dispose();material.dispose();quad.geometry.dispose();}};
}
