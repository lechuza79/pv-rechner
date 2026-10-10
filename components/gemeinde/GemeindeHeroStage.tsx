import type {ReactNode} from 'react';
import SharedSiteHeader from '../SharedSiteHeader';
import AtlasBreadcrumb from './AtlasBreadcrumb';

/** The municipality's existing hero shell, with a replaceable scene slot. */
export default function GemeindeHeroStage({name,parents,scene,children,description,discoverHref='#atlas-stories',productPreview=false}:{name:string;parents:{name:string;href:string}[];scene:ReactNode;children?:ReactNode;description?:string;discoverHref?:string;productPreview?:boolean}){
  return <section className="hero" aria-labelledby="hero-title">
    {scene}
    <SharedSiteHeader aktiv={productPreview?undefined:"atlas"} />
    <div className="hero-copy">
      <h1 id="hero-title" data-sc-contrast="">{productPreview?<>Die Energiewende vor Ort.<br/><span>Für alle verständlich.</span></>:<>{name}.<br/><span>Energie von hier.</span></>}</h1>
      <p className="hero-description" data-sc-contrast="">{description??`Entdecke die Energiewende in ${name}: Insights erklären die Entwicklung, das Ranking zeigt den Ortsvergleich und der Energiemonitor macht die Zahlen sichtbar.`}</p>
      <a className="v3-scroll-indicator is-visible" href={discoverHref} aria-label="Insights entdecken" data-sc-contrast=""><span>Entdecken</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6"/></svg></a>
    </div>
    {!productPreview&&<div className="atlas-hero-local-nav" data-sc-contrast=""><AtlasBreadcrumb parents={parents} name={name}/></div>}
    {children}
  </section>;
}
