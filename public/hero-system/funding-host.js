import {mountHeroStage} from './dist/hero-stage.js';
import {sceneState,validateWeather} from './dist/scene-state.js';
import {heroInstances} from './dist/instances.js';

const root=document.querySelector('.solar-page'),stage=root.querySelector('.hero'),scene=stage.querySelector('.scene');
const parentHero=window.frameElement?.closest('[data-sc-hero-presentation]');
let presentationBound=false;
function bindPresentation(){
 if(parentHero&&!presentationBound)presentationBound=window.bindSolarHeroPresentation({root:parentHero,scene,sceneRoot:root,targets:()=>[...parentHero.querySelectorAll('.site-header,[data-sc-contrast]')],offsetTop:()=>window.frameElement.getBoundingClientRect().top});
}
let plz=new URL(location.href).searchParams.get('plz')||'';
let instance,disposed=false,status="loading",revision=0;
const notify=next=>{status=next;parent.postMessage({type:'funding-scene',plz,status,dark:root.dataset.dark==='true'},location.origin);};
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='funding-scene-request')return;
 bindPresentation();
 const next=event.data.plz;
 // Clearing the selection keeps the painted scene until another location is chosen.
 if(typeof next==='string'&&/^\d{5}$/.test(next)&&next!==plz){plz=next;refresh();}
 else notify(status);
});
async function refresh(){
 const request=++revision;
 try{
  const response=await fetch('/scene-data'+(plz?'?plz='+encodeURIComponent(plz):''),{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Weather unavailable');
  const data=await response.json(),weather=validateWeather(data.weather);
  if(disposed||request!==revision)return;
  const state=sceneState(new Date(),data.location,weather);
  if(instance)instance.update({state});
  else instance=mountHeroStage({root,stage,scene,state,...heroInstances.homepage});
  notify(plz?'loaded':'example');
 }catch{if(!disposed&&request===revision)notify('unavailable');}
}
refresh();
const onVisibility=()=>{if(!document.hidden)refresh();};
addEventListener('visibilitychange',onVisibility);
const timer=setInterval(onVisibility,300000);
addEventListener('pagehide',()=>{disposed=true;clearInterval(timer);removeEventListener('visibilitychange',onVisibility);instance?.dispose();});
