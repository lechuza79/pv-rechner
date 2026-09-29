"use client";
import type { ReactNode } from "react";
import { IconCheck, IconPlus } from "./Icons";
import { iconSizes } from "../lib/theme";
import "./result-choice-header.css";

/** Shared calculation selection for scenarios and product offers. */
export default function ResultChoiceHeader({title,children,selected,onSelect,actionLabel,illustration,illustrationDecorated=false,editSelected=false,neutral=false,onApply,applyLabel="Übernehmen",className=""}:{title:string;children:ReactNode;selected:boolean;onSelect?:()=>void;actionLabel?:string;illustration?:string;illustrationDecorated?:boolean;editSelected?:boolean;neutral?:boolean;onApply?:()=>void;applyLabel?:string;className?:string}) {
  return <><header className={`sc-result-choice-header ${className}`} data-selected={selected} data-neutral={neutral}>
    {illustration && (illustrationDecorated ? <span className="sc-result-choice-art" aria-hidden="true"><img className="sc-result-choice-illustration" src={illustration} alt="" width={160} height={160}/></span> : <img className="sc-result-choice-illustration" src={illustration} alt="" width={96} height={96}/>)}
    <div><strong>{title}</strong><span>{children}</span></div>
    {(selected || onSelect) && <button type="button" className="sc-result-choice-action" aria-pressed={selected}
      aria-label={actionLabel ?? `${title}: ${selected ? "In deiner Berechnung" : "Damit neu berechnen"}`}
      title={selected && editSelected ? "Konfiguration bearbeiten" : selected ? "Wird für dein Ergebnis verwendet" : "Damit neu berechnen"}
      onClick={()=>{if(!selected || editSelected)onSelect?.();}}>{selected ? <IconCheck size={iconSizes.md}/> : <IconPlus size={iconSizes.md}/>}</button>}
  </header>{onApply && <footer className="sc-result-choice-footer"><button type="button" onClick={onApply}>{applyLabel}</button></footer>}</>;
}
