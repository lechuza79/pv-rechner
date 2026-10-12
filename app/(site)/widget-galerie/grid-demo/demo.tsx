'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ResponsiveWidgetComposition,useWidgetHeightBudget} from '../../../../components/dashboard/WidgetComposition';
import WidgetEmbedPreview from '../../../../components/dashboard/WidgetEmbedPreview';
import {WidgetSetting} from '../../../../components/dashboard/WidgetSetting';
import DataSourcesSection from '../../../../components/DataSourcesSection';
import {DataSourceNote} from '../../../../components/PoweredBy';
import {WIDGETS} from '../../../../lib/widget-registry';
import {widgetCompositionItem,widgetPresentationContract,type WidgetTheme} from '../../../../lib/widget-appearance';
import {curatedGalleryEntries} from '../../../../lib/widget-gallery';
import type {CompositionItem} from '../../../../lib/widget-composition';
import gallery from '../gallery.module.css';
import styles from './demo.module.css';

const entries=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'});
const charts=[
 {id:'cost',widgetId:'pv-kostenrennen',presentation:'full',fraction:.72,max:680,grow:1.4},
 {id:'radial',widgetId:'stromhandel',presentation:'compact',fraction:.4,max:360,grow:0},
 {id:'bars',widgetId:'stromhandel',presentation:'compact',period:'seven',fraction:.34,max:320,grow:1},
 {id:'stats',widgetId:'regional-basic-stats',presentation:'full',grow:0},
] as const;
function chartItem(id:typeof charts[number]['id']):CompositionItem{
 const chart=charts.find(item=>item.id===id)!;
 return widgetCompositionItem(chart.widgetId,{id,presentation:chart.presentation,grow:chart.grow,
  ...('fraction' in chart?{preferredHeight:{fraction:chart.fraction,max:chart.max}}:{})});
}
const composition:CompositionItem={id:'overview',kind:'group',direction:'row',children:[
 {id:'chart-group',kind:'group',direction:'row',grow:1,children:[chartItem('cost'),
  {id:'trade-group',kind:'group',direction:'column',grow:1,children:[chartItem('radial'),chartItem('bars')]},
 ]},chartItem('stats'),
]};

export default function GridDemo(){
 const [theme,setTheme]=useState<WidgetTheme>('dark');
 const [autoplay,setAutoplay]=useState(true);
 const heightBudget=useWidgetHeightBudget();
 const render=(id:string)=>{
  const chart=charts.find(item=>item.id===id)!;
  const entry=entries.find(entry=>entry.id===chart.widgetId)!;
  const variant=entry.variants[0];
  const url=new URL(chart.presentation==='compact'?variant.compactSrc!:variant.src,'https://preview.local');
  if('period' in chart)url.searchParams.set('period',chart.period);
  const allocated=widgetPresentationContract(chart.widgetId,chart.presentation)?.supportsAllocation===true;
  return <WidgetEmbedPreview src={url.pathname+url.search} title={entry.title} height={variant.height} allocated={allocated}
   appearance={{theme,autoplay,...(allocated?{layout:'allocated' as const}:{})}}/>;
 };
 return <div className={`${gallery.page} ${styles.page}`}>
  <header><Link href="/widget-galerie">Widgetgalerie</Link><h1>Charts gemeinsam anordnen</h1>
   <p>Stromkosten und Stromhandel bilden eine verschachtelte Chartgruppe. Daneben steht der vollständige Kennzahlenblock für Nidda. Auf schmalen Flächen ordnen sich die Gruppen untereinander an.</p>
   <div className={styles.controls}>
    <WidgetSetting label="Farbschema" value={theme} onChange={value=>setTheme(value as WidgetTheme)} options={[{value:'dark',label:'Dunkel'},{value:'light',label:'Hell'},{value:'hero',label:'Hervorgehoben'}]}/>
    <WidgetSetting label="Animationen" value={autoplay?'on':'off'} onChange={value=>setAutoplay(value==='on')} options={[{value:'on',label:'Automatisch abspielen'},{value:'off',label:'Angehalten'}]}/>
   </div>
  </header>
  <ResponsiveWidgetComposition item={composition} heightBudget={heightBudget} render={render} label="Stromkosten, Stromhandel und Bestand"/>
  <DataSourcesSection>{[...WIDGETS.kostenrennen.sources,...WIDGETS.electricityTrade.sources,...WIDGETS.regionalBasicStats.sources].map(source=><div key={source.url}><DataSourceNote source={source}/></div>)}</DataSourcesSection>
 </div>;
}
