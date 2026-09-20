import * as THREE from 'three';
// Spatial rain rendered after the scene, with a minimum screen-space droplet width.
export function createRainField(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,90);camera.position.z=8;
 const geometry=new THREE.InstancedBufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.5,1,0,.5,1,0],3));geometry.setIndex([0,1,2,2,1,3]);
 let seed=8901;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const count=1800,offsets=[],params=[];
 for(let i=0;i<count;i++){offsets.push((rand()-.5)*2.4,rand()*2.4,-.5-rand()*30);params.push(.65+rand()*.65,rand(),rand());}
 geometry.setAttribute('offset',new THREE.InstancedBufferAttribute(new Float32Array(offsets),3));geometry.setAttribute('params',new THREE.InstancedBufferAttribute(new Float32Array(params),3));geometry.instanceCount=count;
 const uniforms={time:{value:0},drift:{value:0},wind:{value:.8},amount:{value:.6},viewportHeight:{value:850},aspect:{value:1.5}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:false,vertexShader:`
 attribute vec3 offset;attribute vec3 params;uniform float time;uniform float drift;uniform float wind;uniform float amount;uniform float viewportHeight;uniform float aspect;
 varying vec2 uvRain;varying float alphaRain;
 void main(){
 float depth=clamp(-offset.z/30.5,0.,1.);float speed=mix(13.,8.,depth)*params.x*mix(.7,1.2,amount);
 vec3 center=offset;float halfHeight=(8.-offset.z)*.44523;float halfWidth=halfHeight*aspect;
 center.y=(mod(offset.y-time*speed/halfHeight,2.4)-1.2)*halfHeight;
 center.x=(mod(offset.x+drift*params.x/halfWidth,2.4)-1.2)*halfWidth;
 float length=mix(.38,.24,depth)*(0.65+params.y*.7);
 // Preserve coverage at distance instead of shrinking most drops below a pixel.
 float pixelWorld=2.0*(8.0-center.z)*0.44523/viewportHeight;
 length=max(length,pixelWorld*mix(24.,9.,depth)*mix(.65,1.2,amount));
 float width=max(mix(.018,.028,depth),pixelWorld*mix(2.6,1.8,depth));
 vec3 local=vec3(position.x*width,-position.y*length,0.);
 local.x+=position.y*length*wind*.22;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(center+local,1.);
 uvRain=vec2(position.x+.5,position.y);
 float passing=.65+.35*sin(time*.35+offset.x*.2+offset.z*.15);
 alphaRain=mix(.8,.4,depth)*passing*step(params.z,amount);
 }`,fragmentShader:`varying vec2 uvRain;varying float alphaRain;
 void main(){
 // A single soft streak avoids alternating dark/light subpixel fragments.
 float edge=abs(uvRain.x-.5);
 float aa=max(fwidth(uvRain.x),.08);
 float coverage=1.-smoothstep(max(0.,.42-aa),.5,edge);
 float taper=sin(uvRain.y*3.14159);
 gl_FragColor=vec4(vec3(.77,.86,.92),coverage*taper*alphaRain*.82);
 }`});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
 let drift=0,last=0,enabled=true;
 function update(time,wind,amount){
  const dt=Math.min(.15,Math.max(0,time-last));last=time;drift+=dt*wind*2.2;
  uniforms.time.value=time;uniforms.drift.value=drift;uniforms.wind.value=wind;uniforms.amount.value=amount;
 }
 return {scene,camera,update,resize(w,h,low){camera.aspect=w/h;camera.updateProjectionMatrix();uniforms.viewportHeight.value=h;uniforms.aspect.value=w/h;geometry.instanceCount=low?650:w<700?1000:1800;},dispose(){geometry.dispose();material.dispose();}};
}
