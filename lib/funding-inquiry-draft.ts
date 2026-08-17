// ─── Anfrage an die Förderstelle, wenn keine Maschine mehr weiterkommt ───────
//
// WARUM (16.08.2026): Manche Förderträger lassen automatisierte Abrufe nicht
// durch. Gemessen an frankfurt.de: direkter Abruf 403, skriptgesteuerter Browser
// landet auf der Cloudflare-Prüfseite, und selbst im echten Chrome des Betreibers
// erschien zeitweise ein „Bestätigen Sie, dass Sie ein Mensch sind"-Häkchen. Das
// Häkchen setzt hier niemand — eine Mensch-Prüfung für eine Maschine wegzuklicken
// ist die eine Grenze, an der auch ein Wächter anhält.
//
// Bleibt ein Programm über mehrere Läufe unprüfbar (siehe funding-verify-state.ts),
// gibt es noch genau einen ehrlichen Weg: bei der Stelle nachfragen. Das liefert
// sogar etwas, was keine Webseite hergibt — eine datierte Auskunft der
// zuständigen Stelle.
//
// KEIN AUTOMATISCHER VERSAND. Diese Datei erzeugt einen Entwurf; abgeschickt wird
// er vom Betreiber. Rechtlich ist das die unbedenkliche Variante: eine sachliche
// Sachfrage zu einem laufenden Förderprogramm an ein Rollen-Postfach, keine
// Werbung, kein Angebot (§ 7 UWG greift nicht — siehe Legal-Checkliste 6). Genau
// deshalb steht hier auch NICHTS über solar-check.io als Produkt: Sobald der Text
// für uns wirbt, ist es keine Sachfrage mehr, sondern Kaltakquise.
//
// Template statt LLM — dieselbe Entscheidung wie beim Kommunen-Anschreiben
// (lib/kommunen-outreach-draft.ts): reine Funktion, server- und testbar.

export type InquiryContext = {
  /** Name des Programms, wie ihn die Stelle selbst benutzt. */
  programName: string;
  /** Träger, an den die Anfrage geht ("Stadt Frankfurt am Main"). */
  traeger: string;
  /** Adresse der Programmseite, die wir nicht lesen konnten. */
  url: string;
  /** Was auf unserer Seite steht und bestätigt werden soll — je eine Zeile. */
  hinterlegt: string[];
  /** ISO-Datum des letzten Standes, den wir belegen können; null = keiner. */
  standIso: string | null;
};

export type InquiryDraft = { subject: string; body: string };

function datumDe(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Der Betreff nennt Programm und Anliegen — keine Marke, kein Aufhänger.
 * Ein Rollen-Postfach sortiert nach Sachthema, nicht nach Absender.
 */
export function inquirySubject(c: InquiryContext): string {
  return `Aktueller Stand des Förderprogramms „${c.programName}"`;
}

/**
 * Sachfrage, kein Anschreiben. Vier Teile: wer fragt, was wir hinterlegt haben,
 * was wir bestätigt haben möchten, und der Hinweis, warum wir nicht einfach auf
 * die Seite geschaut haben — Letzteres ist keine Beschwerde, sondern erklärt der
 * Stelle, warum sie überhaupt gefragt wird.
 */
export function renderInquiryDraft(c: InquiryContext): InquiryDraft {
  const stand = c.standIso
    ? `Unser letzter belegter Stand ist vom ${datumDe(c.standIso)}.`
    : "Einen belegten Stand haben wir bisher nicht.";

  const punkte = c.hinterlegt.map((z) => `- ${z}`).join("\n");

  const body = [
    "Sehr geehrte Damen und Herren,",
    "",
    `ich betreibe einen kostenlosen Rechner für Photovoltaik-Anlagen und weise darin auch regionale Förderprogramme aus — darunter „${c.programName}". Damit dort keine veralteten Angaben stehen, prüfe ich die Programme regelmäßig nach.`,
    "",
    `Bei Ihrem Programm gelingt das nicht: Die Seite ${c.url} ist durch einen Bot-Schutz gesichert und für einen automatisierten Abruf nicht erreichbar. ${stand}`,
    "",
    "Können Sie mir kurz bestätigen oder korrigieren, ob die folgenden Angaben noch zutreffen?",
    "",
    punkte,
    "",
    "Es genügt mir eine formlose Antwort. Falls das Programm ausgelaufen ist oder die Mittel erschöpft sind, ist auch das eine hilfreiche Auskunft — dann nehme ich es aus der Berechnung.",
    "",
    "Vielen Dank für Ihre Mühe.",
  ].join("\n");

  return { subject: inquirySubject(c), body };
}
