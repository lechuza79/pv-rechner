import * as THREE from 'three';
import {foliageState, leafSeed} from './seasonal-foliage.js';
import {treeSpecies} from './tree-species.js';

// One spatial deformation for wood and attached foliage: crown tips flex in
// the breeze while the trunk base stays planted. Leaf flutter remains separate.
export function prepareTreeWind(tree, phase) {
  tree.branchesMesh.geometry.computeBoundingBox();
  const uniforms={twigTime:{value:0},twigWind:{value:0},twigHeight:{value:Math.max(1,tree.branchesMesh.geometry.boundingBox.max.y)},twigPhase:{value:phase}};
  for(const mesh of [tree.branchesMesh,tree.leavesMesh]){
    const material=mesh.material,original=material.onBeforeCompile,key=material.customProgramCacheKey();
    material.onBeforeCompile=function(shader,renderer){
      original.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='uniform float twigTime, twigWind, twigHeight, twigPhase;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        float flexibility=pow(clamp(position.y/twigHeight,0.,1.),2.);
        float sway=.6+sin(twigTime*1.05+twigPhase+position.x*.035)*.55
          +sin(twigTime*2.1+twigPhase+position.z*.08)*.18;
        transformed.x+=flexibility*twigWind*1.3*sway;
      `);
    };
    material.customProgramCacheKey=()=>key+'/twig-wind-v1';material.needsUpdate=true;
  }
  return {update(time,wind){uniforms.twigTime.value=time;uniforms.twigWind.value=wind;}};
}

// Extend the existing material, including its wind shader. Both crossed cards
// of a tree leaf receive the same seed, so neither half disappears on its own.
export function prepareSeasonalLeaves(mesh, verticesPerLeaf, seedOffset = 0, species = 'linden') {
  const geometry = mesh.geometry, position = geometry.getAttribute('position');
  const seeds = new Float32Array(position.count);
  for (let i = 0; i < seeds.length; i++) seeds[i] = leafSeed(Math.floor(i / verticesPerLeaf) + seedOffset);
  geometry.setAttribute('seasonSeed', new THREE.BufferAttribute(seeds, 1));
  const detached=new THREE.BufferAttribute(new Float32Array(position.count),1);geometry.setAttribute('leafDetached',detached);let previousSeason=null;
  const uniforms = {
    foliageColor: {value: 0}, foliageLoss: {value: 0},
    autumnGold: {value: new THREE.Color(treeSpecies[species].gold)},
    autumnBrown: {value: new THREE.Color(treeSpecies[species].late)},
    foliageBaseLight: {value: Math.max(.04,mesh.material.color.r*.2126+mesh.material.color.g*.7152+mesh.material.color.b*.0722)},
  };
  const material = mesh.material, original = material.onBeforeCompile;
  const summerEmissive = material.emissive?.clone();
  material.onBeforeCompile = function(shader, renderer) {
    original.call(this, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'attribute float seasonSeed, leafDetached; varying float vSeasonSeed, vLeafDetached;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeasonSeed = seasonSeed; vLeafDetached = leafDetached;');
    shader.fragmentShader = 'uniform float foliageColor, foliageLoss, foliageBaseLight; uniform vec3 autumnGold, autumnBrown; varying float vSeasonSeed, vLeafDetached;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      if (vLeafDetached > .5 || foliageLoss >= .025 + vSeasonSeed * .95) discard;
      // Colour order and shedding order must differ: otherwise the colourful
      // leaves disappear first and the remaining crown stays misleadingly green.
      float colourSeed = fract(vSeasonSeed * 13.37);
      float autumn = smoothstep(colourSeed * .4, .45 + colourSeed * .55, foliageColor);
      float tone = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)) / foliageBaseLight;
      vec3 tint = mix(autumnGold, autumnBrown, colourSeed * .4 + smoothstep(.8, 1., foliageColor) * .6);
      diffuseColor.rgb = mix(diffuseColor.rgb, tint * tone, autumn);
    `);
  };
  material.customProgramCacheKey = () => 'seasonal-leaves-v3';
  material.needsUpdate = true;
  return {
    detach(index,loss){
      const start=index*verticesPerLeaf;
      if(detached.getX(start)>.5||loss>=.025+seeds[start]*.95)return false;
      for(let i=start;i<start+verticesPerLeaf;i++)detached.setX(i,1);
      detached.needsUpdate=true;return true;
    },
    update(state) {
      const foliage = foliageState(state);
      const season=foliage.color+':'+foliage.loss;
      if(previousSeason!==season){detached.array.fill(0);detached.needsUpdate=true;previousSeason=season;}
      uniforms.foliageColor.value = foliage.color;
      uniforms.foliageLoss.value = foliage.loss;
      if (summerEmissive && summerEmissive.getHex() !== 0) material.emissive.copy(summerEmissive).lerp(uniforms.autumnBrown.value, foliage.color);
      mesh.visible = foliage.loss < 1;
    },
  };
}
