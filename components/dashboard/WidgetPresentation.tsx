"use client";
import {useEffect,useState} from "react";
import {parseWidgetAppearanceObject} from "../../lib/widget-appearance";
import {WidgetPresentationProvider} from './WidgetPresentationContext';
import type {ReactNode} from 'react';
import type {WidgetAppearance} from '../../lib/widget-appearance';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetPresentation.module.css';

/** Embed presentation adapter: chart data and chart rendering remain unchanged. */
export default function WidgetPresentation({appearance,children}:{appearance:WidgetAppearance;children:ReactNode}) {
  const [live,setLive]=useState(appearance);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.source!==window.parent||event.origin!==window.location.origin||event.data?.type!=="widget:appearance")return;
      const value=parseWidgetAppearanceObject(event.data.appearance);
      if(value)setLive({...value, partner: appearance.partner});
    };
    window.addEventListener('message',receive);
    window.parent.postMessage({type:'widget:appearance-request'},window.location.origin);
    return()=>window.removeEventListener('message',receive);
  },[]);
  return <div className={`${foundation.foundation} ${styles.presentation}`} data-story-scheme={live.theme==='hero'?'highlight':live.theme??'dark'} data-widget-layout={live.layout} data-widget-background={live.background===false?'off':'on'}><WidgetPresentationProvider appearance={live}>{children}</WidgetPresentationProvider></div>;
}
