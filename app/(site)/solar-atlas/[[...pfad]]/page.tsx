import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Breadcrumb, { type Crumb } from "../../../../components/Breadcrumb";
import RegionSearch from "../../../../components/atlas/RegionSearch";
import { v, space, pad } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import { jsonLdHtml, breadcrumbJsonLd, atlasDatasetJsonLd } from "../../../../lib/json-ld";
import { atlasIsIndexable, atlasRobots } from "../../../../lib/atlas-index";
import ZubauChart from "../../../../components/atlas/ZubauChart";
import RankingTable from "../../../../components/atlas/RankingTable";
import AtlasKpiRow from "../../../../components/atlas/AtlasKpiRow";
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
import { fmtPvLeistung as fmtLeistung, pvLeistungTeile, wattProKopfTeile } from "../../../../lib/atlas-format";
import { getRegionAtlasData } from "../../../../lib/mastr-data";
import { DATA_SOURCES } from "../../../../lib/data-sources";

export const revalidate = 3600;
// Zwei Ziele:
// 1) Ohne generateStaticParams behandelt Next die dynamische Route als voll
//    dynamisch (no-store). Mit ihr wird sie ISR (s-maxage=3600).
// 2) Die INDEXIERTEN Ebenen (DE + Bundesländer, siehe lib/atlas-index.ts) werden
//    beim Build vorgerendert → statisch, KEIN Kaltrender, crawl-freundlich.
//    Kreise/Gemeinden sind noindex + zu zahlreich → bleiben on-demand ISR.
//    Möglich seit mastr_children über den Rollup läuft (~0,1s statt >8s), sonst
//    liefen die 17 Parallel-Renders in den DB-Timeout. Slugs aus der DB (16 Zeilen).
export async function generateStaticParams() {
  try {
    const { supabase } = await import("../../../../lib/supabase-server");
    if (!supabase) return [{ pfad: [] as string[] }];
    const { data } = await supabase
      .from("mastr_regions")
      .select("slug")
      .eq("level", "bundesland")
      .not("slug", "is", null);
    return [
      { pfad: [] as string[] },
      ...((data ?? []) as { slug: string }[]).map((r) => ({ pfad: [r.slug] })),
    ];
  } catch {
    return [{ pfad: [] as string[] }];
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";


const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

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
  if (!region) return { robots: atlasRobots(false) };
  const title = headline(region);
  return {
    ...pageMetadata({
      title: `${title} – Bestand & Zubau`,
      description:
        region.level === "de"
          ? "Wie viel Photovoltaik steht in Deutschland? Bestand und Zubau aus dem Marktstammdatenregister, mit Rangliste aller Bundesländer nach Solarleistung je Einwohner."
          : `Wie viele Solaranlagen stehen ${ortPhrase(region)}? Photovoltaik-Bestand, installierte Leistung und jährlicher Zubau aus dem Marktstammdatenregister.`,
      path: `/solar-atlas${params.pfad?.length ? "/" + params.pfad.join("/") : ""}`,
    }),
    robots: atlasRobots(atlasIsIndexable(region.level)),
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

  // Vergleichs-Ebenen für die „Tendenz je Einwohner" (in der KPI-Reihe umschaltbar):
  // Kreis → Bundesland/Deutschland, Bundesland → Deutschland; Default ist die
  // nächsthöhere Ebene. Deutschland selbst hat keinen Elternteil → keine Tendenz.
  const refChain =
    region.level === "landkreis"
      ? [{ key: "bundesland", ags: region.region_id.slice(0, 2) }, { key: "de", ags: "de" }]
      : region.level === "bundesland"
        ? [{ key: "de", ags: "de" }]
        : [];
  const refData = await Promise.all(
    refChain.map(async (r) => {
      const [a, reg] = await Promise.all([getRegionAtlasData(r.ags), getRegionById(r.ags)]);
      return { key: r.key, name: r.key === "de" ? "Deutschland" : reg?.name ?? r.ags, atlas: a, pop: reg?.population ?? null };
    }),
  );
  type AtlasData = Awaited<ReturnType<typeof getRegionAtlasData>>;
  const perCapOf = (a: AtlasData, pop: number | null) =>
    pop
      ? {
          count: a.solar.total_count / pop,
          kwp: a.solar.total_kwp / pop,
          neuLast: (a.solar.by_year.find((y) => y.year === lastYear)?.count ?? 0) / pop,
          neuThis: (a.solar.by_year.find((y) => y.year === thisYear)?.count ?? 0) / pop,
        }
      : { count: null, kwp: null, neuLast: null, neuThis: null };
  const regionPerCap = perCapOf(atlas, region.population ?? null);
  const kpiRefs = refData
    .filter((r) => r.pop)
    .map((r) => ({ key: r.key, name: r.name, perCap: perCapOf(r.atlas, r.pop) }));
  const kpiTiles = [
    { label: "Solaranlagen", value: nf(atlas.solar.total_count), metric: "count" },
    { label: "Installiert", ...pvLeistungTeile(atlas.solar.total_kwp), metric: "kwp" },
    {
      label: "je Einwohner",
      ...(wPerCapita === null ? { value: "—" } : wattProKopfTeile(wPerCapita)),
      metric: "kwp",
    },
    { label: `Neu ${lastYear}`, value: nf(lastYearRow?.count ?? 0), metric: "neuLast" },
    { label: `Neu ${thisYear} bisher`, value: nf(thisYearRow?.count ?? 0), metric: "neuThis" },
  ];
  const defaultRefKey = kpiRefs[0]?.key ?? "";

  const childNoun =
    childLevel === "bundesland" ? "Bundesländer" : childLevel === "landkreis" ? "Kreise" : "Gemeinden";

  const regionLabel = region.level === "de" ? "Deutschland" : region.name;

  const breadcrumbLd = breadcrumbJsonLd(
    crumbs.map((c) => ({ name: c.label, path: c.href })),
    BASE_URL,
  );
  const datasetLd = atlasDatasetJsonLd({
    name: `Solaranlagen-Bestand ${regionLabel}`,
    description: `Anlagenzahl und installierte Leistung der Photovoltaik ${ortPhrase(region)} aus dem Marktstammdatenregister, mit jährlichem Zubau und Rangliste der ${childNoun}.`,
    url: `${BASE_URL}${basePath}`,
    dateModified: atlas.data_as_of,
    placeName: regionLabel,
    variables: [
      { name: "Solaranlagen in Betrieb", value: atlas.solar.total_count },
      { name: "Installierte Leistung", value: Math.round(atlas.solar.total_kwp), unitText: "kWp" },
      ...(wPerCapita !== null ? [{ name: "Solarleistung je Einwohner", value: wPerCapita, unitText: "Wp" }] : []),
    ],
    baseUrl: BASE_URL,
  });

  return (
    <div style={S.page}>
      {crumbs.length > 1 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetLd) }} />
      <div style={S.wrap}>
        <Breadcrumb items={crumbs} rightSlot={<RegionSearch align="right" />} />

        <div style={S.stand}>
          Stand{" "}
          <time dateTime={atlas.data_as_of} style={S.standDate}>
            {standLabel(atlas.data_as_of)}
          </time>{" "}
          · monatlich aktualisiert
        </div>

        <h1 style={S.h1}>{headline(region)}</h1>
        <p style={S.intro}>
          <strong style={S.strong}>{nf(atlas.solar.total_count)} Solaranlagen</strong> mit zusammen{" "}
          <strong style={S.strong}>{fmtLeistung(atlas.solar.total_kwp)}</strong> installierter Leistung
          sind {ortPhrase(region)} in Betrieb, verteilt auf {nf(children.length)} {childNoun}.
          {wPerCapita !== null && (
            <> Das sind {nf(wPerCapita)} Watt Peak-Leistung je Einwohner.</>
          )}
        </p>

        <div style={S.section}>
          <AtlasKpiRow
            groups={[{ tiles: kpiTiles }]}
            regionPerCap={regionPerCap}
            references={kpiRefs}
            defaultRefKey={defaultRefKey}
          />
        </div>

        {/* Karte nur ab Bundesland-Ebene: die Deutschland-Übersicht zeigt dieselbe
            interaktive Karte schon auf der Startseite — auf der DE-Atlas-Seite wäre
            sie redundant (und dupliziert Inhalt gegenüber der Startseite). Ab
            Bundesland/Kreis zeigt die Karte die konkrete Region und ist einzigartig. */}
        {region.level !== "de" && (
          <div style={S.section}>
            <h2 style={S.h2}>Solaranlagen auf der Karte</h2>
            <p style={S.sub}>
              Tippen Sie auf ein Gebiet, um tiefer einzutauchen — bis auf Gemeindeebene.
            </p>
            <MastrHeroSection initialRegion={region.region_id} initialTraeger="solar" showSource={false} />
          </div>
        )}

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
            popInMillions={childLevel === "bundesland"}
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
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur), Stand {standLabel(atlas.data_as_of)},
          monatlich aktualisiert, Datenlizenz{" "}
          <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer" style={S.licLink}>
            dl-de/by-2-0
          </a>{" "}
          (Daten aggregiert). Einwohnerzahlen: {DATA_SOURCES.destatis.name}, Gemeindeverzeichnis
          {region.population_as_of ? `, Stand ${standLabel(region.population_as_of)}` : ""}, Datenlizenz
          dl-de/by-2-0.{" "}
          {region.level !== "de" && (
            // Kartengeometrien: die Karte zeigt ihren Credit auf dieser Seite nicht
            // mehr (showSource=false), daher steht die BKG-Attribution hier.
            <>Kartengeometrien: GeoBasis-DE / BKG, Datenlizenz dl-de/by-2-0 (vereinfacht). </>
          )}
          Gezählt werden nur Anlagen in Betrieb. Alle Angaben sind Näherungswerte ohne
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
    // Top-Padding 0: der Abstand Header→Content kommt zentral aus dem Layout
    // (headerContentGap), analog zu den übrigen (site)-Seiten.
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  stand: { fontSize: 11, color: v("--color-text-muted"), marginBottom: space.sm },
  standDate: { fontFamily: v("--font-mono"), color: v("--color-text-secondary") },
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: `0 0 ${space.md}px` },
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.xxl}px` },
  strong: { color: v("--color-text-primary"), fontWeight: 600 },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: space.lg,
    marginBottom: space.xxl,
  },
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: space.xl },
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: space.xs },
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 },
  tendCaption: { fontSize: 11, color: v("--color-text-muted"), margin: `0 ${space.xxs}px ${space.xxl}px` },
  h2: { fontSize: 16, fontWeight: 700, margin: `0 0 ${space.xs}px` },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px`, lineHeight: 1.6 },
  section: { marginBottom: space.huge },
  card: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: pad("xl"),
  },
  link: { color: v("--color-accent"), textDecoration: "none", fontSize: 14, fontWeight: 600 },
  disclaimer: {
    fontSize: 11,
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    borderTop: `1px solid ${v("--color-border")}`,
    paddingTop: space.lg,
    marginBottom: space.xxxl,
  },
  licLink: { color: "inherit", textDecoration: "underline" },
};
