// Datenaufbereitung für den Vergütungs-Verlauf 2000–heute in Jahres-Sektionen:
// 2000–2011 ein Jahreswert (SFV-Jahresanfangswerte), ab 04/2012 zwölf
// Monatswerte je Jahr (BNetzA-Archiv, ab 08/2022 die gesetzliche Kette).
// Gerendert wird das vom Client-Baustein VerlaufMitMeilensteinen (Chart +
// Ereignis-Timeline). Metrik wie lib/feedin-history: kleinste
// Dachanlagen-Klasse, ab 30.07.2022 Teileinspeisung — EINE Einheit (ct/kWh).
import { FEED_IN_ARCHIV, FEED_IN_ARCHIV_START } from "../../../lib/feedin-archiv";
import { feedInRatesForCommissioning } from "../../../lib/feedin-config";
import {
  FEEDIN_HISTORY_VALUES,
  FEEDIN_HISTORY_YEARS,
} from "../../../lib/feedin-history";

export const MONAT_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export interface VerlaufJahr {
  year: number;
  /** Ein Eintrag = Jahresbalken (2000–2011); zwölf = Monatsbalken (null = kein Satz in diesem Modell, z. B. Jan–Mär 2012). */
  bars: (number | null)[];
}

const archivByYm = new Map(FEED_IN_ARCHIV.map((r) => [r.ym, r.u10]));

/** Monatswert der kleinsten Klasse: Archiv (04/2012–07/2022), danach Kette. */
function monatswert(year: number, month1: number): number | null {
  const ym = `${year}-${String(month1).padStart(2, "0")}`;
  if (ym < FEED_IN_ARCHIV_START) return null;
  const archiv = archivByYm.get(ym);
  if (archiv != null) return archiv;
  return feedInRatesForCommissioning(`${ym}-15`)?.teilUnder10 ?? null;
}

/** Jahres-Sektionen für Chart und Aufklapp-Zeilen — eine Quelle für beide. */
export function verlaufJahre(now: Date = new Date()): VerlaufJahr[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const jahre: VerlaufJahr[] = [];
  for (let year = FEEDIN_HISTORY_YEARS[0]; year <= currentYear; year++) {
    if (year < 2012) {
      const idx = FEEDIN_HISTORY_YEARS.indexOf(year);
      jahre.push({ year, bars: [FEEDIN_HISTORY_VALUES[idx]] });
      continue;
    }
    const months = year === currentYear ? currentMonth : 12;
    const bars: (number | null)[] = [];
    for (let m = 1; m <= 12; m++) bars.push(m <= months ? monatswert(year, m) : null);
    jahre.push({ year, bars });
  }
  return jahre;
}
