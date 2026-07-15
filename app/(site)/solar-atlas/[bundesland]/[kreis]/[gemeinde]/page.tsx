import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../../../components/Header";
import Breadcrumb from "../../../../../../components/Breadcrumb";
import { IconArrowRight } from "../../../../../../components/Icons";
import { v } from "../../../../../../lib/theme";
import { pageMetadata } from "../../../../../../lib/seo";
import ZubauChart from "../../../../../../components/atlas/ZubauChart";
import GemeindeHero, { type HeroPeer } from "../../../../../../components/atlas/GemeindeHero";
import {
  resolveSlugPath,
  getRegionById,
  lastFullYear,
  currentYear,
  peerBand,
  getTopGemeinden,
  type TopGemeinde,
  type Owner,
} from "../../../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";

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

  const basePath = `/solar-atlas/${params.bundesland}/${params.kreis}`;

  // Peers per owner filter, so the reader can switch without a round trip.
  // The size band is what makes the comparison mean anything: unfiltered, the
  // national leader is a 55-inhabitant Koog at 48.115 W per head — a number that
  // measures the denominator, not the effort. Within half to double this
  // Gemeinde's population it bites: Pilsting has 7.158 to Höchberg's 9.564 and
  // reaches 6.210 W per head against 954.
  const band = region.population ? peerBand(region.population) : { min: 0, max: 0 };
  const OWNERS: Owner[] = ["alle", "privat", "gewerbe"];
  const perOwner = await Promise.all(
    OWNERS.map(async (owner) => {
      const [kreisAll, blTop, deTop] = await Promise.all([
        // The whole Kreis, ranked — the top five to show, and this Gemeinde's own
        // position, which is rarely among them.
        getTopGemeinden({ prefix: kreis?.region_id ?? "", owner, limit: 500 }),
        region.population
          ? getTopGemeinden({ prefix: blAgs, owner, limit: 1, minPop: band.min, maxPop: band.max })
          : Promise.resolve([]),
        region.population
          ? getTopGemeinden({ prefix: "", owner, limit: 1, minPop: band.min, maxPop: band.max })
          : Promise.resolve([]),
      ]);
      return { owner, kreisTop: kreisAll.slice(0, 5), self: kreisAll.find((t) => t.region_id === region.region_id), blTop, deTop };
    }),
  );

  const kreisLabel = kreis?.name ?? "Landkreis";
  const blName = bl?.name ?? "Bundesland";

  // Merge the three owner views into one row set: every peer carries a value per
  // filter, so switching is a lookup rather than a refetch.
  const peerMap = new Map<string, HeroPeer>();
  const put = (t: TopGemeinde, owner: Owner, scope: string) => {
    const row: HeroPeer =
      peerMap.get(t.region_id) ??
      {
        region_id: t.region_id,
        name: t.name,
        href: t.slug && kreis ? `${basePath}/${t.slug}` : null,
        population: t.population,
        values: { alle: null, privat: null, gewerbe: null },
        rang: { alle: null, privat: null, gewerbe: null },
        scope,
        isSelf: t.region_id === region.region_id,
      };
    row.values[owner] = t.w_per_capita;
    row.rang[owner] = t.rang;
    peerMap.set(t.region_id, row);
  };
  for (const { owner, kreisTop, self, blTop, deTop } of perOwner) {
    for (const t of kreisTop) put(t, owner, kreisLabel);
    for (const t of blTop) put(t, owner, `${blName}, Größenklasse`);
    for (const t of deTop) put(t, owner, "bundesweit, Größenklasse");
    // This Gemeinde, for every filter — not just the first one round the loop.
    if (self) put(self, owner, kreisLabel);
  }
  const peers = Array.from(peerMap.values());

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

        <GemeindeHero cells={atlas.solar.by_segment} peers={peers} regionName={region.name} />

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
            <div style={S.metricValue}>{nf(speicher.count)}</div>
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

        <div style={S.section}>
          <h2 style={S.h2}>Förderung</h2>
          <p style={S.sub}>Zuschüsse von Land und Kommune — getrennt vom Bestand geführt</p>
          <Link href={`/photovoltaik-foerderung/${params.bundesland}`} style={S.linkRow}>
            <span>Förderprogramme in {bl?.name ?? "diesem Bundesland"}</span>
            <IconArrowRight size={14} />
          </Link>
        </div>

        <div style={S.section}>
          <div style={{ ...S.card, background: v("--color-bg-muted") }}>
            <h2 style={{ ...S.h2, marginBottom: 6 }}>Sie arbeiten für die Gemeinde?</h2>
            <p style={{ ...S.sub, marginBottom: 0 }}>
              Diese Zahlen lassen sich als Widget auf der Website von {region.name} einbinden —
              cookiefrei, ohne Browser-Speicher und monatlich aktuell.{" "}
              <Link href="/energie-widgets" style={{ color: v("--color-accent") }}>
                Zu den Widgets
              </Link>
            </p>
          </div>
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
