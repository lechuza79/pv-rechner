'use client';
import {prepareDashboardSelection} from './WidgetDashboard.actions';
import {applyDashboardSelection,type DashboardWidgetSelection} from '../../lib/widget-dashboard';
import type {WidgetGridSize} from '../../lib/widget-composition';
import {encodeDashboardConfiguration} from '../../lib/widget-dashboard-codec';
import {WidgetErrorBoundary} from './WidgetErrorBoundary';
import EinbettenDialog from '../EinbettenDialog';
import SecondaryButton from '../SecondaryButton';
import Modal,{EmbeddedModalHost} from '../Modal';
import WidgetPreviewCard from './WidgetPreviewCard';
import type {GalleryEntry} from '../../lib/widget-gallery';
import {useState,type ReactNode} from 'react';
import {WidgetDataProvider} from './WidgetData';
import {WidgetHostProvider} from './WidgetHost';
import {ResponsiveWidgetComposition,useWidgetHeightBudget} from './WidgetComposition';
import {WidgetSetting} from './WidgetSetting';
import {widgetDataSourceKey,widgetPresentationContract,type WidgetAppearance} from '../../lib/widget-appearance';
import {dashboardConstraint,dashboardLeaves,type DashboardSection} from '../../lib/widget-dashboard';
import type {WidgetSnapshots} from '../../lib/widget-resource';
import styles from './WidgetDashboard.module.css';
export default function WidgetDashboard({sections,views,queries,snapshots,sources,entries=[],initialAppearance={theme:'dark',autoplay:true},controls=true,variants=true,heightBudget:fixedHeightBudget,canSave=false}:{
 sections:DashboardSection[];views:Record<string,ReactNode>;queries:Record<string,Record<string,string>>;snapshots:WidgetSnapshots;
 canSave?:boolean;entries?:GalleryEntry[];sources?:Record<string,string>;initialAppearance?:WidgetAppearance;controls?:boolean;variants?:boolean;heightBudget?:number;
}){
 const [currentSections,setSections]=useState(sections);
 const [currentSources,setSources]=useState(sources);
 const [currentViews,setViews]=useState(views);
 const [currentQueries,setQueries]=useState(queries);
 const [replacementSnapshots,setReplacementSnapshots]=useState<WidgetSnapshots>(snapshots);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[savedUrl,setSavedUrl]=useState('');
 const heightBudget=useWidgetHeightBudget(fixedHeightBudget);
 const [appearance,setAppearance]=useState(initialAppearance);
 const [arrangement,setArrangement]=useState('recommended');
 const [embedOpen,setEmbedOpen]=useState(false);
 const [variantPreview,setVariantPreview]=useState<{id:string;entry:GalleryEntry;compact:boolean;presentation?:'full'|'compact'|'hero';gridSize?:WidgetGridSize;appearance?:WidgetAppearance;dataSettings:Record<string,string>}|null>(null);
 const configuredSections=currentSections.map(section=>({...section,root:arrangement==='recommended'?section.root:{id:'children' in section.root?section.root.id:section.root.id+'-group',label:section.root.label,direction:arrangement as 'grid'|'column',children:dashboardLeaves(section.root)}}));
 const configuration={version:1 as const,sections:configuredSections,sources:currentSources??{},appearance};
 const config=currentSources?encodeDashboardConfiguration(configuration):'';
 const apply=async(selection:DashboardWidgetSelection)=>{
  if(!variantPreview||!currentSources)return;
  setBusy(true);setStatus('');
  try{
   const next=applyDashboardSelection(configuration,variantPreview.id,selection);
   const widgetId=variantPreview.entry.id;
   if(widgetDataSourceKey(widgetId,selection.src)!==widgetDataSourceKey(widgetId,currentSources[variantPreview.id])){
    const prepared=await prepareDashboardSelection(JSON.stringify(next),variantPreview.id);
    setViews(previous=>({...previous,...prepared.views}));setQueries(previous=>({...previous,...prepared.queries}));
    setReplacementSnapshots(previous=>({...previous,...prepared.snapshots}));
   }
   setSections(next.sections);setSources(next.sources);setArrangement('recommended');
   setVariantPreview(null);setSavedUrl('');setStatus('Auswahl im Dashboard übernommen.');
  }catch(error){console.error('Dashboard selection failed',error);setStatus('Auswahl konnte nicht übernommen werden. Das Dashboard bleibt unverändert.');}finally{setBusy(false);}
 };
 const save=async()=>{
  setBusy(true);setStatus('');setSavedUrl('');
  try{
   const response=await fetch('/api/admin/widget-dashboards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(configuration)});
   const result=await response.json();if(!response.ok)throw new Error(result.error);
   setSavedUrl(result.url);setStatus('Dashboard gespeichert.');
  }catch(error){setStatus(error instanceof Error?error.message:'Speichern fehlgeschlagen.');}finally{setBusy(false);}
 };
 return <WidgetDataProvider snapshots={replacementSnapshots}>
  {controls&&<div className={styles.controls}>
   <WidgetSetting label="Farbschema" value={appearance.theme??'dark'} onChange={theme=>setAppearance(previous=>({...previous,theme:theme as WidgetAppearance['theme']}))} options={[{value:'dark',label:'Dunkel'},{value:'light',label:'Hell'},{value:'hero',label:'Hervorgehoben'}]}/>
   <WidgetSetting label="Animationen" value={appearance.autoplay===false?'off':'on'} onChange={value=>setAppearance(previous=>({...previous,autoplay:value==='on'}))} options={[{value:'on',label:'Automatisch abspielen'},{value:'off',label:'Angehalten'}]}/>
   <WidgetSetting label="Anordnung" value={arrangement} onChange={setArrangement} options={[{value:'recommended',label:'Empfohlene Gruppen'},{value:'grid',label:'Flexibles Spaltenraster'},{value:'column',label:'Untereinander'}]}/>
   {canSave&&<SecondaryButton disabled={busy} onClick={save}>Dashboard speichern</SecondaryButton>}
   {sources&&<SecondaryButton onClick={()=>setEmbedOpen(true)}>Dashboard einbetten</SecondaryButton>}
  </div>}
  {status&&<p role="status">{status}</p>}{savedUrl&&<p><a href={savedUrl}>Gespeichertes Dashboard öffnen</a></p>}
  {configuredSections.map(section=>{
   const leaves=dashboardLeaves(section.root);
   const root=section.root;
   const byId=new Map(leaves.map(leaf=>[leaf.id,leaf]));
   return <section key={section.id} className={styles.section}>
    <h2>{section.title}</h2>{section.description&&<p>{section.description}</p>}
    <ResponsiveWidgetComposition item={dashboardConstraint(root)} heightBudget={heightBudget} label={section.title} render={id=>{
     const leaf=byId.get(id)!;
     const entry=entries.find(entry=>entry.id===leaf.widgetId);
     const allocated=widgetPresentationContract(leaf.widgetId,leaf.presentation)?.supportsAllocation;
     return <div className={styles.slot} data-dashboard-widget={id} data-sizing={allocated?'allocated':'content'}>
      <WidgetHostProvider instanceId={id} query={currentQueries[id]} appearance={{sharing:'on',...appearance,...leaf.appearance,...(allocated?{layout:'allocated'}:{})}}><WidgetErrorBoundary label={leaf.label}>{currentViews[id]??<p role="status">Widget gerade nicht verfügbar</p>}</WidgetErrorBoundary></WidgetHostProvider>
      {variants&&entry&&<button type="button" className={styles.variants} onClick={()=>setVariantPreview({id,entry,compact:leaf.presentation==='compact',presentation:leaf.presentation,gridSize:leaf.gridSize,appearance:leaf.appearance,dataSettings:currentQueries[id]})} aria-label={`Varianten und Einstellungen: ${leaf.label}`} aria-haspopup="dialog">Varianten</button>}
     </div>;
    }}/>
   </section>;
  })}
  {variants&&<><EmbeddedModalHost/><Modal open={!!variantPreview} onClose={()=>setVariantPreview(null)} title="Varianten und Einstellungen" maxWidth={1000} scheme="light">
   {variantPreview&&<WidgetPreviewCard key={variantPreview.id} entry={variantPreview.entry} anchorId={`preview-${variantPreview.id}`} initialCompact={variantPreview.compact} initialPresentation={variantPreview.presentation} initialDataSettings={variantPreview.dataSettings} initialSource={currentSources?.[variantPreview.id]} initialGridSize={variantPreview.gridSize} onApply={apply} applying={busy} settingsModal defaults={{...appearance,...variantPreview.appearance}}/>}
  </Modal></>}
  {sources&&<EinbettenDialog open={embedOpen} onClose={()=>setEmbedOpen(false)} titel="Dashboard" src="/embed/dashboard" params={{config,theme:appearance.theme??'dark',autoplay:appearance.autoplay===false?'off':'on'}} width={1200} height={800} siteUrl="https://solar-check.io" attribution={{path:"/energie-widgets",text:"Datenquelle: Solar Check"}}/>}
 </WidgetDataProvider>;
}
