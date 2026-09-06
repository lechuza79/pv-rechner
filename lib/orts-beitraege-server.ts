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
