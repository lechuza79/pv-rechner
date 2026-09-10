/**
 * Darf ein Ort, dessen Brief als unzustellbar zurückkam, noch einmal in den
 * Versand?
 *
 * WOZU DIESE DATEI: Die Entscheidung stand als Bedingung mitten in der
 * Empfängerauswahl und war damit nicht prüfbar — ein Test hätte nur die
 * Reihenfolge der Zeilen im Quelltext vergleichen können, nicht das Urteil.
 * Genau die Sorte Prüfung, die grün meldet, ohne etwas zu sehen.
 *
 * DIE FEHLERKLASSE, GEGEN DIE SIE GEBAUT IST (10.09.2026): Die Auswahl hängt am
 * KONTAKTDATUM, nicht am Zustand — es trägt jeder Ort, der einmal im Versand
 * war, auch wenn die Mail nie ankam. Ein Ort mit frisch recherchierter Adresse
 * fiele damit für immer durch: Der Zustand sähe richtig aus, die Übergabe liefe
 * ins Leere, und der Lauf meldete grün.
 */
import { STATUS_BOUNCE_BEHOBEN, MAX_DAUERHAFTE_BOUNCER, dauerhafteBouncer } from "./outreach-bounce";

export type VersandKandidat = {
  outreach_status: string;
  contacted_at: string | null;
  /** Die Geschichte des Orts — daraus kommt die Zahl der toten Adressen. */
  notes: string | null;
};

export type Wiedervorlage =
  | { nimm: true }
  | { nimm: false; grund: string };

/**
 * Die Frage wird für JEDEN Kandidaten gestellt, nicht nur für Bouncer — sie ist
 * die eine Stelle, an der „schon angeschrieben" entschieden wird.
 *
 * Das Kontaktdatum wird dabei nie zurückgesetzt, obwohl das die naheliegende
 * Reparatur wäre: Daran hängt die Tagesmengen-Zählung des Versands, und der
 * Zeitpunkt des ersten — gescheiterten — Versuchs wäre für immer weg.
 */
export function darfInDenVersand(z: VersandKandidat): Wiedervorlage {
  if (z.outreach_status === STATUS_BOUNCE_BEHOBEN) {
    // WER OFT GENUG ZURÜCKKAM, HAT KEIN ADRESSPROBLEM MEHR. Nach der zweiten
    // dauerhaften Unzustellbarkeit liegt es am Mailserver der Gemeinde, und
    // dagegen hilft keine dritte Adresse — sonst läuft sie im Kreis.
    //
    // GEZÄHLT WERDEN FEHLVERSUCHE, NICHT ADRESSEN. Die erste Fassung nahm
    // `toteAdressen().length` und sperrte damit Lassan nach seinem EINZIGEN
    // Fehlversuch: Dessen Meldung nennt zwei Adressen, weil unser Empfänger auf
    // ein gelöschtes Personenpostfach weiterleitete. Gefunden nur, weil die
    // Ausnahme gegen die echten vier Fälle lief statt gegen Fixtures.
    const versuche = dauerhafteBouncer(z.notes);
    if (versuche >= MAX_DAUERHAFTE_BOUNCER) {
      return {
        nimm: false,
        grund: `${versuche} dauerhafte Unzustellbarkeiten — nicht die Adresse, sondern der Mailserver`,
      };
    }
    return { nimm: true };
  }

  // Alles andere mit Kontaktdatum ist wirklich angeschrieben. Ein volles
  // Postfach bleibt bewusst auf „bounce": Dort stimmt die Adresse, es gibt
  // nichts zu ersetzen, und in ein paar Tagen ist es wieder leer.
  if (z.contacted_at || z.outreach_status === "kontaktiert" || z.outreach_status === "geantwortet") {
    return { nimm: false, grund: `schon angeschrieben am ${z.contacted_at?.slice(0, 10) ?? "?"}` };
  }
  return { nimm: true };
}
