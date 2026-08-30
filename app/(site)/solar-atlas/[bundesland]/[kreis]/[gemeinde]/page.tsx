import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtlasSkeleton from "../../../../../../components/atlas/AtlasSkeleton";
import Breadcrumb from "../../../../../../components/Breadcrumb";
import RegionSearch from "../../../../../../components/atlas/RegionSearch";
import { IconArrowRight } from "../../../../../../components/Icons";
import { v, space, pad } from "../../../../../../lib/theme";
import { pageMetadata } from "../../../../../../lib/seo";
import { jsonLdHtml, breadcrumbJsonLd, atlasDatasetJsonLd } from "../../../../../../lib/json-ld";
import {
  atlasIsIndexable,
  atlasLevelReleased,
  atlasOrtEinzelfreigabe,
  atlasRobots,
  GEMEINDE_MIN_ANLAGEN,
} from "../../../../../../lib/atlas-index";
import { verlinkendeGemeinden } from "../../../../../../lib/atlas-outreach-freigabe";
import ZubauChart from "../../../../../../components/atlas/ZubauChart";
import GemeindeHero, { type KpiOwnerData } from "../../../../../../components/atlas/GemeindeHero";
import GemeindePeerTiles from "../../../../../../components/atlas/GemeindePeerTiles";
import GemeindePlatzierungen from "../../../../../../components/atlas/GemeindePlatzierungen";
import CollapsibleIntro from "../../../../../../components/atlas/CollapsibleIntro";
import GemeindeEmbedBox from "../../../../../../components/atlas/GemeindeEmbedBox";
import GemeindePotentialClient from "../../../../../../components/atlas/GemeindePotentialClient";
import GemeindeErneuerbareWidget from "../../../../../../components/atlas/GemeindeErneuerbareWidget";
import GemeindeSolarLive from "../../../../../../components/atlas/GemeindeSolarLive";
import { MastrHeroSection } from "../../../../../../components/MastrHeroSection";
import { gemeindeGeo } from "../../../../../../lib/atlas-geo";
import { gemeindeHighlightTeile } from "../../../../../../lib/gemeinde-highlight";
import { gemeindeSzenarioTexte } from "../../../../../../lib/gemeinde-szenario-text";
import {
  resolveSlugPath,
  getRegionById,
  lastFullYear,
  peerBand,
  getPeerContext,
  getRankingData,
  foldSiblings,
  atlasOwnerSlice,
  ownerAnker,
  speicherHinweis,
  type AtlasOwner,
  type AtlasRegion,
  type PeerRow,
} from "../../../../../../lib/atlas";
import {
  fmtBatterieMittel,
  fmtSpeicherJeKwp,
  pvLeistungTeile,
  speicherKwhTeile,
  wattProKopfTeile,
} from "../../../../../../lib/atlas-format";
import { ortPhrase, istKreisfrei, istStadtstaat } from "../../../../../../lib/atlas-orte";
import { vergleichsBasisPfad } from "../../../../../../lib/atlas-ranking";
import { getRegionAtlasData } from "../../../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";
import { publishedCities, cityPath } from "../../../../../../lib/atlas-cities";
import { landProgramBundeslaender } from "../../../../../../lib/funding-programs";
import { DATA_SOURCES } from "../../../../../../lib/data-sources";

// Haltbarkeit: sieben Tage, NICHT ein Tag (Umstellung 26.08.2026).
//
// Die Zahlen dieser Seite kommen aus dem MaStR-Datenlauf — einmal im Monat, am
// 5. Bei 24 Stunden Haltbarkeit verfiel die Seite dreissigmal oefter als ihre
// Daten sich aendern, und jeder Verfall kostet einen vollstaendigen Neuaufbau
// mit rund zehn Datenbank-Abfragen, einem Cache-Schreibvorgang und einer
// Uebertragung ans Auslieferungsnetz. Bei ueber 11.000 Gemeindeseiten unter
// Dauerbeschuss von Crawlern war das ein Hauptposten der Vercel-Rechnung.
//
// WARUM SIEBEN TAGE UND NICHT DREISSIG: Die neuen Zahlen werden nach dem
// Datenlauf aktiv sichtbar gemacht (POST /api/atlas/revalidate, am 26.08.2026
// auf Produktion nachgewiesen: Treffer -> Neuaufbau auf allen drei Ebenen).
// Faellt dieser Schritt einmal aus, ist die Haltbarkeit das Sicherheitsnetz —
// und dann entscheidet sie, wie lange veraltete Zahlen stehen bleiben. Der
// Schritt von einem Tag auf sieben holt bereits den groessten Teil der
// Ersparnis (statt dreissig Verfaellen im Monat nur noch vier); der weitere
// Schritt auf dreissig Tage braechte wenige Prozentpunkte mehr, vervierfachte
// aber das Schadensfenster. Schlechtes Verhaeltnis.
//
// Wer diesen Wert aendert, prueft lib/atlas-revalidate-routen.ts mit: Ab einem
// Tag Haltbarkeit MUSS die Route dort stehen, sonst zeigt sie nach dem
// Datenlauf die Zahlen des Vormonats. Ein Test erzwingt das.
export const revalidate = 604800;
// Ohne generateStaticParams wäre die Route voll dynamisch (no-store). Leeres
// Array = keine Vorab-Renders (zu viele Gemeinden), aber ISR: jede Gemeinde-Seite
// rendert einmal on-demand und liegt dann s-maxage=3600 im CDN.
export function generateStaticParams() {
  return [];
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// Größenklassen-Platzierung vorerst geparkt (Nutzer-Entscheidung 2026-07-22):
// die Kachelreihe wird nicht gerendert und die Abfrage nicht ausgeführt, bis die
// Darstellung final ist. Komponente (GemeindePeerTiles), Datenzugriff
// (getPeerContext) und die vorberechnete Tabelle bleiben im Repo — Reaktivierung
// ist ein einziges Flag. Solange false: keine zusätzliche DB-Last pro Aufruf.
const SHOW_PEER_TILES = false;

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

/** Ab so vielen Batterien ist ein Mittelwert eine Aussage und kein Zufall. */
const MIN_BATTERIEN_FUER_MITTEL = 5;

type Params = { bundesland: string; kreis: string; gemeinde: string };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const params = await props.params;
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region) return { robots: atlasRobots(false) };
  // Eine kreisfreie Stadt hat keinen übergeordneten Landkreis — der Vergleich
  // gilt dort gegen das Bundesland. In Berlin und Hamburg ist auch das
  // Bundesland die Stadt selbst, dort bleibt nur Deutschland.
  const kreisfrei = params.kreis === params.gemeinde;
  const bezugsebene = istStadtstaat(region.region_id)
    ? "Bundesgebiet"
    : kreisfrei
      ? "Bundesland"
      : "Landkreis";
  // Anlagenzahl (für die Thin-Schwelle) nur laden, wenn die Seite überhaupt
  // indexierbar werden kann — sonst ist sie ohnehin noindex und der Abruf wäre
  // reine Last. Neben der Ebene zählt dabei die Einzelfreigabe: Ein Ort, der uns
  // nach dem Outreach öffentlich verlinkt, ist freigegeben, obwohl die Ebene es
  // nicht ist (Begründung an `atlasOrtEinzelfreigabe`).
  // Zwei Wege zur Einzelfreigabe, und der zweite braucht keine Sitzung: Ein Ort
  // aus dem Releaseplan (Entscheidung mit Nachweis) ODER ein Ort, der uns nach
  // dem Outreach nachweislich öffentlich verlinkt hat (Tatsache, kein Ermessen —
  // Begründung in lib/atlas-outreach-freigabe.ts).
  const verlinker = await verlinkendeGemeinden();
  const einzeln = atlasOrtEinzelfreigabe(region.region_id) || verlinker.includes(region.region_id);
  const anlagen =
    atlasLevelReleased("gemeinde") || einzeln
      ? (await getRegionAtlasData(region.region_id)).solar.total_count
      : 0;
  return {
    ...pageMetadata({
      // Führendes Wort + Ortsname — das Muster, mit dem diese Seitengattung
      // gewinnt, gemessen am Wettbewerber wieistmeinsolar.de (139 Platzierungen,
      // 123 davon auf Ortsseiten). Sechs seiner Top-10-Treffer sind echte
      // Ortsanfragen („pv erdweg" 5, „pv rendsburg" 7, „solar weinheim" 10).
      //
      // EHRLICH DAZU, weil es gegen die Wortwahl hier spricht: In seinen Top 10
      // führt KEIN „photovoltaik", sondern durchweg „pv" oder „solar". Umgekehrt
      // trägt „photovoltaik" bei ihm das mit Abstand größte Volumen (28
      // Platzierungen, 4.040 Suchen/Monat gegen 2.790 für „pv"). Wir nehmen das
      // Volumen-Wort, weil unsere eigenen Anfragen dieselbe Richtung zeigen (siehe
      // seitenTitel() der Regionsseiten) — aber es ist eine Abwägung, keine
      // Ableitung, und die Gegenzahl gehört dazu.
      //
      // Wirkung heute: null. Gemeindeseiten sind noindex, bis Welle 1 läuft.
      // Beleg: docs/seo/befund-2026-08-18-atlas-wellen.md
      title: `Photovoltaik in ${region.name}: Solaranlagen, Bestand & Zubau`,
      description: `Photovoltaik in ${region.name}: Anlagenzahl, installierte Leistung und jährlicher Zubau aus dem Marktstammdatenregister — je Einwohner und im Vergleich zum ${bezugsebene}.`,
      path: `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`,
    }),
    robots: atlasRobots(einzeln ? anlagen >= GEMEINDE_MIN_ANLAGEN : atlasIsIndexable("gemeinde", anlagen)),
  };
}

/**
 * Routing-Entscheidung — und NUR sie. Sie läuft in der HTML-Hülle, also bevor die
 * Antwort rausgeht; nur deshalb kann `notFound()` den Statuscode noch auf 404
 * setzen. Der teure Teil steckt hinter dem `<Suspense>` und streamt nach.
 * Hintergrund und Fallstrick: `components/atlas/AtlasSkeleton.tsx`.
 */
export default async function GemeindePage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region || region.level !== "gemeinde") notFound();

  return (
    <Suspense fallback={<AtlasSkeleton />}>
      <GemeindeBody region={region} params={params} />
    </Suspense>
  );
}

async function GemeindeBody({ region, params }: { region: AtlasRegion; params: Params }) {
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

  // KREISFREIE STADT: Sie IST ihr eigener Landkreis. Jede Stelle, die den
  // Elternteil als eigenständige Vergleichs- oder Zugehörigkeitsebene benutzt,
  // sagt dort etwas Falsches („Vergleich mit Stuttgart" auf der Stuttgart-Seite,
  // „Stuttgart liegt in Stuttgart" in den strukturierten Daten). Einmal
  // bestimmen, überall berücksichtigen.
  const istKreisfreiStadt = istKreisfrei(region.region_id, kreis, region.name);
  // BERLIN UND HAMBURG: Dort ist zusätzlich das Bundesland die Stadt selbst.
  // Nur den Kreis zu überspringen reicht nicht — dann steht auf der Seite
  // „Tendenz gegenüber dem Durchschnitt in Berlin" und die Vergleichsgruppe ist
  // wieder eine Liste mit einer Zeile. Hier ist Deutschland die erste echte
  // Bezugsgröße, und die Vergleichsgruppe sind die Bundesländer.
  const istStadtstaatRegion = istStadtstaat(region.region_id);

  const speicher = atlas.speicher;

  // Der Pro-Kopf-Vergleich gegen das Bundesland stand bis zum 20.08.2026 hier
  // und ein zweites Mal im Outreach-Brief — auf einer anderen Messgröße. Er
  // lebt jetzt vollständig in lib/gemeinde-vergleich.ts; die Seite reicht nur
  // noch die beiden Einwohnerzahlen durch.

  // Die Kacheln gibt es für jeden Eigentümer-Filter fertig gerechnet — auch die
  // Vergleichsbasis. Wer „Privat" wählt, sieht die privaten Zahlen der Gemeinde
  // gegen die PRIVATEN Zahlen von Landkreis/Land/Bund; privat gegen Gesamtbestand
  // wäre eine Prozentzahl ohne Aussage. Serverseitig vorgerechnet, weil alle drei
  // Schnitte ohnehin schon geladen sind — der Filter schaltet dann nur um.
  type AtlasData = Awaited<ReturnType<typeof getRegionAtlasData>>;
  const perCapOf = (a: AtlasData, pop: number | null | undefined, owner: AtlasOwner) => {
    if (!pop) return { count: null, kwp: null, speicher: null, neu: null };
    const s = atlasOwnerSlice(a, owner, lastYear);
    return { count: s.count / pop, kwp: s.kwp / pop, speicher: s.speicherKwh / pop, neu: s.neu / pop };
  };

  const kpiForOwner = (owner: AtlasOwner): KpiOwnerData => {
    const s = atlasOwnerSlice(atlas, owner, lastYear);
    const wPerHead = region.population ? Math.round((s.kwp * 1000) / region.population) : null;
    // Speicher je kWp nur gegen Dachanlagen: ein Freiflächenpark im Nenner
    // täuscht ein „hier speichert niemand" vor.
    const proKwp = s.speicherKwh > 0 && s.kwpDach > 100 ? s.speicherKwh / s.kwpDach : null;
    // Durchschnittsgröße je Batterie. Erst ab einer Handvoll Anlagen gezeigt:
    // bei zwei oder drei Speichern ist ein Mittelwert kein Typwert, sondern ein
    // Zufallsprodukt — ein gewerblicher Großspeicher zieht ihn auf ein Vielfaches
    // dessen, was in den Kellern der Gemeinde wirklich steht.
    const avgBatterie = s.batterieCount >= MIN_BATTERIEN_FUER_MITTEL ? s.speicherKwh / s.batterieCount : null;
    // Unter „Alle" mischt der Mittelwert zwei sehr verschiedene Welten: in
    // Herdecke stehen 495 Hausbatterien mit im Schnitt 9 kWh neben 17
    // gewerblichen mit im Schnitt 583 kWh. Der Wert bleibt richtig, aber er
    // beschreibt dann keinen typischen Keller — das muss dranstehen.
    const gemischt =
      owner === "alle" &&
      ["batterie_privat", "batterie_gewerbe"].every(
        (seg) => (speicher.by_segment.find((x) => x.segment === seg)?.count ?? 0) > 0,
      );
    // Anzahl und Durchschnittsgröße stehen in EINER Kachel: die Zahl der
    // Batterien ist die Aussage, wie groß eine typische ist die Erläuterung dazu.
    // Die Einschränkungen bleiben sichtbar, sie sind der ehrliche Teil.
    const avgSub =
      avgBatterie === null
        ? s.batterieCount > 0
          ? "⌀ Größe: zu wenige für einen Mittelwert"
          : undefined
        : `⌀ ${fmtBatterieMittel(avgBatterie)}${gemischt ? " · Haushalte und Gewerbe gemischt" : ""}`;
    return {
      groups: [
        {
          title: "Solaranlagen",
          // Erste Kennzahl ist die Anzahl — beide Boxen (Anlagen wie Speicher)
          // beginnen mit "Anzahl", dann folgt das Mengenmaß. Der Box-Titel sagt
          // schon "Solaranlagen", deshalb "Anzahl" statt des redundanten "Anlagen".
          tiles: [
            { label: "Anzahl", value: nf(s.count), metric: "count" },
            { label: "Installiert", ...pvLeistungTeile(s.kwp), metric: "kwp" },
            {
              label: "je Einwohner",
              ...(wPerHead === null ? { value: "—" } : wattProKopfTeile(wPerHead)),
              metric: "kwp",
              //
              // ZWEI ZAHLEN FÜR „PRIVAT" AUF EINER SEITE — und beide richtig.
              //
              // Der Eigentümer-Filter versteht unter „Privat" alles in
              // Bürgerhand, also Dächer UND Balkongeräte. Die Auszeichnung
              // darüber misst „private Solarleistung auf den DÄCHERN je
              // Einwohner" und lässt die Balkone weg. In Eichenzell sind das
              // 1.204 gegen 1.185 Wp; wer beide sieht, hält eine für falsch.
              //
              // Zusammenlegen wäre der falsche Ausweg: Ein Balkongerät gehört
              // einem Bürger (also in den Eigentümer-Filter) und hängt nicht
              // auf dem Dach (also nicht in die Dach-Auszeichnung). Der
              // Unterschied ist zu benennen, nicht zu beseitigen — dieselbe
              // Regel wie bei jedem Nenner, der sichtbar an seiner Zahl steht.
              sub: owner === "privat" ? "Dächer und Balkone zusammen" : undefined,
            },
            { label: `Neu ${lastYear}`, value: nf(s.neu), metric: "neu" },
          ],
        },
        {
          title: "Batteriespeicher",
          // Gleiche Reihenfolge wie bei den Solaranlagen: erst Anzahl, dann die
          // Kapazität. Der Box-Titel trägt "Batteriespeicher", deshalb "Anzahl"
          // und "Kapazität" statt "Batterien"/"Batteriespeicher".
          // Anzahl zählt nur Batterien (nicht Pumpspeicher) — Anzahl und Kapazität
          // müssen dasselbe meinen; der Rest steht als Erklärung auf der Rückseite.
          tiles: [
            { label: "Anzahl", value: nf(s.batterieCount), sub: avgSub },
            {
              label: "Kapazität",
              ...speicherKwhTeile(s.speicherKwh),
              metric: "speicher",
              sub: proKwp !== null ? fmtSpeicherJeKwp(proKwp) : undefined,
            },
          ],
          note: speicherHinweis(s.nichtBatterie) ?? undefined,
        },
      ],
      perCap: perCapOf(atlas, region.population, owner),
      references: [
        // Bei einer kreisfreien Stadt ist der „Landkreis" die Stadt selbst —
        // ein Vergleich mit sich hat den Wert 0 % und sagt nichts. In Berlin und
        // Hamburg gilt dasselbe zusätzlich für das Bundesland.
        ...(istKreisfreiStadt
          ? []
          : [{ key: "landkreis", name: kreis?.name ?? "Landkreis", perCap: perCapOf(kreisAtlas, kreis?.population, owner) }]),
        ...(istStadtstaatRegion
          ? []
          : [{ key: "bundesland", name: bl?.name ?? "Bundesland", perCap: perCapOf(blAtlas, blRegion?.population, owner) }]),
        { key: "de", name: "Deutschland", perCap: perCapOf(deAtlas, deRegion?.population, owner) },
      ].filter((r) => Object.values(r.perCap).some((x) => x !== null)),
    };
  };
  const kpi: Record<AtlasOwner, KpiOwnerData> = {
    alle: kpiForOwner("alle"),
    privat: kpiForOwner("privat"),
    gewerbe: kpiForOwner("gewerbe"),
  };

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

  // Standort (Geo), Kreis-Rangliste und bundesweite Vergleichsgemeinden hängen
  // nicht voneinander ab → in einem Rutsch statt seriell. Die Lage (repräsentative
  // PLZ + lat/lon aus der AGS) kommt aus einer lokalen Tabelle — schnell, server-
  // seitig. Der langsame Teil (Standort-Ertrag von PVGIS, extern) wird NICHT mehr
  // hier abgewartet: er speist nur die „Was das für Sie bedeutet"-Beispiele und
  // wird client-seitig nachgeladen (GemeindePotentialClient → /api/pvgis), damit
  // der Server-Render sofort steht. Nur für bewohnte Gemeinden sinnvoll
  // (Waldgebiete o. Ä. haben keinen Bedarf). Der Größenklassen-Vergleich
  // (Anführer UND eigener Platz, 3 Eigentümer × 2 Bezüge) kommt aus einem einzigen
  // Aufruf über die vorberechneten Gemeinde-Summen.
  const [geo, siblingData, peerRows] = await Promise.all([
    region.population ? gemeindeGeo(region.region_id) : Promise.resolve(null),
    // The Kreis in raw cells: the table ranks it client-side per owner AND per
    // metric, which no fixed RPC result could serve.
    kreis ? getRankingData(kreis) : Promise.resolve({ regions: [], cells: [] }),
    SHOW_PEER_TILES && region.population
      ? getPeerContext(region.region_id, blAgs, band.min, band.max)
      : Promise.resolve([] as PeerRow[]),
  ]);

  const repPlz = geo?.plz ?? null;
  const geoLat = Number.isFinite(geo?.lat) ? (geo?.lat ?? null) : null;
  const geoLon = Number.isFinite(geo?.lon) ? (geo?.lon ?? null) : null;

  // KREISFREIE STADT: Der übergeordnete „Landkreis" IST die Stadt selbst, also
  // verglich die Rangliste Stuttgart mit Stuttgart — ein Eintrag, dazu die
  // Überschrift „Top Kommunen im Stuttgart". Eine kreisfreie Stadt steht
  // verwaltungsrechtlich auf Kreisebene; ihre Vergleichsgruppe sind deshalb die
  // Stadt- und Landkreise des Bundeslandes, nicht Gemeinden.
  const vergleich = istStadtstaatRegion
    ? { daten: await getRankingData(deRegion ?? blRegion ?? kreis!), was: "Bundesländer", wo: "in Deutschland" }
    : istKreisfreiStadt
      ? { daten: await getRankingData(blRegion ?? kreis!), was: "Kreise", wo: bl ? ortPhrase(bl) : "" }
      : { daten: siblingData, was: "Kommunen", wo: kreis ? ortPhrase(kreis) : "" };

  // Die Vergleichsgruppe EINMAL auf das falten, was diese Seite braucht: je
  // Gebiet und Eigentümer-Filter drei Summen statt des vollen Zell-Korns.
  // Das Korn war 71 % der ausgelieferten Seite und diente einer Liste mit fünf
  // Zeilen (Begründung an foldSiblings). Die Faltung ist ebenengenerisch, also
  // gilt sie für Gemeinden im Kreis genauso wie für die Kreise eines Landes.
  const siblings = foldSiblings(vergleich.daten.regions, vergleich.daten.cells);

  // Rang der Gemeinde nach installierter Solarleistung im Landkreis — fürs
  // Intro (ein je Gemeinde verschiedener, konkreter Fakt). Aus DERSELBEN
  // Faltung wie die Liste darunter: vorher rechnete das hier eigenständig und
  // zählte dabei die Leistung der Batteriespeicher zur Solarleistung dazu.
  // Bei einer kreisfreien Stadt gibt es keinen Kreis-Rang — dort ist die
  // Vergleichsgruppe das Bundesland, und ein „Platz im Landkreis" wäre gelogen.
  const kreisTotal = istKreisfreiStadt ? null : siblings.length || null;
  let rankInKreis: number | null = null;
  if (kreisTotal) {
    const own = siblings.find((s) => s.region_id === region.region_id);
    const ownKwp = own ? own.sums.alle.kwp : atlas.solar.total_kwp;
    rankInKreis =
      1 + siblings.filter((s) => s.region_id !== region.region_id && s.sums.alle.kwp > ownKwp).length;
  }

  // Ortsbezogene Saetze fuer „Was das fuer Sie bedeutet". Aus Zahlen, die die
  // Seite ohnehin geladen hat — kein zusaetzlicher Zugriff.
  const szenarioTexte = gemeindeSzenarioTexte({
    name: region.name,
    regionId: region.region_id,
    balkonCount: atlas.solar.by_segment.find((c) => c.segment === "steckersolar")?.count ?? null,
  });

  const crumbs: { label: string; href?: string }[] = [
    { label: "Solar-Atlas", href: "/solar-atlas" },
    // In Berlin und Hamburg stünde der Name sonst dreimal hintereinander.
    ...(istStadtstaatRegion ? [] : [{ label: bl?.name ?? blAgs, href: `/solar-atlas/${params.bundesland}` }]),
    // Bei kreisfreien Städten stünde hier zweimal derselbe Name.
    ...(istKreisfreiStadt ? [] : [{ label: kreis?.name ?? params.kreis, href: basePath }]),
    { label: region.name },
  ];

  const atlasPath = `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`;
  const breadcrumbLd = breadcrumbJsonLd(
    crumbs.map((c) => ({ name: c.label, path: c.href })),
    BASE_URL,
  );
  const datasetLd = atlasDatasetJsonLd({
    name: `Solaranlagen-Bestand ${region.name}`,
    description: `Anlagenzahl, installierte Leistung und Zubau der Photovoltaik in ${region.name}${kreis && !istKreisfreiStadt ? ` (${kreis.name})` : ""} aus dem Marktstammdatenregister.`,
    url: `${BASE_URL}${atlasPath}`,
    dateModified: atlas.data_as_of,
    placeName: region.name,
    containedInPlace: (istStadtstaatRegion ? "Deutschland" : istKreisfreiStadt ? bl?.name : kreis?.name) ?? bl?.name ?? undefined,
    variables: [
      { name: "Solaranlagen in Betrieb", value: atlas.solar.total_count },
      { name: "Installierte Leistung", value: Math.round(atlas.solar.total_kwp), unitText: "kWp" },
      { name: "Batteriespeicher-Kapazität", value: Math.round(speicher.kwh_batterie), unitText: "kWh" },
    ],
    baseUrl: BASE_URL,
  });

  return (
    <div style={S.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetLd) }} />
      <div style={S.wrap}>
        <Breadcrumb items={crumbs} rightSlot={<RegionSearch align="right" />} />

        {/*
          Data date above the headline, not buried in the footer: it is the first
          thing a Verwaltung checks before quoting a number, and <time dateTime>
          gives crawlers a machine-readable freshness signal on a page whose whole
          value is being current. Die Quelle (Marktstammdatenregister) steht hier
          NICHT — der rechtlich nötige Lizenz-Credit steht vollständig im
          Quellen-Fuß; oben zählt nur die Aktualität.
        */}
        <div style={S.stand}>
          Stand{" "}
          <time dateTime={atlas.data_as_of} style={S.standDate}>
            {standLabel(atlas.data_as_of)}
          </time>{" "}
          · monatlich aktualisiert
        </div>

        {/* Überschrift UND Einleitung links, Auszeichnung rechts: Der Badge
            beginnt damit auf Höhe der Überschrift statt erst neben dem
            Fließtext. Auf schmalen Schirmen gestapelt (CSS: .gemeinde-kopf). */}
        <div className="gemeinde-kopf">
          <div style={{ minWidth: 0 }}>
            <h1 style={S.h1}>Solaranlagen in {region.name}</h1>
            <CollapsibleIntro>
          {/*
            Der Einleitungstext kommt in Stücken, weil zwei davon auf eine
            Stellung des Eigentümer-Umschalters weiter unten zeigen. Welche
            Messgröße wohin gehört, entscheidet der Rechenkern
            (lib/gemeinde-vergleich.ts) — hier wird daraus nur eine Adresse.
          */}
          {gemeindeHighlightTeile({
            name: region.name,
            atlas,
            blAtlas,
            blName: bl?.name ?? "Landes",
            population: region.population ?? null,
            blPopulation: blRegion?.population ?? null,
            bezeichnung: region.bezeichnung,
            kreisName: istKreisfreiStadt ? null : (kreis?.name ?? null),
            rankInKreis: istKreisfreiStadt ? null : rankInKreis,
            kreisTotal,
            byYear: atlas.solar.by_year,
            lastYear,
          }).map((teil, i) =>
            teil.ziel ? (
              <a key={i} href={`#${ownerAnker(teil.ziel)}`} style={S.introLink}>
                {teil.text}
              </a>
            ) : (
              <span key={i}>{teil.text}</span>
            ),
          )}
            </CollapsibleIntro>
          </div>
          <GemeindePlatzierungen regionId={region.region_id} />
        </div>

        {SHOW_PEER_TILES && !!region.population && (
          <GemeindePeerTiles rows={peerRows} blName={bl?.name ?? "diesem Land"} band={band} />
        )}

        <GemeindeHero
          kpi={kpi}
          cells={atlas.solar.by_segment}
          siblings={siblings}
          // DIE EIGENE ZEILE IN DER RANGLISTE: Bei einer kreisfreien Stadt und
          // bei den Stadtstaaten ist die Vergleichsgruppe eine Ebene höher
          // (Kreise bzw. Bundesländer). Dort trägt die eigene Zeile den
          // gekürzten Schlüssel — mit dem 8-stelligen Gemeindeschlüssel fand
          // sie sich nie selbst, stand nicht in der Tabelle und war nicht
          // hervorgehoben. Sichtbar auf der Stuttgart-Seite: „Platz 1" oben,
          // darunter fünf fremde Landkreise.
          regionId={
            istStadtstaatRegion
              ? region.region_id.slice(0, 2)
              : istKreisfreiStadt
                ? region.region_id.slice(0, 5)
                : region.region_id
          }
          vergleichTitel={`Top ${vergleich.was}${vergleich.wo ? ` ${vergleich.wo}` : ""}`}
          eigenePopulation={region.population ?? null}
          // Größenklassen gibt es nur für Gemeinden. Bei einer kreisfreien Stadt
          // sind die Nachbarn in dieser Liste Kreise, bei einem Stadtstaat
          // Bundesländer — dort wäre eine Klasse eine erfundene Einteilung.
          klassenVergleich={vergleich.was === "Kommunen"}
          vergleichWo={vergleich.wo}
          // DIE ZIELADRESSE DER ZEILEN — dieselbe Ebenen-Unterscheidung wie beim
          // regionId darüber, und aus demselben Grund: Steht die Vergleichsgruppe
          // eine Ebene höher, sind ihre Zeilen Kreise bzw. Bundesländer und
          // brauchen deren Adresse. Die Regel selbst steht in atlas-ranking.ts,
          // zusammen mit dem Befund, der sie ausgelöst hat.
          basePath={vergleichsBasisPfad(
            istStadtstaatRegion ? "bundesland" : istKreisfreiStadt ? "landkreis" : "gemeinde",
            params.bundesland,
            params.kreis,
          )}
        />

        {/* „Was das für Sie bedeutet": die drei Beispielrechnungen brauchen den
            Standort-Ertrag (PVGIS, extern/langsam). Er wird client-seitig
            nachgeladen (Skeleton → Zahlen), damit der Server-Render nicht darauf
            wartet — dieselbe pure Rechnung, gleiche Zahlen wie zuvor server-seitig.
            Gezeigt wird der Block wie bisher für jede bewohnte Gemeinde (die
            repräsentative PLZ reicht; ohne Koordinate fällt der Ertrag sauber auf
            den Bundesland-Wert zurück). */}
        {region.population ? (
          <GemeindePotentialClient plz={repPlz} lat={geoLat} lon={geoLon} texte={szenarioTexte} name={region.name} regionId={region.region_id} />
        ) : (
          // Ohne Einwohnerzahl gibt es keinen Potential-Block — der Rechner-Link
          // muss trotzdem erhalten bleiben (sonst hat die Seite keinen Weg dorthin).
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
        {/* Section-Überschrift bewusst aus einem ANDEREN Blickwinkel als die
            Widget-Titel ("Erneuerbare Leistung …" / "Solarleistung heute …"):
            fragende H2 mit lokalem Keyword + Technologie-Nennung (SEO), keine
            Wortwiederholung. */}
        <div style={S.section}>
          <h2 style={S.h2}>Wie grün ist der Strom in {region.name}?</h2>
          <p style={S.sub}>
            Nicht nur Photovoltaik: auch Wasserkraft und Biomasse speisen ein. So verteilt sich
            die installierte Leistung nach Technologie — und so viel liefern die Solaranlagen bei
            aktuellem Wetter.
          </p>
          <div style={S.sideBySide}>
            <div style={S.sbsItem}>
              <GemeindeErneuerbareWidget
                name={region.name}
                solarKwp={atlas.solar.total_kwp}
                generators={atlas.generators}
                speicherKwh={speicher.kwh_batterie}
                liveUrl={`https://solar-check.io${gemeindePath}`}
                onsite
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
                  onsite
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
              {istStadtstaatRegion
                ? "Deutschland mit allen Bundesländern"
                : istKreisfreiStadt
                  ? `${bl?.name ?? "Das Bundesland"} mit allen Kreisen`
                  : `${kreis?.name ?? "Der Landkreis"} mit allen Gemeinden`}{" "}
              — tippen Sie auf ein Gebiet für die Details.
            </p>
            {/* showSource=false: der Quellen-Fuß der Seite trägt BKG + MaStR schon.
                Im Embed zeigt die Karte ihre Quelle weiterhin selbst. */}
            <MastrHeroSection
              /* Kreisfreie Stadt: der Elternteil IST die Stadt selbst, die Karte
                 zeigte dann Stuttgart > Stuttgart. Eine Ebene höher einsteigen,
                 damit die Stadt zwischen ihren echten Nachbarn liegt. */
              initialRegion={istStadtstaatRegion ? "de" : istKreisfreiStadt ? blAgs : region.parent_region_id}
              initialTraeger="solar"
              showSource={false}
            />
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
            pfad={`/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`}
          />
        </div>

        <div style={S.disclaimer}>
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur), Stand {standLabel(atlas.data_as_of)},
          monatlich aktualisiert, Datenlizenz{" "}
          <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer" style={S.licLink}>
            dl-de/by-2-0
          </a>{" "}
          (Daten aggregiert). Einwohnerzahlen und Gebietsstand: {DATA_SOURCES.destatis.name},
          Gemeindeverzeichnis{region.population_as_of ? `, Stand ${standLabel(region.population_as_of)}` : ""},
          Datenlizenz dl-de/by-2-0.{" "}
          {region.parent_region_id && (
            // Kartengeometrien: die Karte selbst zeigt ihren Credit auf dieser Seite
            // nicht mehr (showSource=false), daher steht die BKG-Attribution hier.
            <>
              Kartengeometrien: GeoBasis-DE / BKG, Datenlizenz dl-de/by-2-0 (vereinfacht).{" "}
            </>
          )}
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
          {region.population ? (
            // Der Standort-Ertrag der Beispielrechnungen („Was das für Sie
            // bedeutet") kommt von PVGIS — hier genannt, weil der Ertrag sichtbar
            // ist (… kWh/kWp am Standort). Wird client-seitig geladen, die Quelle
            // gehört trotzdem sichtbar hierher.
            <>
              Der Standort-Ertrag (kWh/kWp) in den Beispielrechnungen stammt von{" "}
              <a href={DATA_SOURCES.pvgis.url} target="_blank" rel="noopener noreferrer" style={S.licLink}>
                PVGIS
              </a>{" "}
              (Europäische Kommission).{" "}
            </>
          ) : null}
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
    padding: "0 16px 24px",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  // EINE Groesse, EINE Farbe: Die Zeile hatte 11px neben Mono in einem anderen
  // Grau — drei Wechsel in sechs Woertern, das las sich zerhackt. Groesse aus
  // der Typo-Skala (caption), Farbe aus einem Token, das Datum nur durch das
  // Schriftgewicht hervorgehoben.
  stand: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-muted"),
    marginBottom: space.sm,
  },
  standDate: { fontWeight: 600, color: "inherit" },
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: `0 0 ${space.md}px` },
  h2: { fontSize: 16, fontWeight: 700, margin: `0 0 ${space.xs}px` },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px` },
  section: { marginBottom: space.huge },
  // Erneuerbare-Mix + 24h-Sim nebeneinander; auf Mobil untereinander (flex-wrap).
  // stretch → beide Karten gleich hoch; sbsItem als flex, damit die Karte (height
  // 100 %) die gestreckte Höhe füllt.
  sideBySide: { display: "flex", flexWrap: "wrap", gap: space.xl, alignItems: "stretch" },
  sbsItem: { flex: "1 1 320px", minWidth: 0, display: "flex" },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.sm,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    padding: pad("lg", "xl"),
    borderRadius: v("--radius-md"),
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  },
  linkRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: pad("lg"),
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
    paddingTop: space.lg,
    marginBottom: space.xxxl,
  },
  licLink: { color: "inherit", textDecoration: "underline" },
  // Verweis INNERHALB eines Fließtextsatzes: gepunktet unterstrichen in der
  // Textfarbe, nicht blau. Er führt nicht weg, sondern an eine Stelle weiter
  // unten auf derselben Seite — ein Akzent-Link mittendrin sähe aus wie ein
  // Absprung und würde den Satz zerreißen. Dieselbe Affordanz wie beim
  // Click-to-Edit im Rechner.
  introLink: {
    color: "inherit",
    textDecoration: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: 3,
  },
};
