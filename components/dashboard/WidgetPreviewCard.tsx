"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import AutoHeightIframe from '../AutoHeightIframe';
import WidgetSettingsFlyout from './WidgetSettingsFlyout';
import {ControlPanel,ControlField} from '../ControlPanel';
import SecondaryButton from '../SecondaryButton';
import SelectField from '../SelectField';
import {widgetPreviewSource,widgetConfiguration,type WidgetAppearance,type WidgetTheme,type WidgetSharing} from '../../lib/widget-appearance';
import type {GalleryEntry} from '../../lib/widget-gallery';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetPreviewCard.module.css';
function Preview({src,title,height,appearance}:{src:string;title:string;height:number;appearance?:WidgetAppearance}) {
  const root=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(false);
  const [ready,setReady]=useState(false);
  const [slow,setSlow]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const loaded=useCallback(()=>{setReady(true);setSlow(false)},[]);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'350px'});
    if(root.current)observer.observe(root.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(!visible||ready)return;const timer=setTimeout(()=>setSlow(true),20000);return()=>clearTimeout(timer)},[visible,ready,attempt]);
  return <div ref={root} className={styles.preview} aria-busy={visible&&!ready} data-ready={ready}>
    {visible?<AutoHeightIframe key={attempt} src={attempt?`${src}${src.includes("?")?"&":"?"}_previewAttempt=${attempt}`:src} title={title} fallbackHeight={height} framed={false} loading="eager" appearance={appearance} onReady={loaded}/>:<div style={{height}}/>}
    {!ready&&<div className={styles.loading} role="status">
      {slow?<><span>Das Widget braucht länger als erwartet.</span><SecondaryButton onClick={()=>{setReady(false);setSlow(false);setAttempt(n=>n+1)}}>Erneut laden</SecondaryButton></>:<><span className={styles.spinner} aria-hidden="true"/><span>Widget wird geladen …</span></>}
    </div>}
  </div>;
}
export default function WidgetPreviewCard({entry,defaults,settings,notice,settingsWide,onSettingsClose}:{entry:GalleryEntry;defaults?:WidgetAppearance;settings?:ReactNode;notice?:ReactNode;settingsWide?:boolean;onSettingsClose?:()=>void}) {
  const [interactive,setInteractive]=useState(false);
  useEffect(()=>setInteractive(true),[]);
  const [selected,setSelected]=useState(0);
  const [theme,setTheme]=useState<WidgetTheme|undefined>(undefined);
  const [background,setBackground]=useState<boolean|undefined>(undefined);
  const [autoplay,setAutoplay]=useState<boolean|undefined>();
  const effectiveAutoplay=autoplay??defaults?.autoplay??true;
  const [sharing,setSharing]=useState<WidgetSharing|undefined>();
  const effectiveSharing=sharing??defaults?.sharing??'on';
  const configuration=widgetConfiguration(entry.id);
  const effectiveTheme=theme??defaults?.theme??(entry.id==='gemeinde-ranking'?'light':'dark');
  const effectiveBackground=background??defaults?.background??true;
  const configurable=!!configuration;
  const variant=entry.variants[selected]??entry.variants[0];
  if(!variant)return null;
  // Appearance travels over the shared channel; only data/variant changes navigate.
  const previewSource=configurable?widgetPreviewSource(variant.src):variant.src;
  const previewUrl=new URL(previewSource,'https://preview.local');
  previewUrl.searchParams.set('onsite','1');
  const src=previewUrl.pathname+previewUrl.search;
  const appearance=configurable?{theme:effectiveTheme,background:effectiveBackground,sharing:effectiveSharing,...(configuration?.autoplay?{autoplay:effectiveAutoplay}:{}),...(defaults?{layout:'group' as const}:{})}:undefined;
  const controls=(configurable&&<ControlPanel>
    <ControlField label="Theme" onReset={theme!==undefined?()=>setTheme(undefined):undefined}><SelectField disabled={!interactive} ariaLabel={`Theme für ${entry.title}`} value={effectiveTheme} onChange={e=>setTheme(e.target.value as WidgetTheme)}><option value="light">Hell</option><option value="dark">Dunkel</option><option value="hero">Hero</option></SelectField></ControlField>
    {configuration?.autoplay&&<ControlField label="Automatisch abspielen" onReset={autoplay!==undefined?()=>setAutoplay(undefined):undefined} toggle={{enabled:effectiveAutoplay,onChange:setAutoplay}}/>}
    {configuration?.background&&<ControlField label="Hintergrundbild" onReset={background!==undefined?()=>setBackground(undefined):undefined} toggle={{enabled:effectiveBackground,onChange:setBackground}}/>}
    {configuration?.sharing&&<ControlField label="Teilen" onReset={sharing!==undefined?()=>setSharing(undefined):undefined} toggle={{enabled:effectiveSharing!=='off',onChange:enabled=>setSharing(enabled?'on':'off')}}>
      {effectiveSharing!=='off'&&<SelectField disabled={!interactive} ariaLabel={`Teilen-Darstellung für ${entry.title}`} value={effectiveSharing==='on'?'secondary':effectiveSharing} onChange={e=>setSharing(e.target.value as WidgetSharing)}><option value="secondary">Secondary · Optionsmenü</option><option value="primary">Primary</option></SelectField>}
    </ControlField>}
  </ControlPanel>);
  return <article id={entry.id} className={styles.card} data-compact={!!configuration?.previewWidth} style={configuration?.previewWidth?{width:configuration.previewWidth,maxWidth:"100%"}:undefined}>
    <div className={foundation.foundation} data-story-scheme={effectiveTheme==='hero'?'highlight':effectiveTheme}><Preview key={src} src={src} appearance={appearance} title={entry.title} height={defaults?520:variant.height}/></div>
    <div className={styles.caption}><div><h2>{entry.title}</h2>{!defaults&&entry.placeLabel&&<p>{entry.placeLabel}</p>}</div>
      {entry.variants.length>1&&<SelectField disabled={!interactive} size="sm" maxWidth={200} ariaLabel={`Variante für ${entry.title}`} value={selected} onChange={e=>setSelected(Number(e.target.value))}>{entry.variants.map((v,i)=><option key={v.src} value={i}>{v.label}</option>)}</SelectField>}
    </div>
    {notice}{(configurable||settings)&&<WidgetSettingsFlyout title={entry.title} wide={settingsWide} onClose={onSettingsClose}>{controls}{settings}{configuration&&<p className={styles.rules}>{configuration.data}<br/>{configuration.period}</p>}</WidgetSettingsFlyout>}
  </article>;
}
