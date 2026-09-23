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
