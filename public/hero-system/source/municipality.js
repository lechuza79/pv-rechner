import {mountHeroStage} from './hero-stage.js';
import {sceneState,validateWeather} from './scene-state.js';
import {heroInstances} from './instances.js';
const root=document.querySelector('.solar-page'),stage=root.querySelector('.hero'),scene=stage.querySelector('.scene');
stage.querySelectorAll('.hero-copy h1,.hero-description,.atlas-hero-local-nav').forEach(node=>node.setAttribute('data-sc-contrast',''));
const place={name:'Höchberg',plz:'97204',lat:49.7867,lon:9.8819};
let weather={cloud:50,rain:0,wind:0,direction:270,code:3},disposed=false;
const instance=mountHeroStage({root,stage,scene,state:sceneState(new Date(),place,weather),...heroInstances.municipality});
async function refresh(){
 try{const data=await window.atlasWeather.load();if(disposed)return;weather=validateWeather(data.weather);Object.assign(place,data.location);stage.dataset.weatherStatus='loaded';}
 catch{if(disposed)return;stage.dataset.weatherStatus='unavailable';}
 instance.update({state:sceneState(new Date(),place,weather)});
}
refresh();
const timer=setInterval(()=>{if(!document.hidden&&stage.getBoundingClientRect().bottom>0)refresh();},300000);
addEventListener('pagehide',event=>{if(!event.persisted){disposed=true;clearInterval(timer);instance.dispose();}});
