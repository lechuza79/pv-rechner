import {solarLight} from './solar-light.js';
import * as THREE from 'three';
import {createForegroundBranch} from './foreground-branch.js';
import {createPanelWater} from './panel-water.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Lightweight instanced panel geometry with sky-lit glass and weather-driven roughness.
export function createPanelView(){
 const camera=new THREE.PerspectiveCamera(42,1,.1,100);
 camera.zoom=5.2;camera.position.set(0,.9,5.5);camera.lookAt(0,1.12,-1);
 const array=new THREE.Group();array.rotation.set(.08,.85,-.20,'YXZ');array.position.set(2,-.60,0);
 return {camera,array};
}
export function createPanelStudy(renderer,options={}){
 const scene=new THREE.Scene(),{camera,array}=createPanelView();scene.add(array);scene.environmentRotation.y=.35;
 const mapCanvas=document.createElement('canvas');mapCanvas.width=1024;mapCanvas.height=1536;
 const ctx=mapCanvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#20262b';ctx.fillRect(0,0,512,768);
 let seed=73;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;
 const cols=6,rows=12,cw=80,ch=59;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const px=10+x*82,py=17+y*61,tone=84+Math.floor(rand()*14);ctx.fillStyle=`rgb(${tone-7},${tone},${tone+8})`;ctx.beginPath();const cut=3;ctx.moveTo(px+cut,py);ctx.lineTo(px+cw-cut,py);ctx.lineTo(px+cw,py+cut);ctx.lineTo(px+cw,py+ch-cut);ctx.lineTo(px+cw-cut,py+ch);ctx.lineTo(px+cut,py+ch);ctx.lineTo(px,py+ch-cut);ctx.lineTo(px,py+cut);ctx.closePath();ctx.fill();ctx.strokeStyle='#9daeba80';ctx.lineWidth=1.1;ctx.stroke();
  ctx.fillStyle='#adbcc852';for(let line=1;line<20;line++)ctx.fillRect(px+1,py+line*ch/20,cw-2,.35);
  ctx.fillStyle='#a4b0b947';for(let bus=1;bus<4;bus++)ctx.fillRect(px+bus*cw/4,py,.75,ch);
 }
 // Very low contrast surface variation, avoiding a pristine plastic appearance.
 for(let i=0;i<18000;i++){ctx.fillStyle=rand()>.5?'#c4d8e006':'#00000008';ctx.fillRect(rand()*512,rand()*768,1+rand()*2,1);}
 const texture=new THREE.CanvasTexture(mapCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 // Low-frequency roughness variation breaks up uniform reflections without embossed cells.
 const roughCanvas=document.createElement('canvas');roughCanvas.width=256;roughCanvas.height=384;const rc=roughCanvas.getContext('2d');rc.fillStyle='#c9c9c9';rc.fillRect(0,0,256,384);
 for(let i=0;i<26;i++){const x=rand()*256,y=rand()*384,r=25+rand()*90,g=rc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'#ffffff28':'#33333324');g.addColorStop(1,'#88888800');rc.fillStyle=g;rc.fillRect(0,0,256,384);}
 const roughnessMap=new THREE.CanvasTexture(roughCanvas);
 const glass=new THREE.MeshPhysicalMaterial({map:texture,roughnessMap,color:0xb6bcc0,specularIntensity:.3,metalness:0,roughness:.38,clearcoat:.3,clearcoatRoughness:.22,envMapIntensity:.25});
 const aluminum=new THREE.MeshStandardMaterial({color:0x171c20,metalness:.15,roughness:.65,envMapIntensity:.08});
 const backing=new THREE.MeshStandardMaterial({color:0x11191c,roughness:.7});
 const moduleScale=1;
 const geometry=new RoundedBoxGeometry(1.76*moduleScale,.035,1.14*moduleScale,2,.003),glassGeometry=new THREE.PlaneGeometry(1.735*moduleScale,1.115*moduleScale);glassGeometry.rotateX(-Math.PI/2);
 texture.center.set(.5,.5);texture.rotation=Math.PI/2;
 const count=60,frames=new THREE.InstancedMesh(geometry,aluminum,count),surfaces=new THREE.InstancedMesh(glassGeometry,glass,count),bases=new THREE.InstancedMesh(new THREE.BoxGeometry(1.72*moduleScale,.03,1.10*moduleScale),backing,count);
 const dummy=new THREE.Object3D();let index=0;
 for(let row=0;row<4;row++)for(let col=0;col<15;col++){
  dummy.position.set((col-7)*1.80*moduleScale,0,-4.38+.57*moduleScale+row*1.18*moduleScale);dummy.updateMatrix();frames.setMatrixAt(index,dummy.matrix);
  dummy.position.y=.0185;dummy.updateMatrix();surfaces.setMatrixAt(index,dummy.matrix);surfaces.setColorAt(index,new THREE.Color().setScalar(.94+rand()*.06));
  dummy.position.y=-.025;dummy.updateMatrix();bases.setMatrixAt(index,dummy.matrix);index++;
 }
 // Thin chamfer highlights and discrete mounting hardware, kept dark for all-black modules.
 const trimMaterial=new THREE.MeshStandardMaterial({color:0x343d44,metalness:.65,roughness:.4,envMapIntensity:.35});
 const trims=new THREE.InstancedMesh(new THREE.BoxGeometry(.009,.006,1.14*moduleScale),trimMaterial,count*2);
 // Extruded middle clamp: two lips and a recessed central bolt, as in the reference.
 const profile=new THREE.Shape();
 const points=[[-.095,.032],[-.078,.045],[-.042,.045],[-.042,.014],[.042,.014],[.042,.045],[.078,.045],[.095,.032],[.057,.032],[.057,-.012],[.042,-.012],[.042,0],[-.042,0],[-.042,-.012],[-.057,-.012],[-.057,.032]];
 points.forEach(([x,y],i)=>i?profile.lineTo(x,y):profile.moveTo(x,y));profile.closePath();
 const clampGeometry=new THREE.ExtrudeGeometry(profile,{depth:.065,bevelEnabled:true,bevelThickness:.0015,bevelSize:.0015,bevelSegments:1,steps:1});clampGeometry.scale(.34,.4,1);clampGeometry.translate(0,0,-.0325);
 const clampMaterial=new THREE.MeshStandardMaterial({color:0x151719,metalness:.55,roughness:.42,envMapIntensity:.3});
 const boltMaterial=new THREE.MeshStandardMaterial({color:0xd4d9dd,metalness:.65,roughness:.26,envMapIntensity:1.2});
 const clamps=new THREE.InstancedMesh(clampGeometry,clampMaterial,56);
 const screws=new THREE.InstancedMesh(new THREE.CylinderGeometry(.005,.005,.004,12),boltMaterial,56);
 const sockets=new THREE.InstancedMesh(new THREE.CircleGeometry(.0025,6).rotateX(-Math.PI/2),backing,56);
 for(let row=0;row<4;row++)for(let col=0;col<15;col++)for(let side=0;side<2;side++){
  const i=(row*15+col)*2+side,x=(col-7)*1.80*moduleScale+(side?1:-1)*1.76*moduleScale/2,z=-4.38+.57*moduleScale+row*1.18*moduleScale;
  dummy.position.set(x,.017,z);dummy.updateMatrix();trims.setMatrixAt(i,dummy.matrix);
 }
 for(let row=0;row<4;row++)for(let col=0;col<14;col++){
  const i=row*14+col,x=(col-6.5)*1.80*moduleScale,z=-4.38+.3*moduleScale+row*1.18*moduleScale;
  dummy.position.set(x,.005,z);dummy.updateMatrix();clamps.setMatrixAt(i,dummy.matrix);
  dummy.position.y=.013;dummy.updateMatrix();screws.setMatrixAt(i,dummy.matrix);
  dummy.position.y=.0151;dummy.updateMatrix();sockets.setMatrixAt(i,dummy.matrix);
 }
 array.add(trims,clamps,screws,sockets);
 const roof=new THREE.Mesh(new THREE.BoxGeometry(28,.06,4.64),backing);roof.position.set(0,-.08,-2.06);array.add(roof,frames,bases,surfaces);
 const water=createPanelWater(array,glass,options);
 const foreground=options.foreground==='branch'?createForegroundBranch(renderer,camera,options):null;
 let filmControls=null, reflectionSky='overcast';
 const filmStudy=options.debugWetFilm===true;
 if(options.debugWetFilm===true){
  filmControls=document.createElement('div');filmControls.className='wetfilm-compare';filmControls.setAttribute('role','group');filmControls.setAttribute('aria-label','Nassfilm vergleichen');
  filmControls.innerHTML='<span>Glas &amp; Spiegelungsumgebung</span><button type="button" aria-pressed="false">Ohne Nassfilm</button><button type="button" aria-pressed="true">Mit Nassfilm</button>';
  const buttons=filmControls.querySelectorAll('button');buttons.forEach((button,i)=>button.addEventListener('click',()=>{water.setFilmEnabled(i===1);window.dispatchEvent(new Event('panel-material-change'));buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}));const skySelect=document.createElement('select');skySelect.setAttribute('aria-label','Himmel der Spiegelungsstudie');skySelect.innerHTML='<option value="overcast">Bedeckt + Bäume</option><option value="broken">Wolkenlücken + Bäume</option>';skySelect.addEventListener('change',()=>{reflectionSky=skySelect.value;window.dispatchEvent(new Event('panel-material-change'));});filmControls.append(skySelect);document.body.append(filmControls);
 }

 const hemi=new THREE.HemisphereLight(0xc8dfed,0x28323b,2),sun=new THREE.DirectionalLight(0xfff1d6,2.5);scene.add(hemi,sun);
 const sky=document.createElement('canvas');sky.width=512;sky.height=256;const sk=sky.getContext('2d');
 const envTexture=new THREE.CanvasTexture(sky);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.colorSpace=THREE.SRGBColorSpace;
 const pmrem=new THREE.PMREMGenerator(renderer);let env=null,lastKey='',wet=0;
 function environment(state){
  const key=state.phase+':'+(state.cloud>.6)+':'+reflectionSky;if(key===lastKey)return;lastKey=key;
  const night=state.phase==='night',warm=state.phase==='dawn'||state.phase==='dusk',cloud=state.cloud>.6;
  const gradient=sk.createLinearGradient(0,0,0,256);gradient.addColorStop(0,night?'#101b32':warm?'#8194b7':cloud?'#8498a9':'#7db8d9');gradient.addColorStop(.48,night?'#273849':warm?'#f0c9a3':'#b6c7d3');gradient.addColorStop(.55,'#59666b');gradient.addColorStop(1,'#18232a');sk.fillStyle=gradient;sk.fillRect(0,0,512,256);
  for(let i=0;i<3;i++){const x=145+i*45,y=76+i%2*22,g=sk.createRadialGradient(x,y,8,x,y,42);g.addColorStop(0,night?'#aabbd008':cloud?'#f4f7fbcc':'#ffffffb0');g.addColorStop(1,'#ffffff00');sk.fillStyle=g;sk.fillRect(0,0,512,150);}
  // Broad directional cloud illumination remains visible in the frosted reflection.
  const opening=sk.createRadialGradient(340,106,4,340,106,115);opening.addColorStop(0,night?'#b4c5df12':warm?'#ffe0b5aa':'#eef5ffcc');opening.addColorStop(1,'#ffffff00');sk.fillStyle=opening;sk.fillRect(0,0,512,256);
  const shade=sk.createRadialGradient(85,100,5,85,100,130);shade.addColorStop(0,'#14253699');shade.addColorStop(1,'#14253600');sk.fillStyle=shade;sk.fillRect(0,0,512,256);
  if(filmStudy){
   // Reflection-only surrounding landscape; identical geometry under both sky presets.
   const overcast=reflectionSky==='overcast';
   const skyGradient=sk.createLinearGradient(0,0,0,256);
   skyGradient.addColorStop(0,night?'#111c2d':overcast?'#8e9eac':'#63899f');skyGradient.addColorStop(.5,night?'#273241':'#d8dee0');skyGradient.addColorStop(.53,'#46514b');skyGradient.addColorStop(1,'#192321');sk.fillStyle=skyGradient;sk.fillRect(0,0,512,256);
   if(!overcast){for(let i=0;i<9;i++){const x=i*69%512,y=24+(i*31%85),g=sk.createRadialGradient(x,y,4,x,y,55);g.addColorStop(0,night?'#697b8b55':i%3?'#f0f2eff0':'#3f525bc0');g.addColorStop(1,'#acbcc000');sk.fillStyle=g;sk.fillRect(0,0,512,140);}}
   let treeSeed=871;const treeRand=()=>((treeSeed=treeSeed*16807%2147483647)-1)/2147483646;
   for(let i=0;i<38;i++){const x=i*14,y=114-treeRand()*35,r=5+treeRand()*10;sk.fillStyle=night?'#101a19':'#263b32';sk.fillRect(x-1,y,2,143-y);for(let j=0;j<16;j++){sk.beginPath();sk.ellipse(x+(treeRand()-.5)*r*1.5,y+treeRand()*25,r*(.35+treeRand()*.4),r*(.3+treeRand()*.5),0,0,Math.PI*2);sk.fill();}}
  }
  envTexture.needsUpdate=true;const next=pmrem.fromEquirectangular(envTexture);env?.dispose();env=next;scene.environment=env.texture;
 }
 const target=new THREE.WebGLRenderTarget(1,1,{samples:Math.min(4,renderer.capabilities.maxSamples)});const compositeScene=new THREE.Scene(),compositeCamera=new THREE.Camera();
 const compositeMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{surface:{value:target.texture},texel:{value:new THREE.Vector2(1,1)}},vertexShader:'varying vec2 uvScene;void main(){uvScene=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 uniform sampler2D surface;uniform vec2 texel;varying vec2 uvScene;
 void main(){float radius=2.5*smoothstep(.89,1.,1.-uvScene.y);vec2 d=texel*radius;
 vec4 c;
 if(radius<.02){c=texture2D(surface,uvScene);}else{
 c=texture2D(surface,uvScene)*.28;
 c+=(texture2D(surface,uvScene+vec2(d.x,0.))+texture2D(surface,uvScene-vec2(d.x,0.))+texture2D(surface,uvScene+vec2(0.,d.y))+texture2D(surface,uvScene-vec2(0.,d.y)))*.12;
 c+=(texture2D(surface,uvScene+d)+texture2D(surface,uvScene-d)+texture2D(surface,uvScene+vec2(d.x,-d.y))+texture2D(surface,uvScene+vec2(-d.x,d.y)))*.06;
 }
 gl_FragColor=c;
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),compositeMaterial);compositeScene.add(quad);let width=1,height=1;
 return {scene,camera,async prepare(state){environment(state);const previous=renderer.getRenderTarget();try{renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera);renderer.setRenderTarget(null);await renderer.compileAsync(compositeScene,compositeCamera);}finally{renderer.setRenderTarget(previous);}await foreground?.prepare();},horizonLine(w,h){camera.updateMatrixWorld();array.updateMatrixWorld();const project=x=>new THREE.Vector3(x,0,-4.38).applyMatrix4(array.matrixWorld).project(camera);const a=project(-4),b=project(4),ax=(a.x+1)*w/2,ay=(1-a.y)*h/2,bx=(b.x+1)*w/2,by=(1-b.y)*h/2,slope=(by-ay)/(bx-ax);return {y:ay+(w/2-ax)*slope,angle:Math.atan(slope)};},resize(w,h){width=w;height=h;water.resize(w,h);camera.aspect=w/h;camera.zoom=5.2;camera.position.set(0,.9,5.5);camera.lookAt(0,1.12,-1);array.position.x=2;
 camera.setViewOffset(w,h,0,h*.965,w,h);camera.updateProjectionMatrix();
 foreground?.resize(w,h);const buffer=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(buffer.x,buffer.y);compositeMaterial.uniforms.texel.value.set(1/w,1/h);},render(){
 const oldAutoClear=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.setViewport(0,0,width,height);renderer.render(compositeScene,compositeCamera);foreground?.render();renderer.autoClear=oldAutoClear;
 },update(time,state){
  environment(state);foreground?.update(time,state);wet=water.update(time,state);
  const night=state.phase==='night',warm=state.phase==='dawn'||state.phase==='dusk';
  glass.roughness=filmStudy?.24:.18-wet*.035;glass.clearcoatRoughness=.16-wet*.095;glass.clearcoat=.025+wet*.22;glass.envMapIntensity=.08+solarLight(state).daylight*(.24+wet*.13);
  if(filmStudy){glass.clearcoat=1;glass.envMapIntensity=.12+.98*solarLight(state).daylight;}
  hemi.intensity=.17+1.53*solarLight(state).daylight;sun.intensity=2.5*solarLight(state).sun*(1-state.cloud*.85);sun.color.setHex(warm?0xffcf94:0xfff4dc);
  sun.position.set((state.sunX/100-.5)*12,2+(1-state.sunY/100)*8,2);
 },dispose(){foreground?.dispose();filmControls?.remove();water.dispose();target.dispose();quad.geometry.dispose();compositeMaterial.dispose();array.traverse(o=>o.geometry?.dispose());glass.dispose();trimMaterial.dispose();clampMaterial.dispose();boltMaterial.dispose();roughnessMap.dispose();aluminum.dispose();backing.dispose();texture.dispose();env?.dispose();envTexture.dispose();pmrem.dispose();}};
}
