import * as THREE from 'three';
import {FullScreenQuad} from 'three/examples/jsm/postprocessing/Pass.js';

/** Background-only circle of confusion, in CSS pixels, shared by scene and HTML pins. */
export function distanceBlur(depth:number,focus:number){
  const start=Math.max(1,focus)*1.25;
  const amount=THREE.MathUtils.clamp((depth-start)/Math.max(1,focus),0,1);
  return 2*amount*amount*(3-2*amount);
}

/** Camera steering and optical focus are independent during landscape travel. */
export function createFlightLensFocus(){
  let travel:number|null=null;
  return (current:number,destination:number,moving:boolean)=>{
    if(!moving){travel=null;return destination;}
    travel??=current>0?current:destination;
    return travel;
  };
}

/** A small depth-aware lens pass. No bloom, fog, or material replacement. */
export function cameraDepthOfField(renderer:THREE.WebGLRenderer,camera:THREE.PerspectiveCamera){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const uniforms={image:{value:target.texture},depthMap:{value:target.depthTexture},
    near:{value:camera.near},far:{value:camera.far},focus:{value:100},
    texel:{value:new THREE.Vector2(1,1)},pixelRatio:{value:renderer.getPixelRatio()}};
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,blending:THREE.NoBlending,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      #include <packing>
      uniform sampler2D image,depthMap;
      uniform float near,far,focus,pixelRatio;
      uniform vec2 texel;
      varying vec2 vUv;
      float depthAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(depthMap,uv).x,near,far);}
      void main(){
        float depth=depthAt(vUv);
        float radius=2.0*smoothstep(focus*1.25,focus*2.25,depth)*pixelRatio;
        vec4 sum=texture2D(image,vUv); float weight=1.0;
        if(radius>0.05){
          for(int i=0;i<12;i++){
            float angle=float(i)*2.39996323;
            vec2 uv=clamp(vUv+vec2(cos(angle),sin(angle))*sqrt((float(i)+0.5)/12.)*radius*texel,vec2(0.),vec2(1.));
            // Keep in-focus foreground silhouettes out of the background kernel.
            if(depthAt(uv)<focus*1.25)continue;
            sum+=texture2D(image,uv);weight+=1.0;
          }
        }
        vec4 color=sum/weight;
        // The offscreen buffer contains premultiplied coverage. Tone-map straight
        // colour once, then restore coverage for the transparent browser canvas.
        gl_FragColor=vec4(color.a>0.00001?color.rgb/color.a:vec3(0.),color.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb*=gl_FragColor.a;
      }`});
  const quad=new FullScreenQuad(material);
  let focus=0;
  return {
    render(scene:THREE.Scene,desiredFocus:number,dt:number){
      desiredFocus=Math.max(1,desiredFocus);
      focus=focus?THREE.MathUtils.lerp(focus,desiredFocus,1-Math.exp(-dt/1.2)):desiredFocus;
      uniforms.focus.value=focus;
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      renderer.setRenderTarget(null);quad.render(renderer);
    },
    blur(depth:number){return distanceBlur(depth,focus);},
    focusDistance(){return focus;},
    resize(width:number,height:number){
      const ratio=renderer.getPixelRatio();
      target.setSize(Math.round(width*ratio),Math.round(height*ratio));
      uniforms.texel.value.set(1/target.width,1/target.height);uniforms.pixelRatio.value=ratio;
    },
    dispose(){target.dispose();target.depthTexture?.dispose();material.dispose();quad.dispose();}
  };
}
