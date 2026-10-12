'use client';
import {ParentSize} from '@visx/responsive';
import type {ReactNode} from 'react';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';

/** Measure the plot after the shared frame has reserved its real chrome. */
export function ChartViewport({height,children}:{height:number;children:(size:{width:number;height:number})=>ReactNode}) {
 const allocated=useWidgetPresentation().layout==='allocated';
 return <div data-widget-plot="cartesian" style={{width:'100%',height:allocated?'100%':height,minHeight:120,position:'relative',...(allocated?{flex:'1 1 0'}:{})}}>
  <ParentSize>{size=>size.width>0?children({width:size.width,height:allocated?Math.max(120,size.height):height}):null}</ParentSize>
 </div>;
}
