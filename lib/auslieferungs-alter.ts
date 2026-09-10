// ─── Wie alt ist die Auslieferung, gegen die gerade gemessen wurde? ──────────
//
// WARUM ES DAS GIBT (10.09.2026): Der Gesundheitscheck läuft nach JEDEM
// inhaltlichen Push auf die Hauptlinie — also regelmäßig wenige Minuten,
// nachdem eine neue Auslieferung live gegangen ist. Ein frisches Bündel hat
// keine warme Function und keinen gefüllten CDN-Cache; der allererste Aufbau
// einer Atlas-Seite ist dann strukturell teurer als jeder spätere.
//
// GEMESSEN, NICHT VERMUTET — vier Fälle, alle mit demselben Bild:
//
//   • 10.09.2026, 00:28 UTC: erste Stichprobe 6,42 s, danach 1,8 / 1,0 s.
//     Die Auslieferung war 3,5 Minuten alt.
//   • 09.09.2026, 15:14 / 15:35 / 15:39 UTC: erste Stichprobe 7,2 / 7,2 / 7,6 s,
//     jede folgende 1,5–2,8 s. Alle drei begannen 0–4 Minuten nach einer
//     Auslieferung.
//
// Zum Vergleich die Läufe FERN von jeder Auslieferung (Zeitplan, 09.09. 16:41
// und 23:16 UTC): 2,0 / 1,6 / 1,4 s und 1,9 / 1,7 / 1,8 s — flach, kein
// Ausreißer an erster Stelle. Über die letzten 60 Läufe: von 37 durch einen
// Push ausgelösten gingen 10 rot (27 %), von 21 nach Zeitplan 2 (10 %).
//
// WAS DAS GEKOSTET HAT, und warum ein Satz im Bericht das wert ist: Am
// 09.09.2026 wurden drei Commits nacheinander auf die Diagnose „die
// Auszeichnungs-Liste läuft ab und wird im Seitenaufbau neu gebaut" geschrieben.
// Die Vorberechnung dort ist richtig und bleibt. Die DIAGNOSE der roten Läufe
// war es nur zum Teil: Nach der Vorberechnung liegt die erste Stichprobe nach
// einer Auslieferung immer noch bei 6,42 s statt bei den erwarteten 2–3 s. Der
// dominierende Anteil des ersten Abrufs ist also nicht die Liste, sondern der
// Kaltstart selbst.
//
// DIE UMKEHRUNG GILT NICHT, und das ist im selben Lauf gemessen worden: Der
// erste Lauf NACH dieser Änderung startete ebenfalls vier Minuten nach einer
// Auslieferung und maß 1,8 / 1,3 / 2,0 s — flach, kein Ausreißer. Eine frische
// Auslieferung macht den ersten Aufbau also nicht zwangsläufig teuer; ob es
// eine wirklich kalte Function trifft, ist Zufall. Genau deshalb ist das Alter
// ein HINWEIS und kein Urteil, und genau deshalb darf hier nie eine Bedingung
// „frisch, also egal" entstehen: Sie wäre in der Hälfte der Fälle falsch.
//
// OFFEN UND HIER AUSDRÜCKLICH NICHT BEHAUPTET: Woraus die verbleibenden rund
// 4,5 s bestehen, ist NICHT gemessen. Der Schluss „Kaltstart" stützt sich auf
// die Lage des Ausreißers (immer die erste Stichprobe) und auf das Alter der
// Auslieferung, nicht auf eine Messung der Function-Startzeit. Wer das
// aufmacht, misst zuerst nach, statt diesen Satz als Befund zu übernehmen.
//
// WAS DIESES MODUL AUSDRÜCKLICH NICHT TUT: das Urteil ändern. Ein Aufbau nahe
// der Notbremse bleibt ein Befund, egal wie alt die Auslieferung ist — der
// erste Besucher nach einem Deploy zahlt die Zeit wirklich. Die Zeile ist
// Kontext, keine Ausnahme. Eine Bedingung „bei frischer Auslieferung nicht
// melden" wäre eine aufgeweichte Schwelle, und die verbietet das Wächter-Gate.

/** Fasst das Alter in Klartext. `null`, wenn es nicht abrufbar war. */
export function auslieferungsAlterText(alterMinuten: number | null): string {
  if (alterMinuten === null) return "Alter der laufenden Auslieferung: nicht abrufbar.";
  if (alterMinuten < 1) return "Laufende Auslieferung: weniger als eine Minute alt.";
  // Umschaltpunkt bei einer vollen Stunde, NICHT spaeter: Rundet man erst ab
  // 90 Minuten auf Stunden, ergibt jede Zahl darueber schon 2 — die Einzahl
  // „1 Stunde" waere unerreichbarer Code. Beim Schreiben genau so gemessen.
  if (alterMinuten < 60) {
    const m = Math.round(alterMinuten);
    return `Laufende Auslieferung: ${m} ${m === 1 ? "Minute" : "Minuten"} alt.`;
  }
  const h = Math.round(alterMinuten / 60);
  return `Laufende Auslieferung: ${h} ${h === 1 ? "Stunde" : "Stunden"} alt.`;
}

/**
 * Der Zusatz, der an einen Kaltaufbau-Befund gehängt wird.
 *
 * BEWUSST OHNE SCHWELLE. Es gibt keine belegte Grenze, ab der eine Auslieferung
 * „warm" ist, und eine gegriffene Zahl wäre genau der Handfaktor, den das Gate
 * verbietet. Genannt wird deshalb immer die Tatsache — sie trägt in BEIDE
 * Richtungen: Ein Alter von drei Minuten sagt „Kaltstart zuerst prüfen", ein
 * Alter von sechs Stunden schließt ihn als Erklärung aus, und das ist der
 * wertvollere der beiden Fälle.
 */
export function kaltaufbauHerkunft(alterMinuten: number | null): string {
  if (alterMinuten === null) {
    return (
      "Wie alt die laufende Auslieferung ist, war nicht abrufbar — ob ein Kaltstart mitspielt, " +
      "lässt sich aus diesem Lauf also nicht sagen."
    );
  }
  return (
    `${auslieferungsAlterText(alterMinuten)} Eine frische Auslieferung hat keine warme Function und ` +
    `keinen gefüllten Cache; der ERSTE Aufbau danach ist strukturell teurer als jeder spätere. ` +
    `Zuerst nachsehen, ob der Ausreißer die erste Stichprobe war — nur seine Lage im Lauf ` +
    `unterscheidet einen Kaltstart von einer langsam gewordenen Seite.`
  );
}

/** Ein Eintrag der Auslieferungsliste — nur die Felder, die hier zaehlen. */
export interface Auslieferung {
  created?: number;
  state?: string;
  target?: string | null;
}

/**
 * Zeitstempel der neuesten LIVE stehenden Produktions-Auslieferung, sonst `null`.
 *
 * Gefiltert wird in der Antwort statt ueber Suchparameter: Welche Filter der
 * Endpunkt akzeptiert, ist nicht geprueft, und ein abgewiesener Parameter waere
 * ununterscheidbar von „keine Auslieferung gefunden". Die FORM der Antwort ist
 * dagegen an echten Daten gesehen (10.09.2026).
 *
 * Drei Zustaende muessen ausgeschlossen bleiben, alle real in der Liste:
 * abgebrochene Auslieferungen (`CANCELED`), Vorschau-Auslieferungen eines
 * Zweiges (`target: null`) und Eintraege ohne Zeitstempel. Jeder davon als
 * „laufende Auslieferung" gelesen ergaebe ein Alter, das es nicht gibt — und
 * das ist schlimmer als „nicht abrufbar".
 *
 * Auf die Reihenfolge der Liste wird BEWUSST nicht vertraut: das Maximum ist
 * eine Zeile mehr und haengt an nichts.
 */
export function neuesteProduktionsAuslieferung(liste: Auslieferung[]): number | null {
  const live = liste
    .filter((d) => d.state === "READY" && d.target === "production")
    .map((d) => d.created)
    .filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  return live.length ? Math.max(...live) : null;
}
