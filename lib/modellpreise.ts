// ─── Listenpreise der Sprachmodelle ──────────────────────────────────────────
//
// Nur für EINE Frage da: Was hätte die Rechenleistung dieses Projekts gekostet,
// wenn sie über die Schnittstelle statt über ein Abo abgerechnet worden wäre?
// Das ist ein Vergleichsmaßstab, keine Ausgabe — die tatsächlichen Zahlungen
// stehen in `projekt-kosten.ts` und sind in Euro.
//
// DER STICHTAG GEHÖRT AN DEN PREIS. Eine Preisliste ohne Stand ist in einem
// halben Jahr eine Behauptung: Modelle kommen dazu, Preise fallen, und ein
// rückwirkend angewandter neuer Preis macht aus einer Messung eine Erfindung.
// Deshalb `PREISE_STAND` — und deshalb wird ein unbekanntes Modell NICHT auf
// ein ähnliches umgebogen, sondern bleibt eine sichtbare Lücke.
//
// DIE ZWISCHENSPEICHER-PREISE SIND ABGELEITET, NICHT ABGESCHRIEBEN: Wiederlesen
// kostet ein Zehntel des Eingabepreises, Schreiben mit kurzer Haltbarkeit das
// 1,25-fache, mit langer das Doppelte. Die eine Ausnahme ist das große
// Fable-Modell, dessen Wiederlesen mit einem Vierzigstel gesondert ausgewiesen
// ist. Wer eine Regel ändert, ändert sie hier — nicht an der Verwendungsstelle.

/** Stand der Preisliste. Älter als ein halbes Jahr heißt: nachsehen. */
export const PREISE_STAND = "2026-06-24";

/** Preise je einer Million Token, in US-Dollar. */
export interface Tokenpreis {
  eingabe: number;
  ausgabe: number;
  gelesen: number;
  schreibenKurz: number;
  schreibenLang: number;
}

/**
 * Grundpreise je Modell: Eingabe und Ausgabe.
 *
 * Alles Weitere leitet sich daraus ab. Ein Modell ohne Eintrag ist unbekannt —
 * das ist der Normalfall bei einem neu erschienenen und kein Fehler, solange es
 * als Lücke sichtbar bleibt.
 */
const GRUNDPREIS: Record<string, { eingabe: number; ausgabe: number; gelesenAbweichend?: number }> = {
  "claude-opus-5": { eingabe: 5, ausgabe: 25 },
  "claude-opus-4-8": { eingabe: 5, ausgabe: 25 },
  "claude-opus-4-7": { eingabe: 5, ausgabe: 25 },
  "claude-opus-4-6": { eingabe: 5, ausgabe: 25 },
  // Das Wiederlesen ist hier ausdrücklich ein Vierzigstel statt eines Zehntels.
  "claude-fable-5-1": { eingabe: 10, ausgabe: 50, gelesenAbweichend: 0.25 },
  "claude-fable-5": { eingabe: 10, ausgabe: 50 },
  "claude-sonnet-5": { eingabe: 2, ausgabe: 10 },
  "claude-sonnet-4-6": { eingabe: 3, ausgabe: 15 },
  "claude-haiku-4-5": { eingabe: 1, ausgabe: 5 },
};

export type Modellname = keyof typeof GRUNDPREIS | (string & {});

const ANTEIL_GELESEN = 0.1;
const ANTEIL_SCHREIBEN_KURZ = 1.25;
const ANTEIL_SCHREIBEN_LANG = 2;

/** Der volle Preissatz eines Modells — oder nichts, wenn es unbekannt ist. */
export function tokenPreisUsd(modell: Modellname): Tokenpreis | null {
  // Die Kennung kann einen Zusatz tragen, wenn ein größeres Kontextfenster
  // gewählt wurde. Der Preis gilt trotzdem dem Modell, nicht der Fassung.
  const name = String(modell).replace(/\[[^\]]*\]$/, "");
  const g = GRUNDPREIS[name];
  if (!g) return null;
  return {
    eingabe: g.eingabe,
    ausgabe: g.ausgabe,
    gelesen: g.gelesenAbweichend ?? g.eingabe * ANTEIL_GELESEN,
    schreibenKurz: g.eingabe * ANTEIL_SCHREIBEN_KURZ,
    schreibenLang: g.eingabe * ANTEIL_SCHREIBEN_LANG,
  };
}

/** Alle Modelle, für die ein Preis hinterlegt ist. */
export function bekannteModelle(): string[] {
  return Object.keys(GRUNDPREIS);
}

/**
 * Der Wechselkurs, mit dem Dollar-Beträge eingeordnet werden.
 *
 * ER WIRD BENANNT UND NICHT VERSTECKT: Die tatsächlichen Zahlungen sind in Euro
 * gebucht, der Listenwert entsteht in Dollar. Wer beide nebeneinanderstellt,
 * rechnet um — und eine Umrechnung ohne genannten Kurs ist eine Zahl, die
 * niemand nachvollziehen kann. Der Wert ist der Durchschnitt der in den
 * Buchungen des Projektzeitraums ausgewiesenen Kurse (0,857 bis 0,874).
 */
export const KURS_USD_EUR = 0.866;
export const KURS_STAND = "2026-09-23";
