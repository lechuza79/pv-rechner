// ─── Wann eine Meldung an Privatleute rausgeht ───────────────────────────────
//
// GEMESSEN IST DIE WIRKUNG, NICHT VON UNS: Zwischen dem besten und dem
// schlechtesten Wochentag liegen im Schnitt 5 bis 8 Prozentpunkte Öffnungsrate,
// zwischen den Tageszeiten bis zu 30. Rund 80 % aller Öffnungen passieren in
// den ersten vier Stunden nach Zustellung — der Zeitpunkt entscheidet also vor
// allem, ob eine Mail oben im Postfach liegt oder unter zwanzig anderen.
// (rapidmail-Auswertung und dogado-Zusammenfassung des Inxmail-Benchmarks,
// beide am 03.09.2026 gelesen.)
//
// DIE ZAHLEN STAMMEN AUS NEWSLETTER-VERSAND, und das ist die Grenze dieser
// Datei: Für eine persönliche Nachricht von einem Menschen an wenige Empfänger
// gibt es keine belastbaren Zahlen. Deshalb greift das Fenster hier nur, wo
// wirklich viele Meldungen auf einmal rausgehen — bei siebzehn Empfängern wäre
// der Unterschied ein einziger, und ein Lauf, der deswegen einen Tag wartet,
// kostet mehr, als er bringt.
//
// WARUM DAS NICHT DIE FERIENREGEL DER ANSCHREIBEN IST: Die bremst Kaltakquise
// an Rathäuser und fragt nach Bundesland, Schulferien und Feiertagen. Hier
// geht es um Menschen, die eine Meldung bestellt haben — ihnen etwas
// vorzuenthalten, weil in ihrem Bundesland Ferien sind, wäre keine Rücksicht,
// sondern Willkür. Geprüft wird nur, ob der Zeitpunkt die Mail unnötig
// begräbt.

/** Ein Zeitfenster in lokaler Zeit (Deutschland). */
export type Versandfenster = { ok: true } | { ok: false; grund: string; naechstes: string };

/** Wochentage, an denen versendet wird. 2 = Dienstag … 4 = Donnerstag. */
export const GUTE_WOCHENTAGE = [2, 3, 4];

/** Stunden, in denen versendet wird — die beiden Fenster der Auswertung. */
export const GUTE_STUNDEN = [
  { von: 9, bis: 11 },
  { von: 14, bis: 15 },
];

/**
 * Ab wie vielen Empfängern das Fenster überhaupt gilt.
 *
 * Darunter ist der erwartete Unterschied kleiner als ein Empfänger, und eine
 * Nachricht einen Tag liegen zu lassen ist dann teurer als der Gewinn. Die
 * Zahl ist keine Messung, sondern die Schwelle, ab der die gemessene Spanne
 * (5–8 Prozentpunkte) überhaupt eine ganze Person ausmacht.
 */
export const AB_EMPFAENGERN = 20;

/** Deutsche Ortszeit aus einem Zeitpunkt, ohne Bibliothek. */
function deutscheZeit(jetzt: Date): { wochentag: number; stunde: number } {
  const teile = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(jetzt);
  const tage: Record<string, number> = { So: 0, Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6 };
  const kurz = (teile.find((t) => t.type === "weekday")?.value ?? "").slice(0, 2);
  return {
    wochentag: tage[kurz] ?? -1,
    stunde: Number(teile.find((t) => t.type === "hour")?.value ?? -1),
  };
}

/**
 * Darf jetzt versendet werden?
 *
 * `empfaenger` entscheidet, ob das Fenster überhaupt greift — siehe
 * AB_EMPFAENGERN. Ein kleiner Lauf geht immer durch.
 */
export function versandzeitOk(jetzt: Date, empfaenger: number): Versandfenster {
  if (empfaenger < AB_EMPFAENGERN) return { ok: true };

  const { wochentag, stunde } = deutscheZeit(jetzt);
  const tagOk = GUTE_WOCHENTAGE.includes(wochentag);
  const stundeOk = GUTE_STUNDEN.some((f) => stunde >= f.von && stunde < f.bis);
  if (tagOk && stundeOk) return { ok: true };

  const namen = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return {
    ok: false,
    grund: tagOk
      ? `${stunde} Uhr liegt außerhalb der Fenster (9–11 und 14–15 Uhr)`
      : `${namen[wochentag] ?? "?"} ist kein Versandtag (Dienstag bis Donnerstag)`,
    naechstes: "Dienstag bis Donnerstag, 9–11 oder 14–15 Uhr deutscher Zeit",
  };
}
