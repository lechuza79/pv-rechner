// ─── Wozu genau hat jemand eingewilligt? ─────────────────────────────────────
//
// Die Nachweispflicht nach Art. 7 Abs. 1 DSGVO verlangt mehr als „irgendwann
// hat jemand geklickt". Zwei Fundstellen, beide am 01.09.2026 im Volltext
// gelesen (Legal-Judge im Council-Verfahren):
//
//   EDSA, Leitlinien 05/2020 zur Einwilligung, Rn. 108: Der Verantwortliche
//   soll festhalten, „welche Informationen der betroffenen Person mitgeteilt
//   wurden" — und ausdrücklich: „Es wäre nicht ausreichend, nur auf eine
//   korrekte Konfiguration der Website hinzuweisen."
//
//   DSK, Orientierungshilfe Direktwerbung (Februar 2022), Ziff. 2.1 S. 9:
//   „revisionsfeste Dokumentation der tatsächlich genutzten Texte mit
//   Versionsnummer"; Ziff. 3.3 S. 11: nachweisbar „auch hinsichtlich ihres
//   Wortlauts".
//
// GENAU DAS FEHLTE. Der Einwilligungstext stand als Konstante im Code der
// Oberfläche; er ändert sich mit dem nächsten Commit, und danach ist nicht mehr
// rekonstruierbar, wozu jemand im September eingewilligt hat. Der Nachweis
// stützte sich stattdessen auf die Bauart des Systems („ein gültiges Token kann
// nur von uns stammen") — also auf genau das Argument, das der EDSA für nicht
// ausreichend erklärt.
//
// ─── Wie es funktioniert ─────────────────────────────────────────────────────
//
// Jede Anmeldung schreibt die Version mit, unter der sie zustande kam. Die
// Fassungen stehen hier, datiert und WERDEN NIE ÜBERSCHRIEBEN: Wer den Text
// ändert, legt eine neue Fassung an und setzt `AKTUELLE_EINWILLIGUNG` um. So
// lässt sich zu jeder Zeile der Wortlaut ausdrucken, der ihr vorlag.
//
// Dieselbe Bauform wie der BEG-Fahrplan und der Einspeise-Stichtagsplan: eine
// Liste datierter Stände statt einer Konstante, die sich still bewegt.
//
// WAS HIER NICHT HINEINGEHÖRT: die Adresse, die IP, irgendein Merkmal der
// Person. Dies ist ein Textarchiv, keine zweite Kopie der Abo-Tabelle.

/** Eine Fassung des Textes, dem jemand zugestimmt hat. */
export type EinwilligungsFassung = {
  /** Kennung, wie sie am Abo gespeichert wird. Nie wiederverwenden. */
  version: string;
  /** Ab wann diese Fassung ausgeliefert wurde (ISO-Datum). */
  seit: string;
  /** Die Erklärung im Anmeldefenster, Gattung „Bestand". */
  gemeinde: string;
  /** Die Erklärung im Anmeldefenster, Gattung „Förderung". */
  foerderung: string;
  /** Die Zusage über dem Absenden-Knopf, für beide Gattungen dieselbe. */
  zusage: string;
};

export const EINWILLIGUNGS_FASSUNGEN: EinwilligungsFassung[] = [
  {
    version: "2026-09-01",
    seit: "2026-09-01",
    gemeinde:
      "Wir schreiben, wenn deine Gemeinde einen Zuschuss auflegt, wenn ein Vergütungsjahrgang ausläuft, wenn die Zahlen fürs Jahr da sind — oder wenn wir sonst etwas über den Ort herausfinden, das der Rede wert ist.",
    foerderung:
      "Die uns bekannten Programmseiten sehen wir täglich durch, nach neuen Programmen suchen wir laufend. Ändern sich die Bedingungen, ist der Topf leer oder kommt ein Zuschuss dazu, schreiben wir dir. Für einen einzelnen Ort passiert das selten.",
    zusage:
      "Kein Spam, jederzeit abmeldbar. Wir geben die Adresse nicht weiter und messen nicht, ob du die Mail öffnest. Was wir speichern, steht in der Datenschutzerklärung.",
  },
];

/**
 * Die Fassung, unter der eine Anmeldung heute zustande kommt.
 *
 * Wird an jedem neuen Abo mitgeschrieben. Ändert jemand einen der Texte, ohne
 * hier eine Fassung zu ergänzen, wird `lib/__tests__/abo-einwilligung.test.ts`
 * rot — der Test hält die Fassung gegen die Texte, die die Oberfläche wirklich
 * ausliefert.
 */
export const AKTUELLE_EINWILLIGUNG = EINWILLIGUNGS_FASSUNGEN[EINWILLIGUNGS_FASSUNGEN.length - 1];

/** Den Wortlaut zu einer gespeicherten Version nachschlagen. */
export function einwilligungsFassung(version: string | null): EinwilligungsFassung | null {
  if (!version) return null;
  return EINWILLIGUNGS_FASSUNGEN.find((f) => f.version === version) ?? null;
}
