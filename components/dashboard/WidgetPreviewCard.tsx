"use client";
import RaceDataControls from './RaceDataControls';
import {useEffect,useState,type ReactNode} from 'react';
import SecondaryButton from '../SecondaryButton';
import type {DashboardWidgetSelection} from '../../lib/widget-dashboard';
import WidgetEmbedPreview from './WidgetEmbedPreview';
import WidgetSettingsFlyout from './WidgetSettingsFlyout';
import {ControlPanel,ControlField} from '../ControlPanel';
import SelectField from '../SelectField';
import Switch from '../Switch';
import {ResponsiveWidgetComposition,useWidgetHeightBudget} from './WidgetComposition';
import {WIDGET_GRID_SIZES,gridExtent,type WidgetGridSize} from '../../lib/widget-composition';
import {widgetCompositionItem,widgetGridOptions,selectWidgetGridOption,widgetPreviewSource,widgetPresentationSource,widgetConfiguration,widgetPresentationContract,type WidgetAppearance,type WidgetTheme,type WidgetSharing} from '../../lib/widget-appearance';
import type {GalleryEntry} from '../../lib/widget-gallery';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetPreviewCard.module.css';
export default function WidgetPreviewCard({entry,defaults,anchorId,settings,notice,settingsWide,onSettingsClose,settingsModal=false,initialCompact=false,initialPresentation,initialDataSettings={},initialGridSize,initialSource,onApply,applying=false}:{entry:GalleryEntry;initialGridSize?:WidgetGridSize;initialSource?:string;onApply?:(selection:DashboardWidgetSelection)=>void;applying?:boolean;anchorId?:string;settingsModal?:boolean;initialCompact?:boolean;initialPresentation?:'full'|'compact'|'hero';initialDataSettings?:Record<string,string>;defaults?:WidgetAppearance;layout?:'natural'|'group';settings?:ReactNode;notice?:ReactNode;settingsWide?:boolean;onSettingsClose?:()=>void}) {
  const heightBudget=useWidgetHeightBudget();
  const [interactive,setInteractive]=useState(false);
  useEffect(()=>setInteractive(true),[]);
  const [selected,setSelected]=useState(()=>{
    // Open the matching source variant instead of resetting a dashboard to its first place.
    const matches=entry.variants.map((variant,index)=>{
      const params=[...new URL(variant.src,'https://solar-check.io').searchParams];
      return {index,score:params.length&&params.every(([key,value])=>initialDataSettings[key]===value)?params.length:0};
    });
    return matches.sort((a,b)=>b.score-a.score)[0]?.index??0;
  });
  const [initialSelected]=useState(selected);
  const [teaser,setTeaser]=useState(initialPresentation==='hero');
  const [gridSize,setGridSize]=useState<WidgetGridSize>(initialGridSize??(initialCompact?'small':'medium'));
  const [compact,setCompact]=useState(initialCompact&&!!entry.variants[0]?.compactSrc);
  const [raceSource,setRaceSource]=useState<string|undefined>();
  const [dataSettings,setDataSettings]=useState<Record<string,string>>(initialDataSettings);
  const [theme,setTheme]=useState<WidgetTheme|undefined>(undefined);
  const [background,setBackground]=useState<boolean|undefined>(undefined);
  const [autoplay,setAutoplay]=useState<boolean|undefined>();
  const effectiveAutoplay=autoplay??defaults?.autoplay??widgetConfiguration(entry.id)?.autoplayDefault??true;
  const [sharing,setSharing]=useState<WidgetSharing|undefined>();
  const effectiveSharing=sharing??defaults?.sharing??'on';
  const configuration=widgetConfiguration(entry.id);
  const requestedTheme=theme??defaults?.theme??(entry.id==='gemeinde-ranking'?'light':'dark');
  const effectiveTheme=configuration?.themes.includes(requestedTheme)?requestedTheme:configuration?.themes[0]??requestedTheme;
  const effectiveBackground=background??defaults?.background??true;
  const variant=entry.variants[selected]??entry.variants[0];
  const availableOptions=widgetGridOptions(entry.id,!!variant?.compactSrc);
  // Alternate representations without a compact source may still have full grid support.
  const activeOption=variant?.supportsGrid===false?undefined:selectWidgetGridOption(entry.id,gridSize,!!variant?.compactSrc);
  const hasGridFormats=!!activeOption;
  const hasHero=!!variant?.heroSrc;
  const isTeaser=teaser&&hasHero;
  const presentation=isTeaser?'hero':activeOption?.presentation??(compact&&variant?.compactSrc?'compact':'full');
  const contract=widgetPresentationContract(entry.id,presentation);
  const slot=activeOption&&!isTeaser?WIDGET_GRID_SIZES[activeOption.size]:undefined;
  const configurable=!!configuration;
  if(!variant)return null;
  // Appearance travels over the shared channel; only data/variant changes navigate.
  const variantSource=entry.id==='regional-race'&&raceSource?raceSource:initialSource&&selected===initialSelected?widgetPresentationSource(entry.id,initialSource,presentation):isTeaser?variant.heroSrc!:presentation==='compact'&&variant.compactSrc?variant.compactSrc:variant.src;
  const previewSource=configurable?widgetPreviewSource(variantSource):variantSource;
  const previewUrl=new URL(previewSource,'https://preview.local');
  const switchedPresentation=presentation!==(initialPresentation??'full');
  const presentationKeys=new Set(Object.values(configuration?.presentations??{}).flatMap(item=>Object.keys(item.params)));
  for(const field of configuration?.dataSettings??[]){
    const explicit=switchedPresentation&&presentationKeys.has(field.key)?undefined:dataSettings[field.key];
    previewUrl.searchParams.set(field.key,explicit??previewUrl.searchParams.get(field.key)??field.defaultValue);
  }
  // A registered preview describes its omissions; settings must not silently restore them.
  if(isTeaser)for(const [key,value] of Object.entries(contract?.params??{}))previewUrl.searchParams.set(key,value);
  previewUrl.searchParams.set('onsite','1');
  const src=previewUrl.pathname+previewUrl.search;
  const appearance=configurable?{theme:effectiveTheme,background:effectiveBackground,sharing:effectiveSharing,...(slot?{layout:'allocated' as const}:{}),...(configuration?.autoplay?{autoplay:effectiveAutoplay}:{}),}:undefined;
  const controls=(configurable&&<ControlPanel>
    {entry.id==='regional-race'&&<RaceDataControls src={src} onChange={setRaceSource}/>}
    {configuration?.dataSettings?.filter(field=>!isTeaser||!(field.key in (contract?.params??{}))).map(field=>!field.when||field.when.values.includes(dataSettings[field.when.key]??previewUrl.searchParams.get(field.when.key)??configuration.dataSettings?.find(other=>other.key===field.when!.key)?.defaultValue??'')?<ControlField key={field.key} label={field.label}><SelectField disabled={!interactive} ariaLabel={`${field.label} für ${entry.title}`} value={dataSettings[field.key]??previewUrl.searchParams.get(field.key)??field.defaultValue} onChange={event=>setDataSettings(current=>({...current,[field.key]:event.target.value}))}>{field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></ControlField>:null)}
    <ControlField label="Theme" onReset={theme!==undefined?()=>setTheme(undefined):undefined}><SelectField disabled={!interactive} ariaLabel={`Theme für ${entry.title}`} value={effectiveTheme} onChange={e=>setTheme(e.target.value as WidgetTheme)}>{configuration?.themes.map(value=><option key={value} value={value}>{{light:'Hell',dark:'Dunkel',hero:'Hero'}[value]}</option>)}</SelectField></ControlField>
    {configuration?.autoplay&&<ControlField label="Automatisch abspielen" onReset={autoplay!==undefined?()=>setAutoplay(undefined):undefined} toggle={{enabled:effectiveAutoplay,onChange:setAutoplay}}/>}
    {configuration?.background&&<ControlField label="Hintergrundbild" onReset={background!==undefined?()=>setBackground(undefined):undefined} toggle={{enabled:effectiveBackground,onChange:setBackground}}/>}
    {configuration?.sharing&&<ControlField label="Teilen" onReset={sharing!==undefined?()=>setSharing(undefined):undefined} toggle={{enabled:effectiveSharing!=='off',onChange:enabled=>setSharing(enabled?'on':'off')}}>
      {effectiveSharing!=='off'&&<SelectField disabled={!interactive} ariaLabel={`Teilen-Darstellung für ${entry.title}`} value={effectiveSharing==='on'?'secondary':effectiveSharing} onChange={e=>setSharing(e.target.value as WidgetSharing)}><option value="secondary">Secondary · Optionsmenü</option><option value="primary">Primary</option></SelectField>}
    </ControlField>}
  </ControlPanel>);
  const preview=<div style={slot?{height:'100%'}:contract?{maxWidth:contract.maxWidth}:undefined} className={foundation.foundation} data-story-scheme={effectiveTheme==='hero'?'highlight':effectiveTheme}><WidgetEmbedPreview key={`${src}-${slot?'allocated':'natural'}`} src={src} appearance={appearance} title={entry.title} height={slot?gridExtent(slot.rows):variant.height} allocated={!!slot}/></div>;
  return <article id={anchorId??entry.id} className={styles.card} data-compact={!!configuration?.previewWidth} style={configuration?.previewWidth?{width:configuration.previewWidth,maxWidth:"100%"}:undefined}>
    <header className={styles.caption}><h2>{entry.title}</h2>{!defaults&&entry.placeLabel&&<p>{entry.placeLabel}</p>}</header>
    <div className={styles.toolbar}>
      {(configurable||settings)&&<WidgetSettingsFlyout modal={settingsModal} title={entry.title} wide={settingsWide} onClose={onSettingsClose}>{controls}{settings}{configuration&&<p className={styles.rules}>{configuration.data}<br/>{configuration.period}</p>}</WidgetSettingsFlyout>}
      {hasHero&&<div className={styles.presentationControl}><span>{hasGridFormats?'Grid':'Vollständig'}</span><Switch an={isTeaser} onChange={setTeaser} label={`Hero-/Story-Vorschau für ${entry.title}`} text="Hero / Story"/></div>}
      {hasGridFormats&&!isTeaser&&<SelectField disabled={!interactive||availableOptions.length<2} size="sm" ariaLabel={`Gridgröße für ${entry.title}`} value={activeOption.size} onChange={e=>setGridSize(e.target.value as WidgetGridSize)}>{availableOptions.map(option=><option key={option.size} value={option.size}>{WIDGET_GRID_SIZES[option.size].label}</option>)}</SelectField>}
      {!hasGridFormats&&!hasHero&&variant.compactSrc&&<div className={styles.presentationControl}><span>Vollständig</span><Switch an={compact} onChange={setCompact} label={`Kompakte Darstellung für ${entry.title}`} text="Kompakt"/></div>}
      {entry.variants.length>1&&<SelectField disabled={!interactive} size="sm" maxWidth={200} ariaLabel={`Variante für ${entry.title}`} value={selected} onChange={e=>setSelected(Number(e.target.value))}>{entry.variants.map((v,i)=><option key={v.src} value={i}>{v.label}</option>)}</SelectField>}
    </div>
    {onApply&&<SecondaryButton disabled={applying} onClick={()=>onApply({src,presentation,appearance,gridSize:slot?activeOption?.size:undefined})}>{applying?'Wird übernommen…':'Im Dashboard übernehmen'}</SecondaryButton>}
    {notice}
    {slot?<div style={{width:'100%',maxWidth:slot.columns<12?contract?.preferredWidth:contract?.maxWidth}}><ResponsiveWidgetComposition
      item={widgetCompositionItem(entry.id,{presentation,preferredHeight:{fraction:.8,max:gridExtent(slot.rows)}})}
      heightBudget={heightBudget} label={`${entry.title}: ${slot.label}`} render={()=>preview}/></div>:preview}
  </article>;
}
