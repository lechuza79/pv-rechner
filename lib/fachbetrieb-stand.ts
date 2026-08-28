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
  bewertung_anzahl?: number | null;
}

/**
 * Die acht Merkmale — EINE Liste, aus der sowohl die Zahl als auch die
 * Aufzählung entsteht.
 *
 * Ohne diese Quelle stünde die Acht an einer Stelle und die Aufzählung an einer
 * anderen; wer ein Merkmal ergänzt, hätte dann eine Liste mit neun Einträgen
 * neben einer Zahl aus acht — und das fiele niemandem auf, weil beide für sich
 * plausibel aussehen. `wert` liefert zugleich, was im aufgeklappten Bereich
 * hinter dem Häkchen steht.
 */
export const MERKMALE: {
  name: string;
  text: string;
  wert: (r: MerkmalTraeger) => string | null;
}[] = [
  { name: "meisterbetrieb", text: "Meisterbetrieb", wert: (r) => (r.meisterbetrieb ? "Meisterbetrieb" : null) },
  { name: "handwerkskammer", text: "Handwerkskammer", wert: (r) => r.handwerkskammer },
  { name: "innung", text: "Innung", wert: (r) => r.innung },
  {
    name: "installateurverzeichnis",
    text: "Installateurverzeichnis",
    wert: (r) => (r.installateurverzeichnis ? "beim Netzbetreiber eingetragen" : null),
  },
  {
    name: "zertifikat",
    text: "Zertifikat",
    wert: (r) => (r.zertifikate && r.zertifikate.length ? r.zertifikate.join(", ") : null),
  },
  {
    name: "gruendungsjahr",
    text: "Gründungsjahr",
    wert: (r) => (r.gruendungsjahr ? `gegründet ${r.gruendungsjahr}` : null),
  },
  { name: "hr_nummer", text: "Handelsregister", wert: (r) => r.hr_nummer },
  {
    name: "bewertung",
    text: "Bewertung",
    // Die Herkunft steht AN der Zahl: eine Selbstauskunft der Website, keine
    // Google-Bewertung. Ohne den Zusatz liest sie sich wie eine erhobene.
    wert: (r) =>
      r.bewertung_wert
        ? `${r.bewertung_wert.toLocaleString("de-DE")} von 5` +
          (r.bewertung_anzahl ? ` aus ${r.bewertung_anzahl} Bewertungen` : "") +
          " (Angabe der Website)"
        : null,
  },
];

export function belegteMerkmale(r: MerkmalTraeger): number {
  return MERKMALE.filter((m) => m.wert(r)).length;
}

/** Gibt es überhaupt einen Weg, diesen Betrieb zu erreichen? */
export function hatKontaktweg(r: {
  email: string | null;
  telefon: string | null;
  kontakt_formular: boolean | null;
}): boolean {
  return Boolean(r.email || r.telefon || r.kontakt_formular);
}
