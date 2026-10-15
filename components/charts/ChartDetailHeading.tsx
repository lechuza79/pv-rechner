"use client";
import ActionButton from '../ActionButton';
export function ChartDetailHeading({title,onBack,backLabel='Zurück zur übergeordneten Übersicht',breadcrumb=false,root='Deutschland'}:{title:string;onBack?:()=>void;backLabel?:string;breadcrumb?:boolean;root?:string}) {
 if(breadcrumb)return <div className="sc-share-heading sc-share-breadcrumb">{onBack&&<><span>{root}</span><span aria-hidden="true">/</span></>}<span>{title}</span>{onBack&&<button data-sc-export-ignore="" type="button" className="sc-search-close" onClick={onBack} aria-label={backLabel}><svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="m3 3 14 14M17 3 3 17" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>}</div>;
 return <div className="sc-share-heading">{onBack&&<ActionButton data-sc-export-ignore="" iconOnly onClick={onBack} aria-label={backLabel}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m6-6-6 6 6 6"/></svg></ActionButton>}<h3>{title}</h3></div>;
}
