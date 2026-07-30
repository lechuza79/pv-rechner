import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb, { type Crumb } from "../../../../../components/Breadcrumb";
import { IconArrowRight, IconChevronLeft, IconChevronRight } from "../../../../../components/Icons";
import RangDelta from "../../../../../components/atlas/RangDelta";
import { v, space, pad } from "../../../../../lib/theme";
import { pageMetadata } from "../../../../../lib/seo";
import { atlasRobots } from "../../../../../lib/atlas-index";
import { resolveSlugPath, getRegionById, getChildren, type AtlasRegion } from "../../../../../lib/atlas";
import { ortPhrase } from "../../../../../lib/atlas-orte";
import { loadAwardStats, loadElternSlugs, loadKreisNames } from "../../../../../lib/awards-server";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";
import { formatAwardValue } from "../../../../../lib/awards";
import { regionDisplayName } from "../../../../../lib/atlas-format";
import { FELD_BY_SLUG, felderNachArt, type RankingFeld } from "../../../../../lib/ranking-felder";
import {
  rankingKategorienGruppiert,
  rankingNav,
  navPunktVon,
  kategorieBySlug,
  rankingRows,
  rankingTitel,
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

/** Zeilen je Seite. Deutschland hat über 10.000 Kommunen — alle auf einmal
 *  wären rund sechs Megabyte Markup. Statt sie abzuschneiden wird geblättert:
 *  Jede Kommune ist erreichbar, nur nicht alle gleichzeitig. */
const PRO_SEITE = 200;

type Params = { pfad?: string[] };
type Suche = { seite?: string; groesse?: string };

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

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const params = await props.params;
  const d = await deute(params.pfad);
  if (!d) return { robots: ROBOTS };
  if (d.uebersicht) {
    return {
      ...pageMetadata({
        title: "Solar-Rankings der Städte und Gemeinden – wer vorn liegt",
        description:
          "Ranglisten nach Größenklasse — Solarleistung, Balkonkraftwerke und Speicher je Einwohner, dazu Freiflächen, Wind und Zubau. Aus dem Marktstammdatenregister.",
        path: BASIS,
      }),
      robots: ROBOTS,
    };
  }
  const wo = d.region.level === "de" ? "in Deutschland" : ortPhrase(d.region);
  return {
    ...pageMetadata({
      title: `Ranking: ${rankingTitel(d.kategorie, wo)}`,
      description: `Welche Städte und Gemeinden ${wo} bei ${d.kategorie.themaDativ} vorn liegen — je Größenklasse gerechnet, aus dem Marktstammdatenregister.`,
      path: `${BASIS}/${(params.pfad ?? []).join("/")}`,
    }),
    robots: ROBOTS,
  };
}

export default async function RankingPage(props: { params: Promise<Params>; searchParams: Promise<Suche> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const d = await deute(params.pfad);
  if (!d) notFound();

  if (d.uebersicht) return <Uebersicht />;

  const { kategorie, region } = d;
  const wo = region.level === "de" ? "in Deutschland" : ortPhrase(region);
  const scopeId = region.level === "de" ? null : region.region_id;

  const [stats, elternSlugs, kreisNamen, kinder] = await Promise.all([
    loadAwardStats(),
    loadElternSlugs(),
    loadKreisNames(),
    // Eine Ebene tiefer weiterblättern — von Deutschland in die Länder, vom
    // Land in die Kreise. Auf Kreisebene sind die Kommunen schon die Zeilen.
    region.level === "landkreis" ? Promise.resolve([]) : getChildren(region),
  ]);

  // GROESSENKLASSEN nur bei den Pro-Kopf-Listen. Dort belohnt der kleine Nenner
  // sonst die kleinste Gemeinde (gemessen: in jeder Kategorie lagen ~alle 100
  // Spitzenplaetze unter 5.000 Einwohnern). Bei den Standort-Kategorien gewinnt
  // ohnehin, wo ein Kraftwerk steht — da erklaert die Ortsgroesse nichts.
  const nachGroesse = kategorie.messart === "proKopf";
  const klasse: RankingFeld | null = nachGroesse ? (FELD_BY_SLUG[searchParams?.groesse ?? ""] ?? null) : null;
  // Ohne gewaehltes Feld zeigt die Seite die Spitzenreiter aller Groessenklassen
  // statt einer Bundesliste — die gaebe es sonst durch die Hintertuer wieder.
  const zeigtSpitzenreiter = nachGroesse && !klasse;
  const spitzenreiter = zeigtSpitzenreiter
    ? felderNachArt("groesse").map((k) => ({ klasse: k, zeilen: rankingRows(stats, kategorie, scopeId, k) }))
    : [];

  const alle = rankingRows(stats, kategorie, scopeId, klasse);
  // Wie viele Orte die Untergrenze aussortiert — im Gebiet, nicht bundesweit.
  const imGebiet = stats.filter((g) => g.population > 0 && (!scopeId || g.regionId.startsWith(scopeId)));
  const ausgeschlossen = kategorie.plausibel
    ? imGebiet.filter((g) => (kategorie.metric(g) ?? 0) > 0 && !kategorie.plausibel!(g)).length
    : 0;
  const seiten = Math.max(1, Math.ceil(alle.length / PRO_SEITE));
  // Kaputte oder erfundene Seitenzahlen landen auf Seite 1 statt im Leeren.
  const seite = Math.min(seiten, Math.max(1, Number.parseInt(searchParams?.seite ?? "1", 10) || 1));
  const zeilen = alle.slice((seite - 1) * PRO_SEITE, seite * PRO_SEITE);
  const slugVon = new Map(stats.map((g) => [g.regionId, g.slug ?? null]));
  const pfadVon = (id: string): string | null => {
    const bl = elternSlugs[id.slice(0, 2)];
    const kreis = elternSlugs[id.slice(0, 5)];
    const gem = slugVon.get(id);
    return bl && kreis && gem ? `/solar-atlas/${bl}/${kreis}/${gem}` : null;
  };

  // Woher die Kommune kommt — aber nur, wo es die Zeile unterscheidet: Auf einer
  // Kreis-Rangliste steht bei allen dasselbe, das waere Rauschen.
  const zeigtHerkunft = region.level !== "landkreis";
  const herkunft = (id: string) => {
    const blSlug = elternSlugs[id.slice(0, 2)];
    const kreisSlug = elternSlugs[id.slice(0, 5)];
    const teile: { name: string; href: string | null }[] = [];
    if (region.level === "de") {
      const bl = bundeslandByAgs(id.slice(0, 2));
      if (bl) teile.push({ name: bl.name, href: blSlug ? `${BASIS}/${kategorie.slug}/${blSlug}` : null });
    }
    const kreisName = kreisNamen[id.slice(0, 5)];
    // STADTSTAATEN: In Bremen, Hamburg und Berlin heisst der Kreis wie das
    // Bundesland. Zweimal derselbe Name waere nicht nur redundant ("Bremen ·
    // Bremen"), sondern auch ein doppelter React-Schluessel — der Browser
    // meldete das als Fehler und der Seiten-Rundgang waere in CI rot geworden.
    if (kreisName && !teile.some((t) => t.name === regionDisplayName(kreisName))) {
      teile.push({
        // "Landkreis Westerwaldkreis" — die Gattung steckt bei 47 Kreisen schon
        // im amtlichen Namen. Der Anzeigename nimmt das Doppelte heraus.
        name: regionDisplayName(kreisName),
        href: blSlug && kreisSlug ? `${BASIS}/${kategorie.slug}/${blSlug}/${kreisSlug}` : null,
      });
    }
    return teile;
  };

  const crumbs: Crumb[] = [
    { label: "Solar-Atlas", href: "/solar-atlas" },
    { label: "Rankings", href: BASIS },
    { label: kategorie.thema, href: `${BASIS}/${kategorie.slug}` },
    ...(region.level === "de" ? [] : [{ label: region.name }]),
  ];

  const kindWort = region.level === "de" ? "Bundesland" : "Landkreis";
  const zeigtVeraenderung = zeilen.some((r) => r.veraenderung !== null);
  const nav = rankingNav();
  const aktiverPunkt = navPunktVon(kategorie.slug);
  /** Kategorie wechseln, Gebiet behalten — der häufigste Sprung. */
  const mitGebiet = (slug: string) => `${BASIS}/${slug}${d.gebiet.length ? "/" + d.gebiet.join("/") : ""}`;
  /** Kategorie + Gebiet + Groessenklasse + Seite in einer Adresse. */
  const listenLink = (katSlug: string, klasseSlug: string | null, n = 1) => {
    const q = [klasseSlug ? `groesse=${klasseSlug}` : null, n > 1 ? `seite=${n}` : null].filter(Boolean).join("&");
    return `${mitGebiet(katSlug)}${q ? `?${q}` : ""}`;
  };
  const seitenLink = (n: number) => listenLink(kategorie.slug, klasse?.slug ?? null, n);
  const katStil = (aktiv: boolean, klein = false): React.CSSProperties => ({
    ...S.kat,
    ...(klein ? S.katKlein : null),
    background: aktiv ? v("--color-accent") : "transparent",
    color: aktiv ? v("--color-text-on-accent") : v("--color-text-secondary"),
    borderColor: aktiv ? v("--color-accent") : v("--color-border"),
  });

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={crumbs} />

        {/* Menü ÜBER der Überschrift: Es sagt, welches Thema man ansieht;
            Überschrift und Einleitung darunter sagen, was genau gemessen wird.
            Zweistufig, weil die drei Zubau-Zeiträume ein Thema sind und keine
            drei — als gleichrangige Knöpfe stand "Zubau" dreimal in der Reihe. */}
        {/* Die beiden Gruppen nebeneinander. Ueber flex-basis statt Media Query:
            Unterschreitet die Spalte 240px, rutscht die zweite von selbst
            darunter — Inline-Styles kennen keine Media Queries. */}
        <div style={S.navReihe}>
          {(
            [
              ["Privat", nav.buerger],
              ["Sonstiges", nav.standort],
            ] as const
          ).map(([titel, punkte]) =>
            punkte.length === 0 ? null : (
              <div key={titel} style={S.navGruppe}>
                <div style={S.navTitel}>{titel}</div>
                <div style={S.kats}>
                  {punkte.map((punkt) => {
                    const aktiv = aktiverPunkt?.slug === punkt.slug;
                    return (
                      <Link key={punkt.slug} href={listenLink(punkt.slug, klasse?.slug ?? null)} style={katStil(aktiv)}>
                        {punkt.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Zweite Ebene: nur für das gewählte Thema. */}
        {aktiverPunkt?.zeitraeume && (
          <div style={S.zeitraeume}>
            <span style={S.zeitraumLabel}>Zeitraum</span>
            {aktiverPunkt.zeitraeume.map((z) => (
              <Link key={z.slug} href={listenLink(z.slug, klasse?.slug ?? null)} style={katStil(z.slug === kategorie.slug, true)}>
                {z.label}
              </Link>
            ))}
          </div>
        )}

        {/* Dritte Ebene: gegen wen verglichen wird. Ohne sie gewinnt jede
            Pro-Kopf-Liste das kleinste Dorf — drei Daecher in einem
            150-Seelen-Ort schlagen jede Stadt. */}
        {nachGroesse && (
          <div style={S.zeitraeume}>
            <span style={S.zeitraumLabel}>Vergleich</span>
            <Link href={listenLink(kategorie.slug, null)} style={katStil(!klasse, true)}>
              Spitze je Größe
            </Link>
            {felderNachArt("groesse").map((k) => (
              <Link
                key={k.slug}
                href={listenLink(kategorie.slug, k.slug)}
                title={k.langform}
                style={katStil(k.slug === klasse?.slug, true)}
              >
                {k.label}
              </Link>
            ))}
            {/* Rollen stehen NEBEN den Groessen, nicht darunter: Wer sich mit den
                Landeshauptstaedten vergleicht, vergleicht sich nicht zusaetzlich
                nach Groesse — es ist ein anderes Feld, keine Verfeinerung. */}
            <span style={S.zeitraumTrenner} aria-hidden />
            {felderNachArt("rolle").map((k) => (
              <Link
                key={k.slug}
                href={listenLink(kategorie.slug, k.slug)}
                title={k.langform}
                style={katStil(k.slug === klasse?.slug, true)}
              >
                {k.label}
              </Link>
            ))}
          </div>
        )}

        <h1 style={S.h1}>
          {rankingTitel(kategorie, wo)}
          {klasse && <span style={S.h1Zusatz}>{` — ${klasse.langform}`}</span>}
        </h1>
        <p style={S.intro}>
          {zeigtSpitzenreiter ? (
            `Verglichen wird innerhalb der Größenklasse: Eine Pro-Kopf-Zahl fällt in einem Dorf mit 150 Einwohnern schon durch drei neue Anlagen aus, in einer Großstadt braucht es tausende. Jede Klasse hat deshalb ihre eigene Liste. Gerechnet aus dem Marktstammdatenregister.`
          ) : alle.length > 0 ? (
            <>
              {/* „sortiert nach" verlangt den Dativ — dafür gibt es themaDativ.
                  Der Rest als ein Textstück, sonst setzt React zwischen die
                  Knoten ein Leerzeichen und der Punkt rutscht ab. */}
              {/* Sammelbegriff aus der Groessenklasse: "80 Grossstaedte" sagt
                  mehr als "80 Kommunen" und stimmt trotzdem ausnahmslos
                  (Begruendung an Groessenklasse.kollektiv). */}
              <strong style={S.strong}>{`${nf(alle.length)} ${klasse ? klasse.label : "Städte und Gemeinden"}`}</strong>
              {` ${wo} sind gewertet, sortiert nach ${kategorie.themaDativ}. Gerechnet aus dem Marktstammdatenregister.`}
              {/* Die Untergrenze schliesst mehr als die Haelfte aller Kommunen
                  aus. Das gehoert in den ersten Absatz und nicht in den
                  Quellen-Fuss — sonst fragt sich jeder, wo sein Ort bleibt. */}
              {ausgeschlossen > 0 &&
                ` ${nf(ausgeschlossen)} ${ausgeschlossen === 1 ? "Ort bleibt" : "Orte bleiben"} außen vor: Dort sind Anlagen als privat gemeldet, die für ein Wohnhaus zu groß sind.`}
            </>
          ) : (
            <>Für diese Auswahl liegen keine wertbaren Zahlen vor.</>
          )}
        </p>

        {zeigtSpitzenreiter &&
          spitzenreiter.map(({ klasse: k, zeilen: z }) => {
            const sieger = z[0];
            return (
              <div key={k.slug} style={S.klassenKarte}>
                <div style={S.klassenKopf}>
                  <span style={S.klassenLabel}>{k.langform}</span>
                  <Link href={listenLink(kategorie.slug, k.slug)} style={S.klassenLink}>
                    {`Ganze Liste (${nf(z.length)}) `}
                    <IconArrowRight size={12} />
                  </Link>
                </div>
                {sieger ? (
                  <div style={S.klassenSieger}>
                    <span style={S.klassenName}>
                      <span aria-hidden style={S.krone}>
                        👑
                      </span>
                      {pfadVon(sieger.regionId) ? (
                        <Link href={pfadVon(sieger.regionId) as string} style={S.klassenNameLink}>
                          {sieger.name}
                        </Link>
                      ) : (
                        sieger.name
                      )}
                      <span style={S.klassenBasis}>
                        {`${nf(sieger.population)} Einwohner`}
                        {sieger.basis && ` · ${sieger.basis}`}
                      </span>
                    </span>
                    <span style={S.wert}>{formatAwardValue(sieger.wert, kategorie.format)}</span>
                  </div>
                ) : (
                  <div style={S.klassenLeer}>Keine wertbaren Zahlen in dieser Klasse.</div>
                )}
              </div>
            );
          })}

        {!zeigtSpitzenreiter && zeilen.length > 0 && (
          <div style={{ ...S.zeile, ...S.kopfzeile }}>
            <span>Platz</span>
            <span>{klasse ? klasse.einzahl : "Ort"}</span>
            <span style={S.kopfRechts}>
              {zeigtVeraenderung ? `seit Ende ${new Date().getFullYear() - 1}` : ""}
            </span>
            <span style={S.kopfRechts}>{kategorie.messart === "proKopf" ? "je Einwohner" : "gesamt"}</span>
            <span />
          </div>
        )}

        {!zeigtSpitzenreiter && zeilen.length > 0 && (
          <ol style={S.liste}>
            {zeilen.map((r) => {
              const href = pfadVon(r.regionId);
              const orte = zeigtHerkunft ? herkunft(r.regionId) : [];
              // KEIN Link um die ganze Zeile: Sie enthaelt selbst Links (Land,
              // Kreis), und ein Anker im Anker ist ungueltiges HTML — Browser
              // reissen ihn auseinander. Stattdessen deckt der Kommunen-Link die
              // Zeile per Overlay ab; die Herkunfts-Links liegen darueber.
              return (
                <li key={r.regionId} className="atlas-rank-row" style={S.zeile}>
                  <span style={S.platz}>{r.platz}.</span>
                  <span style={S.nameSpalte}>
                    {href ? (
                      <Link href={href} className="atlas-rank-ziel" style={S.name}>
                        {r.platz === 1 && (
                          <span aria-hidden style={S.krone}>
                            👑
                          </span>
                        )}
                        {r.name}
                      </Link>
                    ) : (
                      <span style={S.name}>{r.name}</span>
                    )}
                    <span style={S.herkunft}>
                      {`${nf(r.population)} Einwohner`}
                      {/* Die Menge hinter der Rate: "100 je 1.000 Einwohner"
                          liest sich sonst gross, auch wenn EIN Geraet dahinter
                          steht (Wiedenborstel, 10 Einwohner). */}
                      {r.basis && ` · ${r.basis}`}
                      {orte.length > 0 && " · "}
                      {orte.map((t, i) => (
                          <span key={`${i}-${t.name}`}>
                            {i > 0 && " · "}
                            {t.href ? (
                              <Link href={t.href} className="atlas-rank-neben" style={S.herkunftLink}>
                                {t.name}
                              </Link>
                            ) : (
                              t.name
                            )}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span style={S.delta}>
                    <RangDelta plaetze={r.veraenderung} />
                  </span>
                  <span style={S.wert}>{formatAwardValue(r.wert, kategorie.format)}</span>
                  <span className="atlas-go" style={S.go} aria-hidden>
                    {href ? <IconArrowRight size={12} /> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {!zeigtSpitzenreiter && zeigtVeraenderung && (
          <p style={S.deltaHinweis}>
            {`▲ und ▼ zeigen, wie viele Plätze eine Kommune seit Ende ${new Date().getFullYear() - 1} gutgemacht oder verloren hat. Bewusst nicht „gegenüber dem Vorjahr": Der Zeitraum reicht vom Jahresende bis heute.`}
          </p>
        )}

        {/* Keine Blaetterleiste in der Spitzenreiter-Ansicht — dort steht keine
            Liste, durch die man blaettern koennte. */}
        {!zeigtSpitzenreiter && seiten > 1 && (
          <div style={S.blaettern}>
            <span style={S.blaetternText}>
              {`Plätze ${nf((seite - 1) * PRO_SEITE + 1)}–${nf((seite - 1) * PRO_SEITE + zeilen.length)} von ${nf(alle.length)}`}
            </span>
            <span style={S.blaetternKnoepfe}>
              {seite > 1 && (
                <Link href={seitenLink(seite - 1)} style={S.blaetternKnopf}>
                  <IconChevronLeft size={11} /> Zurück
                </Link>
              )}
              <span style={S.blaetternZahl}>{`Seite ${seite} von ${nf(seiten)}`}</span>
              {seite < seiten && (
                <Link href={seitenLink(seite + 1)} style={S.blaetternKnopf}>
                  Weiter <IconChevronRight size={11} />
                </Link>
              )}
            </span>
          </div>
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
          Als privat gewertet werden nur Dachanlagen in Wohnhausgröße: Das Register führt „privat" aus einem
          angekreuzten Feld, ohne Größenprüfung — ein Scheunendach mit 100 kWp stand damit in der Bürger-Wertung.
          Eine Einwohner-Untergrenze gibt es bewusst nicht; die Einwohnerzahl steht stattdessen in jeder Zeile.
          Bestandsdaten: {DATA_SOURCES.mastr.name}, Datenlizenz dl-de/by-2-0 (Daten
          aggregiert). Einwohnerzahlen: {DATA_SOURCES.destatis.name}, Gemeindeverzeichnis, Datenlizenz dl-de/by-2-0.
          Alle Angaben sind Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit.
        </div>
      </div>
    </div>
  );
}

/** Einstieg: welche Ranglisten es gibt — plus zwei Befunde, die aus denselben
 *  Zahlen fallen, aber KEINE Rangliste sein dürfen (Begründung an
 *  lib/atlas-befunde.ts). Live gerechnet, damit sie mit dem Monatslauf mitgehen. */
function Uebersicht() {
  const gruppen = rankingKategorienGruppiert();
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Solar-Atlas", href: "/solar-atlas" }, { label: "Rankings" }]} />
        <h1 style={S.h1}>Rankings der Städte und Gemeinden</h1>
        <p style={S.intro}>
          Wer baut am meisten — gemessen an der Einwohnerzahl. Verglichen wird innerhalb der Größenklasse, damit
          Großstädte gegen Großstädte antreten und nicht gegen Dörfer. Vorn steht der Zubau: Was ein Ort früher
          gebaut hat, kann er nicht mehr ändern. Jede Liste reicht von Deutschland über die Länder bis in den
          Landkreis.
        </p>
        {(
          [
            ["Privat", gruppen.buerger, "Was Haushalte gebaut haben, je Einwohner gerechnet — getrennt nach Größenklasse, von der Kleingemeinde bis zur Großstadt. Dazu Landeshauptstädte und kreisfreie Städte je für sich."],
            ["Sonstiges", gruppen.standort, "Was am Ort steht, unabhängig davon, wer es gebaut hat: Gesamtleistung, Freiflächen, Wind. Hier gewinnen Kraftwerks-Standorte und große Städte. Diese Anlagen bleiben aus den Listen oben heraus, weil ein einziger Investorenpark ein Dorf an die Spitze setzen würde."],
          ] as const
        ).map(([titel, kats, erklaerung]) =>
          kats.length === 0 ? null : (
            <div key={titel} style={S.section}>
              <h2 style={S.h2}>{titel}</h2>
              <p style={S.gruppeText}>{erklaerung}</p>
              <div style={S.karten}>
                {kats.map((k) => (
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
          ),
        )}
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
  h1: { marginTop: space.lg, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: `0 0 ${space.md}px` },
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.xl}px` },
  strong: { color: v("--color-text-primary"), fontWeight: 600 },
  navReihe: { display: "flex", flexWrap: "wrap", gap: space.xl, marginBottom: space.md },
  navGruppe: { flex: "1 1 240px", minWidth: 0 },
  navTitel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: v("--color-text-muted"),
    fontWeight: 700,
    marginBottom: 4,
  },
  kats: { display: "flex", flexWrap: "wrap", gap: 6 },
  katKlein: { fontSize: 11, padding: "2px 10px" },
  zeitraeume: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: space.lg },
  zeitraumLabel: { fontSize: 11, color: v("--color-text-muted"), marginRight: 2 },
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
    gridTemplateColumns: "48px minmax(0,1fr) auto auto 14px",
    gap: space.md,
    alignItems: "baseline",
    padding: pad("sm", "sm"),
    borderBottom: `1px solid ${v("--color-border")}`,
    fontSize: 15,
    position: "relative",
  },
  platz: { fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-accent-dark"), fontSize: 13 },
  zeitraumTrenner: { width: 1, alignSelf: "stretch", background: v("--color-border"), margin: `0 ${space.xs}px` },
  h1Zusatz: { fontWeight: 500, color: v("--color-text-secondary") },
  klassenKarte: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 14,
    padding: pad("lg", "xl"),
    marginBottom: space.lg,
  },
  klassenKopf: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.sm },
  klassenLabel: { fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: v("--color-text-muted") },
  klassenLink: { fontSize: 13, color: v("--color-accent"), textDecoration: "none", whiteSpace: "nowrap" },
  klassenSieger: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.sm, marginTop: space.sm },
  klassenName: { fontSize: 16, fontWeight: 700 },
  klassenNameLink: { color: v("--color-text-primary"), textDecoration: "none" },
  klassenBasis: { display: "block", fontSize: 13, fontWeight: 400, color: v("--color-text-secondary"), marginTop: 2 },
  klassenLeer: { fontSize: 13, color: v("--color-text-muted"), marginTop: space.xs },
  krone: { marginRight: 5 },
  nameSpalte: { display: "flex", flexDirection: "column", minWidth: 0, gap: 1 },
  name: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "inherit",
    textDecoration: "none",
  },
  herkunft: {
    fontSize: 11,
    color: v("--color-text-muted"),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Blau, weil es ein Link ist — vorher sah es aus wie Beschriftung.
  herkunftLink: { color: v("--color-accent-light"), textDecoration: "none" },
  kopfzeile: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: v("--color-text-muted"),
    fontWeight: 700,
    borderBottom: `1px solid ${v("--color-border-muted")}`,
  },
  kopfRechts: { textAlign: "right" },
  delta: { display: "flex", justifyContent: "flex-end" },
  wert: { fontFamily: v("--font-mono"), fontSize: 13, color: v("--color-text-secondary") },
  go: { display: "flex", justifyContent: "flex-end", color: v("--color-accent") },
  deltaHinweis: { fontSize: 12, color: v("--color-text-muted"), margin: `${space.md}px 0 0`, lineHeight: 1.5 },
  blaettern: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.lg,
  },
  blaetternText: { fontSize: 13, color: v("--color-text-muted") },
  blaetternKnoepfe: { display: "flex", alignItems: "center", gap: space.md },
  blaetternZahl: { fontSize: 12, color: v("--color-text-muted"), fontFamily: v("--font-mono") },
  blaetternKnopf: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: pad("xs", "md"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    fontSize: 13,
    fontWeight: 600,
    color: v("--color-accent"),
    textDecoration: "none",
  },
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
  befund: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: pad("md", "lg"),
    marginBottom: space.md,
  },
  befundTitel: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  befundText: { fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.55, margin: 0 },
  stufenLabel: { fontSize: 11, color: v("--color-text-muted"), marginTop: space.md },
  stufen: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 },
  stufe: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    padding: pad("xs", "sm"),
  },
  stufeLabel: { fontSize: 11, color: v("--color-text-muted") },
  stufeWert: { fontFamily: v("--font-mono"), fontSize: 14, fontWeight: 700, color: v("--color-accent-dark") },
  gruppeText: { fontSize: 14, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px`, lineHeight: 1.5 },
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
