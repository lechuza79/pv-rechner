import * as THREE from 'three';

// Stylised silhouettes and palettes, not botanical tree models.
export const treeSpecies = {
  linden: {green: 0x789044, gold: 0xeac752, late: 0xc59532},
  maple: {green: 0x69854c, gold: 0xeab544, late: 0xce662d},
};
export function leafOutline(species) {
  return species === 'linden'
    ? [[0,-.32],[-.16,-.48],[-.36,-.43],[-.49,-.24],[-.5,-.02],[-.37,.22],[-.14,.43],[0,.64],[.12,.42],[.36,.23],[.5,-.03],[.47,-.25],[.32,-.43],[.14,-.46]]
    : [[0,-.47],[-.15,-.37],[-.28,-.39],[-.24,-.16],[-.5,-.09],[-.42,.03],[-.56,.26],[-.32,.24],[-.24,.12],[-.27,.42],[-.13,.33],[0,.65],[.13,.33],[.27,.42],[.24,.12],[.32,.24],[.56,.26],[.42,.03],[.5,-.09],[.24,-.16],[.28,-.39],[.15,-.37]];
}
export function createLeafGeometry(species) {
  const points=leafOutline(species),shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
  const geometry=new THREE.ShapeGeometry(shape),position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i);
    position.setZ(i,Math.abs(x)*.12+Math.sin((y+.5)*Math.PI)*.035);
    uv.setXY(i,(x+.65)/1.3,(y+.65)/1.3);
  }
  geometry.computeVertexNormals();return geometry;
}
export function createLeafTexture(species) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),points=leafOutline(species);
  ctx.translate(64,64);ctx.scale(128/1.3,-128/1.3);
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  const gradient=ctx.createLinearGradient(-.6,0,.6,0);gradient.addColorStop(0,'#bfc3b9');gradient.addColorStop(.48,'#fafbed');gradient.addColorStop(1,'#c9cbbb');
  ctx.fillStyle=gradient;ctx.fillRect(-.65,-.65,1.3,1.3);
  ctx.strokeStyle='#8c967c';ctx.lineWidth=.008;ctx.beginPath();ctx.moveTo(0,-.48);ctx.lineTo(0,.6);
  for(let i=0;i<6;i++){const y=-.28+i*.12;for(const sign of [-1,1]){ctx.moveTo(0,y);ctx.lineTo(sign*(.43-i*.045),y+.16);}}
  ctx.stroke();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function treeOptions(base, species, index) {
  const p=structuredClone(base);p.seed=26867+index*91;p.bark.textured=false;p.bark.tint=0x627269;
  p.branch.children={0:12,1:4,2:3};p.branch.start[1]=.32;
  p.branch.angle[1]=species==='maple'?58:43;p.branch.angle[2]=60;
  p.branch.length[0]=species==='maple'?21:24;p.branch.length[1]=species==='maple'?15:13;
  p.branch.sections={0:8,1:7,2:5,3:3};p.branch.segments={0:6,1:4,2:3,3:3};
  p.leaves.count=26;p.leaves.size=2.8;p.leaves.sizeVariance=.45;p.leaves.tint=treeSpecies[species].green;
  return p;
}
