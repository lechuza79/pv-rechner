"use client";
import {useId,type ReactNode} from 'react';
import SelectField from '../SelectField';
import InfoTooltip from '../InfoTooltip';
import {IconChevronLeft,IconChevronRight} from '../Icons';

/** Shared control for comparison, period and other widget settings. */
export function WidgetSetting({label,value,onChange,options,help,hideLabel=false,size="sm",stepper=false}:{stepper?:boolean;hideLabel?:boolean;size?:"sm"|"md";label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];help?:ReactNode}) {
 const id=useId();
 const index=options.findIndex(option=>option.value===value);
 return <div className="sc-widget-setting">{!hideLabel&&<label htmlFor={id}>{label}</label>}{help&&<InfoTooltip ariaLabel={`${label}: Erklärung`} size={16}>{help}</InfoTooltip>}<div className={stepper?"sc-setting-stepper":"sc-setting-select"}>{stepper&&<button type="button" aria-label="Vorheriger Zeitraum" disabled={index>=options.length-1} onClick={()=>onChange(options[index+1].value)}><IconChevronLeft/></button>}<SelectField id={id} ariaLabel={label} value={value} onChange={event=>onChange(event.target.value)} size={size} maxWidth={220} disabled={options.length<2}>{options.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</SelectField>{stepper&&<button type="button" aria-label="Nächster Zeitraum" disabled={index<=0} onClick={()=>onChange(options[index-1].value)}><IconChevronRight/></button>}</div></div>;
}
