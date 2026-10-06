import React from 'react';
import {IconArrowRight} from './Icons';
import './tool-teaser.css';

/** Shared compact tool card: always use the layered illustration and shared arrow. */
export default function ToolTeaser({title,description,motif,href,upcoming=false}:{title:string;description:string;motif:string;href:string;upcoming?:boolean}){
 return <article className="sc-tool-teaser">
  <div className="sc-tool-teaser-art" aria-hidden="true">{React.createElement('solar-illustration',{motif,circle:'',loading:'lazy',label:title})}</div>
  <div className="sc-tool-teaser-copy">
   <div className="homepage-tool-teaser-heading"><h4>{title}</h4>{upcoming&&<span className="hs-coming">Demnächst</span>}</div>
   <p>{description}</p>
   <a href={href}>{upcoming?'Mehr erfahren':'Ausprobieren'} <IconArrowRight size={24}/></a>
  </div>
 </article>;
}
