import {domToCanvas} from 'modern-screenshot';
let done=false;
window.__scOneShot=()=>{
 if(done)return;
 const button=document.querySelector('.hs-retro-secondary.is-ready');
 const hero=document.querySelector('.hero');
 if(!button||!hero||!document.querySelector('[data-unified-ready="true"]'))return;
 done=true;
 const start=performance.now(),b=button.getBoundingClientRect(),r=hero.getBoundingClientRect();
 const clone=hero.cloneNode(true),originals=[hero,...hero.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 let capturedCanvases=0;
 for(let i=0;i<originals.length;i++){
  const source=originals[i],copy=copies[i],css=getComputedStyle(source);
  for(const key of css)copy.style?.setProperty(key,css.getPropertyValue(key));
  if(copy.style){copy.style.animation='none';copy.style.transition='none';}
  if(source instanceof HTMLCanvasElement){
   const image=document.createElement('img');image.src=source.toDataURL();image.style.cssText=copy.style.cssText;image.className=source.className;copy.replaceWith(image);capturedCanvases++;
  }
 }
 clone.querySelectorAll('.site-header,.hero-copy,.hs-journey,.hs-reading,.hero-bottom,.sc-hero-trust').forEach(e=>e.remove());
 clone.style.position='relative';clone.style.top='0';clone.style.left='0';clone.style.margin='0';clone.style.transform='none';clone.style.width=r.width+'px';clone.style.height=r.height+'px';
 const wrapper=document.createElement('div');wrapper.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none';wrapper.append(clone);document.body.append(wrapper);
 const freezeMs=performance.now()-start;
 domToCanvas(clone,{scale:.5,timeout:3000,
  onCloneEachNode:node=>{if(node.style){node.style.animation='none';node.style.transition='none';}},
 }).then(canvas=>{
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const x=Math.max(0,Math.round((b.left-r.left)*.5)),y=Math.max(0,Math.round((b.top-r.top)*.5));
  const pixels=ctx.getImageData(x,y,Math.round(b.width*.5),Math.round(b.height*.5)).data;
  const lum=[];let opaque=0;
  for(let i=0;i<pixels.length;i+=4){const c=[pixels[i],pixels[i+1],pixels[i+2]].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});lum.push(.2126*c[0]+.7152*c[1]+.0722*c[2]);if(pixels[i+3]===255)opaque++;}
  lum.sort((a,b)=>a-b);
  button.dataset.oneShot=JSON.stringify({freezeMs,totalMs:performance.now()-start,opaqueFraction:opaque/lum.length,luminance10:lum[Math.floor(lum.length*.1)],luminance50:lum[Math.floor(lum.length*.5)],luminance90:lum[Math.floor(lum.length*.9)],capturedCanvases,viewport:[innerWidth,innerHeight],button:{x,y,w:b.width*.5,h:b.height*.5}});
  const img=document.createElement('img');img.id='sc-one-shot-reference';img.hidden=true;img.src=canvas.toDataURL();document.body.append(img);
 }).catch(error=>{button.dataset.oneShot=JSON.stringify({error:String(error),freezeMs});}).finally(()=>wrapper.remove());
};
const run=window.__scOneShot;
window.__scOneShot=()=>{try{run();}catch(error){document.documentElement.dataset.oneShotError=String(error);}};
