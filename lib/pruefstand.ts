// ─── Prüfstand: altert eine Zahl unbemerkt? ─────────────────────────────────
//
// `lib/stand.ts` sagt, WAS unter einem Rechner steht. Diese Datei sagt, WER es
// prüft, WIE OFT — und ab wann ein Prüfdatum verdächtig alt ist.
//
// Warum es das braucht (17.08.2026): Die Regel „das Prüfdatum wandert mit jedem
// erreichten Lauf" stand im Gate, aber niemand kontrollierte sie. Beim Nachsehen
// war der Wärmepumpen-Wächter seit seiner Einrichtung am 13.07.2026 **nie
// gelaufen** — sein erster Termin (20.07.) verstrich ohne Lauf, der nächste ist
// der 20.10. Aufgefallen ist das nicht dem Monitoring, sondern einer Rückfrage
// des Betreibers. Ein stiller Wächter sieht aus wie ein zufriedener; genau
// deshalb ist „seit wann hat sich das Datum nicht bewegt" die Frage, die gestellt
// werden muss, und nicht „ist die Zahl plausibel".
//
// Zwei Fälligkeiten, weil es zwei Fehler sind:
//   • `reviewBy` überschritten → der fachliche Termin ist verstrichen (der Wert
//     selbst gehört auf den Prüfstand).
//   • Prüfdatum älter als `maxAlterTage` → der Lauf, der es hätte bewegen
//     müssen, hat nicht stattgefunden oder hat vergessen zu stempeln. Die
//     Grenze kommt aus dem Rhythmus des Wächters plus Luft für einen
//     ausgefallenen Lauf, nicht aus dem Bauch.
import { DEFAULT_AIRCON_CONFIG } from "./aircon-config";
import { DEFAULT_BALKON_CONFIG, BALKON_RECHT } from "./balkon-config";
import { CO2_PRICE } from "./co2-config";
import { EEG_REFORM_STAND } from "./eeg-reform-config";
import { FEED_IN_GEPRUEFT_ISO } from "./feedin-config";
import { GREEN_GAS_CONFIG } from "./greengas-config";
import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";

export interface PruefEintrag {
  /** In der Sprache der Seite, damit die Meldung ohne Code-Kenntnis lesbar ist. */
  was: string;
  /** Wo das Datum steht — die Stelle, die ein Lauf anfassen muss. */
  feld: string;
  geprueftIso: string;
  /** Fachlicher Termin, bis zu dem neu geprüft sein muss (fehlt, wo es keinen gibt). */
  reviewBy?: string;
  /** Wächter-Auftrag (scheduled task) und sein Rhythmus im Klartext. */
  waechter: string;
  rhythmus: string;
  /** Ab so vielen Tagen ohne Bewegung stimmt etwas mit dem Lauf nicht. */
  maxAlterTage: number;
  /** Runbook, das der Lauf fährt. */
  runbook: string;
}

/**
 * Monatsgenaue Angaben werden je nach Rolle an ihr ungünstigeres Ende gelegt —
 * beide Male so, dass die Meldung eher zu früh als zu spät kommt:
 *   • Prüfdatum „2026-07" → 1. Juli (die Prüfung ist so ALT wie möglich),
 *   • Termin „2026-10"   → 31. Oktober (die Frist ist noch nicht verstrichen).
 * Andersherum würde ein Monatswert Frische behaupten, die er nicht belegt.
 */
function alsTag(iso: string, rolle: "prueftag" | "frist"): string {
  if (!/^\d{4}-\d{2}$/.test(iso)) return iso;
  const [j, m] = iso.split("-").map(Number);
  return rolle === "prueftag"
    ? `${iso}-01`
    : new Date(Date.UTC(j, m, 0)).toISOString().slice(0, 10);
}

/** Ganze Tage zwischen einem Prüf-/Fristdatum und einem Stichtag. */
export function tageZwischen(vonIso: string, bisIso: string, rolle: "prueftag" | "frist" = "prueftag"): number {
  const tag = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${bisIso}T00:00:00Z`) - Date.parse(`${alsTag(vonIso, rolle)}T00:00:00Z`)) / tag);
}

export const PRUEFSTAND: PruefEintrag[] = [
  {
    was: "Wärmepumpe: Anschaffung und Tarife",
    feld: "DEFAULT_HEATPUMP_CONFIG.geprueftIso",
    geprueftIso: DEFAULT_HEATPUMP_CONFIG.geprueftIso,
    reviewBy: DEFAULT_HEATPUMP_CONFIG.reviewBy,
    waechter: "waermepumpe-werte-verify-jaehrlich",
    rhythmus: "quartalsweise, 20. Januar/April/Juli/Oktober",
    maxAlterTage: 120,
    runbook: "scripts/waermepumpe-verify.md",
  },
  {
    was: "Wärmepumpe: BEG-Förderung",
    feld: "DEFAULT_HEATPUMP_CONFIG.geprueftFoerderungIso",
    geprueftIso: DEFAULT_HEATPUMP_CONFIG.geprueftFoerderungIso,
    reviewBy: DEFAULT_HEATPUMP_CONFIG.reviewBy,
    waechter: "waermepumpe-werte-verify-jaehrlich + foerder-news-waechter",
    rhythmus: "quartalsweise, dazu täglicher News-Scan auf Programmstopps",
    maxAlterTage: 120,
    runbook: "scripts/waermepumpe-verify.md",
  },
  {
    was: "Wärmepumpe: Grüngas-Pflicht (Rechtsstand)",
    feld: "GREEN_GAS_CONFIG.geprueftRechtIso",
    geprueftIso: GREEN_GAS_CONFIG.geprueftRechtIso,
    waechter: "foerder-news-waechter",
    rhythmus: "täglich",
    // Ein täglich geprüfter Rechtsstand, der sich zwei Wochen nicht bewegt hat,
    // sagt nichts über das Gesetz und alles über den Lauf.
    maxAlterTage: 14,
    runbook: "scripts/gruengas-verify.md",
  },
  {
    was: "Wärmepumpe: Gaspreis-Bestandteile",
    feld: "GREEN_GAS_CONFIG.geprueftIso",
    geprueftIso: GREEN_GAS_CONFIG.geprueftIso,
    reviewBy: GREEN_GAS_CONFIG.reviewBy,
    waechter: "solar-check-legal-waechter (Report-Nachfolge)",
    rhythmus: "jährlich, mit dem IW-Report",
    maxAlterTage: 400,
    runbook: "scripts/gruengas-verify.md",
  },
  {
    was: "Wärmepumpe: CO₂-Preispfad",
    feld: "CO2_PRICE.geprueftIso",
    geprueftIso: CO2_PRICE.geprueftIso,
    reviewBy: CO2_PRICE.reviewBy,
    waechter: "co2-prognose-monitor + co2-preis-verify-jaehrlich",
    rhythmus: "monatlicher Scan (3.), Voll-Prüfung am 8. Dezember",
    maxAlterTage: 45,
    runbook: "scripts/co2-preis-verify.md",
  },
  {
    was: "Klimaanlage: Gerätepreise und Effizienzen",
    feld: "DEFAULT_AIRCON_CONFIG.geprueftIso",
    geprueftIso: DEFAULT_AIRCON_CONFIG.geprueftIso,
    reviewBy: DEFAULT_AIRCON_CONFIG.reviewBy,
    waechter: "solar-check-geraete-config-verify-jaehrlich",
    rhythmus: "quartalsweise, 15. Januar/April/Juli/Oktober",
    maxAlterTage: 120,
    runbook: "scripts/klimaanlage-verify.md",
  },
  {
    was: "Balkonkraftwerk: Set- und Speicherpreise",
    feld: "DEFAULT_BALKON_CONFIG.geprueftIso",
    geprueftIso: DEFAULT_BALKON_CONFIG.geprueftIso,
    reviewBy: DEFAULT_BALKON_CONFIG.reviewBy,
    waechter: "solar-check-geraete-config-verify-jaehrlich",
    rhythmus: "quartalsweise, 15. Januar/April/Juli/Oktober",
    maxAlterTage: 120,
    runbook: "scripts/balkon-verify.md",
  },
  {
    was: "Balkonkraftwerk: Rechtsaussagen",
    feld: "BALKON_RECHT.geprueftIso",
    geprueftIso: BALKON_RECHT.geprueftIso,
    reviewBy: DEFAULT_BALKON_CONFIG.reviewBy,
    waechter: "solar-check-geraete-config-verify-jaehrlich",
    rhythmus: "quartalsweise, 15. Januar/April/Juli/Oktober",
    maxAlterTage: 120,
    runbook: "scripts/balkon-verify.md",
  },
  {
    was: "EEG-Vergütungssätze",
    feld: "FEED_IN_GEPRUEFT_ISO",
    geprueftIso: FEED_IN_GEPRUEFT_ISO,
    waechter: "eeg-verguetung-verify-halbjaehrlich + foerder-news-waechter",
    rhythmus: "halbjährlich, 28. Januar und 28. Juli",
    // Ein halbes Jahr plus Luft: Die Sätze springen am 1.2./1.8. von selbst
    // (Stichtags-Plan im Code), geprüft wird kurz davor.
    maxAlterTage: 210,
    runbook: "scripts/eeg-verify.md",
  },
  {
    was: "Sachstand der EEG-Reform 2027",
    feld: "EEG_REFORM_STAND.geprueftIso",
    geprueftIso: EEG_REFORM_STAND.geprueftIso,
    waechter: "foerder-news-waechter",
    rhythmus: "täglich",
    // Ein Verfahrensstand ist der volatilste Wert im Projekt: Er kippt an dem
    // Tag, an dem der Bundestag entscheidet.
    maxAlterTage: 30,
    runbook: "scripts/eeg-verify.md",
  },
];

/**
 * Ein Datum für die ganze Seite — das ÄLTESTE, nicht das jüngste.
 *
 * Für eine Vertrauens-Aussage über die gesamte Site („jede Angabe ist seit … an
 * der Originalquelle geprüft") ist das jüngste Prüfdatum die falsche Zahl: Es
 * stammt von genau einem Wert und behauptet Frische für alle anderen mit. Das
 * älteste ist die einzige Zahl, die für JEDEN Wert gilt — und damit die einzige,
 * die man ohne Fußnote hinschreiben kann.
 *
 * Bewusst NICHT geeignet als Quelle dafür: `waechter_reports` in der Datenbank.
 * Dort steht, wann ein Lauf einen Bericht abgelegt hat — auch der Lauf, der an
 * einer Paywall gescheitert ist, legt einen ab. Das ist dieselbe Verwechslung
 * wie `updated_at` als Förder-Prüfdatum (siehe scripts/waechter-gate.md,
 * Regel 9): Schreibzeitpunkt ist kein Prüfzeitpunkt.
 */
export function aeltestePruefung(stand: PruefEintrag[] = PRUEFSTAND): string {
  return stand.map(e => e.geprueftIso).sort()[0];
}

export interface Faelligkeit extends PruefEintrag {
  /** Tage seit der letzten Prüfung. */
  alterTage: number;
  /** Tage über `reviewBy` hinaus (0, wenn der Termin noch läuft oder fehlt). */
  terminUeberzogen: number;
  grund: "termin" | "stillstand" | "beides";
}

/**
 * Was überfällig ist — die Liste, die der tägliche Wächter ausliest.
 *
 * Bewusst zwei Gründe getrennt: „Termin überzogen" ist eine fachliche Aussage
 * über den Wert, „Stillstand" eine über den Lauf. Sie brauchen verschiedene
 * Antworten — einmal prüfen, einmal nachsehen, warum der Wächter schweigt.
 */
export function faelligkeiten(heuteIso: string, stand: PruefEintrag[] = PRUEFSTAND): Faelligkeit[] {
  const offen: Faelligkeit[] = [];
  for (const e of stand) {
    const alterTage = tageZwischen(e.geprueftIso, heuteIso, "prueftag");
    const terminUeberzogen = e.reviewBy ? Math.max(0, tageZwischen(e.reviewBy, heuteIso, "frist")) : 0;
    const stillstand = alterTage > e.maxAlterTage;
    if (!stillstand && terminUeberzogen === 0) continue;
    offen.push({
      ...e,
      alterTage,
      terminUeberzogen,
      grund: stillstand && terminUeberzogen > 0 ? "beides" : stillstand ? "stillstand" : "termin",
    });
  }
  // Das Schlimmste zuerst: was am längsten steht, steht am längsten falsch.
  return offen.sort((a, b) => b.alterTage - a.alterTage);
}
