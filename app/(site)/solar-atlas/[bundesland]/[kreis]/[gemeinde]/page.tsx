import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../../../components/Header";
import Breadcrumb from "../../../../../../components/Breadcrumb";
import { IconArrowRight, IconTrendUp, IconTrendDown } from "../../../../../../components/Icons";
import { v } from "../../../../../../lib/theme";
import { pageMetadata } from "../../../../../../lib/seo";
import { jsonLdHtml, breadcrumbJsonLd } from "../../../../../../lib/json-ld";
import ZubauChart from "../../../../../../components/atlas/ZubauChart";
import GemeindeHero, { type OutsidePeer } from "../../../../../../components/atlas/GemeindeHero";
import GemeindeEmbedBox from "../../../../../../components/atlas/GemeindeEmbedBox";
import GemeindePotentialBlock from "../../../../../../components/atlas/GemeindePotential";
import GemeindeErneuerbareWidget from "../../../../../../components/atlas/GemeindeErneuerbareWidget";
import GemeindeSolarLive from "../../../../../../components/atlas/GemeindeSolarLive";
import { MastrHeroSection } from "../../../../../../components/MastrHeroSection";
import { gemeindeGeo } from "../../../../../../lib/atlas-geo";
import { getPvgisYield } from "../../../../../../lib/pvgis";
import { computeGemeindePotential, type GemeindePotential } from "../../../../../../lib/gemeinde-potential";
import { buildGemeindeHighlight } from "../../../../../../lib/gemeinde-highlight";
import {
  resolveSlugPath,
  getRegionById,
  lastFullYear,
  peerBand,
  getTopGemeinden,
  getRankingData,
  type TopGemeinde,
  type Owner,
} from "../../../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";
import { publishedCities, cityPath } from "../../../../../../lib/atlas-cities";
import { landProgramBundeslaender } from "../../../../../../lib/funding-programs";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

/**
 * Welle 0 (Pilot): gebaut und abgenommen, aber noch nicht im Index. Erst mit
 * Welle 1 geht die Seite indexiert raus — dann aber wirklich, denn ein Backlink
 * auf eine noindex-Seite verpufft, und die Kommune ist der ganze Anlass.
 */
const PILOT_NOINDEX = { index: false, follow: false } as const;

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

/** Tendenz je Einwohner ggü. Bundesland-Schnitt: grün über, rot unter, bei ±0 neutral. */
function TendTag({ dev }: { dev: number | null }) {
  if (dev === null) return null;
  const pct = Math.round(Math.abs(dev) * 100);
  if (pct === 0) {
    return <span style={{ ...S.tend, color: v("--color-text-muted") }}>±0 %</span>;
  }
  const up = dev > 0;
  const color = up ? v("--color-positive") : v("--color-negative");
  return (
    <span style={{ ...S.tend, color }}>
      {up ? <IconTrendUp size={11} color={color} /> : <IconTrendDown size={11} color={color} />}
      {pct} %
    </span>
  );
}

type Params = { bundesland: string; kreis: string; gemeinde: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region) return { robots: PILOT_NOINDEX };
  return {
    ...pageMetadata({
      title: `Solaranlagen in ${region.name} – Bestand & Zubau`,
      description: `Photovoltaik in ${region.name}: Anlagenzahl, installierte Leistung und jährlicher Zubau aus dem Marktstammdatenregister — je Einwohner und im Vergleich zum Landkreis.`,
      path: `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`,
    }),
    robots: PILOT_NOINDEX,
  };
}

export default async function GemeindePage({ params }: { params: Params }) {
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region || region.level !== "gemeinde") notFound();

  const kreis = region.parent_region_id ? await getRegionById(region.parent_region_id) : null;
  const blAgs = region.region_id.slice(0, 2);
  const bl = bundeslandByAgs(blAgs);

  // The Gemeinde's own numbers, its siblings (for the rank) and both parents
  // (for the comparison bars).
  const atlas = await getRegionAtlasData(region.region_id);

  const lastYear = lastFullYear();
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

  // Bundesland-Schnitt als Vergleichsbasis für die Pro-Kopf-Kennzahl (±% zum
  // Landesschnitt über dem Donut). Gleiche Rollup-Quelle wie die Gemeinde selbst.
  const [blAtlas, blRegion] = await Promise.all([getRegionAtlasData(blAgs), getRegionById(blAgs)]);
  const perCapita = region.population
    ? Math.round((atlas.solar.total_kwp * 1000) / region.population)
    : null;
  const blPerCapita = blRegion?.population
    ? (blAtlas.solar.total_kwp * 1000) / blRegion.population
    : null;
  const perCapitaVsBl = perCapita != null && blPerCapita ? perCapita / blPerCapita - 1 : null;

  // Tendenz je Kennzahl = Wert je Einwohner ggü. dem Bundesland-Schnitt (grün über,
  // rot unter). Alle über dieselbe Pro-Kopf-Normierung, damit vergleichbar.
  const blPop = blRegion?.population ?? null;
  const perCapDev = (gemVal: number, blVal: number): number | null => {
    if (!region.population || !blPop || !blVal) return null;
    return gemVal / region.population / (blVal / blPop) - 1;
  };
  // Tendenz je Einwohner ggü. Bundesland-Schnitt. Nur beim reinen Zubau (Neu)
  // weggelassen — der ist ein Momentwert, keine sinnvolle Pro-Kopf-Tendenz.
  const tAnlagen = perCapDev(atlas.solar.total_count, blAtlas.solar.total_count);
  const tLeistung = perCapitaVsBl;
  const tSpeicher = perCapDev(speicher.kwh_batterie, blAtlas.speicher.kwh_batterie);

  // „Angebot trifft Nachfrage" + Beispiele: braucht den Standort-Ertrag. Nur für
  // bewohnte Gemeinden sinnvoll (Waldgebiete o. Ä. haben keinen Bedarf). Der
  // Ertrag kommt über den geteilten PVGIS-Weg; repräsentative PLZ aus der AGS.
  let potential: GemeindePotential | null = null;
  let repPlz: string | null = null;
  let geoLat: number | null = null;
  let geoLon: number | null = null;
  if (region.population) {
    const geo = await gemeindeGeo(region.region_id);
    repPlz = geo?.plz ?? null;
    geoLat = Number.isFinite(geo?.lat) ? (geo?.lat ?? null) : null;
    geoLon = Number.isFinite(geo?.lon) ? (geo?.lon ?? null) : null;
    const yieldData = await getPvgisYield({
      lat: geo?.lat ?? NaN,
      lon: geo?.lon ?? NaN,
      plzPrefix: (repPlz ?? "").slice(0, 2),
    });
    potential = computeGemeindePotential({
      totalKwp: atlas.solar.total_kwp,
      population: region.population,
      annual: yieldData.annual,
      monthly: yieldData.monthly,
    });
  }

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
  const OWNERS: Owner[] = ["alle", "privat", "gewerbe"];
  const [siblingData, ...outsideByOwner] = await Promise.all([
    // The Kreis in raw cells: the table ranks it client-side per owner AND per
    // metric, which no fixed RPC result could serve.
    kreis ? getRankingData(kreis) : Promise.resolve({ regions: [], cells: [] }),
    ...OWNERS.map(async (owner) => {
      if (!region.population) return { owner, rows: [] as TopGemeinde[] };
      const [blTop, deTop] = await Promise.all([
        getTopGemeinden({ prefix: blAgs, owner, limit: 1, minPop: band.min, maxPop: band.max }),
        getTopGemeinden({ prefix: "", owner, limit: 1, minPop: band.min, maxPop: band.max }),
      ]);
      return { owner, rows: [...blTop.map((t) => ({ ...t, scope: `${bl?.name ?? "Land"}, Größenklasse` })), ...deTop.map((t) => ({ ...t, scope: "bundesweit, Größenklasse" }))] };
    }),
  ]);

  // One row per outside peer, carrying a value for each owner filter so switching
  // is a lookup rather than a refetch.
  const outsideMap = new Map<string, OutsidePeer>();
  for (const { owner, rows } of outsideByOwner) {
    for (const t of rows as (TopGemeinde & { scope: string })[]) {
      if (t.region_id === region.region_id) continue;
      const row =
        outsideMap.get(t.region_id) ??
        {
          region_id: t.region_id,
          name: t.name,
          href: null,
          population: t.population,
          scope: t.scope,
          values: { alle: null, privat: null, gewerbe: null },
        };
      row.values[owner] = t.w_per_capita;
      outsideMap.set(t.region_id, row);
    }
  }
  const outside = Array.from(outsideMap.values());

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
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Solaranlagen-Bestand ${region.name}`,
    description: `Anlagenzahl, installierte Leistung und Zubau der Photovoltaik in ${region.name}${kreis ? ` (${kreis.name})` : ""} aus dem Marktstammdatenregister.`,
    url: `${BASE_URL}${atlasPath}`,
    license: "https://www.govdata.de/dl-de/by-2-0",
    creator: { "@type": "Organization", name: "Solar Check", url: BASE_URL },
    isBasedOn: "https://www.marktstammdatenregister.de",
    dateModified: atlas.data_as_of,
    spatialCoverage: {
      "@type": "Place",
      name: region.name,
      ...(kreis || bl ? { containedInPlace: { "@type": "Place", name: kreis?.name ?? bl?.name ?? "" } } : {}),
    },
    variableMeasured: [
      { "@type": "PropertyValue", name: "Solaranlagen in Betrieb", value: atlas.solar.total_count },
      { "@type": "PropertyValue", name: "Installierte Leistung", value: Math.round(atlas.solar.total_kwp), unitText: "kWp" },
      { "@type": "PropertyValue", name: "Batteriespeicher-Kapazität", value: Math.round(speicher.kwh_batterie), unitText: "kWh" },
    ],
  };

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
          })}
        </p>

        <div style={S.metricsGrid}>
          <div style={S.metric}>
            <div style={S.metricLabel}>Solaranlagen</div>
            <div style={S.metricValue}>{nf(atlas.solar.total_count)}</div>
            <TendTag dev={tAnlagen} />
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Installiert</div>
            <div style={S.metricValue}>{fmtLeistung(atlas.solar.total_kwp)}</div>
            <TendTag dev={tLeistung} />
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Batteriespeicher</div>
            <div style={S.metricValue}>{fmtKwh(speicher.kwh_batterie)}</div>
            <TendTag dev={tSpeicher} />
            <div style={S.metricSub}>
              {nf(speicher.count)} Anlagen
              {speicherProKwp !== null && ` · ${speicherProKwp.toLocaleString("de-DE", { maximumFractionDigits: 2 })} kWh je kWp`}
            </div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Neu {lastYear}</div>
            <div style={S.metricValue}>{nf(lastYearRow?.count ?? 0)}</div>
          </div>
        </div>
        {perCapitaVsBl !== null && (
          <p style={S.tendCaption}>Tendenz: je Einwohner gegenüber dem {bl?.name ?? "Landes"}-Schnitt.</p>
        )}

        <GemeindeHero
          cells={atlas.solar.by_segment}
          siblings={siblingData.regions}
          siblingCells={siblingData.cells}
          outside={outside}
          regionId={region.region_id}
          regionName={region.name}
          basePath={basePath}
        />

        {potential && <GemeindePotentialBlock plz={repPlz} p={potential} />}

        {/* Zwei standardisierte, einbettbare Widgets nebeneinander: Erneuerbaren-Mix
            (echte MaStR-Leistung) + standortgenaue 24h-Simulation. Beide auf gleicher
            Höhe (Reihe streckt); das Radial nur wenn Koordinaten vorliegen, sonst
            füllt der Mix die Reihe allein. */}
        <div style={S.section}>
          <div style={S.sideBySide}>
            <div style={S.sbsItem}>
              <GemeindeErneuerbareWidget
                name={region.name}
                solarKwp={atlas.solar.total_kwp}
                generators={atlas.generators}
                speicherKwh={speicher.kwh_batterie}
                liveUrl={`https://solar-check.io${gemeindePath}`}
                showSource={false}
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
            <MastrHeroSection initialRegion={region.parent_region_id} />
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
          <GemeindeEmbedBox
            name={region.name}
            ags={region.region_id}
            atlasPath={`/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`}
          />
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
  strong: { color: v("--color-text-primary"), fontWeight: 600 },
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
  tend: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
    fontFamily: v("--font-mono"),
    fontSize: 11,
    fontWeight: 600,
  },
  tendCaption: { fontSize: 11, color: v("--color-text-muted"), margin: "0 2px 22px" },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px" },
  section: { marginBottom: 28 },
  // Erneuerbare-Mix + 24h-Sim nebeneinander; auf Mobil untereinander (flex-wrap).
  // stretch → beide Karten gleich hoch; sbsItem als flex, damit die Karte (height
  // 100 %) die gestreckte Höhe füllt.
  sideBySide: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" },
  sbsItem: { flex: "1 1 320px", minWidth: 0, display: "flex" },
  card: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
  },
  barHead: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 },
  barVal: { fontFamily: v("--font-mono"), fontSize: 12, color: v("--color-text-secondary") },
  barTrack: { height: 8, background: v("--color-bg-muted"), borderRadius: 4 },
  barFill: { height: "100%", background: v("--color-accent"), borderRadius: 4 },
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
