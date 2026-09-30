import "./section-nav.css";
import { IconCopy, IconShare } from "../Icons";
import GemeindeAboKnopf from "./GemeindeAboKnopf";
import { formatStoryDate } from "../../lib/story-format";

/** Shared municipality/district section bar; behavior comes from GemeindeSkripte. */
export default function GemeindeAbschnittNav({name="",naechstesUpdate,links,subscribable=true,actions=true,theme}:{name?:string;naechstesUpdate?:string;actions?:boolean;theme?:"light";subscribable?:boolean;links:{href:string;label:string}[]}) {
  return <nav className="v3-section-nav" data-theme={theme} data-collapse-at={theme === "light" ? 640 : undefined} aria-label="Auf dieser Seite">
    <details className="v3-nav-menu" open>
      <summary aria-label="Abschnitt wählen"><span className="v3-nav-aktiv">{links[0]?.label}</span></summary>
      <div className="v3-nav-links">{links.map(link=><a key={link.href} href={link.href}>{link.label}</a>)}</div>
    </details>
    {actions && <div className="atlas-page-actions">
      {naechstesUpdate && <span className="atlas-page-update"><b>Nächstes Update</b> <time dateTime={naechstesUpdate}>{formatStoryDate(naechstesUpdate)}</time></span>}
      {subscribable&&<GemeindeAboKnopf name={name}/>}
      <button type="button" data-page-copy aria-label="Link zur Seite kopieren" title="Link kopieren"><IconCopy/></button>
      <button type="button" data-page-share aria-label="Seite teilen" title="Seite teilen"><IconShare/></button>
      <span className="atlas-page-status" role="status"/>
    </div>}
  </nav>;
}
