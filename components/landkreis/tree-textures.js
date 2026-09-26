import * as THREE from 'three';

// Adapter for pinned EZ Tree 1.1.0: preserve its alpha masks, load only used leaves.
const textures = new Map();
export function getLeafTexture(type) {
  if (!['ash', 'pine'].includes(type)) throw new Error(`Unsupported district leaf: ${type}`);
  if (!textures.has(type)) {
    const texture = new THREE.TextureLoader().load(`/landkreis/trees/${type}.png`);
    texture.premultiplyAlpha = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.set(type, texture);
  }
  return textures.get(type);
}
export function getBarkTexture() {
  throw new Error('District trees use untextured bark');
}
