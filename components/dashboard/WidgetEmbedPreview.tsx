"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import AutoHeightIframe from '../AutoHeightIframe';
import SecondaryButton from '../SecondaryButton';
import {onsiteWidgetPreviewSource,type WidgetAppearance} from '../../lib/widget-appearance';
import styles from './WidgetPreviewCard.module.css';
export default function WidgetEmbedPreview({src,title,height,appearance,allocated=false}:{allocated?:boolean;src:string;title:string;height:number;appearance?:WidgetAppearance}) {
  // Seed the server-rendered appearance once; later changes use the live channel.
  const [initialSource]=useState(()=>{
    return onsiteWidgetPreviewSource(src,appearance);
  });
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
  return <div ref={root} className={styles.preview} aria-busy={visible&&!ready} data-ready={ready} style={allocated?{height:"100%",minHeight:0}:undefined}>
    {visible?<AutoHeightIframe key={attempt} src={attempt?`${initialSource}${initialSource.includes("?")?"&":"?"}_previewAttempt=${attempt}`:initialSource} title={title} allocated={allocated} fallbackHeight={height} framed={false} loading="eager" appearance={appearance} onReady={loaded}/>:<div style={{height:allocated?"100%":height}}/>}
    {!ready&&<div className={styles.loading} role="status">
      {slow?<><span>Das Widget braucht länger als erwartet.</span><SecondaryButton onClick={()=>{setReady(false);setSlow(false);setAttempt(n=>n+1)}}>Erneut laden</SecondaryButton></>:<><span className={styles.spinner} aria-hidden="true"/><span>Widget wird geladen …</span></>}
    </div>}
  </div>;
}
