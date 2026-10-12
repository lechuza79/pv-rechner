import {isAdminSession} from '../../../../lib/admin-guard';
import Link from 'next/link';
import DataSourcesSection from '../../../../components/DataSourcesSection';
import {DataSourceNote} from '../../../../components/PoweredBy';
import {widgetVariantFromQuery} from '../../../../lib/widget-appearance';
import {allWidgets} from '../../../../lib/widget-registry';
import {curatedGalleryEntries} from '../../../../lib/widget-gallery';
import {prepareWidgetDashboard} from '../../../../components/dashboard/WidgetDashboard.server';
import WidgetDashboard from '../../../../components/dashboard/WidgetDashboard';
import type {DashboardSection} from '../../../../lib/widget-dashboard';
import styles from '../gallery.module.css';
export const metadata={title:'Widget-Bestand im Dashboard',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{gruppe?:string;varianten?:string}>}){
 const {gruppe,varianten}=await searchParams;
 const place={ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'};
 const entries=curatedGalleryEntries(place).filter(entry=>entry.variants.length&&(!gruppe||entry.group===gruppe));
 const groups=[...new Set(entries.map(entry=>entry.group))];
 const labels:Record<string,string>={comparison:'Orte vergleichen',regional:'Energie vor Ort',energy:'Energiedaten',cost:'Kosten vergleichen',microcharts:'Kleine Ergänzungen'};
 const items=entries.flatMap(entry=>entry.variants.flatMap((variant,index)=>{
  const sources=varianten==='alle'?[variant.src,variant.compactSrc,variant.heroSrc].filter((src):src is string=>!!src):index===0?[variant.src]:[];
  return [...new Set(sources)].map((src,i)=>({id:`${entry.id}-${index}-${i}`,widgetId:entry.id,src,label:entry.title,group:entry.group,presentation:widgetVariantFromQuery(entry.id,new URL(src,'https://solar-check.io').searchParams)}));
 }));
 const sections:DashboardSection[]=groups.map(group=>({id:group,title:labels[group],root:{id:group,label:labels[group],direction:'grid',columns:3,children:items.filter(item=>item.group===group).map(({id,label,widgetId,presentation})=>({id,label,widgetId,presentation}))}}));
 const prepared=await prepareWidgetDashboard(items);
 const ids=new Set(entries.map(entry=>entry.id));
 const sources=[...new Map(allWidgets().filter(widget=>ids.has(widget.id)).flatMap(widget=>widget.sources).map(source=>[source.url,source])).values()];
 return <div className={styles.page}><header><h1>Bestehende Widgets im gemeinsamen Dashboard</h1><p>{entries.length} Widgets mit denselben Daten-, Größen- und Exportregeln.</p><Link href="?varianten=alle">Alle vorhandenen Varianten</Link> · <Link href="/widget-galerie/layout-referenz">Zur Layoutreferenz</Link></header><WidgetDashboard canSave={await isAdminSession()} entries={entries} sections={sections} {...prepared} initialAppearance={{theme:'dark',autoplay:false}}/><DataSourcesSection>{sources.map(source=><div key={source.url}><DataSourceNote source={source}/></div>)}</DataSourcesSection></div>;
}
