import {bindStageButtons} from '../contrast-sampler.js';
import {solarLight} from './solar-light.js';
import {createSunOptics} from './sun-optics.js';
import {createNightSky} from './night-sky.js';
import {createCinematicDust} from './cinematic-dust.js';
import {createSkyLife} from './sky-life.js';

// The host owns markup, location/data loading, navigation and copy.
// Each mount owns its GPU resources, motion clock and event listeners.
export function mountHeroStage({root,stage,scene,state,quality='auto',motion=true,layout={},assets={},sunStyle='natural',moonPhase='today'}){
 if(!root||!stage||!scene||!state)throw new Error('Hero requires containers and normalized scene state');
 const existing=new Set(scene.children),media=matchMedia('(prefers-reduced-motion: reduce)');
 const sun=createSunOptics(scene,root),night=createNightSky(scene,assets),dust=createCinematicDust(scene,root),life=createSkyLife(scene,root);
 const events=new AbortController();
 const disposeContrast=bindStageButtons(stage,scene);
 let renderer=null,disposed=false,booting=false,failed=false,visible=false,paused=false;
 let raf=0,bootFrame=0,scrollTimer=0,scrolling=false,clock=0,gustEnd=0,last=performance.now(),lastDraw=0,dirty=true;
 let tier=quality==='low'||(quality==='auto'&&stage.clientWidth<700)?'low':'high';
 let frames=0,cpu=0,slowWindows=0,reportAt=performance.now(),current={...state},target={...state};
 root.dataset.heroSystem='';root.dataset.sceneBoot='pending';root.classList.add('unified-sun-motion');
 const halo=scene.querySelector('.sun-halo');
 if(halo){halo.style.left='0';halo.style.top='0';halo.style.transform='translate(calc(var(--sun-offset-x, 0px) - 50%),calc(var(--sun-offset-y, 0px) - 50%))';}
 const canRun=()=>!disposed&&visible&&!document.hidden&&!scrolling;
 const moving=()=>motion&&!paused&&!media.matches&&quality!=='static'&&!failed;
 function stop(){cancelAnimationFrame(raf);raf=0;}
 function wake(){dirty=true;if(canRun()&&!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
 function fallback(){failed=true;root.dataset.sceneBoot='failed';scene.dataset.unifiedReady='false';scene.classList.add('static-scene');stop();wake();}
 async function boot(){
  if(booting||renderer||failed||disposed||quality==='static'||!canRun())return;
  booting=true;
  try{
   const {createUnifiedRenderer}=await import('./unified-renderer.js');
   if(disposed)return;
   const instance=await createUnifiedRenderer(scene,null,fallback,wake,{panels:'3d',foreground:'branch',...layout,stage});
   if(disposed){instance.dispose();return;}
   renderer=instance;root.dataset.sceneBoot='ready';resize();
  }catch{if(!disposed)fallback();}
  finally{booting=false;}
 }
 function scheduleBoot(){cancelAnimationFrame(bootFrame);bootFrame=requestAnimationFrame(()=>{bootFrame=requestAnimationFrame(boot);});}
 function resize(){if(disposed)return;const w=stage.clientWidth,h=stage.clientHeight;renderer?.resize(w,h,tier);night.resize(w,h);dust.resize(w,h);wake();}
 function tick(now){
  raf=0;if(!canRun())return;
  const dt=Math.min((now-last)/1000,.1);last=now;const active=moving();
  root.dataset.moving=String(active);if(active)clock+=dt;
  let settling=false;
  for(const key of ['cloud','rain','wind','sunX','sunY','daylight']){const delta=target[key]-current[key];if(!media.matches&&Math.abs(delta)>.002){current[key]+=delta*(1-Math.exp(-dt*1.4));settling=true;}else current[key]=target[key];}
  current.fog=target.fog;current.cloudLow=target.cloudLow;current.cloudMid=target.cloudMid;current.cloudHigh=target.cloudHigh;current.solarElevation=target.solarElevation;current.phase=target.phase;current.season=target.season;current.direction=target.direction;
  if(now-lastDraw>=1000/30-1||dirty){
   const w=stage.clientWidth,h=stage.clientHeight;
   for(const [key,value] of Object.entries({'--sun-offset-x':w*current.sunX/100+'px','--sun-offset-y':h*current.sunY/100+'px','--sun-x':current.sunX+'%','--sun-y':current.sunY+'%','--sun-alpha':solarLight(current).sun*(1-current.cloud)**2,'--sky-brightness':solarLight(current).sky,'--sky-twilight':solarLight(current).twilight,'--sky-night':solarLight(current).night,'--sky-overcast':current.cloud*.85,'--scene-fog':current.fog||0,'--cloud-low':current.cloudLow??current.cloud,'--cloud-mid':current.cloudMid??current.cloud*.5,'--cloud-high':current.cloudHigh??current.cloud*.25,'--night-visibility':1-current.cloud*.92}))root.style.setProperty(key,String(value));
   sun.update(current,sunStyle);
   const wind=(current.wind*(1+Math.sin(clock*.27)*.25)+(clock<gustEnd?Math.sin((gustEnd-clock)/5*Math.PI)*1.2:0))*current.direction;
   if(quality!=='static'&&!failed){const stats=renderer?.render(clock,current,wind);if(stats){frames++;cpu+=stats.cpu;scene.dataset.drawCalls=String(stats.calls);}}
   dust.render(clock,Math.abs(wind),quality!=='static'&&!failed,current.phase!=='night'&&current.rain<.01&&current.cloud<.6);
   life.render(clock,active&&current.phase!=='night'&&current.rain<.01&&current.cloud<.6);
   window.SolarSceneContrast?.afterFrame(scene);
   lastDraw=now;dirty=false;scene.dataset.renderCount=String(Number(scene.dataset.renderCount||0)+1);
  }
  if(now-reportAt>2500){
   const fps=frames*1000/(now-reportAt);scene.dataset.fps=String(Math.round(fps));scene.dataset.cpuMs=frames?(cpu/frames).toFixed(1):'0';
   slowWindows=quality==='auto'&&active&&fps>0&&fps<23?slowWindows+1:0;
   if(slowWindows>=3&&tier==='high'){tier='low';resize();}
   frames=0;cpu=0;reportAt=now;
  }
  if(active||settling)raf=requestAnimationFrame(tick);
 }
 function update(next={}){
  if(disposed)return;
  if(next.state)target={...next.state};
  if(next.motion!==undefined)motion=next.motion;
  if(next.sunStyle)sunStyle=next.sunStyle;
  if(next.moonPhase!==undefined){moonPhase=next.moonPhase;night.setMoonPhase(moonPhase);}
  if(next.quality){quality=next.quality;tier=quality==='low'||(quality==='auto'&&stage.clientWidth<700)?'low':'high';resize();}
  root.dataset.mode=target.phase!=='night'&&target.cloud>.65?'overcast':target.phase;
  root.dataset.weather=target.rain>.01?'rain':target.cloud>.6?'cloud':'sun';
  root.dataset.rainStudy=target.phase==='night'?'night':target.rain>.01?'rain':'dry';
  root.dataset.phase=target.phase;root.dataset.dark=String(solarLight(target).daylight<.25);
  night.setActive(solarLight(target).night>0);root.dataset.moving=String(moving()&&canRun());
  scene.classList.toggle('static-scene',quality==='static'||failed);
  if(quality==='static')scene.dataset.unifiedReady='false';
  if(quality!=='static')scheduleBoot();wake();
 }
 scene.addEventListener('sc-contrast-request',wake,{signal:events.signal});
 const ro=new ResizeObserver(resize);ro.observe(stage);
 const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;root.dataset.moving=String(moving()&&canRun());if(visible){scheduleBoot();wake();}else stop();});io.observe(stage);
 const listen=(target,name,fn,options={})=>target.addEventListener(name,fn,{...options,signal:events.signal});
 listen(document,'visibilitychange',()=>{root.dataset.moving=String(moving()&&canRun());if(document.hidden)stop();else{scheduleBoot();wake();}});
 listen(media,'change',()=>update());
 listen(window,'scroll',()=>{scrolling=true;const rect=stage.getBoundingClientRect();stage.style.setProperty('--scroll',paused||media.matches?'0':String(Math.max(0,Math.min(1,-rect.top/rect.height))));stop();clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{scrolling=false;scheduleBoot();wake();},140);},{passive:true});
 listen(window,'pageshow',()=>{scheduleBoot();wake();});
 listen(window,'pagehide',event=>{if(event.persisted)stop();else dispose();});
 const button=stage.querySelector('.hero-bottom button'),originalButton=button?.innerHTML;
 if(button)listen(button,'click',()=>{paused=!paused;button.setAttribute('aria-label',paused?'Bewegung fortsetzen':'Bewegung pausieren');button.setAttribute('aria-pressed',String(paused));button.innerHTML=paused?'▶ <span>Fortsetzen</span>':originalButton;update();});
 function dispose(){
  if(disposed)return;disposed=true;disposeContrast();events.abort();stop();cancelAnimationFrame(bootFrame);clearTimeout(scrollTimer);ro.disconnect();io.disconnect();renderer?.dispose();sun.dispose();night.dispose();
  for(const child of [...scene.children])if(!existing.has(child))child.remove();
  root.dataset.moving='false';root.dataset.sceneBoot='disposed';if(button)button.innerHTML=originalButton;
 }
 night.setMoonPhase(moonPhase);update();resize();
 return {update,resize,dispose,triggerGust(){gustEnd=clock+5;wake();},simulateLoss(){renderer?.simulateLoss();},get moonDescription(){return night.moonDescription();}};
}
