import * as THREE from 'three';

export function advanceWetness(wet, rain, dt) {
 const target = Math.min(1, Math.max(0, rain * 1.8));
 const rate = target > wet ? .7 : .018;
 return target + (wet - target) * Math.exp(-Math.max(0, dt) * rate);
}

// Water stays in panel coordinates, so highlights follow the roof perspective.
export function createPanelWater(array, glass, options={}) {
 const wetUniform = {value: 0}, filmTime={value:0}, downhill={value:new THREE.Vector2(0,1)};
 const study=options.debugWetFilm===true;
 glass.onBeforeCompile = shader => {
  shader.uniforms.panelWetness = wetUniform;
  shader.fragmentShader = 'uniform float panelWetness;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
   float film = .5 + .25*sin(vMapUv.x*29.+sin(vMapUv.y*17.)) + .25*sin(vMapUv.y*41.+vMapUv.x*11.);
   float pooled = smoothstep(.28,.74,film)*panelWetness;
   roughnessFactor = mix(roughnessFactor,.028,pooled*.95);
  `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
   diffuseColor.rgb *= 1.-panelWetness*.18;
  `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
   // Gentle film ripples distort reflected light, not the cell geometry.
   vec2 ripple=vec2(sin(vMapUv.x*39.+sin(vMapUv.y*23.)),cos(vMapUv.y*35.+vMapUv.x*13.));
   normal=normalize(normal+vec3(ripple*panelWetness*.024,0.));
  `);
 };
 if(study) glass.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{panelWetness:wetUniform,filmTime,filmDownhill:downhill});
  shader.vertexShader='varying vec2 filmPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   filmPosition=(instanceMatrix*vec4(transformed,1.)).xz;
  `);
  shader.fragmentShader=`uniform float panelWetness;uniform float filmTime;uniform vec2 filmDownhill;varying vec2 filmPosition;
   float filmHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float filmNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(filmHash(i),filmHash(i+vec2(1,0)),f.x),mix(filmHash(i+vec2(0,1)),filmHash(i+vec2(1,1)),f.x),f.y);}
   float waterCoverage(vec2 p){
    vec2 q=vec2(dot(p,vec2(filmDownhill.y,-filmDownhill.x)),dot(p,filmDownhill));
    float patches=filmNoise(p*3.1)*.7+filmNoise(p*7.3)*.3;
    float winding=filmNoise(vec2(q.x*8.,q.y*2.))*.32;
    float lanes=smoothstep(.68,.84,filmNoise(vec2((q.x+winding)*32.,q.y*.65-filmTime*.025)));
    return clamp(smoothstep(.39,.65,patches)*.88+lanes*.65,0.,1.)*panelWetness;
   }
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float waterMask=waterCoverage(filmPosition);
   diffuseColor.rgb*=1.-waterMask*.12;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.055,waterMask);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
   material.clearcoat=mix(.025,.95,waterMask);
   material.clearcoatRoughness=mix(.18,.085,waterMask)+geometryRoughness;
  `);
 };
 glass.customProgramCacheKey = () => study?'panel-water-film-v3':'panel-water-film-v2';
 glass.needsUpdate = true;
 const count = 7200, geometry = new THREE.PlaneGeometry(1,1);
 const seeds = new Float32Array(count*2);
 const uniforms = {time:{value:0},rain:{value:0},light:{value:1},viewport:{value:new THREE.Vector2(1280,850)},bounce:{value:new THREE.Vector3(0,1,0)}};
 const material = new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms,
  vertexShader:`attribute vec2 dropSeed;varying vec2 hitUv;varying float fade;uniform float time;uniform float rain;uniform vec2 viewport;uniform vec3 bounce;
   void main(){
    hitUv=uv;float life=fract(time*(.8+dropSeed.y*.5)+dropSeed.x)/.32;
    fade=life<1.&&dropSeed.y<rain&&rain>.01?(life<.16?0.:sin((life-.16)/.84*3.14159)):0.;
    float age=clamp(life,0.,1.);
    vec4 center=instanceMatrix*vec4(0.,0.,0.,1.);
    float flight=max(0.,(age-.16)/.84);
    center.xyz+=bounce*sin(flight*1.5708)*(.018+dropSeed.y*.045);
    // Reflection is calculated in roof-local coordinates from the incident rain direction.
    vec4 viewCenter=modelViewMatrix*center;
    vec4 clip=projectionMatrix*viewCenter;
    // Preserve a legible sub-two-pixel glint at any viewing distance.
    vec2 pixels=age<.16?vec2(3.5,1.6):vec2(1.2+dropSeed.y*1.3,1.7+dropSeed.x*2.);
    pixels*=1.-age*.25;
    clip.xy+=position.xy*pixels*2./viewport*clip.w;
    gl_Position=clip;
   }`,
  fragmentShader:`varying vec2 hitUv;varying float fade;uniform float light;
   void main(){float r=length((hitUv-.5)*2.);float soft=1.-smoothstep(.15,1.,r);
    gl_FragColor=vec4(.86,.93,1.,soft*fade*.85*light);
   }`});
 let randomSeed=824;const rand=()=>((randomSeed=randomSeed*16807%2147483647)-1)/2147483646;
 const mesh=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D();mesh.frustumCulled=false;
 for(let i=0;i<count;i++){
  const col=i%15,row=Math.floor(i/15)%4;
  dummy.position.set((col-7)*1.80+(rand()-.5)*1.63,.0205,-4.38+.57+row*1.18+(rand()-.5)*1.01);
  dummy.scale.setScalar(.65+rand()*.7);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  seeds[i*2]=rand();seeds[i*2+1]=rand();
 }
 geometry.setAttribute('dropSeed',new THREE.InstancedBufferAttribute(seeds,2));
 const contactMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms,
 vertexShader:`attribute vec2 dropSeed;varying vec2 contactUv;varying float contactLife;varying float contactVisible;uniform float time;uniform float rain;
 void main(){contactUv=uv;float age=fract(time*(.8+dropSeed.y*.5)+dropSeed.x)/.32;contactLife=age/.19;contactVisible=age<.19&&dropSeed.y<rain&&rain>.01?1.:0.;
 vec3 local=vec3(position.x,0.,position.y)*(.012+dropSeed.y*.013)*(1.+contactLife*.5);
 gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(local,1.);}`,
 fragmentShader:`varying vec2 contactUv;varying float contactLife;varying float contactVisible;uniform float light;
 void main(){float r=length(contactUv-.5);float core=exp(-r*r*65.)*(1.-contactLife);float rim=exp(-pow((r-.14-contactLife*.15)/.07,2.))*.3;
 gl_FragColor=vec4(.81,.91,.97,contactVisible*(core+rim)*max(0.,1.-contactLife)*.7*light);}`});
 const contacts=new THREE.InstancedMesh(geometry,contactMaterial,count);contacts.instanceMatrix=mesh.instanceMatrix;contacts.frustumCulled=false;
 array.add(mesh,contacts);
 let wet=0,last=null,phase=0,filmEnabled=true;const inverse=new THREE.Matrix4(),incoming=new THREE.Vector3(),normal=new THREE.Vector3(0,1,0);
 return {setFilmEnabled(enabled){filmEnabled=enabled;},resize(w,h){uniforms.viewport.value.set(w,h);},update(time,state){array.updateMatrixWorld();inverse.copy(array.matrixWorld).invert();incoming.set((state.wind||0)*(state.direction||1)*.22,-1,0).normalize().transformDirection(inverse);uniforms.bounce.value.copy(incoming).reflect(normal).normalize();const dt=last===null?0:Math.min(.15,Math.max(0,time-last));last=time;wet=advanceWetness(wet,state.rain,dt);wetUniform.value=filmEnabled?wet:0;filmTime.value=time;const gravity=new THREE.Vector3(0,-1,0).transformDirection(inverse);downhill.value.set(gravity.x,gravity.z).normalize();phase+=dt*(.65+state.rain*1.8);uniforms.time.value=phase;uniforms.rain.value=state.rain;uniforms.light.value=state.phase==='night'?.22:1;mesh.visible=contacts.visible=state.rain>.01;return filmEnabled?wet:0;},dispose(){array.remove(mesh,contacts);geometry.dispose();material.dispose();contactMaterial.dispose();}};
}
