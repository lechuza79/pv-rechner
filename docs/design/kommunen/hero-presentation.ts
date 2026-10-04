import {RESULT_LOGO_COLORS} from "../../../lib/theme";

export const municipalSubline = "Lokale Energiedaten, verständliche Energie-Checks und Datenstories für Ihre Website, Social Media und die Menschen in Ihrer Kommune.";

/** Identical typography before and after the scene mounts. */
export function municipalHeroCss(styles:{referenceControls:string}):string {
 return `
 #municipal-landscape-hero .${styles.referenceControls}>label,
 #municipal-landscape-hero output[data-flight-metrics]{display:none}
 #municipal-landscape-hero{position:relative;--font-montserrat:Montserrat;--font-dm-sans:"DM Sans";--municipal-hero-inset:calc(max(0px,(100vw - 1600px)/2) + 5vw)}
 #municipal-landscape-hero .hero{isolation:auto}
 #municipal-landscape-hero .v3-scroll-indicator{display:none!important}
 #municipal-landscape-hero .${styles.referenceControls}{display:flex;flex-wrap:wrap;gap:12px;align-items:center;right:var(--municipal-hero-inset);left:auto;bottom:32px}
 #municipal-landscape-hero .${styles.referenceControls}>:is(button,a){display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;padding:12px 24px;border-radius:999px;font:600 var(--sc-type-action-size)/1.4 var(--font-heading);white-space:nowrap}
 #municipal-landscape-hero .${styles.referenceControls}>button{order:2}
 #municipal-landscape-hero .municipal-discover{order:1;background:transparent;color:var(--color-text-primary);border:1px solid currentColor;text-decoration:none}
 #municipal-landscape-hero .municipal-discover:hover{background:var(--color-bg-muted)}
 @media(max-width:700px){#municipal-landscape-hero .${styles.referenceControls}{left:var(--municipal-hero-inset);right:var(--municipal-hero-inset);justify-content:center;gap:8px}#municipal-landscape-hero .${styles.referenceControls}>:is(button,a){flex:1;padding:12px}}

 #municipal-landscape-hero .site-header .brand svg{${Object.entries(RESULT_LOGO_COLORS).map(([key,value])=>`${key}:${value}`).join(";")}}
 #municipal-landscape-hero [aria-label="Kartennachweis"]{right:16px!important;opacity:.55}
 body[data-calculator-layout=scroll]>main{padding-top:0}
 #municipal-landscape-hero .site-header{max-width:none;margin:0;padding:24px var(--municipal-hero-inset);min-height:96px}
 #municipal-landscape-hero .hero-copy{left:var(--sc-hero-content-inset);top:calc(var(--municipal-header-height,96px) + var(--sc-hero-copy-gap))!important;bottom:auto!important;width:var(--sc-hero-copy-width)!important;max-width:calc(100% - 2 * var(--sc-hero-content-inset))!important;margin:0!important;padding:0!important;transform:none!important}
 #municipal-landscape-hero .hero-copy h1{max-width:none!important;width:100%;font-size:var(--sc-type-hero-size)!important;line-height:1.12!important;margin:0 0 24px;text-wrap:balance}
 #municipal-landscape-hero .hero-description{display:none}
 #municipal-landscape-hero .municipal-subline{font:400 var(--sc-type-body-size)/var(--sc-type-body-leading) var(--font-text);max-width:52ch;margin:0 0 28px}
 @media(min-width:1100px){#municipal-landscape-hero .hero-copy{width:min(var(--sc-hero-copy-width),600px)!important}#municipal-landscape-hero .municipal-subline{max-width:40ch}}
 #municipal-landscape-hero .v3-scroll-indicator{display:inline-flex;align-items:center;gap:12px;font:400 16px/1.5 var(--font-text)}
 #municipal-landscape-hero .v3-scroll-indicator svg{width:22px;height:22px}
 .municipal-hero-place{position:absolute;top:108px;right:var(--municipal-hero-inset);z-index:29;font-family:var(--font-text);font-size:var(--sc-type-body-size);--font-size-small:var(--sc-type-body-size)}
 #municipal-landscape-hero .hero-copy h1, #municipal-landscape-hero .hero-copy h1 span{font-family:var(--font-heading);font-weight:700;letter-spacing:normal}
 @media(max-width:700px){
 #municipal-landscape-hero{--municipal-hero-inset:6vw;--municipal-header-height:80px}
 #municipal-landscape-hero .site-header{padding:16px var(--municipal-hero-inset);min-height:80px}
 .municipal-hero-place{position:static;order:2;align-self:flex-start;margin:0 0 20px;pointer-events:auto}
 #municipal-landscape-hero .hero-copy .municipal-subline{order:1}
 #municipal-landscape-hero .hero-copy .v3-scroll-indicator{order:3;align-self:flex-start}
 #municipal-landscape-hero .hero-copy{left:var(--sc-page-inset);width:var(--sc-hero-copy-width)!important;max-width:var(--sc-hero-copy-width)!important;display:flex;flex-direction:column}
 #municipal-landscape-hero .hero-copy h1{font-size:var(--sc-type-hero-size)!important;margin-bottom:18px}
 #municipal-landscape-hero .municipal-subline{font-size:var(--sc-type-body-size);max-width:var(--sc-hero-mobile-description-width,285px);margin-bottom:20px}
 }
 `;
}
