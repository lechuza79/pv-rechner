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

/**
 * Wann versendet wird — je Wochentag ein eigenes Fenster.
 *
 * WERKTAGS DER FEIERABEND (Di–Do, 17–20 Uhr): früh genug, dass die Mail nicht
 * über Nacht nach unten rutscht, spät genug, dass sie nicht im Arbeitstag
 * untergeht. Rund 80 % aller Öffnungen fallen in die ersten vier Stunden nach
 * Zustellung — Versand und Lesen liegen damit im selben Abend.
 *
 * SAMSTAG DER FRÜHE NACHMITTAG (13–16 Uhr). Der Samstag fehlte hier zuerst,
 * und das war eine Recherchelücke, kein Urteil: Die erste Suche lieferte den
 * Satz „B2C-Newsletter erreichen früh morgens, abends und AM WOCHENENDE die
 * besten Werte" — er stand im Ergebnis und wurde nicht ausgewertet. Der
 * Betreiber hat es bemerkt (05.09.2026), die Nachrecherche hat ihm recht
 * gegeben.
 *
 * Der Samstag trägt sich anders als die Werktage, und das ist der Punkt: Nicht
 * eine höhere gemessene Öffnungsrate spricht für ihn — die weist der
 * Inxmail-Benchmark 2026 im B2C dem Montag zu —, sondern ein MECHANISMUS.
 * Deutlich weniger Absender verschicken am Wochenende, das Postfach ist
 * leerer, und wer samstags liest, hat Zeit. Für eine Nachricht über die eigene
 * Dachfläche zählt genau das. Die Uhrzeit ist die einzige, die die Quellen für
 * den Wochenendversand nennen (rapidmail, dogado, Brevo, GetResponse, alle am
 * 03. und 05.09.2026 gelesen): früher Nachmittag, nicht der Abend — samstags
 * abends ist niemand am Postfach.
 *
 * SONNTAG BLEIBT DRAUSSEN: 21,8 % gegen 26,9 % am besten Tag — der einzige
 * Wochentag, für den eine Quelle einen deutlich schlechteren Wert nennt.
 */
export const FENSTER: { tag: number; von: number; bis: number }[] = [
  { tag: 2, von: 17, bis: 20 },
  { tag: 3, von: 17, bis: 20 },
  { tag: 4, von: 17, bis: 20 },
  { tag: 6, von: 13, bis: 16 },
];

/** Wochentage, an denen versendet wird. 2 = Dienstag … 6 = Samstag. */
export const GUTE_WOCHENTAGE = [...new Set(FENSTER.map((f) => f.tag))];

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
  const heute = FENSTER.filter((f) => f.tag === wochentag);
  if (heute.some((f) => stunde >= f.von && stunde < f.bis)) return { ok: true };

  const namen = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const zeiten = (f: { von: number; bis: number }) => `${f.von}\u2013${f.bis} Uhr`;
  return {
    ok: false,
    grund: heute.length
      ? `${stunde} Uhr liegt au\u00dferhalb des Fensters (${heute.map(zeiten).join(" und ")})`
      : `${namen[wochentag] ?? "?"} ist kein Versandtag`,
    naechstes: "Dienstag bis Donnerstag 17\u201320 Uhr oder Samstag 13\u201316 Uhr deutscher Zeit",
  };
}

// ─── Wann eine Sachfrage an ein AMT rausgeht ─────────────────────────────────
//
// EIN ANDERER EMPFÄNGER, ALSO EIN ANDERES FENSTER — und die Begründung ist
// nicht die Öffnungsrate, sondern wie die Mail wirkt.
//
// Eine Rückfrage zu einem Förderprogramm ist als Nachricht von einem Menschen
// an einen anderen gemeint. Um 03:14 nachts im Postfach der Ortsgemeinde ist
// sie das erkennbar nicht: Niemand tippt um diese Zeit eine Sachfrage. Der
// Betreiber hat es am 10.09.2026 so entschieden — „so eine Mail sollte nicht
// automatisiert aussehen, also tagsüber zu unrunden Zeiten versenden."
//
// DIE VOLLE STUNDE IST DAS VERRÄTERISCHE, nicht die Uhrzeit an sich. Ein
// Zeitstempel auf 09:00:00 kommt aus einem Zeitplan, 09:07 aus einem
// Schreibtisch. Deshalb zwei Bedingungen statt einer: Bürozeit UND eine
// Minute, die nicht durch fünf teilbar ist. Das schließt genau die zwanzig
// Prozent aus, die nach Kalendereintrag aussehen (00, 05, 10 …) — der Rest
// des Tages bleibt nutzbar, und der Lauf muss nicht auf einen Termin warten.
//
// WAS DIESES FENSTER NICHT IST: die Ferienbremse der Kommunen-Anschreiben.
// Die bremst Kaltakquise. Hier geht es um eine Auskunft, die die Stelle
// ohnehin öffentlich gibt; sie wochenlang zurückzuhalten hieße, eine falsche
// Zahl so lange auf unserer eigenen Seite stehen zu lassen.

/** Bürozeit in deutscher Ortszeit — beide Grenzen als volle Stunde. */
export const AMT_VON_STUNDE = 9;
export const AMT_BIS_STUNDE = 17;

/**
 * Eine Minute sieht nach Zeitplan aus, wenn sie durch fünf teilbar ist.
 *
 * Getrennt herausgezogen, weil genau das die Aussage ist, die geprüft werden
 * muss — und weil „unrund" sonst ein Gefühl bliebe statt einer Bedingung.
 */
export function minuteWirktGeplant(minute: number): boolean {
  return minute % 5 === 0;
}

/** Deutsche Ortszeit samt Minute. */
function deutscheZeitGenau(jetzt: Date): { wochentag: number; stunde: number; minute: number } {
  const teile = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(jetzt);
  const tage: Record<string, number> = { So: 0, Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6 };
  const kurz = (teile.find((t) => t.type === "weekday")?.value ?? "").slice(0, 2);
  return {
    wochentag: tage[kurz] ?? -1,
    stunde: Number(teile.find((t) => t.type === "hour")?.value ?? -1),
    minute: Number(teile.find((t) => t.type === "minute")?.value ?? -1),
  };
}

/**
 * Darf jetzt eine Sachfrage an eine Behörde hinausgehen?
 *
 * Werktags, während der Bürozeit, und nicht zur vollen oder halben Stunde.
 * Anders als beim Abo-Fenster gibt es KEINE Mengenschwelle: Auch eine einzelne
 * Mail soll nicht mitten in der Nacht ankommen — der Grund ist die Wirkung
 * beim Empfänger, nicht die Statistik über viele.
 */
export function amtsVersandzeitOk(jetzt: Date): Versandfenster {
  const { wochentag, stunde, minute } = deutscheZeitGenau(jetzt);
  const naechstes = `Montag bis Freitag ${AMT_VON_STUNDE}–${AMT_BIS_STUNDE} Uhr deutscher Zeit, zu einer unrunden Minute`;
  if (wochentag < 1 || wochentag > 5) {
    const namen = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return { ok: false, grund: `${namen[wochentag] ?? "?"} ist kein Arbeitstag`, naechstes };
  }
  if (stunde < AMT_VON_STUNDE || stunde >= AMT_BIS_STUNDE) {
    return { ok: false, grund: `${stunde} Uhr liegt außerhalb der Bürozeit`, naechstes };
  }
  if (minuteWirktGeplant(minute)) {
    return { ok: false, grund: `Minute ${minute} sieht nach Zeitplan aus`, naechstes };
  }
  return { ok: true };
}

/**
 * Abstand zwischen zwei Mails desselben Laufs, in Millisekunden.
 *
 * DREI MAILS IM SEKUNDENABSTAND SIND EIN VERSAND, drei über eine Stunde
 * verteilt sind drei Vorgänge. Sie gehen ohnehin an verschiedene Ämter, die
 * einander nicht sehen — der Abstand wirkt also nicht beim Empfänger, sondern
 * an den Zeitstempeln, die im eigenen Protokoll und beim Mailanbieter stehen.
 *
 * Die Spanne wird hereingereicht statt gewürfelt, damit sie prüfbar bleibt;
 * der Zufall kommt vom Aufrufer.
 */
export function pauseZwischenMails(zufall: number, minMinuten = 4, maxMinuten = 19): number {
  const spanne = maxMinuten - minMinuten;
  return Math.round((minMinuten + zufall * spanne) * 60_000);
}
