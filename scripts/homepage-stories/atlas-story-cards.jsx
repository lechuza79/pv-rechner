import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import MunicipalStoryPreview, {MunicipalStoryModal} from '../../components/gemeinde/GemeindeInsights';
import candidates from './approved-stories.json';
import labels from './thumb-labels.json';

// Preserve the approved homepage selection and ordering, including municipality spacing.
const cards=[];
const cities=new Map();
for(const form of ['anteilsdonut','donut','saeule','anteilsdonut','donut','saeule']){
 const excluded=new Set(cards.slice(-2).map(card=>card.ags));
 if(cards.length===5)excluded.add(cards[0].ags);
 const matching=candidates.filter(card=>card.bild.art===form&&!cards.includes(card)&&!excluded.has(card.ags));
 matching.sort((a,b)=>(cities.get(a.ags)??0)-(cities.get(b.ags)??0));
 const selected=matching[0];
 if(selected){cards.push(selected);cities.set(selected.ags,(cities.get(selected.ags)??0)+1);}
}
const stories=cards.map(card=>({...card.story,thumbLabel:labels[card.story.id]??card.story.title}));
function HomepageStories(){
 const [selected,setSelected]=useState(()=>{
  const id=new URLSearchParams(location.search).get('story');
  const index=candidates.findIndex(card=>card.story.id===id);
  return index<0?null:index;
 });
 const local=selected===null?[]:candidates.filter(card=>card.ags===candidates[selected].ags).map(card=>card.story);
 const initial=selected===null?0:local.findIndex(story=>story.id===candidates[selected].story.id);
 return <>
  <MunicipalStoryPreview stories={stories} name="Dein Ort" surfaceScheme="light" visualScheme="light" showHeader={false} showDate={false} showTown paused={selected!==null} onStoryOpen={story=>setSelected(candidates.findIndex(card=>card.story.id===story.id))}/>
  <figcaption className="av-story-source">Quelle: <a href="https://www.marktstammdatenregister.de/MaStR/Datendownload" target="_blank" rel="noreferrer">Bundesnetzagentur · Marktstammdatenregister</a></figcaption>
  {selected!==null&&<MunicipalStoryModal key={candidates[selected].ags} stories={local} name={candidates[selected].name} initial={initial} surfaceScheme="dark" onClose={()=>setSelected(null)}/>}
 </>;
}
export function mountStoryCards(element){
 const href='/homepage-study/story-dist/shared-story-cards.css';
 if(!document.querySelector(`link[href="${href}"]`)){
  const style=document.createElement('link');style.rel='stylesheet';style.href=href;document.head.append(style);
 }
 createRoot(element).render(<HomepageStories/>);
}
