/**
 * Das Datum des GELESENEN Beitrags — aus seiner Analyse, nicht aus einem
 * Nachbarartikel.
 *
 * DER FEHLER, GEGEN DEN DAS GEBAUT IST (gemessen 06.09.2026): Die Alterszahl
 * neben dem Aufhänger stammte aus der ersten Erhebung. Sie nannte den jüngsten
 * Beitrag, den ein Medium ZU UNSEREN THEMEN hatte — nicht den, den später
 * jemand gelesen und als Beleg abgelegt hat. Wo sich beide vergleichen ließen,
 * gehörten 36 von 37 Altersangaben zu einem anderen Artikel: Bei einem Beleg
 * über die Strompreis-Ersparnis stand das Alter eines Beitrags „Schaltet Eure
 * PV-Anlagen ab!". Der Filter „trägt und aktuell" rechnete darauf.
 *
 * Dieselbe Klasse wie der maschinell abgeleitete Aufhänger-Vorschlag: ein Wert
 * aus einem früheren Lauf, der neben dem geprüften steht und von ihm nicht zu
 * unterscheiden ist. Deshalb wird er nicht repariert, sondern ersetzt — das
 * Datum kommt aus der Analyse, in der es fast immer wörtlich steht.
 */

const MONATE: Record<string, number> = {
  januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

/** „17. August 2023", „03.09.2026", „5. März 2026" — alle drei Schreibweisen. */
const MUSTER =
  /\b(\d{1,2})\.\s*(\d{1,2}|januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\.?\s*(20\d{2})\b/i;

/**
 * Zieht das Beitragsdatum aus der Analyse.
 *
 * Genommen wird das ERSTE Datum im Text: Die Analysen beginnen durchweg mit
 * dem Erscheinungsdatum („Vom 03.09.2026, Autor …"), während spätere Daten im
 * Text Stichtage aus dem Beitrag selbst sind — ein Gesetzestermin, eine Frist.
 * Wer das jüngste nähme, träfe regelmäßig einen Termin in der Zukunft.
 */
export function belegDatumAus(analyse: string | null | undefined): string | null {
  if (!analyse) return null;
  const t = MUSTER.exec(analyse);
  if (!t) return null;
  const tag = Number(t[1]);
  const monat = Number.isNaN(Number(t[2])) ? MONATE[t[2].toLowerCase()] : Number(t[2]);
  const jahr = Number(t[3]);
  if (!monat || tag < 1 || tag > 31 || monat > 12) return null;
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  // Ein Datum, das der Kalender verwirft (31. Februar), ist ein Lesefehler.
  if (d.getUTCDate() !== tag || d.getUTCMonth() !== monat - 1) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Alter in Tagen. Ein Datum in der ZUKUNFT liefert null, nicht eine negative
 * Zahl: Es ist dann kein Erscheinungsdatum, sondern ein Termin aus dem Text —
 * und „vor -12 Tagen erschienen" wäre eine Angabe, die niemand prüft.
 */
export function belegAlterTage(analyse: string | null | undefined, heute = new Date()): number | null {
  const iso = belegDatumAus(analyse);
  if (!iso) return null;
  // ABGERUNDET, nicht gerundet: Ein Beitrag von heute früh ist null Tage alt,
  // nicht einer. Gerundet sprang die Zahl je nach Tageszeit des Aufrufs.
  const tage = Math.floor((heute.getTime() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000);
  return tage < 0 ? null : tage;
}
