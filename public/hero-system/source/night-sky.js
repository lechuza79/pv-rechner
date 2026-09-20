import { createTexturedMoon } from './textured-moon.js';
// A stable star field with a strongly skewed brightness distribution, drawn only on resize.
export function createNightSky(scene,assets={}){
 const layer=document.createElement('div');layer.className='night-layer';layer.setAttribute('aria-hidden','true');
 const canvas=document.createElement('canvas');layer.append(canvas);
 const moon=createTexturedMoon(layer,{textureUrl:assets.moonTextureUrl});
 scene.insertBefore(layer,scene.querySelector('.sun-halo'));
 const ctx=canvas.getContext('2d');
 return {dispose(){moon.dispose();layer.remove();},setActive(active){moon.setActive(active);},setMoonPhase(value){moon.setPhase(value);},moonDescription(){return moon.describe();},resize(w,h){
  const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  let seed=971;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const count=Math.round(w*h/3100);
  for(let i=0;i<count;i++){
   const x=random()*w,y=random()*h*.68,power=Math.pow(random(),4);
   const horizon=Math.pow(1-y/(h*.7),1.6),alpha=(.1+power*.7)*horizon;
   const radius=.35+power*.65;
   ctx.fillStyle=`rgba(213,226,245,${alpha})`;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
   if(power>.91){const halo=ctx.createRadialGradient(x,y,0,x,y,2.5);halo.addColorStop(0,`rgba(210,226,250,${alpha*.15})`);halo.addColorStop(1,'rgba(210,226,250,0)');ctx.fillStyle=halo;ctx.fillRect(x-3,y-3,6,6);}
  }
 }};
}
