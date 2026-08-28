/**
 * Der Arbeitsstand je Fachbetrieb — die einzige Stelle, die ihn kennt.
 *
 * Bewusst klein gehalten. Es gibt keinen Versandweg und kein Anschreiben; diese
 * Zustände beschreiben nur, wie weit ein Mensch mit einem Betrieb gekommen ist.
 * Wer hier Zustände ergänzt, die einen Versand voraussetzen („angeschrieben",
 * „Antwort erhalten"), baut den Apparat, den es noch nicht geben soll —
 * die zwei offenen Fragen dazu stehen in docs/solarteur-widget-offene-fragen.md.
 */

export const STAENDE = [
  { wert: "offen", text: "offen", hinweis: "noch nicht angesehen" },
  { wert: "vorgemerkt", text: "vorgemerkt", hinweis: "kommt für ein Gespräch infrage" },
  { wert: "angesehen", text: "angesehen", hinweis: "geprüft, vorerst nichts weiter" },
  { wert: "ungeeignet", text: "ungeeignet", hinweis: "passt nicht — Grund in die Notiz" },
] as const;

export type Stand = (typeof STAENDE)[number]["wert"];

export function istStand(s: string): s is Stand {
  return STAENDE.some((x) => x.wert === s);
}

/**
 * Wie viele der erhobenen Vertrauensmerkmale ein Betrieb trägt.
 *
 * KEINE Bewertung des Betriebs, sondern eine Auskunft über unseren Datenstand —
 * ein Meisterbetrieb, der seinen Meistertitel nicht auf die Website schreibt,
 * bekommt hier weniger Punkte als einer, der es tut. Deshalb heißt die Größe
 * „belegte Merkmale" und nicht „Qualität", und deshalb steht sie in der Ansicht
 * neben den einzelnen Merkmalen statt an ihrer Stelle.
 */
export interface MerkmalTraeger {
  meisterbetrieb: boolean | null;
  handwerkskammer: string | null;
  innung: string | null;
  installateurverzeichnis: boolean | null;
  zertifikate: string[] | null;
  gruendungsjahr: number | null;
  hr_nummer: string | null;
  bewertung_wert: number | null;
}

export function belegteMerkmale(r: MerkmalTraeger): number {
  let n = 0;
  if (r.meisterbetrieb) n++;
  if (r.handwerkskammer) n++;
  if (r.innung) n++;
  if (r.installateurverzeichnis) n++;
  if (r.zertifikate && r.zertifikate.length) n++;
  if (r.gruendungsjahr) n++;
  if (r.hr_nummer) n++;
  if (r.bewertung_wert) n++;
  return n;
}

/** Gibt es überhaupt einen Weg, diesen Betrieb zu erreichen? */
export function hatKontaktweg(r: {
  email: string | null;
  telefon: string | null;
  kontakt_formular: boolean | null;
}): boolean {
  return Boolean(r.email || r.telefon || r.kontakt_formular);
}
