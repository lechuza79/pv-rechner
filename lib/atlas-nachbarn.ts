import "server-only";
import { getGemeindeRang, getGruppenGroesse, getTopGemeinden, type TopGemeinde } from "./atlas";
import { loadElternSlugs } from "./awards-server";
import { GROESSENKLASSE_BY_SLUG } from "./gemeindegroesse";

//
// DIE VERGLEICHSGRUPPE FOLGT DER BEZUGSGRÖSSE.
//
// Die Gemeindeseite verglich oben mit dem Bundesland („39 % über dem
// Hessen-Schnitt") und unten mit dem Landkreis („Platz 27 von 27"). Beides
// richtig, beides eine andere Frage — nebeneinander liest es sich als
// Widerspruch. Stellt der Leser den Bezug auf Hessen, muss die Liste darunter
// mitgehen, sonst bleibt genau die Unstimmigkeit stehen, deretwegen der
// Umschalter überhaupt angefasst wurde.
//
// Die Nachbarn im Kreis liegen ohnehin auf der Seite (siehe `siblings`) und
// werden im Browser sortiert. Für Land und Bund geht das nicht: Hessen hat
// rund 420 Gemeinden, Deutschland über elftausend, und beide vollständig
// auszuliefern wäre ein Vielfaches der Seite für eine Liste mit fünf Zeilen.
// Deshalb hier: einmal serverseitig ranken, fünf Zeilen plus die eigene
// zurückgeben.
//
// GERANKT WIRD INNERHALB DER GRÖSSENKLASSE, aus demselben Grund wie im Kreis:
// Ohne sie führen bundesweit die Dörfer, und eine Kleinstadt steht bei Platz
// 3.000 — das misst die Einwohnerzahl im Nenner, nicht den Ausbau.

export type NachbarZeile = {
  regionId: string;
  name: string;
  /** Atlas-Pfad, oder null wenn ein Slug der Kette fehlt. */
  href: string | null;
  /** Wp je Einwohner. */
  wert: number;
  platz: number;
  selbst: boolean;
};

export type Nachbarschaft = {
  zeilen: NachbarZeile[];
  /** Wie viele Kommunen die Gruppe insgesamt hat — der Nenner des Platzes. */
  total: number;
  /** Wie viele Zeilen davon die Spitze sind. Die eigene Zeile hängt gegebenenfalls
   *  dahinter — ohne diese Zahl liesse sich „die ersten 100" nicht von „die
   *  ersten 100 plus die eigene" unterscheiden, und der Satz im Fenster müsste
   *  raten. */
  spitzeZeilen: number;
};

/**
 * So viele Zeilen zeigt die Liste, bevor die eigene angehängt wird. Dieselbe
 * Zahl wie in der Kreis-Ansicht — sonst springt die Höhe beim Umschalten.
 */
export const NACHBARN_ZEILEN = 4;

/**
 * Wie viele Zeilen das Fenster „ganze Liste" zeigt.
 *
 * NICHT ALLE, UND DAS IST ABSICHT: Die Datenbank gibt höchstens 1.000 Zeilen je
 * Antwort zurück (`.range()` hebt das nicht auf, gemessen 20.08.2026), und eine
 * bundesweite Gruppe ist größer — „Dörfer" hat 3.795. Sie vollständig zu
 * liefern hieße mehrere Abrufe und ein paar hundert Kilobyte in den Browser zu
 * schieben, für eine Liste, durch die niemand scrollt.
 *
 * Hundert Zeilen sind eine Seite, die man wirklich durchsieht — und der Titel
 * sagt, dass es hundert von 2.235 sind, statt „alle" zu behaupten.
 */
export const VOLLE_LISTE_ZEILEN = 100;

/**
 * Die Vergleichsgruppe einer Kommune in einem Gebiet, gerankt nach Leistung je
 * Einwohner.
 *
 * `prefix` ist der Gebiets-Schlüssel: "" = bundesweit, "06" = Hessen. Er geht
 * unverändert in die vorhandene, gecachte Abfrage; die Zwischenergebnisse sind
 * je (Gebiet × Eigentümer × Klasse) identisch für alle Kommunen darin, also
 * zahlt die erste Anfrage und der Rest liest aus dem Cache.
 */
export async function nachbarschaft(opts: {
  prefix: string;
  owner: "alle" | "privat" | "gewerbe";
  klasseSlug: string;
  regionId: string;
  /** Wie viele Spitzenreiter — die Karte zeigt vier, das Fenster hundert. */
  top?: number;
}): Promise<Nachbarschaft | null> {
  const klasse = GROESSENKLASSE_BY_SLUG[opts.klasseSlug];
  if (!klasse) return null;
  const grenzen = { minPop: klasse.min, maxPop: klasse.max ?? undefined };
  const top = opts.top ?? NACHBARN_ZEILEN;

  //
  // DREI SCHLANKE ABFRAGEN STATT EINER GROSSEN.
  //
  // Die erste Fassung holte die ganze Größenklasse und schnitt sie hier zu.
  // Das ging in Hessen gut (240 Kommunen) und bundesweit still schief: Die
  // Antwort ist bei 1.000 Zeilen gedeckelt, also stand auf der Seite „1.000
  // Kommunen in dieser Gruppe" statt 2.235 — und Melsungen, auf Platz 1.849,
  // fiel aus der Liste, weil sie ihn nicht enthielt. Beides sah nach nichts
  // aus: eine runde Zahl und eine Liste ohne die eigene Zeile.
  //
  // Jetzt: die Spitze (vier oder hundert Zeilen), der Zähler ohne Zeilen, die
  // eigene Zeile einzeln. Der Rang entsteht in der Datenbank über den
  // vollständigen Datensatz, also stimmt er auch für Platz 1.849.
  const [spitze, total, eigen, elternSlugs] = await Promise.all([
    getTopGemeinden({ prefix: opts.prefix, owner: opts.owner, limit: top, ...grenzen }),
    getGruppenGroesse({ prefix: opts.prefix, owner: opts.owner, ...grenzen }),
    getGemeindeRang({ prefix: opts.prefix, owner: opts.owner, regionId: opts.regionId, ...grenzen }),
    loadElternSlugs(),
  ]);
  if (spitze.length === 0) return null;

  const href = (r: TopGemeinde): string | null => {
    const bl = elternSlugs[r.parent_region_id.slice(0, 2)];
    const kreis = elternSlugs[r.parent_region_id];
    return bl && kreis && r.slug ? `/solar-atlas/${bl}/${kreis}/${r.slug}` : null;
  };
  const zeile = (r: TopGemeinde): NachbarZeile => ({
    regionId: r.region_id,
    name: r.name,
    href: href(r),
    wert: r.w_per_capita,
    platz: r.rang,
    selbst: r.region_id === opts.regionId,
  });

  const kopf = spitze.map(zeile);

  // Die eigene Zeile wird ANGEHÄNGT, nicht eingefügt — außer sie steht ohnehin
  // in den ersten Zeilen. Sonst stünde sie zweimal da, und das sah in der
  // Kreis-Ansicht schon einmal wie ein Fehler aus.
  const zeilen = eigen && !kopf.some((z) => z.selbst) ? [...kopf, zeile(eigen)] : kopf;

  return { zeilen, total, spitzeZeilen: kopf.length };
}
