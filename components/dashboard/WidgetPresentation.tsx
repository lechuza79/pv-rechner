"use client";
import {useWidgetHost} from './WidgetHost';
import WidgetReferenceDataBoundary from './WidgetReferenceData';
import {useEffect,useState} from "react";
import {parseWidgetAppearance,parseWidgetAppearanceObject,widgetConfiguration,widgetPresentationContract,widgetVariantFromQuery} from "../../lib/widget-appearance";
import {WidgetPresentationProvider} from './WidgetPresentationContext';
import type {ReactNode,CSSProperties} from 'react';
import type {WidgetAppearance} from '../../lib/widget-appearance';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetPresentation.module.css';
import './dashboard.css';

/** Embed presentation adapter: chart data and chart rendering remain unchanged. */
export default function WidgetPresentation({appearance,children,widgetId,variant}:{appearance?:WidgetAppearance;children:ReactNode;widgetId?:string;variant?:'full'|'compact'|'hero'}) {
  const host=useWidgetHost();
  const [queryVariant,setQueryVariant]=useState<'full'|'compact'|'hero'>('full');
  // Controlled hosts may switch a mounted instance without remounting it.
  const selectedVariant=variant??(host&&widgetId?widgetVariantFromQuery(widgetId,new URLSearchParams(host.query)):queryVariant);
  const contract=widgetId?widgetPresentationContract(widgetId,selectedVariant):undefined;
  const [live,setLive]=useState<WidgetAppearance>(appearance??{});
  useEffect(()=>{
    if(host)return;
    const query=new URLSearchParams(window.location.search);
    if(!appearance)setLive(parseWidgetAppearance(Object.fromEntries(query)));
    if(!variant&&widgetId)setQueryVariant(widgetVariantFromQuery(widgetId,query));
  },[appearance,variant,widgetId,host]);
  useEffect(()=>{
    if(host)return;
    const receive=(event:MessageEvent)=>{
      if(event.source!==window.parent||event.origin!==window.location.origin||event.data?.type!=="widget:appearance")return;
      const value=parseWidgetAppearanceObject(event.data.appearance);
      if(value)setLive(value);
    };
    window.addEventListener('message',receive);
    window.parent.postMessage({type:'widget:appearance-request'},window.location.origin);
    return()=>window.removeEventListener('message',receive);
  },[!!host]);
  const configured=host?{...live,...host.appearance}:live;
  const themes=widgetId?widgetConfiguration(widgetId)?.themes:undefined;
  const supported={...configured,...(configured.theme&&themes&&!themes.includes(configured.theme)?{theme:themes[0]}:{})};
  const effective=supported.layout==='allocated'&&contract&&!contract.supportsAllocation?{...supported,layout:undefined}:supported;
  return <div style={contract?{'--widget-max-width':`${contract.maxWidth}px`,'--widget-compact-max-width':`${contract.maxWidth}px`} as CSSProperties:undefined} data-widget-host={host?'dashboard':'embed'} data-widget-palette={effective.theme?'shared':'legacy'} data-widget-family={contract?.family} data-widget-variant={selectedVariant} data-widget-height={contract?.height} className={`${foundation.foundation} sc-dashboard ${styles.presentation}`} data-story-scheme={effective.theme==='hero'?'highlight':effective.theme??'light'} data-widget-layout={effective.layout} data-widget-background={effective.background===false?'off':'on'}><WidgetPresentationProvider appearance={effective}><WidgetReferenceDataBoundary widgetId={widgetId}>{children}</WidgetReferenceDataBoundary></WidgetPresentationProvider></div>;
}
