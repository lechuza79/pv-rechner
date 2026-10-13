import {isAdminSession} from '../../../../lib/admin-guard';
import Link from 'next/link';
import {galleryPlace} from '../../../../lib/widget-gallery-place';
import {curatedGalleryEntries} from '../../../../lib/widget-gallery';
import {ladeGemeindePaket} from '../../../../lib/gemeinde-paket-server';
import type {StoryConcept} from '../../../../lib/story-konzepte';
import {storyWidgetTemplates,selectWidgetStory} from '../../../../lib/story-widget-selection';
import StoryWidget from '../../../../components/dashboard/StoryWidget';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import WidgetDashboard from '../../../../components/dashboard/WidgetDashboard';
import {prepareWidgetDashboard} from '../../../../components/dashboard/WidgetDashboard.server';
import type {DashboardSection} from '../../../../lib/widget-dashboard';
import styles from '../gallery.module.css';
export const metadata={title:'Storyansicht und Story-Widgets',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{ags?:string}>}){
 const {ags='06440016'}=await searchParams;
 if(!/^\d{8}$/.test(ags))return <p>Keine gültige Gemeinde angegeben.</p>;
 const data=await ladeGemeindePaket(ags);
 if(!data)return <p>Für diesen Ort liegen keine veröffentlichten Storys vor.</p>;
 const stories=(data.stories??[]) as StoryConcept[];
 const available=storyWidgetTemplates.filter(template=>selectWidgetStory(stories,template.id));
 const missing=storyWidgetTemplates.filter(template=>!selectWidgetStory(stories,template.id));
 const items=available.map(template=>({id:`story-${template.id}`,widgetId:'gemeinde-meldung',src:`/embed/gemeinde-meldung?ags=${ags}&view=single&template=${template.id}&story=${encodeURIComponent(selectWidgetStory(stories,template.id)!.id)}`}));
 const sections:DashboardSection[]=[{id:'story-widgets',title:'Dieselben Visuals einzeln im Grid',root:{id:'story-grid',label:'Story-Widgets',direction:'grid',columns:3,children:available.map(template=>({id:`story-${template.id}`,label:template.name,widgetId:'gemeinde-meldung'}))}}];
 const prepared=await prepareWidgetDashboard(items);
 const place=await galleryPlace(ags);
 const entries=place?curatedGalleryEntries(place).filter(entry=>entry.id==='gemeinde-meldung'):[];
 return <div className={styles.page}><header><h1>Geschichten aus {data.name}</h1><p>Eine gemeinsame Grundlage für Dashboard, Story und reduzierte Hero-Vorschau.</p><Link href="/widget-galerie/layout-referenz">Zur Layoutreferenz</Link></header>
 <WidgetPresentation widgetId="gemeinde-meldung" appearance={{theme:'dark',autoplay:false}}><StoryWidget stories={stories} name={data.name}/></WidgetPresentation>
 {items.length>0&&<WidgetDashboard canSave={await isAdminSession()} entries={entries} sections={sections} {...prepared} initialAppearance={{theme:'dark',autoplay:false}}/>}
 {missing.length>0&&<p>Für {data.name} fehlen veröffentlichte Beispiele für: {missing.map(template=>template.name).join(', ')}. Die Vorlagen werden hier nicht mit Beispieldaten aufgefüllt.</p>}
 </div>;
}
