import "server-only";

// Die Geschichten EINES Orts als Beiträge — die ganze Kette an einer Stelle.
//
// WARUM: Die Kette stand bis zum 06.09.2026 inline auf der Gemeindeseite —
// Anlagenbestand, Zubau nach Monat, Wohnungsbestand, Platzierungen, Funde des
// Suchlaufs, dann `ortsStories` und `ortsPosts`. Solange nur die Seite sie
// brauchte, war das in Ordnung. Der Redaktionstisch braucht sie jetzt auch
// (dort werden die Beiträge eines Versandschubs eingestellt), und eine zweite
// Zusammenstellung hieße: Was der Betreiber im Tisch sieht, ist nicht, was auf
// der Seite steht — genau die Klasse Fehler, gegen die dieses Projekt seine
// geteilten Rechenfunktionen hat.
//
// SERVER-ONLY: Vier der sechs Quellen lesen die Datenbank.

import { getAncestors, getRankingData, getRegionById } from "./atlas";
import { getRegionAtlasData } from "./mastr-data";
import { fundeFuerOrt } from "./social-fundvorrat";
import { vergleichsPlaetze } from "./awards-server";
import { monatsZubau, wohnungsBestand } from "./orts-daten";
import { ortsStories, type StoryDaten } from "./orts-stories";
import { ortsPosts, type OrtsBeitrag } from "./orts-posts";
import { ladeFassungen } from "./social-vorlagen-db";
import type { GespeicherteFassung } from "./social-posts";

/** Was der Aufrufer schon hat — die Seite lädt es ohnehin für ihre Kacheln. */
export type OrtsEingang = {
  regionId: string;
  name: string;
  population: number | null;
  solar: StoryDaten["solar"];
  speicher: StoryDaten["speicher"];
  /** Datenstand des Anlagenregisters (ISO). */
  standIso: string;
  /** Die Namen der Nachbargemeinden im Kreis — sie erweitern die Fundsuche. */
  kreisOrte: string[];
  /** Name des Bundeslands, für die Fundsuche. */
  land: string | null;
};

/**
 * Die Beiträge eines Orts, stärkste zuerst.
 *
 * `fassungen` kann hereingereicht werden: Wer viele Orte hintereinander baut
 * (der Redaktionstisch tut das), lädt die Ablage EINMAL statt je Ort — sonst
 * kostet ein Schub von fünfundzwanzig Orten fünfundzwanzig Abfragen für
 * dieselbe kleine Tabelle. Dieselbe Überlegung wie bei den Sitemap-Pfaden: Eine
 * Seite darf nicht mit den Daten teurer werden.
 */
export async function ortsBeitraege(
  ort: OrtsEingang,
  fassungen?: Record<string, GespeicherteFassung>,
): Promise<OrtsBeitrag[]> {
  const [monate, wohnungen, plaetze, funde, gespeichert] = await Promise.all([
    monatsZubau(ort.regionId),
    wohnungsBestand(ort.regionId),
    vergleichsPlaetze(ort.regionId),
    // Nur redaktionell VORGEMERKTE Funde. „offen" heißt, dass den Fund noch
    // niemand angesehen hat — ein Kandidat, keine veröffentlichte Aussage.
    fundeFuerOrt({ ort: ort.name, kreisOrte: ort.kreisOrte, land: ort.land, stand: "vorgemerkt" }),
    fassungen ? Promise.resolve(fassungen) : ladeFassungen(),
  ]);

  return ortsPosts({
    stories: ortsStories({
      daten: {
        name: ort.name,
        regionId: ort.regionId,
        population: ort.population,
        solar: ort.solar,
        speicher: ort.speicher,
        standIso: ort.standIso,
        monate,
        wohnungen,
      },
      heuteJahr: new Date().getUTCFullYear(),
      plaetze,
      funde,
    }),
    ort: { regionId: ort.regionId, name: ort.name },
    standIso: ort.standIso,
    fassungen: gespeichert,
  });
}


/**
 * Dieselben Beiträge, aber nur aus dem Gemeindeschlüssel.
 *
 * Für Aufrufer, die den Bestand nicht ohnehin geladen haben — der
 * Redaktionstisch stellt die Beiträge eines Versandschubs ein und hat keine
 * Atlas-Seite darum herum. Die Ortsseite benutzt weiterhin `ortsBeitraege`
 * direkt: Sie hat alles schon und würde es sonst ein zweites Mal holen.
 *
 * `null`, wenn es die Gemeinde nicht gibt — kein Wurf: Der Schlüssel kommt aus
 * einer Adresse, und ein Vertipper ist kein Fehler des Codes.
 */
export async function ortsBeitraegeFuerId(
  regionId: string,
  fassungen?: Record<string, GespeicherteFassung>,
): Promise<OrtsBeitrag[] | null> {
  const region = await getRegionById(regionId);
  if (!region) return null;
  const [atlas, vorfahren] = await Promise.all([
    getRegionAtlasData(regionId),
    getAncestors(region),
  ]);
  // Die Nachbargemeinden erweitern die Fundsuche. Über DIESELBE Funktion wie
  // die Ortsseite — eine schlankere Abfrage nur für den Tisch hieße, dass er
  // andere Funde zeigt als die Seite, und genau das soll diese Datei
  // verhindern.
  const kreis = vorfahren.find((r) => r.level === "landkreis") ?? null;
  const geschwister = kreis ? await getRankingData(kreis) : { regions: [] };
  const land = vorfahren.find((r) => r.level === "bundesland")?.name ?? null;

  return ortsBeitraege(
    {
      regionId,
      name: region.name,
      population: region.population ?? null,
      solar: atlas.solar,
      speicher: atlas.speicher,
      standIso: atlas.data_as_of,
      kreisOrte: geschwister.regions.map((r) => r.name),
      land,
    },
    fassungen,
  );
}


/**
 * Die Beiträge MEHRERER Orte — für die Templates-Ansicht.
 *
 * WOFÜR: Ein Design wird an den Beiträgen abgenommen, die im nächsten
 * Versandschub wirklich rausgehen, nicht an den vierzehn bundesweiten. Welche
 * Bildform eine Ortsgeschichte bekommt, entscheiden ihre Zahlen — man muss also
 * echte Orte ansehen, um zu wissen, welche Formen der Schub überhaupt braucht.
 *
 * MIT DECKEL, und der ist keine Bequemlichkeit: Die Kette je Ort kostet ein
 * halbes Dutzend Abfragen. Ein ganzer Schub sind hundert Gemeinden, also
 * sechshundert Abfragen für eine Ansicht — genau die Kopplung „teurer mit den
 * Daten", an der im September der Produktionsbau zerbrochen ist.
 *
 * Der Aufrufer bekommt zurück, WIE VIELE Orte angesehen wurden. Eine Ansicht,
 * die einen Ausschnitt zeigt und wie das Ganze aussieht, behauptet eine
 * Vollständigkeit, die sie nicht hat.
 */
export async function ortsBeitraegeMehrere(
  orte: OrtsSchluessel[],
  opts: { hoechstens?: number } = {},
): Promise<{ beitraege: OrtsBeitrag[]; angesehen: number; vorhanden: number }> {
  const deckel = Math.max(1, Math.min(opts.hoechstens ?? 6, 24));
  const auswahl = orte.slice(0, deckel);
  // Die Fassungen EINMAL — sonst holt jeder Ort dieselbe kleine Tabelle neu.
  const fassungen = await ladeFassungen();
  // Nebenläufig, aber nicht unbegrenzt: Der Deckel IST die Begrenzung.
  const listen = await Promise.all(
    auswahl.map((o) =>
      ortsBeitraegeFuerId(o.regionId, fassungen).catch(() => null),
    ),
  );
  return {
    beitraege: listen.flatMap((l) => l ?? []),
    angesehen: auswahl.length,
    vorhanden: orte.length,
  };
}

/** Nur der Schlüssel — mehr braucht der Sammellauf nicht. */
export type OrtsSchluessel = { regionId: string };
