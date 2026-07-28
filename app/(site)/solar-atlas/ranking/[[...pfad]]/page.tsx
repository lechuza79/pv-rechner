import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb, { type Crumb } from "../../../../../components/Breadcrumb";
import { IconArrowRight } from "../../../../../components/Icons";
import { v, space, pad } from "../../../../../lib/theme";
import { pageMetadata } from "../../../../../lib/seo";
import { atlasRobots } from "../../../../../lib/atlas-index";
import { resolveSlugPath, getRegionById, getChildren, type AtlasRegion } from "../../../../../lib/atlas";
import { ortPhrase } from "../../../../../lib/atlas-orte";
import { loadAwardStats, loadElternSlugs } from "../../../../../lib/awards-server";
import { formatAwardValue } from "../../../../../lib/awards";
import {
  rankingKategorien,
  kategorieBySlug,
  rankingRows,
  rankingTitel,
  RANKING_MIN_POPULATION,
} from "../../../../../lib/atlas-ranking";
import { DATA_SOURCES } from "../../../../../lib/data-sources";

export const revalidate = 3600;

// Kein Vorab-Rendern: Drei Kategorien × 417 Gebiete sind über 1.200 Seiten, und
// Next rendert die Einträge dieser Liste PARALLEL — genau das hat am 27.07.2026
// mit 17 Seiten die Produktion gekippt. Die Seiten kommen on-demand (ISR) und
// liegen danach im CDN.
export function generateStaticParams() {
  return [];
}

// NOINDEX, bewusst und vorerst: Alles, was zwischen den Index-Wellen entsteht,
// geht ohne Index raus (Betreiber-Entscheidung 28.07.2026). Für Menschen sind
// die Seiten normal erreichbar und verlinkt.
const ROBOTS = atlasRobots(false);

const BASIS = "/solar-atlas/ranking";
const nf = (n: number) => n.toLocaleString("de-DE");

/** So viele Zeilen zeigt eine Seite. Deutschland hat über 10.000 Kommunen —
 *  die vollständige Liste wäre ein Megabyte Markup für eine Seite, die niemand
 *  bis Platz 8.000 liest. Was fehlt, steht ehrlich darunter. */
const MAX_ZEILEN = 200;

type Params = { pfad?: string[] };

/** Pfad → Kategorie + Gebiet. Ohne Kategorie ist es die Übersichtsseite. */
async function deute(pfad: string[] | undefined) {
  const [katSlug, ...gebiet] = pfad ?? [];
  if (!katSlug) return { uebersicht: true as const };
  const kategorie = kategorieBySlug(katSlug);
  if (!kategorie || gebiet.length > 2) return null;
  const region: AtlasRegion | null = gebiet.length ? await resolveSlugPath(gebiet) : await getRegionById("de");
  if (!region) return null;
  // Gemeinden sind die Zeilen dieser Listen, keine eigenen Ranking-Gebiete.
  if (region.level === "gemeinde") return null;
  return { uebersicht: false as const, kategorie, region, gebiet };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await deute(params.pfad);
  if (!d) return { robots: ROBOTS };
  if (d.uebersicht) {
    return {
      ...pageMetadata({
        title: "Solar-Rankings der Kommunen – wer vorn liegt",
        description:
          "Ranglisten aller Kommunen nach Solarleistung, Balkonkraftwerken und Speicherkapazität je Einwohner — aus dem Marktstammdatenregister.",
        path: BASIS,
      }),
      robots: ROBOTS,
    };
  }
  const wo = d.region.level === "de" ? "in Deutschland" : ortPhrase(d.region);
  return {
    ...pageMetadata({
      title: `Ranking: ${rankingTitel(d.kategorie, wo)}`,
      description: `Welche Kommunen ${wo} bei ${d.kategorie.themaDativ} vorn liegen — gerechnet aus dem Marktstammdatenregister.`,
      path: `${BASIS}/${(params.pfad ?? []).join("/")}`,
    }),
    robots: ROBOTS,
  };
}

export default async function RankingPage({ params }: { params: Params }) {
  const d = await deute(params.pfad);
  if (!d) notFound();

  if (d.uebersicht) return <Uebersicht />;

  const { kategorie, region } = d;
  const wo = region.level === "de" ? "in Deutschland" : ortPhrase(region);
  const scopeId = region.level === "de" ? null : region.region_id;

  const [stats, elternSlugs, kinder] = await Promise.all([
    loadAwardStats(),
    loadElternSlugs(),
    // Eine Ebene tiefer weiterblättern — von Deutschland in die Länder, vom
    // Land in die Kreise. Auf Kreisebene sind die Kommunen schon die Zeilen.
    region.level === "landkreis" ? Promise.resolve([]) : getChildren(region),
  ]);

  const alle = rankingRows(stats, kategorie, scopeId);
  const zeilen = alle.slice(0, MAX_ZEILEN);
  const slugVon = new Map(stats.map((g) => [g.regionId, g.slug ?? null]));
  const pfadVon = (id: string): string | null => {
    const bl = elternSlugs[id.slice(0, 2)];
    const kreis = elternSlugs[id.slice(0, 5)];
    const gem = slugVon.get(id);
    return bl && kreis && gem ? `/solar-atlas/${bl}/${kreis}/${gem}` : null;
  };

  const crumbs: Crumb[] = [
    { label: "Solar-Atlas", href: "/solar-atlas" },
    { label: "Rankings", href: BASIS },
    { label: kategorie.thema, href: `${BASIS}/${kategorie.slug}` },
    ...(region.level === "de" ? [] : [{ label: region.name }]),
  ];

  const kindWort = region.level === "de" ? "Bundesland" : "Landkreis";

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={crumbs} />

        <h1 style={S.h1}>{rankingTitel(kategorie, wo)}</h1>
        <p style={S.intro}>
          {alle.length > 0 ? (
            <>
              {/* „sortiert nach" verlangt den Dativ — dafür gibt es themaDativ.
                  Der Rest als ein Textstück, sonst setzt React zwischen die
                  Knoten ein Leerzeichen und der Punkt rutscht ab. */}
              <strong style={S.strong}>{nf(alle.length)} Kommunen</strong>
              {` ${wo} sind gewertet, sortiert nach ${kategorie.themaDativ}. Gerechnet aus dem Marktstammdatenregister.`}
            </>
          ) : (
            <>Für diese Auswahl liegen keine wertbaren Zahlen vor.</>
          )}
        </p>

        {/* Kategorie wechseln, Gebiet behalten — der häufigste Sprung. */}
        <div style={S.kats}>
          {rankingKategorien().map((k) => {
            const aktiv = k.slug === kategorie.slug;
            return (
              <Link
                key={k.slug}
                href={`${BASIS}/${k.slug}${d.gebiet.length ? "/" + d.gebiet.join("/") : ""}`}
                style={{
                  ...S.kat,
                  background: aktiv ? v("--color-accent") : "transparent",
                  color: aktiv ? v("--color-text-on-accent") : v("--color-text-secondary"),
                  borderColor: aktiv ? v("--color-accent") : v("--color-border"),
                }}
              >
                {k.thema}
              </Link>
            );
          })}
        </div>

        {zeilen.length > 0 && (
          <ol style={S.liste}>
            {zeilen.map((r) => {
              const href = pfadVon(r.regionId);
              const inhalt = (
                <>
                  <span style={S.platz}>{r.platz}.</span>
                  <span style={S.name}>
                    {r.platz === 1 && (
                      <span aria-hidden style={S.krone}>
                        👑
                      </span>
                    )}
                    {r.name}
                  </span>
                  <span style={S.wert}>{formatAwardValue(r.wert, kategorie.format)}</span>
                </>
              );
              return (
                <li key={r.regionId}>
                  {href ? (
                    <Link href={href} className="atlas-rank-row" style={{ ...S.zeile, ...S.zeileLink }}>
                      {inhalt}
                      <span className="atlas-go" style={S.go} aria-hidden>
                        <IconArrowRight size={12} />
                      </span>
                    </Link>
                  ) : (
                    <div style={S.zeile}>
                      {inhalt}
                      <span aria-hidden />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {alle.length > zeilen.length && (
          <p style={S.gekuerzt}>
            Gezeigt sind die ersten {nf(zeilen.length)} von {nf(alle.length)} Kommunen. Für die vollständige Liste
            eine Ebene tiefer gehen.
          </p>
        )}

        {kinder.length > 0 && (
          <div style={S.section}>
            <h2 style={S.h2}>Nach {kindWort}</h2>
            <div style={S.gebiete}>
              {kinder
                .filter((k) => k.slug)
                .map((k) => (
                  <Link
                    key={k.region_id}
                    href={`${BASIS}/${kategorie.slug}/${[...d.gebiet, k.slug].join("/")}`}
                    style={S.gebiet}
                  >
                    {k.name}
                  </Link>
                ))}
            </div>
          </div>
        )}

        <div style={S.disclaimer}>
          Gewertet werden Kommunen ab {nf(RANKING_MIN_POPULATION)} Einwohnern — darunter kippt jede Pro-Kopf-Zahl
          schon an einer einzelnen Anlage. Bestandsdaten: {DATA_SOURCES.mastr.name}, Datenlizenz dl-de/by-2-0 (Daten
          aggregiert). Einwohnerzahlen: {DATA_SOURCES.destatis.name}, Gemeindeverzeichnis, Datenlizenz dl-de/by-2-0.
          Alle Angaben sind Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit.
        </div>
      </div>
    </div>
  );
}

/** Einstieg: welche Ranglisten es gibt. */
function Uebersicht() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Solar-Atlas", href: "/solar-atlas" }, { label: "Rankings" }]} />
        <h1 style={S.h1}>Rankings der Kommunen</h1>
        <p style={S.intro}>
          Wer baut am meisten — gemessen an der Einwohnerzahl, nicht an der Größe der Gemeinde. Jede Liste führt
          jede gewertete Kommune, von Deutschland über die Länder bis in den Landkreis.
        </p>
        <div style={S.karten}>
          {rankingKategorien().map((k) => (
            <Link key={k.slug} href={`${BASIS}/${k.slug}`} style={S.karte}>
              <span style={S.karteTitel}>{rankingTitel(k, "in Deutschland")}</span>
              <span style={S.karteText}>{k.merit}</span>
              <span style={S.karteCta}>
                Ranking ansehen <IconArrowRight size={13} />
              </span>
            </Link>
          ))}
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
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: `0 0 ${space.md}px` },
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.xl}px` },
  strong: { color: v("--color-text-primary"), fontWeight: 600 },
  kats: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: space.xl },
  kat: {
    padding: pad("xs", "md"),
    border: "1px solid",
    borderRadius: 999,
    fontSize: v("--font-size-caption"),
    fontWeight: 600,
    textDecoration: "none",
  },
  liste: { listStyle: "none", margin: 0, padding: 0 },
  zeile: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr) auto 14px",
    gap: space.md,
    alignItems: "baseline",
    padding: pad("sm", "sm"),
    borderBottom: `1px solid ${v("--color-border")}`,
    fontSize: 15,
  },
  zeileLink: { textDecoration: "none", color: "inherit" },
  platz: { fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-accent-dark"), fontSize: 13 },
  krone: { marginRight: 5 },
  name: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  wert: { fontFamily: v("--font-mono"), fontSize: 13, color: v("--color-text-secondary") },
  go: { display: "flex", justifyContent: "flex-end", color: v("--color-accent") },
  gekuerzt: { fontSize: 13, color: v("--color-text-muted"), margin: `${space.md}px 0 0`, lineHeight: 1.6 },
  section: { marginTop: space.xxxl },
  h2: { fontSize: 16, fontWeight: 700, margin: `0 0 ${space.md}px` },
  gebiete: { display: "flex", flexWrap: "wrap", gap: 6 },
  gebiet: {
    padding: pad("xs", "md"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 999,
    fontSize: v("--font-size-caption"),
    color: v("--color-text-secondary"),
    textDecoration: "none",
  },
  karten: { display: "flex", flexDirection: "column", gap: space.md },
  karte: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: pad("lg", "xl"),
    textDecoration: "none",
    color: "inherit",
  },
  karteTitel: { fontSize: 16, fontWeight: 700 },
  karteText: { fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.5 },
  karteCta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    fontSize: 13,
    fontWeight: 600,
    color: v("--color-accent"),
  },
  disclaimer: {
    fontSize: 11,
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    borderTop: `1px solid ${v("--color-border")}`,
    paddingTop: space.lg,
    marginTop: space.xxxl,
    marginBottom: space.xxxl,
  },
};
