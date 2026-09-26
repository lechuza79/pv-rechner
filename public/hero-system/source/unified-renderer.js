import {solarLight} from './solar-light.js';
import * as THREE from 'three';
import {createTreeAsync} from './tree-async.js';
import preset from './node_modules/@dgreenheck/ez-tree/src/lib/presets/ash_small.json';
import {createFlightStudy} from './flight-models.js';
import {createPanelStudy} from './panel-study.js';
import {createRainField} from './rain-field.js';
export async function createUnifiedRenderer(container,panelImage,onFallback,onReady,options={}){
 const timings={};let stamp=performance.now();const checkpoint=name=>{timings[name]=Math.round(performance.now()-stamp);stamp=performance.now();container.dataset.bootTimings=JSON.stringify(timings);};
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0,0);renderer.autoClear=false;renderer.info.autoReset=false;
 const canvas=renderer.domElement;canvas.className='unified-canvas';canvas.setAttribute('aria-hidden','true');container.append(canvas);
 checkpoint('renderer');
 const treesScene=new THREE.Scene(),treeCamera=new THREE.OrthographicCamera(-80,80,48,-4,.1,500);treeCamera.position.set(0,16,120);treeCamera.lookAt(0,16,0);
 const ambient=new THREE.HemisphereLight(0xdceefa,0x657368,2.5),sun=new THREE.DirectionalLight(0xffe3b3,2.4);sun.position.set(-40,65,40);treesScene.add(ambient,sun);
 const trees=[];
 const positions=[[-62,.85],[-36,.72],[46,.82],[72,1.02]];
 for(const [i,[x,s]] of positions.entries()){
  // Yield between independent tree builds so input and painting are not blocked.
  await new Promise(resolve=>setTimeout(resolve,0));
const p=structuredClone(preset);p.seed=26867+i*91;p.bark.textured=false;p.bark.tint=0x627269;p.leaves.count=26;p.leaves.size=3.1;p.leaves.tint=0x879c7a;p.branch.sections={0:8,1:7,2:5,3:3};p.branch.segments={0:6,1:4,2:3,3:3};const t=await createTreeAsync(p);for(const mesh of [t.branchesMesh,t.leavesMesh]){mesh.material.transparent=false;mesh.material.opacity=1;mesh.material.forceSinglePass=true;}t.leavesMesh.material.alphaTest=.35;t.leavesMesh.material.alphaToCoverage=true;t.position.set(x,-5,0);t.scale.setScalar(s);treesScene.add(t);trees.push(t);checkpoint('tree'+i);}
 if(options.foreground==='branch')trees[3].position.x=24;
 const treePositions=trees.map(t=>t.position.x);
 treesScene.fog=new THREE.Fog(0xc4d2d3,75,190);
 const panelStudy=options.panels!=='image'?createPanelStudy(renderer,options):null;
 checkpoint('panels');
 // Composite atmospheric haze after vegetation and before the opaque roof.
 const hazeScene=new THREE.Scene(),hazeCamera=new THREE.Camera();
 const hazeMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{time:{value:0},strength:{value:.5},tint:{value:new THREE.Color(0xcbd8d6)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform float strength;uniform vec3 tint;
 void main(){float y=1.-vUv.y;float drift=sin(time*.055)*.045;float a=exp(-pow((y-.77)/.16,2.)-pow((vUv.x-.28-drift)/.57,2.));float b=exp(-pow((y-.84)/.12,2.)-pow((vUv.x-.79+drift)/.48,2.));float fog=clamp((a+b*.8)*strength,0.,.78);gl_FragColor=vec4(tint,fog);
 #include <colorspace_fragment>
 }`});
 const hazeQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),hazeMaterial);hazeScene.add(hazeQuad);
 const panels=new THREE.Scene(),panelCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);panelCamera.position.z=2;
 const panelMaterial=new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false});
 const panelMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),panelMaterial);panels.add(panelMesh);
 let loaded=Boolean(panelStudy),prepared=false,preparing=false;// Reuse the already downloaded image instead of fetching the fallback twice.
 const usePanelImage=()=>{if(dead)return;const texture=new THREE.Texture(panelImage);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;panelMaterial.map=texture;panelMaterial.needsUpdate=true;loaded=true;container.dataset.unifiedReady='false';onReady?.();};
 if(!panelStudy&&panelImage.complete&&panelImage.naturalWidth)queueMicrotask(usePanelImage);else if(!panelStudy)panelImage.addEventListener('load',usePanelImage,{once:true});
 const kind=options.actor;const flight=['plane','bird','butterfly'].includes(kind)?createFlightStudy(kind):null;
 const rain=createRainField();let width=1,height=1,quality='high',dead=false;
 function resize(w,h,tier=quality){width=w;height=h;quality=tier;renderer.setPixelRatio(Math.min(devicePixelRatio,tier==='low'?1:2));renderer.setSize(w,h,false);
  const narrow=Math.max(0,Math.min(1,(800-w)/440));
  trees.forEach((t,i)=>{t.position.x=THREE.MathUtils.lerp(treePositions[i],[-48,-22,34,58][i],narrow);});
  const th=h*(w<700?.4:.48),extent=Math.max(80,48*w/th/2);treeCamera.left=-extent;treeCamera.right=extent;treeCamera.bottom=-4-52*(h*(w<700?.16:.17))/th;treeCamera.updateProjectionMatrix();panelCamera.left=-w/2;panelCamera.right=w/2;panelCamera.top=h/2;panelCamera.bottom=-h/2;panelCamera.updateProjectionMatrix();rain.resize(w,h,tier==='low');flight?.resize(w,h);panelStudy?.resize(w,h);}

 function render(time,state,wind){
  if(dead||!loaded)return null;
  if(!prepared){
   if(!preparing){
    preparing=true;
    // Keep the static image while the driver prepares the graphics programs.
    (async()=>{
     await renderer.compileAsync(treesScene,treeCamera);
     if(dead)return;
     await renderer.compileAsync(hazeScene,hazeCamera);
     if(dead)return;
     if(panelStudy)await panelStudy.prepare(state);else await renderer.compileAsync(panels,panelCamera);
     if(dead)return;
     prepared=true;onReady?.();
    })().catch(()=>{if(!dead){dead=true;canvas.hidden=true;onFallback('3D konnte nicht vorbereitet werden. Standbild aktiv.');}});
   }
   return null;
  }
  const started=performance.now(),night=state.phase==='night',warm=state.phase==='dawn'||state.phase==='dusk';
  const light=solarLight(state);
  treesScene.fog.near=state.fog?75:150;treesScene.fog.far=state.fog?190:600;
  treesScene.fog.color.setHex(night?0x192b3b:state.rain>0?0xa4b6c0:0xc4d2d3);
  ambient.intensity=.35+light.daylight*(state.rain>0?1.05:2.15);sun.intensity=2.4*light.sun*(1-state.cloud*.85);sun.color.setHex(warm?0xffb979:0xffe3b3);sun.position.x=(state.sunX/100-.5)*120;
  trees.forEach((t,i)=>{t.rotation.z=Math.sin(time*.65+i*.8)*.009*wind;t.update(time);t.leavesMesh.visible=state.season!=='winter';t.leavesMesh.material.color.setHex(state.season==='autumn'?0xd7a16b:0x879c7a);const shader=t.leavesMesh.material.userData.shader;if(shader)shader.uniforms.uWindStrength.value.set(wind*1.7,0,Math.abs(wind)*.7);});
  renderer.info.reset();renderer.setViewport(0,0,width,height);renderer.clear();
  const th=height*(width<700?.4:.48),bottom=height*(width<700?.16:.17);renderer.setViewport(0,0,width,th+bottom);renderer.render(treesScene,treeCamera);if(!timings.firstFrame)timings.treesDraw=Math.round(performance.now()-started);
  renderer.setViewport(0,0,width,height);renderer.clearDepth();
  if(flight){flight.update(time,!night&&state.rain<.01);renderer.render(flight.scene,flight.camera);renderer.clearDepth();}
  hazeMaterial.uniforms.time.value=time;hazeMaterial.uniforms.strength.value=.035+(state.fog||0)*.5+(state.rain>0?.08:0);hazeMaterial.uniforms.tint.value.setHex(night?0x233a4a:state.rain>0?0xc4d1d7:0xd4dfd6);renderer.render(hazeScene,hazeCamera);
  if(!panelStudy){const r=panelImage.getBoundingClientRect(),base=container.getBoundingClientRect();panelMesh.scale.set(r.width,r.height,1);panelMesh.position.set(r.left-base.left+r.width/2-width/2,height/2-(r.top-base.top+r.height/2),0);}
  const b=.19+light.daylight*(state.rain>0?.43:warm?.51:.81);panelMaterial.color.setRGB(b**2.2,(b*(warm?.9:1))**2.2,(b*(warm?.83:1))**2.2);if(panelStudy){const panelStart=performance.now();panelStudy.update(time,state);if(!timings.firstFrame)timings.panelUpdate=Math.round(performance.now()-panelStart);renderer.setViewport(0,0,width,height);panelStudy.render();if(!timings.firstFrame)timings.panelDraw=Math.round(performance.now()-panelStart);}else renderer.render(panels,panelCamera);
  if(state.rain>.005){renderer.clearDepth();rain.update(time,wind,state.rain);renderer.render(rain.scene,rain.camera);}
  container.dataset.unifiedReady=container.classList.contains('static-scene')?'false':'true';
  if(!timings.firstFrame){timings.firstFrame=Math.round(performance.now()-started);container.dataset.bootTimings=JSON.stringify(timings);}
  return {cpu:performance.now()-started,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality};
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();dead=true;container.dataset.unifiedReady='false';canvas.hidden=true;onFallback('3D wurde vom Gerät angehalten. Standbild aktiv.');});
 return {simulateLoss(){renderer.forceContextLoss();},get ready(){return loaded&&!dead;},resize,render,dispose(){dead=true;panelImage?.removeEventListener('load',usePanelImage);canvas.remove();hazeQuad.geometry.dispose();hazeMaterial.dispose();rain.dispose();flight?.dispose();panelStudy?.dispose();trees.forEach(t=>t.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();}));panelMaterial.map?.dispose();panelMesh.geometry.dispose();panelMaterial.dispose();renderer.dispose();}};
}
