import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../../../components/Header";
import { IconArrowRight } from "../../../../../../components/Icons";
import { v } from "../../../../../../lib/theme";
import { pageMetadata } from "../../../../../../lib/seo";
import MetricToggle from "../../../../../../components/atlas/MetricToggle";
import ZubauChart from "../../../../../../components/atlas/ZubauChart";
import {
  resolveSlugPath,
  getRegionById,
  getChildren,
  rankableCount,
  lastFullYear,
  currentYear,
  type AtlasRegion,
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

function fmtLeistung(kwp: number): string {
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(Math.round(kwp))} kW`;
}

const SEGMENT_LABEL: Record<string, string> = {
  steckersolar: "Steckersolar (Balkonkraftwerke)",
  privat_dach: "Private Dächer",
  gewerbe_dach: "Gewerbedächer",
  freiflaeche: "Freiflächenanlagen",
};

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
  const [atlas, siblings, kreisRegion, blRegion, deRegion] = await Promise.all([
    getRegionAtlasData(region.region_id),
    kreis ? getChildren(kreis) : Promise.resolve([]),
    kreis ? getChildren(kreis).then(() => getRegionById(kreis.region_id)) : Promise.resolve(null),
    getRegionById(blAgs),
    getRegionById("de"),
  ]);

  const me = siblings.find((s) => s.region_id === region.region_id);
  const of = rankableCount(siblings);

  const freiflaeche = atlas.solar.by_segment.find((s) => s.segment === "freiflaeche");
  const hasFreiflaeche = (freiflaeche?.count ?? 0) > 0;

  // Parent per-capita values, computed the same way as the Gemeinde's own so the
  // bars compare like with like.
  const parentMetric = async (r: AtlasRegion | null, dachOnly: boolean): Promise<number | null> => {
    if (!r?.population) return null;
    const d = await getRegionAtlasData(r.region_id);
    const kwp = dachOnly
      ? d.solar.by_segment.filter((s) => s.segment !== "freiflaeche").reduce((a, s) => a + s.kwp, 0)
      : d.solar.total_kwp;
    return Math.round((kwp * 1000) / r.population);
  };

  const [kreisGesamt, kreisDach, blGesamt, blDach, deGesamt, deDach] = await Promise.all([
    parentMetric(kreisRegion, false),
    parentMetric(kreisRegion, true),
    parentMetric(blRegion, false),
    parentMetric(blRegion, true),
    parentMetric(deRegion, false),
    parentMetric(deRegion, true),
  ]);

  const lastYear = lastFullYear();
  const thisYear = currentYear();
  const lastYearRow = atlas.solar.by_year.find((y) => y.year === lastYear);
  const thisYearRow = atlas.solar.by_year.find((y) => y.year === thisYear);
  const speicher = atlas.speicher;

  const basePath = `/solar-atlas/${params.bundesland}/${params.kreis}`;

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <nav style={S.breadcrumb}>
          <Link href="/solar-atlas" style={S.crumb}>Solar-Atlas</Link>
          {" › "}
          <Link href={`/solar-atlas/${params.bundesland}`} style={S.crumb}>{bl?.name ?? blAgs}</Link>
          {" › "}
          <Link href={basePath} style={S.crumb}>{kreis?.name ?? params.kreis}</Link>
          {" › "}
          <span>{region.name}</span>
        </nav>

        <h1 style={S.h1}>Solaranlagen in {region.name}</h1>
        <p style={S.intro}>
          In {region.bezeichnung === "Markt" ? "der Marktgemeinde" : region.bezeichnung === "Stadt" ? "der Stadt" : ""}{" "}
          {region.name} sind <strong style={S.strong}>{nf(atlas.solar.total_count)} Solaranlagen</strong> mit
          zusammen <strong style={S.strong}>{fmtLeistung(atlas.solar.total_kwp)}</strong> in Betrieb.
          {region.population ? ` Auf ${nf(region.population)} Einwohner gerechnet ergibt das den Wert unten.` : ""}
        </p>

        <MetricToggle
          regionName={region.name}
          ownHasFreiflaeche={hasFreiflaeche}
          gesamt={{
            value: me?.wPerCapita ?? null,
            rank: me?.rank ?? null,
            of,
            vergleich: [
              { label: `→ ${region.name}`, value: me?.wPerCapita ?? null },
              { label: kreis?.name ?? "Landkreis", value: kreisGesamt },
              { label: bl?.name ?? "Bundesland", value: blGesamt },
              { label: "Deutschland", value: deGesamt },
            ],
          }}
          dach={{
            value: me?.wPerCapitaDach ?? null,
            rank: me?.rankDach ?? null,
            of,
            vergleich: [
              { label: `→ ${region.name}`, value: me?.wPerCapitaDach ?? null },
              { label: kreis?.name ?? "Landkreis", value: kreisDach },
              { label: bl?.name ?? "Bundesland", value: blDach },
              { label: "Deutschland", value: deDach },
            ],
          }}
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

        {atlas.solar.by_segment.length > 0 && (
          <div style={S.section}>
            <h2 style={S.h2}>Wo die Anlagen stehen</h2>
            <p style={S.sub}>Nach Anlagenart, gemessen an der installierten Leistung</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {(() => {
                const max = Math.max(...atlas.solar.by_segment.map((s) => s.kwp));
                return atlas.solar.by_segment.map((s) => (
                  <div key={s.segment}>
                    <div style={S.barHead}>
                      <span>{SEGMENT_LABEL[s.segment] ?? s.segment}</span>
                      <span style={S.barVal}>
                        {fmtLeistung(s.kwp)} · {nf(s.count)} Anlagen
                      </span>
                    </div>
                    <div style={S.barTrack}>
                      <div
                        style={{
                          ...S.barFill,
                          width: `${Math.max(2, Math.round((s.kwp / max) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

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
  breadcrumb: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 8 },
  crumb: { color: v("--color-text-secondary"), textDecoration: "none" },
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
