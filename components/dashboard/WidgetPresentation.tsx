"use client";
import {useEffect,useState} from "react";
import {parseWidgetAppearanceObject,widgetPresentationContract} from "../../lib/widget-appearance";
import {WidgetPresentationProvider} from './WidgetPresentationContext';
import type {ReactNode,CSSProperties} from 'react';
import type {WidgetAppearance} from '../../lib/widget-appearance';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetPresentation.module.css';
import './dashboard.css';

/** Embed presentation adapter: chart data and chart rendering remain unchanged. */
export default function WidgetPresentation({appearance,children,widgetId,variant='full'}:{appearance:WidgetAppearance;children:ReactNode;widgetId?:string;variant?:'full'|'compact'|'hero'}) {
  const contract=widgetId?widgetPresentationContract(widgetId,variant):undefined;
  const [live,setLive]=useState(appearance);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.source!==window.parent||event.origin!==window.location.origin||event.data?.type!=="widget:appearance")return;
      const value=parseWidgetAppearanceObject(event.data.appearance);
      if(value)setLive(value);
    };
    window.addEventListener('message',receive);
    window.parent.postMessage({type:'widget:appearance-request'},window.location.origin);
    return()=>window.removeEventListener('message',receive);
  },[]);
  return <div style={contract?{'--widget-max-width':`${contract.maxWidth}px`,'--widget-compact-max-width':`${contract.maxWidth}px`} as CSSProperties:undefined} data-widget-variant={variant} data-widget-height={contract?.height} className={`${foundation.foundation} sc-dashboard ${styles.presentation}`} data-story-scheme={live.theme==='hero'?'highlight':live.theme??'dark'} data-widget-layout={live.layout} data-widget-background={live.background===false?'off':'on'}><WidgetPresentationProvider appearance={live}>{children}</WidgetPresentationProvider></div>;
}
