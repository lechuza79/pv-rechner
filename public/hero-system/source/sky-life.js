// Eight flight families, shuffled without replacement and varied for every passage.
const paths = [
 [[-.05,.48],[.25,.38],[.7,.58],[1.05,.43]],
 [[1.05,.57],[.7,.39],[.35,.62],[-.05,.48]],
 [[-.05,.66],[.18,.64],[.48,.28],[1.05,.32]],
 [[1.05,.3],[.65,.35],[.45,.63],[-.05,.7]],
 [[-.05,.35],[.8,.25],[.12,.63],[1.05,.53]],
 [[1.05,.7],[.3,.75],[.85,.35],[-.05,.42]],
 [[-.05,.56],[.82,.35],[.65,.68],[-.05,.72]],
 [[1.05,.4],[.05,.56],[.3,.24],[1.05,.32]],
];
export function createSkyLife(scene, root) {
 const layer=document.createElement('div');layer.className='sky-life';layer.setAttribute('aria-hidden','true');
 const fly=document.createElement('div');fly.className='passing-fly';layer.append(fly);
 scene.insertBefore(layer,scene.querySelector('.panel-layer'));
 let bag=[],previous=-1,next=8,flight=null;
 function begin(time){
  if(!bag.length){
   bag=paths.map((_,i)=>i);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag[bag.length-1]===previous)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
  }
  const index=bag.pop();previous=index;
  const offset=(Math.random()-.5)*.1;
  flight={start:time,duration:2.4+Math.random()*2.7,path:paths[index].map(([x,y])=>[x,y+offset]),phase:Math.random()*6.28,scale:.65+Math.random()*.65,opacity:.4+Math.random()*.35,jitter:2+Math.random()*6};
  fly.dataset.flightVariant=String(index+1);
 }
 function render(time,enabled){
  const clear=enabled&&root.dataset.weather==='sun'&&root.dataset.mode!=='night';
  layer.hidden=!clear;
  if(!clear){flight=null;next=time+8;return;}
  if(!flight&&time>=next)begin(time);
  fly.style.display=flight?'block':'none';if(!flight)return;
  const t=(time-flight.start)/flight.duration;
  if(t>=1){flight=null;next=time+18+Math.random()*37;fly.style.display='none';return;}
  const u=1-t,p=flight.path,w=scene.clientWidth,h=scene.clientHeight;
  const x=(u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0])*w;
  const y=(u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1])*h+Math.sin(t*19+flight.phase)*flight.jitter*Math.sin(t*Math.PI);
  fly.style.transform=`translate(${x}px,${y}px) scale(${flight.scale*(.8+Math.sin(t*Math.PI)*.2)})`;
  fly.style.opacity=Math.min(1,t*12,(1-t)*12)*flight.opacity;
 }
 return {render,showFly(time){begin(time);}};
}
