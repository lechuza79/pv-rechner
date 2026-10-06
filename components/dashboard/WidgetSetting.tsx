"use client";
import {useId,type ReactNode} from 'react';
import SelectField from '../SelectField';
import InfoTooltip from '../InfoTooltip';
import {IconChevronLeft,IconChevronRight} from '../Icons';
import {WidgetStepper} from './WidgetControls';

/** Shared control for comparison, period and other widget settings. */
export function WidgetSetting({label,value,onChange,options,help,hideLabel=false,size="sm",stepper=false,loop=false,stepLabels,variant='widget',order='descending'}:{order?:'ascending'|'descending';variant?:'widget'|'hero';loop?:boolean;stepLabels?:{previous:string;next:string};stepper?:boolean;hideLabel?:boolean;size?:"sm"|"md";label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];help?:ReactNode}) {
 const id=useId();
 const index=options.findIndex(option=>option.value===value);
 const move=(offset:number)=>{if(!options.length||index<0)return;const next=loop?(index+offset+options.length)%options.length:index+offset;if(next>=0&&next<options.length)onChange(options[next].value);};
 const previousOffset=loop||order==='ascending'?-1:1;
 const nextOffset=-previousOffset;
 const disabled=(offset:number)=>index<0||options.length<2||(!loop&&(index+offset<0||index+offset>=options.length));
 const selection=<SelectField id={id} ariaLabel={label} value={value} onChange={event=>onChange(event.target.value)} size={size} maxWidth={220} disabled={options.length<2}>{options.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</SelectField>;
 if(stepper&&variant==='widget')return <div className="sc-widget-setting" data-size={size} data-variant={variant}>{!hideLabel&&<label htmlFor={id}>{label}</label>}{help&&<InfoTooltip ariaLabel={`${label}: Erklärung`} size={16}>{help}</InfoTooltip>}<WidgetStepper label={label} size={size} onPrevious={()=>move(previousOffset)} onNext={()=>move(nextOffset)} previousDisabled={disabled(previousOffset)} nextDisabled={disabled(nextOffset)} previousLabel={stepLabels?.previous} nextLabel={stepLabels?.next}>{selection}</WidgetStepper></div>;
 return <div className="sc-widget-setting" data-size={size} data-variant={variant}>{!hideLabel&&<label htmlFor={id}>{label}</label>}{help&&<InfoTooltip ariaLabel={`${label}: Erklärung`} size={16}>{help}</InfoTooltip>}<div className={stepper?"sc-setting-stepper":"sc-setting-select"}>{stepper&&<button type="button" aria-label={stepLabels?.previous??"Vorheriger Zeitraum"} disabled={disabled(previousOffset)} onClick={()=>move(previousOffset)}><IconChevronLeft/></button>}{selection}{stepper&&<button type="button" aria-label={stepLabels?.next??"Nächster Zeitraum"} disabled={disabled(nextOffset)} onClick={()=>move(nextOffset)}><IconChevronRight/></button>}</div></div>;
}
