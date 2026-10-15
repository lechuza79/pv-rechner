import type { GemeindePaket } from "../../lib/gemeinde-paket";
import { AWARD_CATEGORY_BY_KEY } from "../../lib/awards";
import { GROESSENKLASSE_BY_SLUG } from "../../lib/gemeindegroesse";
import { MIN_WERT_FUER_AUFHAENGER, selectHook, type Placement } from "../../lib/award-hook";
import { klasseVon } from "../../lib/gemeindegroesse";
import { STUFEN } from "../../lib/atlas-format";
import { anzeigeOrtsname, istStadtstaat, ortPraeposition } from "../../lib/atlas-orte";

/**
 * What public/gemeinde/rangliste.js and teilen.js read as window.__GEMEINDE__.
 * Everything town-specific the prototype had typed in (Höchberg, 09679147,
 * "Landkreis Würzburg", 9.564 Einwohner, its URLs) is built here from the
 * package — one place, server-side.
 */

/** Unit labels of the ranking stage, as the approved prototype writes them
 *  (scripts/municipality-preview/rank-overview.ts, unitFor). */
export const RANKING_UNITS: Record<string, string> = {
  wattProKopf: "Wp / Einwohner",
  countPer1000: "Anlagen / 1.000 Einwohner",
  je100Dach: "je 100 Dächer",
  whProKopf: "Wh / Einwohner",
  pvLeistung: "kWp",
  mixLeistung: "kW",
  count: "Anlagen",
  speicherKwh: "kWh",
};

/** German genitive of a place name: "Höchbergs", but "Bad Ems’". */
export function genitiv(name: string): string {
  return /[sßxz]$/i.test(name) ? `${name}’` : `${name}s`;
}

/**
 * WELCHE Platzierung dieser Ort führt — die EINE Entscheidung, aus der sowohl
 * die Kachel im Kopf als auch die Startkategorie des Ranking-Abschnitts folgt.
 *
 * WARUM AN EINER STELLE (Betreiber, 23.09.2026): Beide entschieden es vorher
 * getrennt, mit verschiedenem Ergebnis — der Kopf zeigte bei Höchberg „Platz 2
 * · Anzahl der Solaranlagen", der Abschnitt darunter öffnete auf
 * „Batteriespeicher". Zwei Platzierungen desselben Orts auf einer Seite, und
 * keine sagt, welche gilt.
 *
 * Since 15.10.2026 the head shows the placement the outreach letter leads with
 * (see the comment in the function); the count among same-size towns of the
 * district, podium only, is the fallback for towns without any award.
 */
export type KopfPlatzierung = { art: "anzahl"; platz: number } | { art: "auszeichnung"; index: number };

export function kopfPlatzierung(p: GemeindePaket): KopfPlatzierung | null {
  // THE LETTER'S PLACEMENT FIRST (operator, 15.10.2026): Schönewalde's letter
  // said "Platz 1 von 140 in Brandenburg", the head of its page "Platz 3 ·
  // Anzahl der Solaranlagen" (count in the district). The head now runs the
  // letter's own selection (selectHook) over the page's rankings: only
  // per-capita citizen categories within a size class, largest level first.
  // The minimum values apply here too; the spike and stock-count brakes need
  // the group median and counts the package lacks, so rare towns may differ.
  const placements: Placement[] = [];
  const herkunft = new Map<string, number>();
  p.rankings.forEach((r, i) => {
    const [categoryKey, scope, klasseSlug] = r.key.split(":");
    // Same pool as buildHookIndex: citizen categories, ratios only, within a size class.
    const cat = AWARD_CATEGORY_BY_KEY[categoryKey];
    if (!cat || cat.traeger !== "buerger" || cat.messart === "absolut" || !GROESSENKLASSE_BY_SLUG[klasseSlug]) return;
    const level = scope === "de" ? "bund" : scope.length === 2 ? "land" : "kreis";
    const mindest = MIN_WERT_FUER_AUFHAENGER[categoryKey];
    const duenn = mindest != null && r.value < mindest;
    placements.push({ categoryKey, level, scopeId: scope === "de" ? "de" : scope, klasseSlug, klasseLabel: "", rank: r.rank, total: r.size, value: r.value, spike: false, duenn, schlusslicht: false } as Placement);
    herkunft.set(`${categoryKey}|${level}|${klasseSlug}`, i);
  });
  const hook = selectHook(placements);
  const index = hook.kind === "neutral" ? -1 : herkunft.get(`${hook.categoryKey}|${hook.level}|${placements.find((x) => x.categoryKey === hook.categoryKey && x.level === hook.level && x.rank === hook.rank)?.klasseSlug}`) ?? -1;
  if (index >= 0) return { art: "auszeichnung", index };
  const peers = p.district.peers as { region_id: string; sums: { alle: { count: number } } }[];
  const own = peers.find((r) => r.region_id === p.ags);
  if (peers.length >= 3 && own) {
    const platz = 1 + peers.filter((r) => r.sums.alle.count > own.sums.alle.count).length;
    if (platz <= 3) return { art: "anzahl", platz };
  }
  return null;
}

export function ranglistenDaten(
  paket: GemeindePaket,
  ort: { name: string; ags: string; landName: string; kreisBase: string; liveUrlAbsolut: string; widgetUrl: string },
) {
  const population = paket.register?.own.population ?? null;
  const klasse = population ? klasseVon(population) : null;
  // A district comparison only where the package has one (at least three
  // towns of the same size); kreisfreie Städte and Stadtstaaten start with
  // the state instead.
  const lokal = paket.district.peers.length >= 3;
  const kreisAgs = lokal ? paket.kreis.ags : null;
  const landAgs = ort.ags.slice(0, 2);
  // Ein Stadtstaat IST sein Bundesland: Der Landesvergleich enthält dann nur
  // diese eine Stadt, und die Rangliste zeigte „Top 1 von 1" — ein Podest aus
  // dem Nichts (dieselbe Regel wie die Dreier-Schwelle im Kreis). Hamburg und
  // Berlin starten deshalb bundesweit, Bremen auch: dort wären es zwei.
  const alleinImLand = istStadtstaat(ort.ags);
  return {
    ags: ort.ags,
    name: ort.name,
    genitiv: genitiv(ort.name),
    kreisAgs,
    kreisLabel: paket.kreis.name,
    landAgs,
    landLabel: ort.landName,
    startArea: kreisAgs ?? (alleinImLand ? "" : landAgs),
    startLabel: kreisAgs ? paket.kreis.name : alleinImLand ? "Deutschland" : ort.landName,
    // Die Kategorie, mit der der Abschnitt aufmacht — dieselbe, die im Kopf
    // steht. "count" ist die eingebaute Anzahl-Rangliste, sonst der Platz der
    // ausgezeichneten Platzierung in der Liste darunter.
    startKategorie: (() => {
      const wahl = kopfPlatzierung(paket);
      return wahl ? (wahl.art === "anzahl" ? "count" : `saved-${wahl.index}`) : null;
    })(),
    // Die Staffelung der Einheiten kommt aus dem Einheiten-Modul der Site —
    // das Browser-Skript der Rangliste kann es nicht importieren und hatte
    // deshalb eine eigene, kürzere Tabelle. Die kannte die Leistung eines
    // Technologie-Mix nicht („Windleistung 121.712" statt 121,7 MW).
    stufen: STUFEN,
    klasse: klasse?.slug ?? "gemeinden-und-kleinstaedte",
    einwohnerLabel: population ? `${population.toLocaleString("de-DE")} Einwohner` : "keine Einwohnerzahl",
    kreisBase: ort.kreisBase,
    liveUrl: ort.liveUrlAbsolut,
    widgetUrl: ort.widgetUrl,
    district: {
      dataAsOf: paket.rangStand,
      populationAsOf: paket.einwohnerStand ?? paket.rangStand,
      // Dieselbe Kurzform wie überall auf der Seite (sonst steht der Ort in
      // seiner eigenen Kreisliste doppelt so lang wie im Kopf darüber).
      districtPeers: paket.district.districtPeers.map((r) =>
        typeof (r as { name?: unknown }).name === "string" ? { ...r, name: anzeigeOrtsname((r as { name: string }).name) } : r,
      ),
    },
    discoveries: paket.rankings.map((r) => ({
      ...r,
      unit: RANKING_UNITS[r.format] ?? "",
      // "im Landkreis Görlitz", "in der Region Hannover", "in Sachsen" — die
      // Regel steht in lib/atlas-orte.ts und kann im Browser-Skript nicht
      // importiert werden; dort stand deshalb hart "in " vor jedem Gebiet.
      scopePhrase: (() => {
        const gebiet = r.scope.split(" · ")[0];
        return `${ortPraeposition(gebiet)} ${gebiet}`;
      })(),
      rowsUrl: `/api/gemeinde/rangliste?schluessel=${encodeURIComponent(r.key)}`,
    })),
  };
}
