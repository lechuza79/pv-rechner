"use client";
import {createContext, useContext, type ReactNode} from 'react';
import type {WidgetReferenceData} from '../../lib/widget-reference-data';
import {useWidgetResource} from './WidgetData';
import {useWidgetHost} from './WidgetHost';
const ReferenceContext = createContext<WidgetReferenceData | null>(null);
export const WidgetReferenceDataProvider = ReferenceContext.Provider;
export const useWidgetReferenceData = () => useContext(ReferenceContext);
export const REFERENCE_WIDGETS = new Set(['welt-zubaurennen','welt-stromrennen','laender-strommixrennen','laender-strommix-pro-kopf','zubau-erneuerbare-atom','einspeiseverguetung-verlauf']);
export default function WidgetReferenceDataBoundary({widgetId,children}:{widgetId?:string;children:ReactNode}) {
 const host=useWidgetHost();
 const enabled=REFERENCE_WIDGETS.has(widgetId??'')&&(!!host||process.env.NODE_ENV==='development');
 const {data,error,refetch}=useWidgetResource<WidgetReferenceData|null>(enabled?'/api/widgets/reference-data':null,null);
 if(enabled&&!data)return <p role="status" data-widget-loading={!error}>{error?<>{error} <button onClick={refetch}>Erneut versuchen</button></>:'Vergleichsdaten werden geladen …'}</p>;
 return <ReferenceContext.Provider value={data}>{children}</ReferenceContext.Provider>;
}
