import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../../../components/Header";
import Breadcrumb from "../../../../../../components/Breadcrumb";
import { IconArrowRight } from "../../../../../../components/Icons";
import AtlasKpiRow from "../../../../../../components/atlas/AtlasKpiRow";
import { v } from "../../../../../../lib/theme";
import { pageMetadata } from "../../../../../../lib/seo";
import { jsonLdHtml, breadcrumbJsonLd, atlasDatasetJsonLd } from "../../../../../../lib/json-ld";
import { atlasIsIndexable, atlasLevelReleased, atlasRobots } from "../../../../../../lib/atlas-index";
import ZubauChart from "../../../../../../components/atlas/ZubauChart";
import GemeindeHero, { type OutsidePeer } from "../../../../../../components/atlas/GemeindeHero";
import GemeindeEmbedBox from "../../../../../../components/atlas/GemeindeEmbedBox";
import GemeindePotentialBlock from "../../../../../../components/atlas/GemeindePotential";
import GemeindeErneuerbareWidget from "../../../../../../components/atlas/GemeindeErneuerbareWidget";
import GemeindeSolarLive from "../../../../../../components/atlas/GemeindeSolarLive";
import { MastrHeroSection } from "../../../../../../components/MastrHeroSection";
import { gemeindeGeo } from "../../../../../../lib/atlas-geo";
import { getPvgisYield } from "../../../../../../lib/pvgis";
import { computeGemeindePotential } from "../../../../../../lib/gemeinde-potential";
import { buildGemeindeHighlight } from "../../../../../../lib/gemeinde-highlight";
import {
  resolveSlugPath,
  getRegionById,
  lastFullYear,
  peerBand,
  getPeerLeaders,
  getRankingData,
  type PeerLeader,
} from "../../../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";
import { publishedCities, cityPath } from "../../../../../../lib/atlas-cities";
import { landProgramBundeslaender } from "../../../../../../lib/funding-programs";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// Index-Freischaltung gestaffelt über lib/atlas-index (Wellen; Plan in
// docs/atlas-index-wellen.md). Gemeinden gehen erst in einer späteren Welle
// indexiert raus — und dann nur oberhalb der Anlagen-Schwelle.

const nf = (n: number) => n.toLocaleString("de-DE");

/** "2026-07-15" → "15. Juli 2026". */
function standLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function fmtLeistung(kwp: number): string {
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(Math.round(kwp))} kW`;
}

function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWh`;
  return `${nf(Math.round(kwh))} kWh`;
}

type Params = { bundesland: string; kreis: string; gemeinde: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region) return { robots: atlasRobots(false) };
  // Anlagenzahl (für die Thin-Schwelle) nur laden, wenn die Gemeinde-Ebene
  // überhaupt freigeschaltet ist — sonst ist die Seite ohnehin noindex.
  const anlagen = atlasLevelReleased("gemeinde")
    ? (await getRegionAtlasData(region.region_id)).solar.total_count
    : 0;
  return {
    ...pageMetadata({
      title: `Solaranlagen in ${region.name} – Bestand & Zubau`,
      description: `Photovoltaik in ${region.name}: Anlagenzahl, installierte Leistung und jährlicher Zubau aus dem Marktstammdatenregister — je Einwohner und im Vergleich zum Landkreis.`,
      path: `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`,
    }),
    robots: atlasRobots(atlasIsIndexable("gemeinde", anlagen)),
  };
}

export default async function GemeindePage({ params }: { params: Params }) {
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region || region.level !== "gemeinde") notFound();

  const blAgs = region.region_id.slice(0, 2);
  const bl = bundeslandByAgs(blAgs);
  const kreisAgs = region.region_id.slice(0, 5);
  const lastYear = lastFullYear();

  // Alle voneinander unabhängigen Reads in einem Rutsch statt seriell: die
  // Gemeinde selbst, die Eltern-Schnitte (Landkreis/Land/Deutschland) und der
  // Kreis. Spart den Wasserfall; die Reads sind zusätzlich gecacht.
  const [kreis, atlas, blAtlas, blRegion, kreisAtlas, deAtlas, deRegion] = await Promise.all([
    region.parent_region_id ? getRegionById(region.parent_region_id) : Promise.resolve(null),
    getRegionAtlasData(region.region_id),
    getRegionAtlasData(blAgs),
    getRegionById(blAgs),
    getRegionAtlasData(kreisAgs),
    getRegionAtlasData("de"),
    getRegionById("de"),
  ]);

  const lastYearRow = atlas.solar.by_year.find((y) => y.year === lastYear);
  const speicher = atlas.speicher;

  // Storage per roof kWp — the honest denominator is roof solar, not total: a
  // village with a big open-field park has lots of kWp and few home batteries,
  // and dividing by the park would fake a "no storage" picture. Only shown when
  // there is enough of both to mean something.
  const kwpDach = atlas.solar.by_segment
    .filter((s) => s.segment !== "freiflaeche")
    .reduce((a, s) => a + s.kwp, 0);
  const speicherProKwp =
    speicher.kwh_batterie > 0 && kwpDach > 100 ? speicher.kwh_batterie / kwpDach : null;
  const perCapita = region.population
    ? Math.round((atlas.solar.total_kwp * 1000) / region.population)
    : null;
  const blPerCapita = blRegion?.population ? (blAtlas.solar.total_kwp * 1000) / blRegion.population : null;
  const perCapitaVsBl = perCapita != null && blPerCapita ? perCapita / blPerCapita - 1 : null;

  type AtlasData = Awaited<ReturnType<typeof getRegionAtlasData>>;
  const perCapOf = (a: AtlasData, pop: number | null | undefined) =>
    pop
      ? {
          count: a.solar.total_count / pop,
          kwp: a.solar.total_kwp / pop,
          speicher: a.speicher.kwh_batterie / pop,
          neu: (a.solar.by_year.find((y) => y.year === lastYear)?.count ?? 0) / pop,
        }
      : { count: null, kwp: null, speicher: null, neu: null };
  const regionPerCap = perCapOf(atlas, region.population);
  const kpiRefs = [
    { key: "landkreis", name: kreis?.name ?? "Landkreis", perCap: perCapOf(kreisAtlas, kreis?.population) },
    { key: "bundesland", name: bl?.name ?? "Bundesland", perCap: perCapOf(blAtlas, blRegion?.population) },
    { key: "de", name: "Deutschland", perCap: perCapOf(deAtlas, deRegion?.population) },
  ].filter((r) => Object.values(r.perCap).some((x) => x !== null));
  const kpiTiles = [
    { label: "Solaranlagen", value: nf(atlas.solar.total_count), metric: "count" },
    { label: "Installiert", value: fmtLeistung(atlas.solar.total_kwp), metric: "kwp" },
    { label: "je Einwohner", value: perCapita === null ? "—" : `${nf(perCapita)} W`, metric: "kwp" },
    {
      label: "Batteriespeicher",
      value: fmtKwh(speicher.kwh_batterie),
      metric: "speicher",
      sub: `${nf(speicher.count)} Anlagen${speicherProKwp !== null ? ` · ${speicherProKwp.toLocaleString("de-DE", { maximumFractionDigits: 2 })} kWh je kWp` : ""}`,
    },
    { label: `Neu ${lastYear}`, value: nf(lastYearRow?.count ?? 0), metric: "neu" },
  ];

  const basePath = `/solar-atlas/${params.bundesland}/${params.kreis}`;
  const gemeindePath = `${basePath}/${params.gemeinde}`;

  // Only link to funding that actually applies here. Linking a Gemeinde to its
  // Bundesland's funding page just because it sits in that Bundesland sends people
  // to a list they are not on: Bayern has no Landesprogramm at all (only Bremen
  // and Berlin do), and its page lists Regensburg, Würzburg and Memmingen — none
  // of which helps anyone in Höchberg.
  const ownCity = publishedCities().find((c) => region.region_id.startsWith(c.ags));
  const hasLandProgram = landProgramBundeslaender().some((b) => b.slug === params.bundesland);

  // Peers per owner filter, so the reader can switch without a round trip.
  // The size band is what makes the comparison mean anything: unfiltered, the
  // national leader is a 55-inhabitant Koog at 48.115 W per head — a number that
  // measures the denominator, not the effort. Within half to double this
  // Gemeinde's population it bites: Pilsting has 7.158 to Höchberg's 9.564 and
  // reaches 6.210 W per head against 954.
  const band = region.population ? peerBand(region.population) : { min: 0, max: 0 };

  // Standort-Ertrag (Geo→PVGIS), Kreis-Rangliste und bundesweite Vergleichs-
  // gemeinden hängen nicht voneinander ab → in einem Rutsch statt seriell. Der
  // Ertrag speist „Angebot trifft Nachfrage" + Beispiele; nur für bewohnte
  // Gemeinden sinnvoll (Waldgebiete o. Ä. haben keinen Bedarf), repräsentative
  // PLZ aus der AGS. Die Vergleichs-Anführer (3 Eigentümer × 2 Bezüge) kommen aus
  // einem einzigen Aufruf (getPeerLeaders) statt sechs, die sich in der DB stauten.
  const [geoYield, siblingData, peerRows] = await Promise.all([
    region.population
      ? gemeindeGeo(region.region_id).then(async (geo) => {
          const y = await getPvgisYield({
            lat: geo?.lat ?? NaN,
            lon: geo?.lon ?? NaN,
            plzPrefix: (geo?.plz ?? "").slice(0, 2),
          });
          return { geo, potential: computeGemeindePotential({ annual: y.annual, monthly: y.monthly }) };
        })
      : Promise.resolve({ geo: null, potential: null }),
    // The Kreis in raw cells: the table ranks it client-side per owner AND per
    // metric, which no fixed RPC result could serve.
    kreis ? getRankingData(kreis) : Promise.resolve({ regions: [], cells: [] }),
    region.population ? getPeerLeaders(blAgs, band.min, band.max) : Promise.resolve([] as PeerLeader[]),
  ]);

  const potential = geoYield.potential;
  const repPlz = geoYield.geo?.plz ?? null;
  const geoLat = Number.isFinite(geoYield.geo?.lat) ? (geoYield.geo?.lat ?? null) : null;
  const geoLon = Number.isFinite(geoYield.geo?.lon) ? (geoYield.geo?.lon ?? null) : null;

  // One row per outside peer, carrying a value for each owner filter so switching
  // is a lookup rather than a refetch.
  const scopeLabel = (s: "de" | "bl") =>
    s === "bl" ? `${bl?.name ?? "Land"}, Größenklasse` : "bundesweit, Größenklasse";
  const outsideMap = new Map<string, OutsidePeer>();
  for (const p of peerRows) {
    if (p.region_id === region.region_id) continue;
    const row =
      outsideMap.get(p.region_id) ??
      {
        region_id: p.region_id,
        name: p.name,
        href: null,
        population: p.population,
        scope: scopeLabel(p.scope),
        values: { alle: null, privat: null, gewerbe: null },
      };
    row.values[p.owner] = p.w_per_capita;
    outsideMap.set(p.region_id, row);
  }
  const outside = Array.from(outsideMap.values());

  // Rang der Gemeinde nach installierter Solarleistung im Landkreis — aus den
  // Ranking-Zellen des Kreises aggregiert (Speicher zählt nicht zur Leistung).
  // Fürs Intro (ein je Gemeinde verschiedener, konkreter Fakt).
  const kwpByRegion = new Map<string, number>();
  for (const c of siblingData.cells) {
    if (c.segment === "speicher") continue;
    kwpByRegion.set(c.region_id, (kwpByRegion.get(c.region_id) ?? 0) + c.kwp);
  }
  const kreisTotal = siblingData.regions.length || null;
  let rankInKreis: number | null = null;
  if (kreisTotal) {
    const ownKwp = kwpByRegion.get(region.region_id) ?? atlas.solar.total_kwp;
    let r = 1;
    kwpByRegion.forEach((kwp, rid) => {
      if (rid !== region.region_id && kwp > ownKwp) r++;
    });
    rankInKreis = r;
  }

  const crumbs: { label: string; href?: string }[] = [
    { label: "Solar-Atlas", href: "/solar-atlas" },
    { label: bl?.name ?? blAgs, href: `/solar-atlas/${params.bundesland}` },
    { label: kreis?.name ?? params.kreis, href: basePath },
    { label: region.name },
  ];

  const atlasPath = `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`;
  const breadcrumbLd = breadcrumbJsonLd(
    crumbs.map((c) => ({ name: c.label, path: c.href })),
    BASE_URL,
  );
  const datasetLd = atlasDatasetJsonLd({
    name: `Solaranlagen-Bestand ${region.name}`,
    description: `Anlagenzahl, installierte Leistung und Zubau der Photovoltaik in ${region.name}${kreis ? ` (${kreis.name})` : ""} aus dem Marktstammdatenregister.`,
    url: `${BASE_URL}${atlasPath}`,
    dateModified: atlas.data_as_of,
    placeName: region.name,
    containedInPlace: kreis?.name ?? bl?.name ?? undefined,
    variables: [
      { name: "Solaranlagen in Betrieb", value: atlas.solar.total_count },
      { name: "Installierte Leistung", value: Math.round(atlas.solar.total_kwp), unitText: "kWp" },
      { name: "Batteriespeicher-Kapazität", value: Math.round(speicher.kwh_batterie), unitText: "kWh" },
    ],
    baseUrl: BASE_URL,
  });

  return (
    <div style={S.page}>
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetLd) }} />
      <div style={S.wrap}>
        <Breadcrumb items={crumbs} />

        {/*
          Data date above the headline, not buried in the footer: it is the first
          thing a Verwaltung checks before quoting a number, and <time dateTime>
          gives crawlers a machine-readable freshness signal on a page whose whole
          value is being current.
        */}
        <div style={S.stand}>
          Stand{" "}
          <time dateTime={atlas.data_as_of} style={S.standDate}>
            {standLabel(atlas.data_as_of)}
          </time>{" "}
          · Marktstammdatenregister · monatlich aktualisiert
        </div>

        <h1 style={S.h1}>Solaranlagen in {region.name}</h1>
        <p style={S.intro}>
          {buildGemeindeHighlight({
            name: region.name,
            atlas,
            blAtlas,
            blName: bl?.name ?? "Landes",
            perCapita,
            perCapitaVsBl,
            kreisName: kreis?.name ?? null,
            rankInKreis,
            kreisTotal,
            byYear: atlas.solar.by_year,
            lastYear,
          })}
        </p>

        <AtlasKpiRow
          tiles={kpiTiles}
          regionPerCap={regionPerCap}
          references={kpiRefs}
          defaultRefKey="landkreis"
        />

        <GemeindeHero
          cells={atlas.solar.by_segment}
          siblings={siblingData.regions}
          siblingCells={siblingData.cells}
          outside={outside}
          regionId={region.region_id}
          regionName={region.name}
          kreisName={kreis?.name ?? undefined}
          basePath={basePath}
        />

        {potential && <GemeindePotentialBlock plz={repPlz} p={potential} />}

        {/* Ohne Einwohnerzahl gibt es keinen Potential-Block — der Rechner-Link
            muss trotzdem erhalten bleiben (sonst hat die Seite keinen Weg dorthin). */}
        {!potential && (
          <div style={S.section}>
            <Link href="/photovoltaik-rechner" style={S.cta}>
              Rentabilität einer PV-Anlage berechnen <IconArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Zwei standardisierte, einbettbare Widgets nebeneinander: Erneuerbaren-Mix
            (echte MaStR-Leistung) + standortgenaue 24h-Simulation. Beide auf gleicher
            Höhe (Reihe streckt); das Radial nur wenn Koordinaten vorliegen, sonst
            füllt der Mix die Reihe allein. */}
        <div style={S.section}>
          <h2 style={S.h2}>Erneuerbare Energien in {region.name}</h2>
          <p style={S.sub}>Installierte Leistung nach Technologie und die heutige Solarleistung, simuliert</p>
          <div style={S.sideBySide}>
            <div style={S.sbsItem}>
              <GemeindeErneuerbareWidget
                name={region.name}
                solarKwp={atlas.solar.total_kwp}
                generators={atlas.generators}
                speicherKwh={speicher.kwh_batterie}
                liveUrl={`https://solar-check.io${gemeindePath}`}
                showSource={false}
                showEmbed={false}
              />
            </div>

            {geoLat !== null && geoLon !== null && (
              <div style={S.sbsItem}>
                <GemeindeSolarLive
                  lat={geoLat}
                  lon={geoLon}
                  totalKwp={atlas.solar.total_kwp}
                  name={region.name}
                  liveUrl={`https://solar-check.io${gemeindePath}`}
                  showSource={false}
                  showEmbed={false}
                />
              </div>
            )}
          </div>
        </div>

        {region.parent_region_id && (
          <div style={S.section}>
            <h2 style={S.h2}>{region.name} auf der Karte</h2>
            <p style={S.sub}>
              {kreis?.name ?? "Der Landkreis"} mit allen Gemeinden — tippen Sie auf ein Gebiet für die Details.
            </p>
            <MastrHeroSection initialRegion={region.parent_region_id} initialTraeger="solar" />
          </div>
        )}

        {atlas.solar.by_year.length >= 4 && (
          <div style={S.section}>
            <h2 style={S.h2}>Zubau pro Jahr in {region.name}</h2>
            <p style={S.sub}>Neu in Betrieb genommene Solaranlagen</p>
            <ZubauChart years={atlas.solar.by_year} />
          </div>
        )}



        {(ownCity || hasLandProgram) && (
          <div style={S.section}>
            <h2 style={S.h2}>Förderung in {region.name}</h2>
            <p style={S.sub}>Zuschüsse zusätzlich zur bundesweiten Regelung</p>
            <Link
              href={ownCity ? cityPath(ownCity) : `/photovoltaik-foerderung/${params.bundesland}`}
              style={S.linkRow}
            >
              <span>
                {ownCity ? `Förderung in ${ownCity.name}` : `Landesförderung in ${bl?.name ?? "diesem Bundesland"}`}
              </span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        )}

        <div style={S.section}>
          <GemeindeEmbedBox name={region.name} ags={region.region_id} />
        </div>

        <div style={S.disclaimer}>
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur), Stand {atlas.data_as_of},
          monatlich aktualisiert, Datenlizenz{" "}
          <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer" style={S.licLink}>
            dl-de/by-2-0
          </a>{" "}
          (Daten aggregiert). Einwohnerzahlen und Gebietsstand: Statistisches Bundesamt,
          Gemeindeverzeichnis{region.population_as_of ? `, Stand ${region.population_as_of}` : ""},
          Datenlizenz dl-de/by-2-0.{" "}
          {geoLat !== null && geoLon !== null && (
            <>
              Die simulierte Solarleistung nutzt Wetterdaten von{" "}
              <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={S.licLink}>
                Open-Meteo
              </a>{" "}
              (DWD, NOAA), Lizenz{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                style={S.licLink}
              >
                CC BY 4.0
              </a>
              .{" "}
            </>
          )}
          Gezählt werden nur Anlagen in Betrieb. Alle Angaben sind
          Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit.
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  stand: { fontSize: 11, color: v("--color-text-muted"), marginBottom: 6 },
  standDate: { fontFamily: v("--font-mono"), color: v("--color-text-secondary") },
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" },
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: 10,
    marginBottom: 8,
  },
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 },
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 4 },
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 },
  metricSub: { fontSize: 10, color: v("--color-text-muted"), marginTop: 3, lineHeight: 1.4 },
  tendCaption: { fontSize: 11, color: v("--color-text-muted"), margin: "0 2px 22px" },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px" },
  section: { marginBottom: 50 },
  // Erneuerbare-Mix + 24h-Sim nebeneinander; auf Mobil untereinander (flex-wrap).
  // stretch → beide Karten gleich hoch; sbsItem als flex, damit die Karte (height
  // 100 %) die gestreckte Höhe füllt.
  sideBySide: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" },
  sbsItem: { flex: "1 1 320px", minWidth: 0, display: "flex" },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    padding: "10px 16px",
    borderRadius: v("--radius-md"),
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  },
  linkRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    fontSize: 14,
    color: v("--color-text-primary"),
    textDecoration: "none",
  },
  disclaimer: {
    fontSize: 11,
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    borderTop: `1px solid ${v("--color-border")}`,
    paddingTop: 12,
    marginBottom: 32,
  },
  licLink: { color: "inherit", textDecoration: "underline" },
};
