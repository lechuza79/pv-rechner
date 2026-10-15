import {RESULT_LOGO_COLORS} from "../../lib/theme";

export const municipalSubline = "Lokale Energiedaten, verständliche Energie-Checks und Datenstories für Ihre Website, Social Media und die Menschen in Ihrer Kommune.";

/** Identical typography before and after the scene mounts. */
export function municipalHeroCss(styles:{referenceControls:string}, root = "[data-landscape-product][data-nidda-hero] .solar-page"):string {
 return `
 ${root}{--sc-hero-copy-width:720px;--sc-hero-copy-gap:75px;--sc-hero-mobile-description-width:285px}
 @media(min-width:1100px) and (max-width:1279px){${root}{--sc-hero-copy-width:600px}}
 @media(min-width:701px) and (max-width:1099px){${root}{--sc-hero-copy-width:360px;--sc-hero-copy-gap:60px}}
 @media(max-width:700px){${root}{--sc-hero-copy-width:calc(100% - 2 * var(--sc-page-inset));--sc-hero-copy-gap:70px}}
 ${root} .${styles.referenceControls}>label,
 ${root} output[data-flight-metrics]{display:none}
 ${root}{position:relative;--font-montserrat:Montserrat;--font-dm-sans:"DM Sans";--municipal-hero-inset:calc(max(0px,(100vw - 1600px)/2) + 5vw)}
 ${root} .hero{isolation:auto}
 ${root} .v3-scroll-indicator{display:none!important}
 ${root} .${styles.referenceControls}{display:flex;flex-wrap:wrap;gap:12px;align-items:center;right:var(--municipal-hero-inset);left:auto;bottom:32px}
 ${root} .${styles.referenceControls}>:is(button,a){display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;padding:12px 24px;border-radius:999px;font:600 var(--sc-type-action-size)/1.4 var(--font-heading);white-space:nowrap}
 ${root} .${styles.referenceControls}>button{order:2}
 ${root} .municipal-discover{order:1;background:transparent;color:var(--color-text-primary);border:1px solid currentColor;text-decoration:none}
 ${root} .municipal-discover:hover{background:var(--color-bg-muted)}
 @media(max-width:700px){${root} .${styles.referenceControls}{left:var(--municipal-hero-inset);right:var(--municipal-hero-inset);justify-content:center;gap:8px}${root} .${styles.referenceControls}>:is(button,a){flex:1;padding:12px}}

 ${root} .site-header .brand svg{${Object.entries(RESULT_LOGO_COLORS).map(([key,value])=>`${key}:${value}`).join(";")}}
 ${root} [aria-label="Kartennachweis"]{right:16px!important;opacity:.55}
 ${root} .site-header{max-width:none;margin:0;padding:24px var(--municipal-hero-inset);min-height:96px}
 ${root} .hero-copy{left:var(--sc-hero-content-inset);top:calc(var(--municipal-header-height,96px) + var(--sc-hero-copy-gap))!important;bottom:auto!important;width:var(--sc-hero-copy-width)!important;max-width:calc(100% - 2 * var(--sc-hero-content-inset))!important;margin:0!important;padding:0!important;transform:none!important}
 ${root} .hero-copy h1{max-width:none!important;width:100%;font-size:var(--sc-type-hero-size)!important;line-height:1.12!important;margin:0 0 24px;text-wrap:balance}
 ${root} .hero-description{display:block}
 ${root} .hero-description{font:400 var(--sc-type-body-size)/var(--sc-type-body-leading) var(--font-text);max-width:52ch;margin:0 0 28px}
 @media(min-width:1100px){${root} .hero-copy{width:min(var(--sc-hero-copy-width),600px)!important}${root} .hero-description{max-width:40ch}}
 ${root} .v3-scroll-indicator{display:inline-flex;align-items:center;gap:12px;font:400 16px/1.5 var(--font-text)}
 ${root} .v3-scroll-indicator svg{width:22px;height:22px}
 .municipal-hero-place{position:absolute;top:108px;right:var(--municipal-hero-inset);z-index:29;font-family:var(--font-text);font-size:var(--sc-type-body-size);--font-size-small:var(--sc-type-body-size)}
 .municipal-hero-place [role=combobox]::placeholder{color:var(--color-accent-light);opacity:1}
 ${root} .hero-copy h1, ${root} .hero-copy h1 span{font-family:var(--font-heading);font-weight:700;letter-spacing:normal}
 @media(max-width:700px){
 ${root}{--municipal-hero-inset:6vw;--municipal-header-height:80px}
 ${root} .site-header{padding:16px var(--municipal-hero-inset);min-height:80px}
 .municipal-hero-place{position:static;order:2;align-self:flex-start;margin:0 0 20px;pointer-events:auto}
 ${root} .hero-copy .hero-description{order:1}
 ${root} .hero-copy .v3-scroll-indicator{order:3;align-self:flex-start}
 ${root} .hero-copy{left:var(--sc-page-inset);width:var(--sc-hero-copy-width)!important;max-width:var(--sc-hero-copy-width)!important;display:flex;flex-direction:column}
 ${root} .hero-copy h1{font-size:var(--sc-type-hero-size)!important;margin-bottom:18px}
 ${root} .hero-description{font-size:var(--sc-type-body-size);max-width:var(--sc-hero-mobile-description-width,285px);margin-bottom:20px}
 }
 `;
}
