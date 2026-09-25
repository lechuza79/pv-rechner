import {solarLight} from './solar-light.js';
// Screen-space optics share the same solar position as the scene lighting.
export function createSunOptics(scene,root){
 const layer=document.createElement('div');layer.className='sun-optics';layer.setAttribute('aria-hidden','true');layer.innerHTML='<div class="optical-veil"></div><div class="optical-ghost"></div>';scene.append(layer);
 const ghost=layer.querySelector('.optical-ghost');
 let previous='';
 return {update(state,style){
  const light=solarLight(state),key=[style,state.phase,light.sun,state.rain,state.cloud,state.sunX,state.sunY].join(':');
  if(key===previous)return;previous=key;
  if(root.dataset.sunStyle!==style)root.dataset.sunStyle=style;
  const warm=state.phase==='dawn'||state.phase==='dusk';root.style.setProperty('--solar-core',warm?'#fff1d2':'#fffff6');
  const visible=light.sun>0&&state.rain<.01;
  const transmission=visible?light.sun*Math.pow(1-state.cloud,2):0;
  layer.style.opacity=style==='flare'?String(transmission):'0';
  // A weak ghost lies across the optical centre, on the sun-to-centre axis.
  ghost.style.left=(50+(50-state.sunX)*.65)+'%';ghost.style.top=(50+(50-state.sunY)*.65)+'%';
 },dispose(){layer.remove();}};
}
