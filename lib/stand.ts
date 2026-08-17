// ─── Aktualisierungsstand der Rechner-Seiten — EINE Quelle ──────────────────
//
// Jede Rechner-Seite trägt unter dem Inhalt eine Zeile: „Stand: … geprüft am …".
// Sie stand zuerst nur unter dem Balkonkraftwerk-Rechner und wäre auf jeder
// weiteren Seite ein zweites Mal getippt worden — mit derselben Folge wie bei
// den Einheiten und den Rechtssätzen: Eine Korrektur erreicht dann still nur
// eine Oberfläche. Deshalb steht hier, WAS eine Seite trägt und WOHER das
// Datum kommt; die Formulierung macht <StandNote>, das Recrawl-Signal die
// Sitemap (app/sitemap.ts liest `standGeprueftIso`).
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
import { DEFAULT_BALKON_CONFIG, BALKON_RECHT } from "./balkon-config";
import { DEFAULT_AIRCON_CONFIG } from "./aircon-config";
import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { GREEN_GAS_CONFIG } from "./greengas-config";
import { CO2_PRICE } from "./co2-config";
import { FEED_IN_GEPRUEFT_ISO, feedInRatesFor } from "./feedin-config";
import { EEG_REFORM_STAND } from "./eeg-reform-config";

/** `tag` = YYYY-MM-DD (eine Prüfung an einem Tag), `monat` = YYYY-MM (ein
 *  Datenstand, den taggenau anzugeben Genauigkeit vortäuschen würde). */
export type StandPraezision = "tag" | "monat";

export interface StandEintrag {
  /** Was geprüft wurde — in der Sprache der Seite, nicht der des Codes. */
  was: string;
  /** ISO-Datum aus der Config, die den Wert trägt. Nie hier getippt. */
  iso: string;
  praezision: StandPraezision;
  /**
   * Stand der Werte selbst (`validFrom`), falls die Seite ihn getrennt nennen
   * soll. <StandNote> zeigt ihn NUR, wenn er spürbar älter ist als die Prüfung
   * — dann sagt die Zeile „Werte von Juli, im Oktober bestätigt", und genau das
   * ist die interessante Auskunft. Solange beide zusammenfallen, wäre die
   * zweite Zahl nur Lärm.
   */
  wertIso?: string;
}

export interface StandSeite {
  /** Geprüfte Stände. Leer, wenn die Seite ausschließlich live rechnet. */
  eintraege: StandEintrag[];
  /** Werte, die bei jedem Aufruf frisch geholt werden — ohne Stichtag. */
  live: string[];
}

export const STAND: Record<string, StandSeite> = {
  // Marktpreise kommen hier live aus der Preis-Pipeline (monatlicher Scrape in
  // `market_prices`), nicht aus einer Config — deshalb tragen sie bewusst KEIN
  // Stichtagsdatum, sondern stehen bei den Live-Werten.
  "/photovoltaik-rechner": {
    eintraege: [
      { was: "EEG-Vergütungssätze", iso: FEED_IN_GEPRUEFT_ISO, praezision: "tag", wertIso: feedInRatesFor().validFrom },
      { was: "Sachstand der EEG-Reform 2027", iso: EEG_REFORM_STAND.geprueftIso, praezision: "tag", wertIso: EEG_REFORM_STAND.kabinettBeschlussIso },
    ],
    live: ["Anlagen- und Speicherpreise (monatlich neu erhoben)", "Strompreis", "Standort-Ertrag"],
  },

  // Der Empfehlungs-Flow rechnet mit denselben Preisen und Sätzen wie der
  // Rechner, aber ohne Standort und ohne den Reform-Umschalter — deshalb ein
  // Eintrag weniger statt derselben Zeile.
  "/pv-bedarf-berechnen": {
    eintraege: [
      { was: "EEG-Vergütungssätze", iso: FEED_IN_GEPRUEFT_ISO, praezision: "tag", wertIso: feedInRatesFor().validFrom },
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
      { was: "Grüngas-Pflicht", iso: GREEN_GAS_CONFIG.geprueftRechtIso, praezision: "tag", wertIso: GREEN_GAS_CONFIG.validFrom },
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
      { was: "EEG-Vergütungssätze", iso: FEED_IN_GEPRUEFT_ISO, praezision: "tag", wertIso: feedInRatesFor().validFrom },
      { was: "Sachstand der EEG-Reform 2027", iso: EEG_REFORM_STAND.geprueftIso, praezision: "tag", wertIso: EEG_REFORM_STAND.kabinettBeschlussIso },
    ],
    live: ["Standort-Ertrag"],
  },

  "/balkonkraftwerk-rechner": {
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

/** „Juli 2026" aus „2026-07". */
export const monatJahr = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

/** „16. August 2026" aus „2026-08-16". */
export const tagMonatJahr = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

/**
 * Das jüngste taggenaue Prüfdatum einer Seite — die Zeile, die sich zuletzt
 * wirklich geändert hat, und damit das `lastmod` der Sitemap.
 *
 * Monatsgenaue Stände zählen hier bewusst NICHT: `lastmod` ist ein Tagesdatum,
 * und aus „Juli 2026" den 1. Juli zu machen hieße, einen Tag zu behaupten, an
 * dem niemand etwas geprüft hat. Eine Seite ohne taggenauen Eintrag bekommt
 * `undefined` und steht ohne `lastmod` in der Sitemap — das ist die ehrliche
 * Antwort, nicht die schwächere.
 */
export function standGeprueftIso(pfad: string): string | undefined {
  const seite = STAND[pfad];
  if (!seite) return undefined;
  const tage = seite.eintraege.filter(e => e.praezision === "tag").map(e => e.iso).sort();
  return tage.length ? tage[tage.length - 1] : undefined;
}
