// ─── Wann eine Meldung an Privatleute rausgeht ───────────────────────────────
//
// EMPFÄNGER SIND PRIVATLEUTE ZU HAUSE, keine Schreibtische im Büro. Das ist die
// ganze Begründung für die Uhrzeit: Wer über seine eigene Dachfläche nachdenkt,
// tut das nach Feierabend. Die verbreitete Empfehlung „Dienstag bis Donnerstag,
// vormittags" ist die für Geschäftsempfänger — sie stand hier zuerst und war
// die falsche Zielgruppe. Für Privatempfänger zeigen die Auswertungen
// übereinstimmend den Abend (Brevo, Mailjet, ActiveCampaign, GetResponse,
// rapidmail; MailerLites Auswertung von 2,1 Mio Kampagnen sieht die höchsten
// KLICKraten bei Privat-Zielgruppen zwischen 18 und 21 Uhr — alle am 03.09.2026
// gelesen).
//
// ─── Warum die meisten Zahlen dazu nichts wert sind ──────────────────────────
//
// ÖFFNUNGSRATEN TAUGEN SEIT 09/2021 NICHT MEHR FÜR EINE ZEITAUSSAGE. Apples
// Mail-Datenschutz lädt die Bilder einer Mail beim EINGANG, nicht beim Lesen,
// und Apple Mail steht für rund 58 % aller gemeldeten Öffnungen. Eine
// Auswertung „welche Versandstunde hat die beste Öffnungsrate" misst damit zu
// gutem Teil die Versandstunde selbst. Genau daher kommt das sonst unerklärliche
// Ergebnis des Inxmail-Benchmarks 2026 (4 Mrd. Mails), die beste Versandzeit
// liege zwischen 3 und 6 Uhr morgens — DIESE ZAHL WIRD HIER BEWUSST NICHT
// BENUTZT. MailerLite empfiehlt aus demselben Grund ausdrücklich, nur noch über
// Klickraten zu testen.
//
// UND KEINE DIESER AUSWERTUNGEN IST EIN EXPERIMENT. Sie vergleichen Kampagnen,
// die zu verschiedenen Zeiten rausgingen — also verschiedene Absender an
// verschiedene Listen. Keine nennt Signifikanz oder Streuung; die Unterschiede
// liegen im Bereich weniger Prozentpunkte. Wir übernehmen die Richtung, nicht
// die Genauigkeit.
//
// DESHALB DIE SCHWELLE. Bei siebzehn Empfängern ist der erwartete Unterschied
// kein ganzer Mensch, und ein Lauf, der dafür einen Abend wartet, kostet mehr,
// als er bringt. Das Fenster greift erst, wo wirklich viele Meldungen auf
// einmal rausgehen.
//
// WAS DAS FENSTER NICHT IST: die Ferienbremse der Kommunen-Anschreiben. Die
// bremst Kaltakquise an Rathäuser. Hier haben Menschen die Meldung bestellt;
// ihnen etwas vorzuenthalten, weil in ihrem Bundesland Ferien sind, wäre keine
// Rücksicht, sondern Willkür.

/** Ein Zeitfenster in lokaler Zeit (Deutschland). */
export type Versandfenster = { ok: true } | { ok: false; grund: string; naechstes: string };

/** Wochentage, an denen versendet wird. 2 = Dienstag … 4 = Donnerstag. */
export const GUTE_WOCHENTAGE = [2, 3, 4];

/**
 * Stunden, in denen versendet wird — der Feierabend.
 *
 * 17 bis 20 Uhr: früh genug, dass die Mail nicht über Nacht nach unten rutscht,
 * spät genug, dass sie nicht im Arbeitstag untergeht. Rund 80 % aller Öffnungen
 * passieren in den ersten vier Stunden nach Zustellung — der Versand liegt
 * damit im selben Abend wie das Lesen.
 */
export const GUTE_STUNDEN = [{ von: 17, bis: 20 }];

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
      ? `${stunde} Uhr liegt außerhalb des Fensters (17–20 Uhr)`
      : `${namen[wochentag] ?? "?"} ist kein Versandtag (Dienstag bis Donnerstag)`,
    naechstes: "Dienstag bis Donnerstag, 17–20 Uhr deutscher Zeit",
  };
}
