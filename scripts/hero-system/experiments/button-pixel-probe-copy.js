// Temporary, read-only rendering probe. Never changes the button's appearance.
const sample=document.createElement('canvas');sample.width=64;sample.height=12;
const ctx=sample.getContext('2d',{willReadFrequently:true});
let last=0;const measurements=[];
window.__scContrastProbe=(canvas)=>{
 const now=performance.now();if(now-last<250||measurements.length>=40)return;
 const button=document.querySelector('.hs-retro-secondary.is-ready');if(!button)return;
 const b=button.getBoundingClientRect(),r=canvas.getBoundingClientRect();
 if(b.top<0||b.bottom>innerHeight)return;
 last=now;const start=performance.now();
 try{
  ctx.clearRect(0,0,64,12);
  ctx.filter=getComputedStyle(canvas).filter;
  ctx.drawImage(canvas,(b.left-r.left)*canvas.width/r.width,(b.top-r.top)*canvas.height/r.height,b.width*canvas.width/r.width,b.height*canvas.height/r.height,0,0,64,12);
  const pixels=ctx.getImageData(0,0,64,12).data;
  const alpha=[],brightness=[];
  for(let i=0;i<pixels.length;i+=4){alpha.push(pixels[i+3]/255);if(pixels[i+3]>16)brightness.push((pixels[i]+pixels[i+1]+pixels[i+2])/3);}
  const sorted=brightness.sort((a,b)=>a-b);
  measurements.push({ms:performance.now()-start,alpha:alpha.reduce((a,b)=>a+b,0)/alpha.length,covered:alpha.filter(a=>a>.1).length/alpha.length,rgb10:sorted[Math.floor(sorted.length*.1)],rgb90:sorted[Math.floor(sorted.length*.9)],width:b.width,height:b.height,viewport:[innerWidth,innerHeight]});
  button.dataset.pixelProbe=JSON.stringify({count:measurements.length,last:measurements.at(-1),medianMs:[...measurements].map(m=>m.ms).sort((a,b)=>a-b)[Math.floor(measurements.length/2)],maxMs:Math.max(...measurements.map(m=>m.ms))});
 }catch(error){button.dataset.pixelProbe=JSON.stringify({error:String(error)});}
};
