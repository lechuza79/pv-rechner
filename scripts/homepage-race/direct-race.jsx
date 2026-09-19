import React,{useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import KostenrennenWidget from '../../components/charts/KostenrennenWidget';
import HeizkostenrennenWidget from '../../components/charts/HeizkostenrennenWidget';
import {kostenrennen,RENNEN_OHNE_MIT_PV} from '../../lib/kostenrennen';
import {usePrices} from '../../lib/prices';
import {feedInRatesFor} from '../../lib/feedin-config';
import {tokens} from '../../lib/theme';
import Modal from '../../components/Modal';
function Pv(){const prices=usePrices();const rennen=useMemo(()=>kostenrennen(RENNEN_OHNE_MIT_PV,{prices,feedIn:feedInRatesFor()}),[prices]);return <KostenrennenWidget rennen={rennen} onsite branding={false} showEmbed={false} preiseStandIso={prices.validFrom}/>;}
function Chart({kind,onReady}){useEffect(()=>{onReady()},[kind]);return kind==='pv'?<Pv/>:<HeizkostenrennenWidget onsite branding={false} showEmbed={false}/>;}
export function mountDirectRace(host,onReady){
 for(const [key,value] of Object.entries(tokens))host.style.setProperty(key,String(value));
 const palette={'--color-chart-grid':'#aec3bd28','--color-chart-zero':'#aec3bd50','--color-bg':'#163338','--color-bg-muted':'#1c3b40','--color-bg-accent':'#23464c','--color-text-primary':'#e7eeea','--color-text-secondary':'#aec3bd','--color-text-muted':'#aec3bd','--color-accent':'#d4ff24','--color-highlight':'#d4ff24','--color-border-accent':'#aec3bd40','--color-border':'#aec3bd30','--color-border-muted':'#aec3bd20','--font-family':'Montserrat, sans-serif','--widget-bg':'#163338','--widget-fg':'#e7eeea','--widget-muted':'#aec3bd','--widget-accent':'#d4ff24','--widget-accent-fg':'#15343c','--widget-highlight':'#d4ff24','--widget-ink':'#e7eeea'};
 for(const [key,value] of Object.entries(palette))host.style.setProperty(key,value);
 const root=createRoot(host);return {show(kind){root.render(<Chart kind={kind} onReady={onReady}/>)},destroy(){root.unmount()}};
}

// Use the existing modal and menu cards without a second visual system.
export function mountToolsOverview(){
 const host=document.createElement('div');document.body.append(host);
 const root=createRoot(host);
 const menuStyle=getComputedStyle(document.querySelector('.sc-global-header'));
 const modalTokens={...tokens,'--color-bg':menuStyle.getPropertyValue('--sc-nav-surface'),'--color-text-primary':menuStyle.getPropertyValue('--sc-nav-ink'),'--color-text-secondary':menuStyle.getPropertyValue('--sc-nav-muted')};
 const stylesheet=document.createElement('style');
 stylesheet.textContent='.sc-tools-modal{'+Object.entries(modalTokens).map(([key,value])=>`${key}:${value}`).join(';')+'}';
 document.head.append(stylesheet);
 const catalogue=[...document.querySelectorAll('.sc-nav-section-tools .sc-nav-tool')].map(card=>card.outerHTML).join('');
 function show(open){root.render(<Modal className="sc-tools-modal" open={open} onClose={()=>show(false)} title="Alle Tools" maxWidth={1000}><div className="sc-global-header sc-nav-section-tools"><div className="sc-nav-tools" dangerouslySetInnerHTML={{__html:catalogue}}/></div></Modal>);}
 return {show(){show(true)}};
}
