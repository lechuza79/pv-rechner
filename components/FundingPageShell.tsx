"use client";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocation } from "../lib/location";
import { FUNDING_PAGES } from "../lib/funding-pages";
import LocationSearch, { searchLocations, type SearchLocation } from "./LocationSearch";
import { IconArrowLeft, IconArrowRight } from "./Icons";
import { ActionLink } from "./ActionButton";
import SharedSiteHeader from "./SharedSiteHeader";
import SidebarPageLayout from "./SidebarPageLayout";
import { breadcrumbJsonLd, jsonLdHtml } from "../lib/json-ld";
import { BASE_URL } from "../lib/seo";
import AtlasBreadcrumb from "./gemeinde/AtlasBreadcrumb";
import { stageDefaults } from "../lib/theme";
import EditorialPage from "./EditorialPage";
import styles from "./FundingPageShell.module.css";

const FundingLocation = createContext<{place: SearchLocation | null; dark: boolean}>({place:null,dark:false});
export const useFundingLocation = () => useContext(FundingLocation);

/** Mounted in the persistent site layout: navigation never replaces the stage or location. */
export type FundingLocalRoute = { href: string; name: string; breadcrumbName?: string; title?: string; ags: string; bundesland: string };
export default function FundingPageShell({children, localRoutes = []}:{children:ReactNode; localRoutes?: FundingLocalRoute[]}) {
  const pathname=usePathname();
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const localPage=localRoutes.find(page=>page.href===pathname);
  const page=localPage ? FUNDING_PAGES[0] : undefined;
  const {plz,setPlz}=useLocation();
  const [place,setPlace]=useState<SearchLocation|null>(null);
  const frame=useRef<HTMLIFrameElement>(null);
  const [dark,setDark]=useState(false);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.origin!==location.origin || event.source!==frame.current?.contentWindow || event.data?.type!=="funding-scene" || typeof event.data.dark!=="boolean")return;
      setDark(event.data.dark);
    };
    window.addEventListener("message",receive);
    return()=>window.removeEventListener("message",receive);
  },[]);

  const sendLocation=()=>frame.current?.contentWindow?.postMessage({type:"funding-scene-request",plz:plz||""},location.origin);
  useEffect(()=>{sendLocation();},[plz,!!page,localPage?.href]);
  useEffect(()=>{
    if(!page || localPage || (place && (place.plz||null)===plz))return;
    if(!plz){setPlace(null);return;}
    const controller=new AbortController();
    searchLocations(plz,controller.signal).then(hits=>{
      if(controller.signal.aborted)return;
      const matches=hits.map(hit=>JSON.parse(hit.id) as SearchLocation).filter(hit=>hit.plz===plz);
      setPlace(matches.length===1 ? matches[0] : null);
    }).catch(()=>{});
    return()=>controller.abort();
    // The shared postcode changes independently of the current funding page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[plz,!!page,localPage?.href]);
  useEffect(()=>{
    if(!localPage || place?.ags===localPage.ags || (place?.name===localPage.name && place.ags.startsWith(localPage.ags)))return;
    const controller=new AbortController();
    searchLocations(localPage.name,controller.signal).then(hits=>{
      const matches=hits.map(hit=>JSON.parse(hit.id) as SearchLocation)
        .filter(hit=>hit.name===localPage.name && hit.ags.startsWith(localPage.ags));
      const next=matches.find(hit=>hit.plz) ?? matches[0];
      if(!controller.signal.aborted && next){setPlace(next);setPlz(next.plz||null);}
    }).catch(()=>{});
    return()=>controller.abort();
  },[localPage?.href]);
  const navigate=(href:string)=>startTransition(()=>router.push(href,{scroll:false}));
  const navigateWithinFunding=(event:MouseEvent<HTMLDivElement>)=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    const anchor=(event.target as HTMLElement).closest('a');
    if(!anchor || anchor.target || anchor.hasAttribute('download'))return;
    const url=new URL(anchor.href,location.href);
    if(url.origin!==location.origin || url.hash || url.search || url.pathname===pathname)return;
    if(!FUNDING_PAGES.some(item=>item.href===url.pathname) && !localRoutes.some(item=>item.href===url.pathname))return;
    event.preventDefault();navigate(url.pathname);
  };
  if(!page)return <>{children}</>;
  const search=(appearance: "default" | "simulation")=><LocationSearch placeholder="PLZ oder Ort …" appearance={appearance} selected={place} onClear={()=>{setPlace(null);setPlz(null);if(localPage)navigate(page.href);}}
    onPick={next=>{setPlace(next);setPlz(next.plz||null);
      if(localPage){const target=localRoutes.find(item=>item.ags===next.ags || (item.name===next.name && next.ags.startsWith(item.ags)));navigate(target?.href ?? page.href);}
    }}/>;
  const selectedRoute=place ? localRoutes.find(item=>item.ags===place.ags || (item.name===place.name && place.ags.startsWith(item.ags))) : undefined;
  const parents = localPage ? [{name:"Förderung",href:"/photovoltaik-foerderung"},{name:localPage.bundesland,href:localPage.href.slice(0,localPage.href.lastIndexOf('/'))}] : pathname === "/balkonkraftwerk/foerderung" ? [{name:"Balkonkraftwerk",href:"/balkonkraftwerk"}] : pathname === "/ratgeber/waermepumpe-foerderung" ? [{name:"Ratgeber",href:"/ratgeber"}] : [{name:"Startseite",href:"/"}];
  return <FundingLocation.Provider value={{place,dark}}>
    <div className={styles.shell} style={dark && localPage ? {"--funding-transition-bg":stageDefaults(0)["--color-bg"]} as CSSProperties : undefined} data-sc-hero-presentation="" data-local-page={!!localPage || undefined} onClickCapture={navigateWithinFunding}>
      <div className={styles.scene}><iframe ref={frame} src="/embed/funding-hero" onLoad={sendLocation} title="Wetter und Solardach am gewählten Standort" tabIndex={-1}/></div>
      <div className={styles.header}><SharedSiteHeader scene/></div>
      <div className={styles.breadcrumb} data-sc-contrast>
        <AtlasBreadcrumb framed parents={parents} name={localPage?.breadcrumbName ?? localPage?.name ?? page.title}/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLdHtml(breadcrumbJsonLd([...parents.map(parent=>({name:parent.name,path:parent.href})),{name:localPage?.breadcrumbName ?? localPage?.name ?? page.title,path:pathname}],BASE_URL))}}/>
      </div>
      <SidebarPageLayout links={FUNDING_PAGES} activeHref={page.href} label="Förderbereiche" enabled={!localPage}
        alignWith="#funding-title" navigationControls={search("default")}>
        {!localPage && <section className={styles.hero} aria-labelledby="funding-title">
          <div className={styles.copy} data-sc-contrast>
            <p data-sc-contrast>Bund · Länder · Kommunen</p>
            <h1 id="funding-title" data-sc-contrast>{`${page.title} ${new Date().getFullYear()}`}</h1>
            {!localPage && <><p data-sc-contrast>Welche Förderung gibt es für dein Vorhaben?</p>
            <div className={styles.heroSearch}>{search("simulation")}</div>
            <div className={styles.routeLink}>
              {selectedRoute ? <ActionLink data-sc-contrast variant="text" href={selectedRoute.href}>Förderung in {selectedRoute.name} ansehen <IconArrowRight /></ActionLink> : null}
            </div></>}
          </div>
        </section>}
        <div data-sidebar-light-start aria-busy={pending}>{children}</div>
      </SidebarPageLayout>
    </div>
  </FundingLocation.Provider>;
}

/** Local pages keep their server-rendered introduction inside the shared scene. */
export function FundingLocalHero({title, children, compact=false}:{title:string;children:ReactNode;compact?:boolean}) {
 const {dark}=useFundingLocation();
 return <section style={dark ? stageDefaults(0) as CSSProperties : undefined} className={styles.localHero} aria-labelledby="funding-title">
  <div className={styles.localCopy} data-compact={compact || undefined} data-sc-contrast>
   <ActionLink data-sc-contrast size={compact ? "small" : "default"} variant="secondary" iconOnly href="/photovoltaik-foerderung" aria-label="Zurück zur Förderübersicht"><IconArrowLeft size={18} /></ActionLink>
   <div className={styles.localText}><h1 id="funding-title" data-sc-contrast>{title}</h1>{compact ? <div className={styles.localIntro}>{children}</div> : children}</div>
  </div>
 </section>;
}

/** The programme section shares the scene palette without changing the site theme. */
export function FundingProgramSection({children}:{children:ReactNode}) {
 const {dark}=useFundingLocation();
 return <div style={dark ? stageDefaults(0) as CSSProperties : undefined} className={styles.programSection}><EditorialPage>{children}</EditorialPage></div>;
}
