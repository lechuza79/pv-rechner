import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../../../components/Header";
import Breadcrumb from "../../../../../../components/Breadcrumb";
import { IconArrowRight } from "../../../../../../components/Icons";
import { v } from "../../../../../../lib/theme";
import { pageMetadata } from "../../../../../../lib/seo";
import ZubauChart from "../../../../../../components/atlas/ZubauChart";
import GemeindeHero, { type OutsidePeer } from "../../../../../../components/atlas/GemeindeHero";
import GemeindeEmbedBox from "../../../../../../components/atlas/GemeindeEmbedBox";
import {
  resolveSlugPath,
  getRegionById,
  lastFullYear,
  currentYear,
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

type Params = { bundesland: string; kreis: string; gemeinde: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region) return { robots: PILOT_NOINDEX };
  return {
    ...pageMetadata({
      title: `Solaranlagen in ${region.name} – Bestand und Zubau`,
      description: `Wie viele Solaranlagen stehen in ${region.name}? Anlagenzahl, installierte Leistung und Zubau aus dem Marktstammdatenregister — je Einwohner und im Vergleich zum Landkreis.`,
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
  const thisYear = currentYear();
  const lastYearRow = atlas.solar.by_year.find((y) => y.year === lastYear);
  const thisYearRow = atlas.solar.by_year.find((y) => y.year === thisYear);
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

  const basePath = `/solar-atlas/${params.bundesland}/${params.kreis}`;

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

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Solar-Atlas", href: "/solar-atlas" },
            { label: bl?.name ?? blAgs, href: `/solar-atlas/${params.bundesland}` },
            { label: kreis?.name ?? params.kreis, href: basePath },
            { label: region.name },
          ]}
        />

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
          In {region.bezeichnung === "Markt" ? "der Marktgemeinde" : region.bezeichnung === "Stadt" ? "der Stadt" : ""}{" "}
          {region.name} sind <strong style={S.strong}>{nf(atlas.solar.total_count)} Solaranlagen</strong> mit
          zusammen <strong style={S.strong}>{fmtLeistung(atlas.solar.total_kwp)}</strong> in Betrieb.
          {region.population ? ` Auf ${nf(region.population)} Einwohner gerechnet ergibt das den Wert unten.` : ""}
        </p>

        <GemeindeHero
          cells={atlas.solar.by_segment}
          siblings={siblingData.regions}
          siblingCells={siblingData.cells}
          outside={outside}
          regionId={region.region_id}
          regionName={region.name}
          basePath={basePath}
        />

        <div style={S.metricsGrid}>
          <div style={S.metric}>
            <div style={S.metricLabel}>Solaranlagen</div>
            <div style={S.metricValue}>{nf(atlas.solar.total_count)}</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Installiert</div>
            <div style={S.metricValue}>{fmtLeistung(atlas.solar.total_kwp)}</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Batteriespeicher</div>
            <div style={S.metricValue}>{fmtKwh(speicher.kwh_batterie)}</div>
            <div style={S.metricSub}>
              {nf(speicher.count)} Anlagen
              {speicherProKwp !== null && ` · ${speicherProKwp.toLocaleString("de-DE", { maximumFractionDigits: 2 })} kWh je kWp`}
            </div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Neu {lastYear}</div>
            <div style={S.metricValue}>{nf(lastYearRow?.count ?? 0)}</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Neu {thisYear} bisher</div>
            <div style={S.metricValue}>{nf(thisYearRow?.count ?? 0)}</div>
          </div>
        </div>

        {atlas.solar.by_year.length >= 4 && (
          <div style={S.section}>
            <h2 style={S.h2}>Zubau pro Jahr</h2>
            <p style={S.sub}>Neu in Betrieb genommene Solaranlagen</p>
            <ZubauChart years={atlas.solar.by_year} />
          </div>
        )}

        <div style={S.section}>
          <div style={S.card}>
            <h2 style={{ ...S.h2, marginBottom: 6 }}>Was bringt eine Anlage in {region.name}?</h2>
            <p style={{ ...S.sub, marginBottom: 14 }}>
              Der Rechner nutzt den Sonnenertrag Ihres Standorts und rechnet mit aktuellen
              Marktpreisen — ohne Anmeldung, ohne Datenabfrage.
            </p>
            <Link href="/photovoltaik-rechner" style={S.cta}>
              Rentabilität berechnen <IconArrowRight size={15} />
            </Link>
          </div>
        </div>

        {(ownCity || hasLandProgram) && (
          <div style={S.section}>
            <h2 style={S.h2}>Förderung</h2>
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
          Datenlizenz dl-de/by-2-0. Gezählt werden nur Anlagen in Betrieb. Alle Angaben sind
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
    marginBottom: 28,
  },
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 },
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 4 },
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 },
  metricSub: { fontSize: 10, color: v("--color-text-muted"), marginTop: 3, lineHeight: 1.4 },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px" },
  section: { marginBottom: 28 },
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
