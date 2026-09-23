import type { GemeindePaket } from "../../lib/gemeinde-paket";
import { klasseVon } from "../../lib/gemeindegroesse";
import { anzeigeOrtsname, istStadtstaat, ortPraeposition } from "../../lib/atlas-orte";

/**
 * What public/gemeinde/rangliste.js and teilen.js read as window.__GEMEINDE__.
 * Everything town-specific the prototype had typed in (Höchberg, 09679147,
 * "Landkreis Würzburg", 9.564 Einwohner, its URLs) is built here from the
 * package — one place, server-side.
 */

/** Unit labels of the ranking stage, as the approved prototype writes them
 *  (scripts/municipality-preview/rank-overview.ts, unitFor). */
const EINHEIT: Record<string, string> = {
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
 * Die Regel selbst ist die des abgenommenen Entwurfs: der Platz nach der Zahl
 * der Solaranlagen unter den gleich großen Orten des Kreises, aber NUR aufs
 * Podest (Quitzdorf stand hier mit „Platz 25", während es im Kreis beim Zubau
 * je Einwohner Zweiter ist). Sonst die beste ausgezeichnete Platzierung, und
 * wo es keine gibt, keine.
 */
export type KopfPlatzierung = { art: "anzahl"; platz: number } | { art: "auszeichnung"; index: number };

export function kopfPlatzierung(p: GemeindePaket): KopfPlatzierung | null {
  const peers = p.district.peers as { region_id: string; sums: { alle: { count: number } } }[];
  const own = peers.find((r) => r.region_id === p.ags);
  if (peers.length >= 3 && own) {
    const platz = 1 + peers.filter((r) => r.sums.alle.count > own.sums.alle.count).length;
    if (platz <= 3) return { art: "anzahl", platz };
  }
  const index = p.rankings.findIndex((x) => x.distinction);
  return index >= 0 ? { art: "auszeichnung", index } : null;
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
      unit: EINHEIT[r.format] ?? "",
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
