"use client";
import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {IconChevronLeft, IconChevronRight} from '../Icons';
import styles from './WidgetControls.module.css';

/** A single responsive row; controls wrap only when their intrinsic widths require it. */
export function WidgetToolbar({children}:{children:ReactNode}) {
 return <div className={styles.toolbar}>{children}</div>;
}

/** One segmented shell for a native selection or a clickable current value. */
export function WidgetStepper({label,children,onPrevious,onNext,previousDisabled=false,nextDisabled=false,previousLabel='Vorheriger Zeitraum',nextLabel='Nächster Zeitraum',size='sm'}:{label:string;children:ReactNode;onPrevious:()=>void;onNext:()=>void;previousDisabled?:boolean;nextDisabled?:boolean;previousLabel?:string;nextLabel?:string;size?:'sm'|'md'}) {
 return <div className={styles.stepper} data-size={size} role="group" aria-label={label}>
  <button type="button" aria-label={previousLabel} disabled={previousDisabled} onClick={onPrevious}><IconChevronLeft size={16}/></button>
  <div className={styles.value}>{children}</div>
  <button type="button" aria-label={nextLabel} disabled={nextDisabled} onClick={onNext}><IconChevronRight size={16}/></button>
 </div>;
}

/** Playback and reset use the same standalone control geometry. */
export function WidgetIconButton({label,children,size='sm',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'aria-label'|'className'|'children'> & {label:string;children:ReactNode;size?:'sm'|'md'}) {
 return <button {...props} type="button" aria-label={label} className={styles.iconButton} data-size={size}>{children}</button>;
}

/** Calendar labels never identify an arbitrary selected date as the peak day. */
export function widgetDayLabel(date:string,peakDate:string,showDate:boolean,formatDate:(date:string)=>string) {
 return date===peakDate&&!showDate?'Bester Tag':formatDate(date);
}

/** Quick presets share the same theme and geometry as the adjacent stepper. */
export function WidgetPresetButtons({label,value,options,onChange}:{label:string;value:string;options:ReadonlyArray<{value:string;label:string}>;onChange:(value:string)=>void}) {
 return <div className={styles.presets} role="group" aria-label={label}>{options.map(option=><button key={option.value} type="button" aria-pressed={value===option.value} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>;
}
