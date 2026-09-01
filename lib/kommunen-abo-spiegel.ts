// Wer hat sich nach unserem Brief eingetragen — und war es jemand aus dem Rathaus?
//
// WOZU: Der Outreach kannte bisher zwei Signale, und beide sind schwach. Eine
// Antwort misst Höflichkeit; eine Veröffentlichung ist das eigentliche Ziel,
// taucht aber erst Tage bis Wochen später in einem Verweis-Verzeichnis auf.
// Eine Eintragung ins Abo ist das dritte, und für eine ANGESCHRIEBENE Gemeinde
// ist sie das aussagekräftigste: Der Brief verlinkt genau die Seite, auf der
// die Eintragung sitzt.
//
// DIE UNTERSCHEIDUNG IST DER PUNKT. Trägt sich ein Bürger ein, ist das
// Reichweite. Trägt sich jemand aus der Verwaltung ein, hat unser Brief die
// Stelle erreicht, die über eine Veröffentlichung entscheidet — auch dann,
// wenn niemand geantwortet hat.
//
// DIE ANGABE KOMMT AUS DEM ANMELDEFENSTER, NICHT AUS DER ADRESSE.
//
// Die erste Fassung dieses Moduls leitete sie aus der E-Mail-Domain ab: Adresse
// auf der Domain der Gemeinde oder ihrer verwaltenden Gemeinde ⇒ Verwaltung.
// Verworfen am 01.09.2026 aus drei Gründen, und der zweite ist der tragende:
//
//   1. Es gäbe ZWEI Wahrheiten über dieselbe Frage. Seit dem 01.09.2026 fragt
//      das Anmeldefenster der Gemeindeseite selbst danach. Zwei Quellen für
//      eine Angabe laufen auseinander, und niemand merkt, welche stimmt —
//      dieselbe Systematik wie bei jeder anderen Zweitfassung im Projekt.
//   2. Aus der Domain auf den ARBEITGEBER zu schließen ist eine eigene
//      Verarbeitung, und die Datenschutzerklärung nennt sie nicht. Dort steht
//      die freiwillige Angabe. Die Ableitung nachzuschieben wäre neu und
//      bräuchte den Weg über zwei Legal-Judges.
//   3. Sie liegt oft daneben: Wer abends privat abonniert, nutzt sein privates
//      Postfach — und wäre für die Domain-Regel ein Bürger.
//
// DIE GRENZE DER SELBSTAUSKUNFT gehört an jede Zahl, die daraus entsteht: Wer
// das Kästchen nicht ankreuzt, zählt als „nein". Sie ist damit eine
// UNTERGRENZE — dieselbe Sorte Untergrenze wie bei den Veröffentlichungen, wo
// eine Meldung ohne Link nicht mitzählt. Deshalb heißt die Beschriftung „mit
// Angabe Verwaltung" und nicht „aus der Verwaltung": Sie behauptet nur, was
// jemand angekreuzt hat.
//
// KEINE ADRESSEN NACH DRAUSSEN. Dieses Modul gibt Zahlen zurück, nie die
// Eintragungen selbst. Der Kreis derer, die diese Adressen sehen, soll klein
// bleiben; fürs Cockpit ist die Zahl die ganze Auskunft.

/** Eine Eintragung, so weit sie hier gebraucht wird. */
export type AboZeile = {
  region_id: string;
  /** ausstehend | bestaetigt | abgemeldet */
  status: string;
  /** Selbstauskunft aus dem Anmeldefenster. Nullable: Altzeilen tragen nichts,
   *  und die Förderseite fragt bewusst gar nicht danach. */
  aus_verwaltung?: boolean | null;
  /** Kam die Person über unseren Brief? Nullable aus demselben Grund. */
  ueber_brief?: boolean | null;
};

export type AboSpiegel = {
  /** Bestätigte Eintragungen. Nur diese bekommen je eine Mail. */
  bestaetigt: number;
  /** Davon MIT ANGABE Verwaltung. Untergrenze, siehe oben. */
  mitAngabeVerwaltung: number;
  /** Eingetragen, aber noch nicht bestätigt. Zählt für nichts — steht hier,
   *  damit „niemand hat abonniert" nicht mit „noch keiner hat bestätigt"
   *  verwechselt wird. */
  ausstehend: number;
  /** Bestätigte, die über den Brief kamen. */
  ueberBrief: number;
};

export const LEERER_SPIEGEL: AboSpiegel = {
  bestaetigt: 0,
  mitAngabeVerwaltung: 0,
  ausstehend: 0,
  ueberBrief: 0,
};

/**
 * Eintragungen je Gemeinde zusammenzählen.
 *
 * Reine Funktion: Der Aufrufer holt den Bestand selbst und reicht ihn herein.
 * So ist die Zählregel testbar, ohne eine Datenbank zu brauchen — und es gibt
 * sie nur einmal, auch wenn später eine zweite Ansicht sie braucht.
 */
export function zaehleAbos(abos: AboZeile[]): Map<string, AboSpiegel> {
  const out = new Map<string, AboSpiegel>();
  for (const a of abos) {
    const s = out.get(a.region_id) ?? { ...LEERER_SPIEGEL };
    if (a.status === "ausstehend") {
      s.ausstehend++;
    } else if (a.status === "bestaetigt") {
      s.bestaetigt++;
      // Nur ein ausdrückliches Ja zählt. Fehlende Angabe ist kein Ja — genau
      // das macht die Zahl zur Untergrenze und hält sie ehrlich.
      if (a.aus_verwaltung === true) s.mitAngabeVerwaltung++;
      if (a.ueber_brief === true) s.ueberBrief++;
    }
    // „abgemeldet" zählt nirgends mit: Wer sich austrägt, ist kein Signal für
    // Reichweite, und ihn weiter mitzuzählen behauptete eine Leserschaft, die
    // es nicht gibt.
    out.set(a.region_id, s);
  }
  return out;
}

/**
 * Ein Satz für die Cockpit-Zeile — oder nichts.
 *
 * NICHTS ist der Normalfall und ausdrücklich gewollt: Eine Zeile „0
 * Eintragungen" unter 11.000 Gemeinden ist Lärm, der die wenigen echten Funde
 * verdeckt.
 */
export function aboSatz(s: AboSpiegel | null | undefined): string | null {
  if (!s || (!s.bestaetigt && !s.ausstehend)) return null;
  if (!s.bestaetigt) {
    return s.ausstehend === 1
      ? "1 Eintragung, noch nicht bestätigt"
      : `${s.ausstehend} Eintragungen, noch nicht bestätigt`;
  }
  const kopf = s.bestaetigt === 1 ? "1 Abo" : `${s.bestaetigt} Abos`;
  if (!s.mitAngabeVerwaltung) return kopf;
  // „mit Angabe Verwaltung", nie „aus der Verwaltung": Die Zahl sagt, wer das
  // Kästchen angekreuzt hat, nicht wer dort arbeitet.
  return `${kopf}, davon ${s.mitAngabeVerwaltung} mit Angabe Verwaltung`;
}
