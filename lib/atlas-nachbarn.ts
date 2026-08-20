import "server-only";
import { getTopGemeinden, type TopGemeinde } from "./atlas";
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
};

/**
 * So viele Zeilen zeigt die Liste, bevor die eigene angehängt wird. Dieselbe
 * Zahl wie in der Kreis-Ansicht — sonst springt die Höhe beim Umschalten.
 */
export const NACHBARN_ZEILEN = 4;

/**
 * Obergrenze der serverseitigen Rangliste.
 *
 * Sie muss die ganze Größenklasse fassen, weil sonst der eigene Platz nicht
 * bestimmbar ist: Wer nicht in der Liste steht, hat keinen Rang, und eine
 * abgeschnittene Liste liefert stillschweigend „nicht gefunden" statt „Platz
 * 812". Die größte Klasse (Dörfer, bundesweit) hat rund 5.000 Kommunen.
 */
const MAX_ZEILEN = 12_000;

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
}): Promise<Nachbarschaft | null> {
  const klasse = GROESSENKLASSE_BY_SLUG[opts.klasseSlug];
  if (!klasse) return null;

  const [alle, elternSlugs] = await Promise.all([
    getTopGemeinden({
      prefix: opts.prefix,
      owner: opts.owner,
      limit: MAX_ZEILEN,
      minPop: klasse.min,
      maxPop: klasse.max ?? undefined,
    }),
    loadElternSlugs(),
  ]);
  if (alle.length === 0) return null;

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

  const kopf = alle.slice(0, NACHBARN_ZEILEN).map(zeile);
  const eigen = alle.find((r) => r.region_id === opts.regionId);

  // Die eigene Zeile wird ANGEHÄNGT, nicht eingefügt — außer sie steht ohnehin
  // in den ersten Zeilen. Sonst stünde sie zweimal da, und das sah in der
  // Kreis-Ansicht schon einmal wie ein Fehler aus.
  const zeilen =
    eigen && !kopf.some((z) => z.selbst) ? [...kopf, zeile(eigen)] : kopf;

  return { zeilen, total: alle.length };
}
