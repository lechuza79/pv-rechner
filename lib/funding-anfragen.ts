// ─── Was an eine Förderstelle hinausging — und ob je etwas zurückkam ─────────
//
// Zwei Fragen, die ohne Protokoll beide unbeantwortbar sind:
//
//   1. Haben wir hier schon einmal gefragt? Ohne diese Antwort schickt ein
//      nächtlicher Lauf dieselbe Frage jede Nacht erneut. „Kein Nachfassen" ist
//      die Zusage, mit der die ganze Aussendung vertretbar ist — sie hängt an
//      einem Gedächtnis, nicht an einem Vorsatz.
//
//   2. Wo kam nichts zurück? Das ist die eigentliche Auskunft dieses Moduls.
//      Eine verschickte Frage ohne Antwort sieht in jeder Statistik aus wie eine
//      nie gestellte — bis jemand die Leere sichtbar macht. Erst dann lässt sich
//      entscheiden, ob ein Programm auf „unsicher" fällt oder ob es sich lohnt,
//      dort anzurufen.
//
// DIE RECHNUNG IST REIN, DAS SCHREIBEN NICHT. Was fällig ist und was offen ist,
// entscheiden Funktionen ohne Datenbank — nur so lassen sie sich prüfen. Der
// Zugriff liegt daneben und wird von den Läufen hereingereicht.

import { normalisiert } from "./outreach-sachfrage";

/** Eine verschickte Anfrage, so wie sie im Protokoll steht. */
export type Anfrage = {
  programId: string;
  empfaenger: string;
  gesendetAm: string;
  antwortAm: string | null;
  antwortArt: string | null;
};

/**
 * Ab wann eine unbeantwortete Anfrage berichtet wird.
 *
 * VIERZEHN TAGE, und die Zahl ist eine Aussage über Verwaltungen, nicht über
 * uns: Eine Ortsgemeinde mit einer Halbtagsstelle beantwortet eine Sachfrage
 * nicht am nächsten Tag. Kürzer gesetzt stünde nach jedem Versand dieselbe
 * Meldung im Bericht, und eine Meldung, die immer da ist, liest niemand.
 *
 * Sie löst KEINE zweite Mail aus. Was nach der Frist passiert, ist ein Eintrag
 * im Bericht — mehr nicht.
 */
export const OHNE_ANTWORT_AB_TAGEN = 14;

/**
 * Höchstzahl Anfragen je Lauf.
 *
 * Nicht die Zustellbarkeit ist der Grund (drei Mails sind für keinen Mailserver
 * ein Ereignis), sondern die Umkehrbarkeit: Ein Fehler in der Auswahl trifft bei
 * drei Empfängern drei Ämter und ist am nächsten Morgen zu sehen. Bei fünfzig
 * wäre er ein Vorfall.
 */
export const MAX_JE_LAUF = 3;

/**
 * Abstand zum Kommunen-Anschreiben an dieselbe Stelle.
 *
 * ZWEI MAILS VON UNS BINNEN TAGEN sind für die Empfängerin eine Sache, für uns
 * aber zwei verschiedene: ein Werbebrief und eine Sachfrage. Kommen sie dicht
 * hintereinander, ist die Reaktion auf den Brief nicht mehr die Reaktion auf
 * den Brief — und das ist die einzige Kennzahl, an der der Erfolg des
 * Anschreibens gemessen wird. Gemessen (10.09.2026): 64 der 289 angeschriebenen
 * Gemeinden haben ein Programm im Katalog, 19 der 175 im offenen Versandtopf.
 *
 * VIERZEHN TAGE, dieselbe Größenordnung wie die Antwortfrist: lang genug, dass
 * die eine Mail nicht mehr auf die andere abfärbt, kurz genug, dass eine
 * Korrektur nicht wochenlang liegen bleibt. Die Sperre wirkt nur in EINE
 * Richtung — sie hält die Sachfrage zurück, nie den Brief. Der Brief ist der
 * Zeitplan des Betreibers; die Sachfrage kann warten.
 */
export const ABSTAND_ZUM_BRIEF_TAGE = 14;

/**
 * Welche Programme dürfen eine Anfrage bekommen?
 *
 * DREI BEDINGUNGEN, und die dritte ist die, die man vergisst: Es muss ein
 * Postfach geben. Ein Programm ohne Empfänger fällt sonst still aus der Auswahl
 * und niemand erfährt, dass die Eskalation dort gar nicht stattfinden kann.
 * Deshalb liefert die Funktion beides — was geht, und was aus welchem Grund
 * nicht.
 */
export function faelligeAnfragen(
  kandidaten: {
    programId: string;
    eskaliert: boolean;
    empfaenger: string | null;
    /** Tage seit dem Kommunen-Anschreiben an dieselbe Stelle; null = keins. */
    tageSeitBrief?: number | null;
  }[],
  schonGefragt: Set<string>,
  max = MAX_JE_LAUF,
): { senden: string[]; uebersprungen: { programId: string; grund: string }[] } {
  const senden: string[] = [];
  const uebersprungen: { programId: string; grund: string }[] = [];
  for (const k of kandidaten) {
    if (!k.eskaliert) continue;
    if (schonGefragt.has(k.programId)) {
      uebersprungen.push({ programId: k.programId, grund: "schon einmal gefragt — kein Nachfassen" });
      continue;
    }
    if (!k.empfaenger) {
      uebersprungen.push({ programId: k.programId, grund: "kein Rollen-Postfach hinterlegt" });
      continue;
    }
    if (k.tageSeitBrief !== null && k.tageSeitBrief !== undefined && k.tageSeitBrief < ABSTAND_ZUM_BRIEF_TAGE) {
      uebersprungen.push({
        programId: k.programId,
        grund: `vor ${k.tageSeitBrief} Tagen ging schon das Kommunen-Anschreiben dorthin`,
      });
      continue;
    }
    if (senden.length >= max) {
      uebersprungen.push({ programId: k.programId, grund: "Höchstzahl dieses Laufs erreicht" });
      continue;
    }
    senden.push(k.programId);
  }
  return { senden, uebersprungen };
}

/**
 * Verschickt, aber ohne Antwort — und lange genug her, dass das etwas bedeutet.
 *
 * `heute` wird hereingereicht statt hier gebildet: Eine Frist, die ihre eigene
 * Uhr mitbringt, lässt sich nicht prüfen, und dieselbe Fehlerklasse hat im
 * Projekt schon zweimal ein falsches Datum erzeugt.
 */
export function ohneAntwort(anfragen: Anfrage[], heuteIso: string, abTagen = OHNE_ANTWORT_AB_TAGEN): Anfrage[] {
  const grenze = Date.parse(`${heuteIso}T00:00:00Z`) - abTagen * 86_400_000;
  return anfragen
    .filter((a) => !a.antwortAm && Date.parse(a.gesendetAm) <= grenze)
    .sort((a, b) => a.gesendetAm.localeCompare(b.gesendetAm));
}

/** Wie viele Tage eine Anfrage schon offen ist. */
export function offenSeitTagen(a: Anfrage, heuteIso: string): number {
  return Math.floor((Date.parse(`${heuteIso}T00:00:00Z`) - Date.parse(a.gesendetAm)) / 86_400_000);
}

/**
 * Gehört diese eingegangene Mail zu einer unserer Anfragen?
 *
 * DAS POSTFACH TRÄGT ZWEI DINGE: die Antworten auf die Kommunen-Anschreiben und
 * die auf diese Sachfragen. Beide kommen von derselben Amtsdomain, oft aus
 * demselben Postfach — die Absenderadresse allein entscheidet also nichts.
 *
 * Was entscheidet, ist der ZITIERTE BETREFF. Jedes Mailprogramm setzt ihn beim
 * Antworten voran, und unserer ist unverwechselbar („Aktueller Stand des
 * Förderprogramms …"). Fehlt er, ordnen wir NICHT zu: Eine falsch zugeordnete
 * Antwort schließt eine offene Frage, die in Wahrheit offen ist — und niemand
 * sieht das je wieder nach. Ein nicht zugeordneter Rückläufer kostet dagegen
 * einen Blick. Dieselbe konservative Richtung wie im Kommunen-Rücklauf.
 */
export function ordneAnfrageZu(
  mail: { von: string; betreff: string; roh: string },
  offene: Anfrage[],
  betreffZu: Map<string, string>,
): string | null {
  const vonDomain = mail.von.split("@")[1]?.toLowerCase() ?? "";
  if (!vonDomain) return null;
  // DIESELBE NORMALISIERUNG WIE DIE WEICHE IM RÜCKLAUF, und zwar importiert
  // statt nachgebaut: Beide beantworten dieselbe Frage an demselben Text, und
  // zwei Fassungen davon liefen beim ersten abweichenden Mailprogramm
  // auseinander — die eine ordnete zu, die andere nicht.
  //
  // Der Grund, warum es überhaupt eine Normalisierung braucht, ist gemessen
  // (Outreach-Sitzung, 10.09.2026): Bricht ein Mailprogramm den zitierten
  // Betreff um, steht mitten darin eine Zeile mit „> " — „Aktueller Stand >
  // des Förderprogramms". Wörtlich gesucht bleibt genau diese Antwort
  // unerkannt, und hier ist das teurer als in der Gegenrichtung: Die Frage
  // stünde für immer als „ohne Antwort" da.
  const nadelBar = (s: string) => normalisiert(s);
  const treffer = offene.filter((a) => {
    if ((a.empfaenger.split("@")[1] ?? "").toLowerCase() !== vonDomain) return false;
    const betreff = betreffZu.get(a.programId);
    if (!betreff) return false;
    // Der zitierte Betreff steht mal im Betreff der Antwort („AW: …"), mal nur
    // im zitierten Text darunter — beides zählt.
    const nadel = nadelBar(betreff);
    return nadelBar(mail.betreff).includes(nadel) || nadelBar(mail.roh).includes(nadel);
  });
  return treffer.length === 1 ? treffer[0].programId : null;
}
