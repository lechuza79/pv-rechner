import * as THREE from 'three';

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
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d');
 const gradient=ctx.createLinearGradient(0,0,256,0);gradient.addColorStop(0,'#25391c');gradient.addColorStop(.48,'#5b7037');gradient.addColorStop(.52,'#3e5525');gradient.addColorStop(1,'#293d1e');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,512);
 ctx.strokeStyle='#91a65a';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(128,512);ctx.quadraticCurveTo(134,260,128,0);ctx.stroke();
 for(let i=1;i<14;i++){const y=i*36;for(const side of [-1,1]){ctx.strokeStyle='#83974b99';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(130,y+33);ctx.quadraticCurveTo(128+side*48,y+10,128+side*118,y-24);ctx.stroke();for(let j=1;j<4;j++){ctx.strokeStyle='#8ba35744';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(128+side*j*25,y+25-j*10);ctx.lineTo(128+side*(j*25+23),y-j*12-18);ctx.stroke();}}}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const leaf=new THREE.MeshStandardMaterial({map:texture,roughness:.75,emissive:0x63734b,emissiveIntensity:.32,side:THREE.DoubleSide});
 const light=new THREE.HemisphereLight(0xdce6ee,0x263023,2);scene.add(light);
 const geometries=[],leafMeshes=[];
 function point(x,y,depth){camera.updateMatrixWorld();const ray=new THREE.Vector3(x,y,.5).unproject(camera).sub(camera.position);const forward=new THREE.Vector3();camera.getWorldDirection(forward);return ray.multiplyScalar(depth/ray.dot(forward)).add(camera.position);}
 function rebuild(){
  group.clear();leafMeshes.length=0;geometries.splice(0).forEach(g=>g.dispose());
  // Frame-edge anchors place the actual 3D geometry without covering the claim.
  function twig(path,radius){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),20,radius,6,false);geometries.push(g);group.add(new THREE.Mesh(g,bark));}
  const crown=[[[1.12,-1.16],[1.02,-.78],[.97,-.43],[.90,-.22]],[[1.13,-1.13],[.96,-.94],[.78,-.82],[.59,-.77]],[[1.17,-1.08],[1.04,-.84],[.98,-.66],[.84,-.52]]];
  const leafGeometry=new THREE.BufferGeometry(),positions=[],uvs=[],indices=[];
  for(let n=0;n<=40;n++){const t=n/40,width=Math.pow(Math.sin(Math.PI*t),.85)*(.43+(n%2)*.035);for(const side of [-1,0,1]){const x=side*width;positions.push(x,t*2-1,Math.abs(x)*.16+Math.sin(t*Math.PI)*.1);uvs.push((x+.5),t);}if(n<40){const k=n*3;indices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}}
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));leafGeometry.setIndex(indices);leafGeometry.computeVertexNormals();geometries.push(leafGeometry);
  crown.forEach((branch,k)=>{
   const points=branch.map(([x,y],i)=>point(x-.12,y+.16,1.08-i*.035));twig(points,.00065-k*.0001);
   for(let i=1;i<4;i++){
    const anchor=points[i],screen=branch[i],tip=point(screen[0]-.12-(i%2?.07:-.035),screen[1]+.205,1.07-i*.035);
    twig([anchor,anchor.clone().lerp(tip,.55),tip],.00024);
    // Alternate leaves along each shoot, with short attached petioles and open gaps.
    for(let j=0;j<4;j++){
     const m=new THREE.Mesh(leafGeometry,leaf),side=j%2?1:-1;
     const size=.0048+((i*3+j+k)%4)*.00045;
     const junction=anchor.clone().lerp(tip,.22+j*.24);
     m.rotation.set(.18+(i+k)%3*.22,side*(.25+j*.08),side*(.7+j*.15)+k*.18);
     m.scale.setScalar(size);
     const axis=new THREE.Vector3(0,1,0).applyEuler(m.rotation);
     const base=junction.clone().addScaledVector(axis,.0022);
     twig([junction,junction.clone().lerp(base,.5),base],.00010);
     m.position.copy(base).addScaledVector(axis,size);m.userData.stem=base;m.userData.rest=m.rotation.clone();m.userData.length=size;group.add(m);leafMeshes.push(m);
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
 },update(time,state){leaf.color.setHex(state.season==='autumn'?0xe3c998:0xffffff);leaf.emissiveIntensity=state.phase==='night'?.025:.32;leafMeshes.forEach((m,i)=>{m.visible=state.season!=='winter';const wind=Math.min(state.wind||0,2),rest=m.userData.rest,phase=i*2.39996;const flutter=Math.sin(time*(1.4+i%4*.17)+phase)*.11+Math.sin(time*3.2+phase*1.7)*.035;m.rotation.set(rest.x+flutter*wind,rest.y+Math.sin(time*1.1+phase)*.13*wind,rest.z+Math.sin(time*.8+phase)*.055*wind);m.position.set(0,m.userData.length,0).applyEuler(m.rotation).add(m.userData.stem);});light.intensity=state.phase==='night'?.16:1.7;group.rotation.z=Math.sin(time*.64)*.003*Math.min(state.wind||0,3);},render(){const auto=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
  uniforms.surface.value=target.texture;uniforms.direction.value.set(1,0);uniforms.finalPass.value=false;material.blending=THREE.NoBlending;
  renderer.setRenderTarget(blurTarget);renderer.clear();renderer.render(composite,screenCamera);
  uniforms.surface.value=blurTarget.texture;uniforms.direction.value.set(0,1);uniforms.finalPass.value=true;material.blending=THREE.NormalBlending;
  renderer.setRenderTarget(null);if(overlay)renderer.clear();renderer.setViewport(0,0,width,height);renderer.render(composite,screenCamera);renderer.autoClear=auto;if(overlay)overlay.domElement.dataset.ready='true';},dispose(){overlay?.domElement.remove();overlay?.dispose();geometries.forEach(g=>g.dispose());bark.dispose();leaf.dispose();texture.dispose();target.dispose();blurTarget.dispose();material.dispose();quad.geometry.dispose();}};
}
