// ─── Aktualisierungsstand der Rechner-Seiten — EINE Quelle ──────────────────
//
// Jede Rechner-Seite trägt unter dem Inhalt eine Zeile: „Stand: … geprüft am …".
// Sie stand zuerst nur unter dem Balkonkraftwerk-Rechner und wäre auf jeder
// weiteren Seite ein zweites Mal getippt worden — mit derselben Folge wie bei
// den Einheiten und den Rechtssätzen: Eine Korrektur erreicht dann still nur
// eine Oberfläche. Deshalb steht hier, WAS eine Seite trägt und WOHER das
// Datum kommt; die Formulierung macht <StandNote>, das Recrawl-Signal die
// Sitemap (app/sitemap.ts liest `standLastModIso` — den Stand der WERTE, nicht
// den Prüftag; die Begründung steht dort).
//
// ZWEI REGELN, beide aus echten Fehlschlägen:
//
//  1. NUR STEMPELN, WAS GEPRÜFT WURDE. Kein Datum in dieser Datei kommt aus
//     `new Date()` oder aus der Build-Zeit. Ein mitlaufendes Datum behauptet
//     eine Prüfung, die nie stattgefunden hat — genau so trugen bis zum
//     16.08.2026 25 von 38 Förderprogrammen ein Prüfdatum aus `updated_at`.
//     Google ignoriert ein Build-`lastmod` ohnehin.
//  2. GETRENNTE DATEN FÜR GETRENNTE SACHEN. Marktpreise, Rechtsstand und
//     Modellannahmen altern verschieden schnell. Ein gemeinsames Datum wäre für
//     mindestens eines von ihnen gelogen, deshalb nennt eine Seite mehrere.
//     Live geholte Werte (Strompreis, Standort-Ertrag, Wetter) tragen gar kein
//     Datum — sie stehen als „kommt bei jedem Aufruf live dazu" daneben.
//
// Neue Rechner-Seite: Eintrag hier ergänzen und <StandNote> unter den Inhalt
// setzen. Eine Seite ohne ehrliches Datum bekommt KEINEN Eintrag mit erfundenem
// Stichtag, sondern nur ihre Live-Werte (Muster: /pv-simulation).
//
// DIESES MODUL IST SERVERSEITIG. Die sieben Config-Importe unten sind der Preis
// dafür, dass kein Datum handgetippt ist — sie gehören aber in kein Browser-
// Bundle. Wer die Stand-Zeile in einer CLIENT-Komponente braucht, liest den
// Datensatz in der Server-Seite mit `standSeite(pfad)` und reicht ihn durch;
// gerendert wird er dann von <StandNoteView>, das nur `lib/stand-format`
// importiert. Direkt <StandNote pfad="…"> nur in Server-Komponenten.
import { DEFAULT_BALKON_CONFIG, BALKON_RECHT } from "./balkon-config";
import { DEFAULT_AIRCON_CONFIG } from "./aircon-config";
import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { GREEN_GAS_CONFIG } from "./greengas-config";
import { CO2_PRICE } from "./co2-config";
import { FEED_IN_GEPRUEFT_ISO, feedInRatesFor } from "./feedin-config";

import { EEG_REFORM_STAND } from "./eeg-reform-config";

/** Die Periode, die AM PRÜFTAG galt — nicht die von heute. `feedInRatesFor()`
 *  ohne Argument fragt die Uhr; damit käme das sichtbare „Werte von …" aus der
 *  Laufzeit, und am 01.02.2027 stünde ein Wertstand da, der jünger ist als sein
 *  eigenes Prüfdatum. */
const FEED_IN_WERTSTAND = feedInRatesFor(new Date(`${FEED_IN_GEPRUEFT_ISO}T00:00:00`)).validFrom;

// Typen und Datums-Wortlaut liegen in `stand-format.ts` (config-frei, damit die
// Client-Seite sie mitnehmen kann) und werden hier weitergereicht — für alle
// Aufrufer bleibt `lib/stand` die eine Adresse.
export {
  monatJahr,
  tagMonatJahr,
  type StandPraezision,
  type StandEintrag,
  type StandSeite,
} from "./stand-format";
import type { StandSeite } from "./stand-format";

export const STAND: Record<string, StandSeite> = {
  // Marktpreise kommen hier live aus der Preis-Pipeline (monatlicher Scrape in
  // `market_prices`), nicht aus einer Config — deshalb tragen sie bewusst KEIN
  // Stichtagsdatum, sondern stehen bei den Live-Werten.
  "/photovoltaik-rechner": {
    eintraege: [
      { was: "EEG-Vergütungssätze", iso: FEED_IN_GEPRUEFT_ISO, praezision: "tag", wertIso: FEED_IN_WERTSTAND },
      { was: "Sachstand der EEG-Reform 2027", iso: EEG_REFORM_STAND.geprueftIso, praezision: "tag", wertIso: EEG_REFORM_STAND.kabinettBeschlussIso },
    ],
    live: ["Anlagen- und Speicherpreise (monatlich neu erhoben)", "Strompreis", "Standort-Ertrag"],
  },

  // Der Empfehlungs-Flow rechnet mit denselben Preisen und Sätzen wie der
  // Rechner, aber ohne Standort und ohne den Reform-Umschalter — deshalb ein
  // Eintrag weniger statt derselben Zeile.
  "/pv-bedarf-berechnen": {
    eintraege: [
      { was: "EEG-Vergütungssätze", iso: FEED_IN_GEPRUEFT_ISO, praezision: "tag", wertIso: FEED_IN_WERTSTAND },
    ],
    live: ["Anlagen- und Speicherpreise (monatlich neu erhoben)", "Strompreis"],
  },

  // Der Wärmepumpen-Rechner ist der einzige ohne Live-Werte: Investition,
  // Tarife, Förderung, Gaspreis und CO₂-Pfad stehen alle in Configs. Deshalb
  // fehlt hier der Live-Satz — und deshalb ist das Prüfdatum hier besonders
  // wichtig, es ist die einzige Auskunft über das Alter der Zahlen.
  "/waermepumpe-rechner": {
    eintraege: [
      { was: "Anschaffung und Tarife", iso: DEFAULT_HEATPUMP_CONFIG.geprueftIso, praezision: "tag", wertIso: DEFAULT_HEATPUMP_CONFIG.validFrom },
      // Die Förderung hat einen eigenen Prüftag, weil sie an einer eigenen
      // Quelle hängt (KfW-Merkblatt) und außer der Reihe geprüft wird. Sie mit
      // den Marktwerten unter ein Datum zu stellen hieße, das ältere von beiden
      // auf die Förderung zu übertragen — und damit eine Prüfung zu
      // verschweigen, die stattgefunden hat.
      { was: "BEG-Förderung", iso: DEFAULT_HEATPUMP_CONFIG.geprueftFoerderungIso, praezision: "tag", wertIso: DEFAULT_HEATPUMP_CONFIG.validFrom },
      // Kein Wertstand: „Grüngas-Pflicht" ist eine Rechtsaussage. `validFrom`
      // wäre hier der Stand der IW-Report-PREISE — ein fremdes Datum an einer
      // Rechtszeile (dieselbe Begründung wie beim Balkon-Rechner unten).
      { was: "Grüngas-Pflicht", iso: GREEN_GAS_CONFIG.geprueftRechtIso, praezision: "tag" },
      { was: "Gaspreis-Bestandteile", iso: GREEN_GAS_CONFIG.geprueftIso, praezision: "tag", wertIso: GREEN_GAS_CONFIG.validFrom },
      { was: "CO₂-Preispfad", iso: CO2_PRICE.geprueftIso, praezision: "tag", wertIso: CO2_PRICE.validFrom },
    ],
    live: [],
  },

  "/klimaanlage-stromkosten": {
    eintraege: [
      { was: "Gerätepreise und Effizienzen", iso: DEFAULT_AIRCON_CONFIG.geprueftIso, praezision: "tag", wertIso: DEFAULT_AIRCON_CONFIG.validFrom },
    ],
    live: ["Kühlbedarf aus dem Wetterarchiv deines Standorts", "Strompreis"],
  },

  "/einspeiseverguetung-rechner": {
    eintraege: [
      { was: "EEG-Vergütungssätze", iso: FEED_IN_GEPRUEFT_ISO, praezision: "tag", wertIso: FEED_IN_WERTSTAND },
      { was: "Sachstand der EEG-Reform 2027", iso: EEG_REFORM_STAND.geprueftIso, praezision: "tag", wertIso: EEG_REFORM_STAND.kabinettBeschlussIso },
    ],
    live: ["Standort-Ertrag"],
  },

  // Der Themen-Einstieg rechnet mit denselben Werten wie der Rechner — er zeigt
  // dieselbe Beispielrechnung als Kurzantwort. Deshalb derselbe Stand, und zwar
  // aus DENSELBEN Quellen abgeleitet statt als Zweitkopie der Literale: Zieht
  // der Wächter die Config nach, wandert beides gemeinsam.
  "/balkonkraftwerk": {
    eintraege: [
      { was: "Set- und Speicherpreise", iso: DEFAULT_BALKON_CONFIG.geprueftIso, praezision: "tag", wertIso: DEFAULT_BALKON_CONFIG.validFrom },
      { was: "rechtliche Angaben", iso: BALKON_RECHT.geprueftIso, praezision: "tag" },
    ],
    live: ["Strompreis"],
  },

  "/balkonkraftwerk/rechner": {
    eintraege: [
      { was: "Set- und Speicherpreise", iso: DEFAULT_BALKON_CONFIG.geprueftIso, praezision: "tag", wertIso: DEFAULT_BALKON_CONFIG.validFrom },
      // Rechtsaussagen tragen bewusst KEINEN Wertstand: Sie sind entweder
      // geltendes Recht oder nicht — was altert, ist allein die Prüfung. Ein
      // zweites Datum müsste man erfinden (welches der drei beteiligten
      // Gesetze?), und ein erfundenes Datum ist schlechter als keins.
      { was: "rechtliche Angaben", iso: BALKON_RECHT.geprueftIso, praezision: "tag" },
    ],
    live: ["Strompreis", "Standort-Ertrag"],
  },

  // Die Live-Simulation hat keinen Stichtag, und einen zu erfinden wäre
  // schlimmer als keinen zu haben: Sie rechnet ausschließlich mit Wetterdaten
  // des laufenden Tages. Deshalb kein Eintrag — und in der Sitemap kein
  // `lastmod` (siehe `standGeprueftIso`).
  "/pv-simulation": {
    eintraege: [],
    live: ["Wetterdaten", "Standort-Ertrag"],
  },
};

/**
 * Der Datensatz einer Seite — für Server-Komponenten, die ihn an eine
 * Client-Komponente durchreichen (Muster: die Rechner, deren Stand-Zeile
 * innerhalb des Rechner-Rahmens sitzt). Das Ergebnis ist reine Daten und damit
 * über die Server/Client-Grenze übergebbar; gerendert wird es von
 * <StandNoteView>.
 *
 * Der Pfad steht dabei bewusst als Literal am Aufruf: `lib/__tests__/stand.test.ts`
 * liest ihn von dort und prüft, dass jede Seite mit Stand-Zeile einen Eintrag
 * hat — und jeder Eintrag eine Seite.
 */
export function standSeite(pfad: string): StandSeite | undefined {
  return STAND[pfad];
}

/**
 * Das jüngste taggenaue Prüfdatum einer Seite — „wann hat zuletzt jemand
 * nachgesehen". Für Anzeigen gedacht (auch für die Vertrauens-Leiste), NICHT
 * für das `lastmod` der Sitemap: siehe `standLastModIso`.
 *
 * Monatsgenaue Stände zählen bewusst nicht mit — aus „Juli 2026" den 1. Juli zu
 * machen hieße, einen Tag zu behaupten, an dem niemand etwas geprüft hat.
 */
export function standGeprueftIso(pfad: string): string | undefined {
  const seite = STAND[pfad];
  if (!seite) return undefined;
  const tage = seite.eintraege.filter(e => e.praezision === "tag").map(e => e.iso).sort();
  return tage.length ? tage[tage.length - 1] : undefined;
}

/**
 * Das `lastmod` der Sitemap: der jüngste Stand der WERTE — nicht der jüngste
 * Prüftag.
 *
 * Der Unterschied ist der ganze Punkt (Befund des Prüfagenten, 17.08.2026).
 * Zwei der Prüfdaten werden täglich nachgezogen (Rechtsstand der Grüngas-Pflicht,
 * Sachstand der EEG-Reform). Hinge `lastmod` daran, meldete die Sitemap jeden
 * Tag „geändert", während sich am Rechner nur eine Datumszeile in der Fußnote
 * bewegt — exakt das automatisch mitlaufende Datum, das Google als Gegenbeispiel
 * nennt und mit dem man die Verlässlichkeit des Signals für die ganze Domain
 * verspielt. Inhalt der Seite sind die Werte; eine Bestätigung ist keine
 * Änderung.
 *
 * Monatsgenaue Wertstände zählen ab dem Monatsersten: die vorsichtige Richtung
 * (behauptet eher zu alt als zu jung). Eine Seite ohne Wertstand bekommt kein
 * `lastmod`.
 */
export function standLastModIso(pfad: string): string | undefined {
  const seite = STAND[pfad];
  if (!seite) return undefined;
  const werte = seite.eintraege
    .map(e => e.wertIso)
    .filter((iso): iso is string => !!iso)
    .map(iso => (iso.length === 7 ? `${iso}-01` : iso))
    .sort();
  return werte.length ? werte[werte.length - 1] : undefined;
}
