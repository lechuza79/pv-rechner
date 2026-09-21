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
  const gl=canvas.getContext('webgl2');
  const x=Math.max(0,Math.floor((b.left-r.left)*canvas.width/r.width));
  const y=Math.max(0,Math.floor((r.bottom-b.bottom)*canvas.height/r.height));
  const w=Math.min(canvas.width-x,Math.ceil(b.width*canvas.width/r.width));
  const h=Math.min(canvas.height-y,Math.ceil(b.height*canvas.height/r.height));
  const pixels=new Uint8Array(w*h*4);
  gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const alpha=[],brightness=[];
  for(let i=0;i<pixels.length;i+=64){alpha.push(pixels[i+3]/255);if(pixels[i+3]>16)brightness.push((pixels[i]+pixels[i+1]+pixels[i+2])/3);}
  const sorted=brightness.sort((a,b)=>a-b);
  measurements.push({method:"direct-gpu-region",ms:performance.now()-start,alpha:alpha.reduce((a,b)=>a+b,0)/alpha.length,covered:alpha.filter(a=>a>.1).length/alpha.length,rgb10:sorted[Math.floor(sorted.length*.1)],rgb90:sorted[Math.floor(sorted.length*.9)],width:b.width,height:b.height,viewport:[innerWidth,innerHeight]});
  button.dataset.pixelProbe=JSON.stringify({count:measurements.length,last:measurements.at(-1),medianMs:[...measurements].map(m=>m.ms).sort((a,b)=>a-b)[Math.floor(measurements.length/2)],maxMs:Math.max(...measurements.map(m=>m.ms))});
 }catch(error){button.dataset.pixelProbe=JSON.stringify({error:String(error)});}
};
