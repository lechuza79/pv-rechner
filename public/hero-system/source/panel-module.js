import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Shared roof/ground-array module: dimensions in metres.
export function createPanelModule(renderer,{overview=false}={}){
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
 // Millimetre corner rounding is invisible in landscape shots. Preserve the
 // same module, dimensions and materials with twelve frame triangles there.
 const geometry=overview?new THREE.BoxGeometry(1.76*moduleScale,.035,1.14*moduleScale):new RoundedBoxGeometry(1.76*moduleScale,.035,1.14*moduleScale,2,.003),glassGeometry=new THREE.PlaneGeometry(1.735*moduleScale,1.115*moduleScale);glassGeometry.rotateX(-Math.PI/2);
 texture.center.set(.5,.5);texture.rotation=Math.PI/2;
 return {texture,roughnessMap,glass,aluminum,backing,geometry,glassGeometry,moduleScale,rand};
}
