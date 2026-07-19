import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "../../../../components/Header";
import Breadcrumb, { type Crumb } from "../../../../components/Breadcrumb";
import { v } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import { jsonLdHtml, breadcrumbJsonLd } from "../../../../lib/json-ld";
import ZubauChart from "../../../../components/atlas/ZubauChart";
import RankingTable from "../../../../components/atlas/RankingTable";
import { MastrHeroSection } from "../../../../components/MastrHeroSection";
import {
  resolveSlugPath,
  getRegionById,
  getAncestors,
  getChildren,
  getRankingData,
  childLevelOf,
  lastFullYear,
  currentYear,
  type AtlasRegion,
} from "../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../lib/mastr-data";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

/** Pilot: built and reviewable, out of the index until Welle 1. */
const PILOT_NOINDEX = { index: false, follow: false } as const;

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

function fmtLeistung(kwp: number): string {
  if (kwp >= 1_000_000) return `${(kwp / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GW`;
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW`;
  return `${nf(kwp)} kW`;
}

function standLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

type Params = { pfad?: string[] };

/** Deutschland when the path is empty, otherwise whatever the slugs resolve to. */
async function resolve(pfad: string[] | undefined): Promise<AtlasRegion | null> {
  if (!pfad || pfad.length === 0) return getRegionById("de");
  if (pfad.length > 3) return null;
  return resolveSlugPath(pfad);
}

function headline(region: AtlasRegion): string {
  if (region.level === "de") return "Solaranlagen in Deutschland";
  if (region.level === "bundesland") return `Solaranlagen in ${region.name}`;
  // "im Landkreis Würzburg", but "in Würzburg" for a kreisfreie Stadt.
  const nennt = region.bezeichnung === "Landkreis" || region.bezeichnung === "Kreis";
  return `Solaranlagen ${nennt ? "im" : "in"} ${region.name}`;
}

/** Locative phrase for headings and copy: "in Deutschland", "in Bayern",
 *  "im Landkreis Würzburg". region.name already carries the "Landkreis" prefix. */
function ortPhrase(region: AtlasRegion): string {
  if (region.level === "de") return "in Deutschland";
  const nennt = region.bezeichnung === "Landkreis" || region.bezeichnung === "Kreis";
  return `${nennt ? "im" : "in"} ${region.name}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = await resolve(params.pfad);
  if (!region) return { robots: PILOT_NOINDEX };
  const title = headline(region);
  const childLevel = childLevelOf(region);
  const childNoun =
    childLevel === "bundesland" ? "Bundesländer" : childLevel === "landkreis" ? "Kreise" : "Gemeinden";
  return {
    ...pageMetadata({
      title: `${title} – Bestand & Zubau`,
      description:
        region.level === "de"
          ? "Wie viel Photovoltaik steht in Deutschland? Bestand und Zubau aus dem Marktstammdatenregister, mit Rangliste aller Bundesländer nach Solarleistung je Einwohner."
          : `Wie viele Solaranlagen stehen ${ortPhrase(region)}? Photovoltaik-Bestand, installierte Leistung und Zubau aus dem Marktstammdatenregister — je Einwohner vergleichbar, mit Rangliste der ${childNoun}.`,
      path: `/solar-atlas${params.pfad?.length ? "/" + params.pfad.join("/") : ""}`,
    }),
    robots: PILOT_NOINDEX,
  };
}

export default async function AtlasPage({ params }: { params: Params }) {
  const region = await resolve(params.pfad);
  if (!region) notFound();

  const childLevel = childLevelOf(region);

  // A kreisfreie Stadt sits at Kreis level but has exactly one Gemeinde beneath
  // it — itself. A ranking of one row is nonsense, so send it to the leaf page
  // that actually says something.
  if (region.level === "landkreis") {
    const kids = await getChildren(region);
    if (kids.length === 1 && kids[0].slug) {
      redirect(`/solar-atlas/${(params.pfad ?? []).join("/")}/${kids[0].slug}`);
    }
  }
  if (!childLevel) notFound();

  const [atlas, children, ancestors, ranking] = await Promise.all([
    getRegionAtlasData(region.region_id),
    getChildren(region),
    getAncestors(region),
    getRankingData(region),
  ]);

  const crumbs: Crumb[] = [
    { label: "Solar-Atlas", href: "/solar-atlas" },
    ...ancestors
      .filter((a) => a.level !== "de")
      .map((a, i) => ({
        label: a.name,
        href: `/solar-atlas/${(params.pfad ?? []).slice(0, i + 1).join("/")}`,
      })),
    ...(region.level === "de" ? [] : [{ label: region.name }]),
  ];

  const basePath = `/solar-atlas${params.pfad?.length ? "/" + params.pfad.join("/") : ""}`;
  const lastYear = lastFullYear();
  const thisYear = currentYear();
  const lastYearRow = atlas.solar.by_year.find((y) => y.year === lastYear);
  const thisYearRow = atlas.solar.by_year.find((y) => y.year === thisYear);
  const wPerCapita = region.population
    ? Math.round((atlas.solar.total_kwp * 1000) / region.population)
    : null;

  const childNoun =
    childLevel === "bundesland" ? "Bundesländer" : childLevel === "landkreis" ? "Kreise" : "Gemeinden";

  const regionLabel = region.level === "de" ? "Deutschland" : region.name;

  const breadcrumbLd = breadcrumbJsonLd(
    crumbs.map((c) => ({ name: c.label, path: c.href })),
    BASE_URL,
  );
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Solaranlagen-Bestand ${regionLabel}`,
    description: `Anlagenzahl und installierte Leistung der Photovoltaik ${ortPhrase(region)} aus dem Marktstammdatenregister, mit jährlichem Zubau und Rangliste der ${childNoun}.`,
    url: `${BASE_URL}${basePath}`,
    license: "https://www.govdata.de/dl-de/by-2-0",
    creator: { "@type": "Organization", name: "Solar Check", url: BASE_URL },
    isBasedOn: "https://www.marktstammdatenregister.de",
    dateModified: atlas.data_as_of,
    spatialCoverage: { "@type": "Place", name: regionLabel },
    variableMeasured: [
      { "@type": "PropertyValue", name: "Solaranlagen in Betrieb", value: atlas.solar.total_count },
      { "@type": "PropertyValue", name: "Installierte Leistung", value: Math.round(atlas.solar.total_kwp), unitText: "kWp" },
      ...(wPerCapita !== null
        ? [{ "@type": "PropertyValue", name: "Solarleistung je Einwohner", value: wPerCapita, unitText: "W" }]
        : []),
    ],
  };

  return (
    <div style={S.page}>
      <Header />
      {crumbs.length > 1 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetLd) }} />
      <div style={S.wrap}>
        {crumbs.length > 1 ? <Breadcrumb items={crumbs} /> : <div style={{ height: 8 }} />}

        <div style={S.stand}>
          Stand{" "}
          <time dateTime={atlas.data_as_of} style={S.standDate}>
            {standLabel(atlas.data_as_of)}
          </time>{" "}
          · Marktstammdatenregister · monatlich aktualisiert
        </div>

        <h1 style={S.h1}>{headline(region)}</h1>
        <p style={S.intro}>
          <strong style={S.strong}>{nf(atlas.solar.total_count)} Solaranlagen</strong> mit zusammen{" "}
          <strong style={S.strong}>{fmtLeistung(atlas.solar.total_kwp)}</strong> installierter Leistung
          sind {ortPhrase(region)} in Betrieb, verteilt auf {nf(children.length)} {childNoun}.
          {wPerCapita !== null && (
            <> Das sind {nf(wPerCapita)} Watt Photovoltaik-Leistung je Einwohner.</>
          )}
        </p>

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
            <div style={S.metricLabel}>W je Einwohner</div>
            <div style={S.metricValue}>{wPerCapita === null ? "—" : nf(wPerCapita)}</div>
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

        <div style={S.section}>
          <h2 style={S.h2}>Solaranlagen auf der Karte</h2>
          <p style={S.sub}>
            Tippen Sie auf ein Gebiet, um tiefer einzutauchen — bis auf Gemeindeebene.
          </p>
          <MastrHeroSection initialRegion={region.level === "de" ? "de" : region.region_id} />
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>
            {region.level === "de" ? "Rangliste der Bundesländer" : `Rangliste der ${childNoun} ${ortPhrase(region)}`}
          </h2>
          <p style={S.sub}>
            „Privat" zählt private Dächer, Balkonkraftwerke und Hausbatterien, „Gewerbe"
            gewerbliche Dächer, Freiflächen-Parks und gewerbliche Speicher.
          </p>
          <RankingTable
            regions={ranking.regions}
            cells={ranking.cells}
            basePath={basePath}
            lastFullYear={lastYear}
          />
        </div>

        {atlas.solar.by_year.length >= 4 && (
          <div style={S.section}>
            <h2 style={S.h2}>Zubau pro Jahr {ortPhrase(region)}</h2>
            <p style={S.sub}>Neu in Betrieb genommene Solaranlagen</p>
            <ZubauChart years={atlas.solar.by_year} />
          </div>
        )}

        {region.level === "de" && (
          <div style={S.section}>
            <div style={S.card}>
              <h2 style={{ ...S.h2, marginBottom: 6 }}>Deutschland im internationalen Vergleich</h2>
              <p style={{ ...S.sub, marginBottom: 12 }}>
                Wie der deutsche Ausbau gegenüber anderen Ländern dasteht, zeigt der Ländervergleich.
              </p>
              <Link href="/laendervergleich" style={S.link}>
                Photovoltaik-Ausbau im Ländervergleich
              </Link>
            </div>
          </div>
        )}

        {region.level === "bundesland" && region.slug && (
          <div style={S.section}>
            <h2 style={S.h2}>Förderung</h2>
            <p style={S.sub}>Zuschüsse von Land und Kommunen — getrennt vom Bestand geführt</p>
            <Link href={`/photovoltaik-foerderung/${region.slug}`} style={S.link}>
              Förderprogramme in {region.name}
            </Link>
          </div>
        )}

        <div style={S.disclaimer}>
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur), Stand {atlas.data_as_of},
          monatlich aktualisiert, Datenlizenz{" "}
          <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer" style={S.licLink}>
            dl-de/by-2-0
          </a>{" "}
          (Daten aggregiert). Einwohnerzahlen: Statistisches Bundesamt, Gemeindeverzeichnis
          {region.population_as_of ? `, Stand ${region.population_as_of}` : ""}, Datenlizenz
          dl-de/by-2-0. Gezählt werden nur Anlagen in Betrieb. Alle Angaben sind Näherungswerte ohne
          Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit.
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
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px", lineHeight: 1.6 },
  section: { marginBottom: 28 },
  card: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
  },
  link: { color: v("--color-accent"), textDecoration: "none", fontSize: 14, fontWeight: 600 },
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
