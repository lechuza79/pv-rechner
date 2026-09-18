import SunCalc from './suncalc.cjs';
// Orthographic sphere projection of NASA's LROC map, rendered only when phase changes.
export function createTexturedMoon(parent,{textureUrl='/hero-system/moon-lroc-1k.jpg'}={}){
 const canvas=document.createElement('canvas');canvas.className='night-moon';canvas.width=canvas.height=144;parent.append(canvas);
 const ctx=canvas.getContext('2d');let texture=null,selection='today';
 const image=new Image();let requested=false;canvas.hidden=true;
 function activate(){if(requested)return;requested=true;image.src=textureUrl;}
 image.onload=()=>{const map=document.createElement('canvas');map.width=image.width;map.height=image.height;const g=map.getContext('2d');g.drawImage(image,0,0);texture={pixels:g.getImageData(0,0,map.width,map.height).data,w:map.width,h:map.height};draw();};
 image.onerror=()=>{canvas.hidden=true;canvas.dataset.textureStatus='unavailable';};
 function phase(){return selection==='today'?SunCalc.getMoonIllumination(new Date()).phase:Number(selection);}
 function draw(){
  if(!texture)return;canvas.hidden=false;canvas.dataset.textureStatus='loaded';
  const p=phase(),angle=p*Math.PI*2,lx=Math.sin(angle),lz=-Math.cos(angle),n=canvas.width;
  const output=ctx.createImageData(n,n);canvas.dataset.phase=p.toFixed(4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const nx=(x+.5-n/2)/(n/2-1),ny=-(y+.5-n/2)/(n/2-1),r2=nx*nx+ny*ny;if(r2>=1)continue;
   const nz=Math.sqrt(1-r2),u=.5+Math.atan2(nx,nz)/(2*Math.PI),v=.5-Math.asin(ny)/Math.PI;
   const tx=Math.min(texture.w-1,Math.floor(u*texture.w)),ty=Math.min(texture.h-1,Math.floor(v*texture.h)),src=(ty*texture.w+tx)*4,dst=(y*n+x)*4;
   const incidence=nx*lx+nz*lz;
   // Mild earthshine, subdued at new moon; no relief shadows are inferred from the color map.
   const earthshine=.016+.025*Math.sin(Math.PI*p);
   const light=earthshine+Math.pow(Math.max(0,incidence),.48)*.94;
   for(let c=0;c<3;c++)output.data[dst+c]=Math.min(255,texture.pixels[src+c]*light*1.3);
   output.data[dst+3]=Math.round(Math.min(1,(1-Math.sqrt(r2))*n/2)*255);
  }
  ctx.putImageData(output,0,0);
 }
 const timer=setInterval(()=>{if(selection==='today'&&!document.hidden)draw();},900000);
 return {dispose(){clearInterval(timer);image.onload=null;image.onerror=null;canvas.remove();},setActive(active){if(active)activate();},setPhase(value){selection=value;draw();},describe(){const p=phase(),fraction=(1-Math.cos(2*Math.PI*p))/2;return `${selection==='today'?'Heute · '+new Date().toLocaleDateString('de-DE'):'Vorschau'} · ca. ${Math.round(fraction*100)} % beleuchtet`;}};
}
