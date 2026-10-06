import {kaiserslauternRaceSettings} from "../../lib/race-settings";
import {loadRegionalRace} from "../../lib/regional-race-server";
import {regionalRaceData} from "../../lib/regional-race";
import RegionNavigation from "./RegionNavigation";
import { packeRankingZellen } from "../../lib/ranking-zellen";
import {monitorContentForPreview} from '../../lib/monitor-content-preview';
import SiteFuss from '../SiteFuss';
import {stageDefaults} from '../../lib/theme';
import {ortPhrase,ortPraeposition} from '../../lib/atlas-orte';
import DataSourcesSection from '../DataSourcesSection';
import Script from 'next/script';
import DistrictRaceWidget, {DISTRICT_RACE_WORDING, type RaceWording} from "./DistrictRaceWidget";
import {loadDistrictContent,loadRegionContent,type DistrictContent} from "../../lib/district-monitor-server";
import {districtSolarCells} from "../../lib/district-monitor";
import {isDistrictMember} from "../../lib/district-package";
import LandkreisMonitor from "./LandkreisMonitor";
import Header from "../SharedSiteHeader";
import { Suspense, type ReactNode, type ComponentProps, type CSSProperties } from "react";
import LandkreisStories from "./LandkreisStories";
import foundation from "../social/atlas-foundations.module.css";
import type { Crumb } from "../Breadcrumb";
import AtlasBreadcrumb from "../gemeinde/AtlasBreadcrumb";
import RankingTable from "../atlas/RankingTable";
import LazyDisclosure from "./LazyDisclosure";
import { DataSourceNote } from "../PoweredBy";
import { DATA_SOURCES } from "../../lib/data-sources";
import { foldSiblings, lastFullYear, type AtlasRegion, type AtlasChild, type RankingRegion, type ChildYearRow } from "../../lib/atlas";
import { STUFEN, pvLeistungTeile, anlagenZahlTeile, speicherKwhTeile } from "../../lib/atlas-format";
import { dashboardDate } from "../../lib/dashboard/format";
import { districtGeometry, childGeometry } from "../../lib/district-geometry";
import RegionKarte, { type MapValue } from "./RegionKarte";
import GemeindeAbschnittNav from "../gemeinde/GemeindeAbschnittNav";
import GemeindeAboDialog from "../gemeinde/GemeindeAboDialog";
import GemeindeSkripte from "../gemeinde/GemeindeSkripte";
import GemeindeFoerderung from "../gemeinde/GemeindeFoerderung";
import { getFundingPrograms } from "../../lib/funding-data";
import { matchFundingForAgs, fundingStandLabel, fundingZaehlt } from "../../lib/funding-programs";
import { IMPORT_TAGE, naechsteAktualisierung } from "../../lib/mastr-import-plan";
import { ABO_SOFORT_SKRIPT } from "../../lib/abo-sofort";
import styles from "./landkreis.module.css";

/** What the page calls its members, per level. The district texts are the accepted originals. */
const LEVEL_TEXT: Record<"landkreis" | "bundesland" | "de", {noun: string; member: string; overview: string; table: string; tableHeading: string; race: RaceWording}> = {
  landkreis: {noun: "Gemeinden", member: "Gemeinde", overview: "Gemeindeübersicht", table: "Alle Gemeinden in der ausführlichen Tabelle", tableHeading: "Die Gemeinden im Ranking", race: DISTRICT_RACE_WORDING},
  bundesland: {noun: "Kreise und kreisfreie Städte", member: "Kreis", overview: "Kreisübersicht", table: "Alle Kreise in der ausführlichen Tabelle", tableHeading: "Die Kreise im Ranking",
    race: {title: "Welcher Kreis hat die meisten Solaranlagen?", members: "Alle Landkreise und kreisfreien Städte", leaders: "Die zehn führenden Kreise", unit: "Kreise"}},
  de: {noun: "Bundesländer", member: "Bundesland", overview: "Länderübersicht", table: "Alle Bundesländer in der ausführlichen Tabelle", tableHeading: "Die Bundesländer im Ranking",
    race: {title: "Welches Bundesland hat die meisten Solaranlagen?", members: "Alle Bundesländer", leaders: "Die zehn führenden Bundesländer", unit: "Bundesländer"}},
};

/**
 * Shared regional page (Landkreis, Bundesland, Deutschland) using the region
 * register and prepared monitor packages. Only districts have stories and
 * live power; states and Germany reuse the same historical energy widgets.
 */
export default async function LandkreisSeite({ region, children, ranking, basePath, crumbs, stand, intro, einordnung, zusatz, state, variant = false }: {
  region: AtlasRegion; children: AtlasChild[]; ranking: { regions: RankingRegion[]; cells: ChildYearRow[] };
  state: {id:string;name:string}; basePath: string; crumbs: Crumb[]; stand: string; intro: ReactNode; einordnung?: ReactNode; zusatz?: ReactNode; variant?: boolean | "dark";
}) {
  // The authoritative municipality list is the region register (one rule with
  // the district package build). Geometry also contains forests and the
  // enclosed independent city; neither becomes a card, nor do retired keys.
  const level = region.level === "bundesland" || region.level === "de" ? region.level : "landkreis";
  const text = LEVEL_TEXT[level];
  const isDistrict = level === "landkreis";
  // Bundesland: every Landkreis AND kreisfreie Stadt; Deutschland: the 16 Länder.
  const towns = isDistrict ? children.filter(c => isDistrictMember(c, region.region_id)) : children.filter(c => c.bezeichnung !== "Gemeindefreies Gebiet");
  // The three reads of this component start together (28.09.2026): the monitor
  // package used to begin only after the map outline and the funding catalogue
  // had arrived, one wait after the other. Guarded by
  // lib/__tests__/atlas-seite-parallel.test.ts.
  const content=monitorContentForPreview(isDistrict?loadDistrictContent(region.region_id,towns.map(t=>t.region_id),stand):loadRegionContent(region.region_id,children.map(c=>c.region_id),stand));
  const [shapes, allPrograms, featuredRace] = await Promise.all([
    isDistrict ? districtGeometry(region.region_id) : childGeometry(level as "bundesland" | "de", region.region_id),
    level === "de" ? Promise.resolve([] as Awaited<ReturnType<typeof getFundingPrograms>>) : getFundingPrograms(),
    region.region_id === "07335" ? loadRegionalRace("07",kaiserslauternRaceSettings) : Promise.resolve(null),
  ]);
  const sums = new Map(foldSiblings(ranking.regions, ranking.cells).map(r => [r.region_id, r.sums.alle]));
  const places: MapValue[] = towns.map(town => {
    const value = sums.get(town.region_id)?.kwp ?? null;
    return { id: town.region_id, name: town.name, value, formatted: value === null ? { value: "–", unit: "" } : pvLeistungTeile(value), href: town.slug ? `${basePath}/${town.slug}` : null };
  }).sort((a, b) => a.name.localeCompare(b.name, "de"));
  // Reuse the map's geographic boundaries for the footer-style navigation cards.
  const outlines = shapes.map(shape => {
    const points = shape.ground.flat(2);
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return {id:shape.id, viewBox:`${x} ${y} ${Math.max(...xs)-x} ${Math.max(...ys)-y}`, path:shape.ground.flatMap(poly => poly.map(ring => `M${ring.map(p=>p.join(',')).join('L')}Z`)).join(' ')};
  });
  const metrics = [
    { id: "kwp", label: "Installierte Solarleistung", format: pvLeistungTeile },
    { id: "count", label: "Solaranlagen", format: anlagenZahlTeile },
    { id: "speicher", label: "Speicherkapazität", format: speicherKwhTeile },
  ].map(m => ({ id: m.id, label: m.label, values: places.map(p => {
    const value = sums.get(p.id)?.[m.id as "kwp" | "count" | "speicher"] ?? null;
    return { ...p, value, formatted: value === null ? { value: "–", unit: "" } : m.format(value) };
  }) }));
  const districtPrograms = matchFundingForAgs(allPrograms,region.region_id);
  const programs = new Map(districtPrograms.filter(p=>p.level!=="bund").map(p=>[p.id,p]));
  const coverage = new Map<string,string[]>();
  // Districts list programmes of their municipalities too; a Bundesland lists its own only.
  if(isDistrict) for(const town of towns) for(const p of matchFundingForAgs(allPrograms,town.region_id)) {
    if(p.level==="bund")continue;
    programs.set(p.id,p);
    coverage.set(p.id,[...(coverage.get(p.id)??[]),town.name]);
  }
  const foerderProgramme=[...programs.values()].map(programm=>({programm,standLabel:fundingStandLabel(programm),zaehlt:fundingZaehlt(programm),geltungsbereich:districtPrograms.some(p=>p.id===programm.id)?(isDistrict?"Gilt im gesamten Landkreis":"Gilt im gesamten Bundesland"):"Gilt in: "+coverage.get(programm.id)?.join(", ")}));
  const naechstesUpdate=naechsteAktualisierung(IMPORT_TAGE,stand,new Date());
  const raceData = regionalRaceData(towns,ranking,stand,basePath);
  const townIds = new Set(towns.map(t => t.region_id));
  const missingGeometry = places.filter(p => !shapes.some(s => s.id === p.id));
  const comparable=towns.length>1;
  return <><div className={`solar-page ${variant === "dark" ? foundation.foundation : ""} ${styles.page} ${variant ? styles.cutVariant : ""} ${variant === "dark" ? styles.darkVariant : ""}`} data-story-scheme={variant === "dark" ? "dark" : "light"}>
    <link rel="stylesheet" href="/gemeinde/region-sections.css" precedence="default"/>
    <link rel="stylesheet" href="/design-system/feature-card.css" precedence="default"/>
    <div className={`${styles.heroBand} ${foundation.foundation}`} data-story-scheme="dark" data-map-hero-band>
    <div className={styles.heroHeader}><Header /></div>
    <div className={styles.heroInner}>
    <div className={styles.breadcrumbBand}><AtlasBreadcrumb parents={crumbs.filter(c=>c.href && c.href!=="/").map(c=>({name:c.label,href:c.href!}))} name={region.name} /></div>
    <section className={styles.hero}>
      <div className={styles.heroStage} data-map-hero-stage data-map-clear-heading={!isDistrict}>
      <div className={styles.heroHeading} data-map-hero-heading>

        <h1>{region.name}</h1>
        <p className={styles.lede}>{comparable&&<>{places.length.toLocaleString("de-DE")} {text.noun}.<br /></>}Solarenergie im Überblick.</p>
      </div>
      {shapes.length>0 ? <RegionKarte shapes={shapes} metrics={metrics} member={text.member} overview={text.overview} framingScale={isDistrict ? 1 : 0.84} /> : <p>Für dieses Gebiet liegt derzeit keine aktuelle Karte vor. Die Gemeindedaten stehen unten in der Übersicht.</p>}
      </div>
    </section>
    </div></div>
    <GemeindeAboDialog name={region.name} ags={region.region_id} verwaltungLabel={isDistrict ? "Für den Landkreis" : level === "bundesland" ? "Für das Bundesland" : "Für eine Organisation"}/>
    <script dangerouslySetInnerHTML={{__html:ABO_SOFORT_SKRIPT}}/>
    <div className={styles.subnavRail}><GemeindeAbschnittNav subscribable name={region.name} naechstesUpdate={naechstesUpdate} links={[
      {href:"#atlas-stories",label:"Insights"},{href:"#atlas-ranking",label:"Ranking"},{href:"#atlas-data",label:"Energiemonitor"},{href:"#atlas-foerderung",label:"Förderung"},
    ].filter(link=>isDistrict||(link.href==="#atlas-ranking"?comparable:link.href==="#atlas-foerderung"?level==="bundesland":link.href!=="#atlas-stories"))}/></div>
    <div className={`${styles.storyBand} ${foundation.foundation}`} data-story-scheme={variant === "dark" ? "dark" : "light"}>
      <section className={styles.districtIntro}>
        <div><p>Stand {dashboardDate(stand)}</p><h2>So steht es um Solar<br/>{ortPhrase(region)}.</h2></div>
        <div><p>{intro}</p>{einordnung&&<p>{einordnung}</p>}</div>
      </section>
      {isDistrict&&<section id="atlas-stories" className={styles.districtStories} aria-label="Geschichten aus dem Landkreis">
        <h2>Insights {ortPhrase(region)}</h2>
        <Suspense fallback={<p>Geschichten werden geladen …</p>}><LandkreisStories content={content} name={region.name}/></Suspense>
      </section>}
    </div>
    {missingGeometry.length > 0 && <p>Für {missingGeometry.map(p => p.name).join(", ")} fehlt der Kartenumriss. Die Werte stehen in der Übersicht.</p>}
    {comparable&&<><section id="atlas-ranking" data-widget-ranking className={`${styles.section} ${styles.raceSection}`} aria-label="Ranking">
      {region.region_id === "07335" ? featuredRace ? <DistrictRaceWidget regionId="07" name={featuredRace.region.name} stand={featuredRace.stand} rows={featuredRace.rows} history={featuredRace.history} settings={kaiserslauternRaceSettings} wording={{title:"Solarleistung auf privaten Dächern je Einwohner",members:"Alle Landkreise",leaders:"Die zehn führenden Landkreise",unit:"Landkreise"}}/> : <p role="status">Der Landkreisvergleich ist gerade nicht verfügbar.</p> : <DistrictRaceWidget regionId={region.region_id} name={region.name} stand={stand} wording={text.race} {...raceData}/>}
    </section>
    </>}
    <Suspense fallback={<RegionNavigation places={places} outlines={outlines} title={text.overview} parentName={region.name} locationPhrase={ortPhrase(region)}/>}><RegionNavigationSection content={content} places={places} outlines={outlines} title={text.overview} parentName={region.name} locationPhrase={ortPhrase(region)}/></Suspense>

    <section id="atlas-data" className={`${styles.section} sc-dashboard-section`}><h2>Energiemonitor {ortPhrase(region)}</h2><Suspense fallback={<p role="status">Energiemonitor wird geladen …</p>}><RegionMonitorSection content={content} regionId={region.region_id} name={region.name} population={region.population} populationStand={region.population_as_of} cells={districtSolarCells(ranking.cells.filter(c=>townIds.has(c.region_id)))} stand={stand}/></Suspense></section>
    {comparable&&<LazyDisclosure className={`${styles.section} ${styles.tableDisclosure}`} summary={text.table}
      closed={<ul>{places.filter(p=>p.href).map(p=><li key={p.id}><a href={p.href!}>{p.name}</a></li>)}</ul>}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Im Vergleich</p><h2>{text.tableHeading}</h2></div></div>
      <div style={variant === "dark" ? stageDefaults(0) as CSSProperties : undefined}>
        <RankingTable regions={ranking.regions} zellen={packeRankingZellen(ranking.cells, ranking.regions)} basePath={basePath} lastFullYear={lastFullYear()} popInMillions={level==="de"} />
      </div>
    </LazyDisclosure>}
    {zusatz&&<section id="atlas-related" className={`${styles.section} ${styles.regionExtras}`} aria-label="Weitere Auswertungen">{zusatz}</section>}
    {level!=="de"&&<section className={`${styles.fundingSection} ${foundation.foundation}`} data-story-scheme={variant === "dark" ? "dark" : "light"}>
      <GemeindeFoerderung praeposition={ortPraeposition(region.name)} ort={region.name} programme={foerderProgramme}/>
    </section>}
    <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive"/>
    <GemeindeSkripte navigationOnly daten={{districtOverview:true,overviewLabel:isDistrict?"Landkreisübersicht":level==="bundesland"?"Länderübersicht":"Deutschlandübersicht",ortPhrase:ortPhrase(region),ags:null,kreisAgs:region.region_id,kreisLabel:region.name,landAgs:state.id,landLabel:state.name,startArea:region.region_id,startKategorie:"count",klasse:"alle",kreisBase:basePath+"/",stufen:STUFEN,discoveries:[],name:region.name,liveUrl:`https://solar-check.io${basePath}`,genitiv:region.name,widgetUrl:"https://solar-check.io/energie-widgets"}}/>

  </div><div data-page-footer><SiteFuss zwischen={<DataSourcesSection><DataSourceNote label="Datenbasis:" source={[DATA_SOURCES.mastr, DATA_SOURCES.bkg, DATA_SOURCES.iconD2Archive, DATA_SOURCES.era5Archive]}/></DataSourcesSection>}/></div></>;
}

/** The map and introduction must not wait for all municipality monitor packages. */
async function RegionMonitorSection({content,...props}:Omit<ComponentProps<typeof LandkreisMonitor>,"monitor"> & {content:Promise<DistrictContent>}) {
  const {monitor,prepared,preview}=await content;
  // Never present an older district evaluation as current, never hide a missing one.
  const note=prepared.state==='unavailable'&&prepared.reason==='read-error'
    ?<p role="status">Die Monitordaten konnten gerade nicht geladen werden. Bitte lade die Seite erneut. Die verfügbaren Registerzahlen bleiben sichtbar.</p>
    :prepared.state==='unavailable'||monitor.status==='unavailable'
    ?<p role="status">Die vorbereitete Auswertung für {props.name} ist derzeit nicht vollständig verfügbar. Monatsvergleiche und Energiedaten erscheinen hier, sobald alle Teilgebiete auf gemeinsamer Grundlage vorliegen.</p>
    :prepared.state==='older-edition'?<p role="status">Diese Auswertung beruht auf den Gebietsdaten mit Registerstand {dashboardDate(prepared.editions.at(-1)!)}. Die neueren Registerzahlen werden gerade eingearbeitet.</p>:null;
  return <div data-monitor-preview={preview ? "local-package" : undefined}>{note}<LandkreisMonitor {...props} monitor={monitor}/></div>;
}

async function RegionNavigationSection({content,...props}:ComponentProps<typeof RegionNavigation> & {content:Promise<DistrictContent>}) {
  const {childEnergy}=await content;
  return <RegionNavigation {...props} energy={childEnergy}/>;
}
