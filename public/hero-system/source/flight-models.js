import * as THREE from 'three';
// Original procedural study models with articulated wings and real depth.
export function createFlightStudy(kind){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.z=12;
 // Match the composed landscape horizon at 68% of the frame, below eye level.
 const pitch=Math.atan(.36*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
 if(kind==='plane')camera.lookAt(0,12*Math.tan(pitch),0);
 const flightHeight=12*Math.tan(pitch+THREE.MathUtils.degToRad(15));
 const actor=new THREE.Group();scene.add(actor);scene.add(new THREE.HemisphereLight(0xe7f3ff,0x354332,2.4));const light=new THREE.DirectionalLight(0xffecc9,3);light.position.set(-5,8,9);scene.add(light);
 const materials=[];const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.65,side:THREE.DoubleSide});materials.push(m);return m;};
 const dark=mat(0x26313a),white=mat(0xd8e2e7),orange=mat(0xd68030);
 function ellipsoid(parent,position,scale,material){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
 function wing(parent,points,depth,material){const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),material);parent.add(mesh);return mesh;}
 let left=null,right=null;
 if(kind==='plane'){
  ellipsoid(actor,[0,0,0],[.95,.095,.1],white);
  wing(actor,[[.2,0],[-.27,.85],[-.48,.9],[-.26,0],[-.48,-.9],[-.27,-.85]],.025,white);
  wing(actor,[[-.63,0],[-.85,.35],[-.98,.36],[-.87,0],[-.98,-.36],[-.85,-.35]],.02,white);
  const tail=wing(actor,[[-.85,0],[-.77,.35],[-.55,0]],.02,dark);tail.rotation.x=-Math.PI/2;
  ellipsoid(actor,[.02,.34,.11],[.17,.055,.055],dark);ellipsoid(actor,[.02,-.34,.11],[.17,.055,.055],dark);
 }else{
  const butterfly=kind==='butterfly';ellipsoid(actor,[0,0,0],butterfly?[.05,.23,.055]:[.14,.36,.12],dark);ellipsoid(actor,[0,.29,0],butterfly?[.07,.07,.065]:[.105,.13,.1],dark);
  left=new THREE.Group();right=new THREE.Group();actor.add(left,right);
  for(const [side,group] of [[-1,left],[1,right]]){
   if(butterfly){
    const upper=ellipsoid(group,[side*.27,.13,0],[.29,.28,.025],dark);upper.rotation.z=side*-.3;
    ellipsoid(group,[side*.27,.14,.025],[.235,.22,.015],orange);ellipsoid(group,[side*.19,-.2,0],[.2,.21,.022],dark);ellipsoid(group,[side*.19,-.2,.024],[.15,.16,.012],orange);
    for(let i=0;i<4;i++)ellipsoid(group,[side*(.25+i*.045),.33-i*.065,.045],[.022,.026,.012],white);
   }else wing(group,[[0,.13],[side*.45,.1],[side*1.05,-.27],[side*.65,-.18],[side*.32,-.3],[0,-.15]],.025,dark);
  }
  if(!butterfly)wing(actor,[[0,-.2],[-.2,-.6],[0,-.52],[.2,-.6]],.02,dark);
 }

 // Two expanding vapour ribbons; their tail fades rather than ending in a hard line.
 const trails=[];
 if(kind==='plane')for(const side of [-1,1]){
  const count=100,positions=new Float32Array((count+1)*6),uv=new Float32Array((count+1)*4),indices=[];
  for(let i=0;i<=count;i++){const a=i/count;uv.set([a,0,a,1],i*4);if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;void main(){float edge=exp(-pow((vUv.y-.5)*3.6,2.0));float fade=smoothstep(0.0,.04,vUv.x)*(1.0-smoothstep(.35,1.0,vUv.x));gl_FragColor=vec4(.95,.97,1.0,edge*fade*.36);}' });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);materials.push(material);trails.push({mesh,positions,side,count});
 }
 let width=1;
 return {scene,camera,resize(w,h){width=w;camera.aspect=w/h;camera.updateProjectionMatrix();},update(time,enabled){
  actor.visible=enabled;trails.forEach(t=>t.mesh.visible=enabled);if(!enabled)return;
  const duration=kind==='plane'?80:kind==='bird'?17:13,u=((time+duration*.25)%(duration+5))/duration;actor.visible=u<=1;trails.forEach(t=>t.mesh.visible=u<=1);if(u>1)return;
  const span=12*Math.tan(42*Math.PI/360),x=(u*2-1)*span*camera.aspect*1.18;
  actor.position.set(x,kind==='plane'?flightHeight:kind==='bird'?3.2+Math.sin(u*5)*.3:.1+Math.sin(u*11)*.55,kind==='butterfly'?2+Math.sin(u*6):0);
  const scale=kind==='plane'?.065:kind==='bird'?.17:.24;actor.scale.setScalar(scale*(width<700?.85:1));
  actor.rotation.set(kind==='plane'?Math.PI/2:.25,kind==='plane'?0:Math.sin(time*.7)*.35,kind==='plane'?0:-Math.PI/2+Math.sin(time*.8)*.2);
  for(const trail of trails){
   for(let i=0;i<=trail.count;i++){
    const age=i/trail.count,dx=-.075-age*2.1,spread=.003+age*.04;
    // Wings and wake share the horizontal XZ plane. Camera elevation determines foreshortening.
    const y=actor.position.y-.007,z=trail.side*.022+Math.sin(age*7+time*.07)*age*.015;
    trail.positions.set([x+dx,y,z-spread,x+dx,y,z+spread],i*6);
   }
   trail.mesh.geometry.attributes.position.needsUpdate=true;
  }
  if(left){const glide=kind==='bird'&&Math.sin(time*.5)>.35,flap=glide?.18:Math.sin(time*(kind==='bird'?7:24))*(kind==='bird'?.7:1.05);left.rotation.y=flap;right.rotation.y=-flap;}
 },dispose(){scene.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());}};
}
