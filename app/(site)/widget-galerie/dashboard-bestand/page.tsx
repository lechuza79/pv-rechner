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
export default async function Page({searchParams}:{searchParams:Promise<{gruppe?:string;varianten?:string;seite?:string}>}){
 const {gruppe,varianten,seite}=await searchParams;
 const place={ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'};
 const entries=curatedGalleryEntries(place).filter(entry=>entry.variants.length&&(!gruppe||entry.group===gruppe));
 const labels:Record<string,string>={comparison:'Orte vergleichen',regional:'Energie vor Ort',energy:'Energiedaten',cost:'Kosten vergleichen',microcharts:'Kleine Ergänzungen'};
 const items=entries.flatMap(entry=>entry.variants.flatMap((variant,index)=>{
  const sources=varianten==='alle'?[variant.src,variant.compactSrc,variant.heroSrc].filter((src):src is string=>!!src):index===0?[variant.src]:[];
  return [...new Set(sources)].map((src,i)=>({id:`${entry.id}-${index}-${i}`,widgetId:entry.id,src,label:entry.title,group:entry.group,presentation:widgetVariantFromQuery(entry.id,new URL(src,'https://solar-check.io').searchParams)}));
 }));
 // The inventory is a browsing tool, not a stress dashboard: mount a bounded page.
 const pageSize=8;
 const pageCount=Math.max(1,Math.ceil(items.length/pageSize));
 const requestedPage=Number(seite);
 const page=Number.isSafeInteger(requestedPage)?Math.min(pageCount,Math.max(1,requestedPage)):1;
 const visibleItems=items.slice((page-1)*pageSize,page*pageSize);
 const groups=[...new Set(visibleItems.map(item=>item.group))];
 const pageUrl=(target:number,all=varianten==='alle')=>{
  const query=new URLSearchParams();
  if(gruppe)query.set('gruppe',gruppe);
  if(all)query.set('varianten','alle');
  query.set('seite',String(target));
  return `?${query}`;
 };
 const pagination=<nav aria-label="Bestand durchblättern" className={styles.filters}>
  {page>1&&<Link prefetch={false} href={pageUrl(page-1)}>Vorherige Seite</Link>}
  <span>Seite {page} von {pageCount} · {visibleItems.length} von {items.length} Ansichten</span>
  {page<pageCount&&<Link prefetch={false} href={pageUrl(page+1)}>Nächste Seite</Link>}
 </nav>;
 const sections:DashboardSection[]=groups.map(group=>({id:group,title:labels[group],root:{id:group,label:labels[group],direction:'grid',columns:3,children:visibleItems.filter(item=>item.group===group).map(({id,label,widgetId,presentation})=>({id,label,widgetId,presentation}))}}));
 const prepared=await prepareWidgetDashboard(visibleItems);
 const ids=new Set(entries.map(entry=>entry.id));
 const sources=[...new Map(allWidgets().filter(widget=>ids.has(widget.id)).flatMap(widget=>widget.sources).map(source=>[source.url,source])).values()];
 return <div className={styles.page}><header><h1>Bestehende Widgets im gemeinsamen Dashboard</h1><p>{entries.length} Widgets mit denselben Daten-, Größen- und Exportregeln.</p><Link prefetch={false} href={pageUrl(1,true)}>Alle vorhandenen Varianten</Link> · <Link href="/widget-galerie/layout-referenz">Zur Layoutreferenz</Link></header>{pagination}<WidgetDashboard key={`${gruppe??'all'}-${varianten??'default'}-${page}`} canSave={await isAdminSession()} entries={entries} sections={sections} {...prepared} initialAppearance={{theme:'dark',autoplay:false}}/>{pagination}<DataSourcesSection>{sources.map(source=><div key={source.url}><DataSourceNote source={source}/></div>)}</DataSourcesSection></div>;
}
