import {loadStrommixPage} from './snapshot';
import {jsonLdHtml} from '../../../lib/json-ld';
import { Suspense } from "react";
import { strommixFaq } from "../../../lib/faq";
import EditorialPage from "../../../components/EditorialPage";
import content from "../../../components/EditorialContent.module.css";
import Faq from "../../../components/Faq";
import ArticleTeasers from "../../../components/ArticleTeasers";
import { LoadingDots } from "../../../components/LoadingDots";
import StrommixOverview from './StrommixOverview';
import SharedSiteHeader from '../../../components/SharedSiteHeader';
import Breadcrumb from '../../../components/Breadcrumb';
import DataSourcesSection from '../../../components/DataSourcesSection';
import DataSourceList from '../../../components/DataSourceList';
import SiteFuss from '../../../components/SiteFuss';
import stage from '../../../components/EnergyEditorialStage.module.css';
import foundation from '../../../components/social/atlas-foundations.module.css';
import SidebarPageLayout from '../../../components/SidebarPageLayout';
import {strommixClusterLinks} from '../../../public/shared-nav/nav-content.js';
import StateElectricitySection from '../../../components/StateElectricitySection';
import EnergieClient from "./client";

export const dynamic = "force-dynamic";
type PageProps={searchParams:Promise<{variante?:string;selected?:string;time?:string}>};
export async function generateMetadata({searchParams}:PageProps){const variant=(await searchParams).variante;const review=variant==='regional';const metadata=(await loadStrommixPage(review)).metadata;return (review||variant==='kartenhero'||variant==='spiderhero'||variant==='radarhero')?{...metadata,robots:{index:false,follow:true}}:metadata;}
export default async function EnergiePage({searchParams}:PageProps) {
  const {variante:variant,selected,time}=await searchParams;
  const review=variant==='regional',mapHero=variant==='kartenhero',spiderHero=!variant||variant==='spiderhero'||variant==='radarhero',splitHero=!variant||variant==='radarhero';
  const {initialData,renderedAt,jsonLd}=await loadStrommixPage(review);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLdHtml(jsonLd)}}/>
    <div className={`${stage.header} ${stage.standaloneHeader} ${foundation.foundation}`} data-story-scheme="dark"><SharedSiteHeader aktiv="energie" /></div>
    <div className={`${stage.breadcrumbBand} ${foundation.foundation}`} data-story-scheme="dark"><div className={stage.breadcrumb}><Breadcrumb variant="compact" items={[{label:'Start',href:'/'},{label:'Strommix Deutschland live'}]} jsonLd /></div></div>
    {splitHero&&<StrommixOverview initialData={initialData} renderedAt={renderedAt} spider splitHero/>}
    <SidebarPageLayout links={strommixClusterLinks} activeHref="/strommix-deutschland" label="Strommix & Stromhandel" darkHero alignWith={splitHero?"#speicher-stromhandel":(mapHero||spiderHero)?"#strommix-title":".strommix-hero-tiles"}>
    {mapHero?<>
      <StrommixOverview initialData={initialData} renderedAt={renderedAt} scrollTarget="#bundeslaender" visual={<Suspense fallback={<LoadingDots/>}><StateElectricitySection hero selected={selected} time={time}/></Suspense>}/>
      <StrommixOverview initialData={initialData} renderedAt={renderedAt} secondary scrollTarget="#tagesverlauf"/>
    </>:<>
      <StrommixOverview initialData={initialData} renderedAt={renderedAt} review={review} spider={spiderHero} section={splitHero?"flows":"hero"}/>
      <Suspense fallback={<div className={`${stage.stage} ${foundation.foundation}`} data-story-scheme="dark" style={{minHeight:560,padding:24}} role="status"><LoadingDots/> Bundesländerkarte wird geladen.</div>}><StateElectricitySection nested={splitHero} selected={selected} time={time}/></Suspense>
    </>}
    <div data-sidebar-light-start className={stage.readingSections}><EditorialPage wide>
    <StrommixOverview initialData={initialData} section="day" splitHero={splitHero}/>
    <section className={stage.context} id="zeitvergleich">
    <Suspense fallback={<div className={content.card} role="status"><LoadingDots /> Stromverlauf wird geladen.</div>}>
      <EnergieClient initialData={initialData} review={review} />
    </Suspense>
    </section>
    <section className={stage.context}>
      <h2 className={content.h2}>Was die Strommix-Zahlen bedeuten</h2>
      <div className={stage.raceInsights}>
      <article className={content.hero}>
      <h3 className={content.h3}>Erzeugung ist eine Momentaufnahme</h3>
      <p className={content.p}>
        Der Strommix zeigt die Anteile der Energieträger an der öffentlichen Nettostromerzeugung
        in Deutschland. Der Eigenverbrauch der Kraftwerke ist bereits abgezogen.
        Die aktuelle Leistung steht in GW. Für einen ganzen Zeitraum wird daraus eine
        Strommenge in GWh oder TWh. Ein hoher Anteil in einer einzelnen Viertelstunde
        bedeutet deshalb noch keinen ebenso hohen Anteil am ganzen Tag oder Jahr.
      </p>
      </article><article className={content.hero}><h3 className={content.h3}>Wind und Solar verändern den Anteil</h3>
      <p className={content.p}>
        Solarstrom hängt von Tageslicht und Bewölkung ab, Windstrom von den Windverhältnissen.
        Gleichzeitig verändern sich Stromnachfrage und die Erzeugung anderer Kraftwerke.
        Der Anteil erneuerbarer Energien kann deshalb steigen, weil mehr erneuerbarer Strom
        erzeugt wird oder weil die übrige Erzeugung sinkt. Ein Anteil allein erklärt die Ursache nicht.
      </p>
      </article><article className={content.hero}><h3 className={content.h3}>Erzeugung ist nicht Verbrauch</h3>
      <p className={content.p}>
        Deutschland handelt Strom mit seinen Nachbarländern. Die inländische Erzeugung
        beschreibt deshalb nicht vollständig den Strom, der hier verbraucht wird.
        Der zusätzlich einblendbare Atomstrom-Import ist eine rechnerische Herkunftszuordnung.
        Er gehört nicht zur deutschen Erzeugung und bildet nicht sämtliche Stromimporte ab.
      </p>
      </article><article className={content.hero}><h3 className={content.h3}>Datenstand statt Echtzeitversprechen</h3>
      <p className={content.p}>
        Die kurzfristigen Daten liegen in Viertelstunden vor. Veröffentlichungen können
        verzögert eintreffen und nachträglich korrigiert werden. „Update“ im Hero nennt den letzten Abruf; „Stand“ den zugehörigen Messzeitpunkt. Weitere Angaben stehen in der Diagrammhilfe. Im sichtbaren Tab prüfen wir alle
        fünf Minuten auf neue Daten. Für abgeschlossene historische Zeiträume entfällt diese Prüfung.
      </p>
      </article></div>
    </section>
    <Faq items={[...strommixFaq(),{q:'Warum unterscheiden sich die Live-Zahlen und die Bundesländerkarte?',a:'Die Live-Zahlen zeigen die öffentliche Nettostromerzeugung Deutschlands. Die stündliche Regionalansicht von CO2Map.de ist modelliert und fasst drei Stadtstaaten mit ihren Nachbarländern zusammen. Zeiträume, Gebiete und Datenbasis unterscheiden sich; Offshore-Wind ist in den Regionalwerten enthalten. Die Summen sind deshalb nicht unmittelbar vergleichbar.'}]} title="Häufige Fragen zum Strommix" currentPath="/strommix-deutschland" />
    <ArticleTeasers title="Weiterlesen" currentPath="/strommix-deutschland" items={[
      {href:"/langzeit-strommix",title:"Wie hat sich Deutschlands Strommix entwickelt?",teaser:"Stromerzeugung seit 1990, CO₂-Emissionen und Strompreise im Jahresvergleich."},
      { href: "/atomstrom-import", title: "Wie viel Atomstrom importiert Deutschland?", teaser: "Importmengen, Herkunftsländer und die Berechnung des Kernenergie-Anteils." },
      { href: "/photovoltaik-zubau-deutschland", title: "Wie schnell wächst die Solarenergie?", teaser: "Neu installierte Solarleistung und Entwicklung des Anlagenbestands." },
      { href: "/pv-simulation", title: "Was erzeugt dein Dach gerade?", teaser: "Solarstrom an deinem Standort und im Tagesverlauf simulieren." },
    ]} />
  </EditorialPage></div></SidebarPageLayout>
  <div data-page-footer><SiteFuss zwischen={<DataSourcesSection id="quellen">
    <DataSourceList tone="inherit" only={["energyCharts", "co2map", "mastr", "smard", "bkg"]} purposes={{co2map:'Modellierte stündliche Stromerzeugung in 13 Regionen',smard:"Ersatzquelle für die öffentliche Nettostromerzeugung bei Ausfällen",mastr:"Installierte Leistung für die Auslastung im Tageswidget",energyCharts:'Öffentliche Nettostromerzeugung und Pumpspeicherleistung'}}/>
    <p>Bei einem Ausfall kann <a href="https://www.smard.de/">Bundesnetzagentur | SMARD.de</a> als Ersatzquelle einspringen. Sind beide Quellen nicht erreichbar, wird der letzte gespeicherte Stand gekennzeichnet. Daten können nachträglich korrigiert werden.</p>
    <p>Die Bundesländerkarte verwendet modellierte stündliche Erzeugungsdaten von <a href="https://co2map.de/methodology.html">CO2Map.de (Universität Freiburg)</a>. Drei Stadtstaaten sind mit ihren Nachbarländern zusammengefasst. Die Werte zeigen mittlere Leistungen über eine Stunde, keine Jahresmengen und keinen Verbrauchsstrommix inklusive Importen. Offshore-Wind ist in den Regionalwerten enthalten. Fehlende Einzelwerte werden gekennzeichnet.</p>
    <p>Stromimporte sind nicht Teil der inländischen Erzeugung. Der optional eingeblendete Atomstrom-Import wird aus Grenzflüssen und nationalen Strommixen geschätzt. <a href="/atomstrom-import/methodik">Methodik der Atomstrom-Berechnung</a>.</p>
    {spiderHero&&<p>Physikalische Import- und Exportleistungen: <a href="https://energy-charts.info">Energy-Charts (Fraunhofer ISE)</a> auf Basis von <a href="https://transparency.entsoe.eu/">ENTSO-E</a>. Die Aufteilung nach Energieträgern ist rechnerisch: Importe anhand zeitgleicher Nachbarland-Strommixe, Exporte anhand deutscher Erzeugung einschließlich Importen. Quellen können verzögert liefern; der jeweilige Datenstand steht in der Diagrammhilfe.</p>}
  </DataSourcesSection>}/></div></>;
}
