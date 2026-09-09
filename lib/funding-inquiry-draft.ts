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

import { SIGNATURE } from "./kommunen-outreach-draft";

/**
 * WARUM ÜBERHAUPT GEFRAGT WIRD — und warum das zwei verschiedene Fälle sind.
 *
 * Der erste Fall war der Anlass dieser Datei: Die Amtsseite lässt uns nicht
 * lesen. Der zweite kam am 09.09.2026 dazu und ist häufiger, als er aussieht:
 * Die Seite ist bestens erreichbar und sagt ZWEI verschiedene Dinge. Bei der
 * Ortsgemeinde Waldalgesheim steht im Seitentext eine Pauschale von 100 €, in
 * der Richtlinie daneben 200 €. Beides ist gelesen, beides ist amtlich, und
 * genau deshalb hilft kein weiterer Abruf.
 *
 * Der Unterschied MUSS im Text stehen: Wer einer Gemeinde schreibt, ihre Seite
 * sei durch einen Bot-Schutz gesperrt, obwohl sie es nicht ist, hat eine
 * Falschaussage verschickt — an genau die Stelle, die es besser weiß. Deshalb
 * ein eigener Anlass statt eines Freitextfelds: Ein Freitext wäre die Stelle,
 * an der beim nächsten Mal wieder jemand einen Satz erfindet.
 */
export type InquiryAnlass =
  | { art: "unerreichbar" }
  /**
   * Die Seite widerspricht sich. `angaben` nennt je Fundstelle den Wert, den
   * sie trägt — mindestens zwei, sonst gibt es keinen Widerspruch zu klären.
   */
  | { art: "widerspruch"; angaben: { fundstelle: string; wert: string }[] };

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
  /** Warum wir fragen. Ohne Angabe der Ursprungsfall: Seite nicht abrufbar. */
  anlass?: InquiryAnlass;
  /**
   * Die eigene Seite, auf der das Programm steht.
   *
   * DAS IST EIN BELEG, KEINE WERBUNG — und der Unterschied hängt daran, WAS die
   * Adresse zeigt: die Angaben der Stelle selbst, so wie wir sie ausweisen. Wer
   * einer Behörde schreibt „bei mir steht 100 €", ohne zu sagen wo, verlangt,
   * dass sie es glaubt; mit der Adresse kann sie in zehn Sekunden nachsehen und
   * im selben Zug korrigieren, was daneben liegt. Ein Satz über unser Produkt
   * bleibt trotzdem draußen: Sobald der Text für uns wirbt, ist es keine
   * Sachfrage mehr, sondern Kaltakquise (§ 7 UWG).
   */
  unsereSeite?: string;
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
  const anlass = c.anlass ?? { art: "unerreichbar" };
  const stand = c.standIso
    ? `Unser letzter belegter Stand ist vom ${datumDe(c.standIso)}.`
    : "Einen belegten Stand haben wir bisher nicht.";

  const punkte = c.hinterlegt.map((z) => `- ${z}`).join("\n");

  // Der Anlass-Absatz und die eigentliche Frage hängen zusammen: Bei einer
  // unlesbaren Seite bitten wir um Bestätigung des ganzen Standes, bei einem
  // Widerspruch um die Entscheidung zwischen zwei Werten. Beides in einen
  // Absatz zu gießen ergäbe eine Mail, die zwei Dinge gleichzeitig will — und
  // eine Sachbearbeitung, die nur eines davon beantwortet.
  const teile: string[] = [
    "Sehr geehrte Damen und Herren,",
    "",
    // DER PROGRAMMNAME STEHT IM BETREFF UND SONST NIRGENDS. Ihn hier noch
    // einmal zu nennen ist derselbe Satz zweimal — der Empfänger hat ihn beim
    // Öffnen gelesen. Was der Absatz leisten muss, ist etwas anderes: sagen,
    // wer schreibt und warum überhaupt jemand nachfragt.
    "ich betreibe einen kostenlosen Rechner für Photovoltaik-Anlagen und weise darin auch regionale Förderprogramme aus. Damit dort keine veralteten Angaben stehen, prüfe ich sie regelmäßig nach.",
    "",
  ];

  if (anlass.art === "unerreichbar") {
    teile.push(
      `Bei Ihrem Programm gelingt das nicht: Die Seite ${c.url} ist durch einen Bot-Schutz gesichert und für einen automatisierten Abruf nicht erreichbar. ${stand}`,
      "",
      "Können Sie mir kurz bestätigen oder korrigieren, ob die folgenden Angaben noch zutreffen?",
      "",
      punkte,
    );
  } else {
    if (anlass.angaben.length < 2) {
      throw new Error("Ein Widerspruch braucht mindestens zwei Fundstellen — sonst ist es keiner.");
    }
    teile.push(
      `Bei Ihrem Programm bin ich dabei auf zwei unterschiedliche Angaben gestoßen, beide auf ${c.url}:`,
      "",
      anlass.angaben.map((a) => `- ${a.fundstelle}: ${a.wert}`).join("\n"),
      "",
      // Was wir bis zur Antwort ausweisen, gehört in die Mail: Die Stelle kann
      // dann selbst nachsehen, ob auf unserer Seite gerade der Wert steht, den
      // sie meint — und wir behaupten nicht, neutral zu warten.
      // NICHT „unser letzter belegter Stand" wie im anderen Fall: Dort geht es
      // darum, wie alt unsere Angabe ist, hier darum, WANN wir den Widerspruch
      // gesehen haben. Wer schreibt, er habe seit Monaten keinen Stand, und im
      // selben Absatz zwei Werte von der Seite zitiert, widerspricht sich selbst.
      `Welche Angabe ist die gültige? Bis zu Ihrer Antwort weise ich die vorsichtigere aus.${
        c.standIso ? ` Gelesen habe ich die Seite zuletzt am ${datumDe(c.standIso)}.` : ""
      }`,
      "",
      "Wenn Sie ohnehin dabei sind: Trifft der übrige Stand, den ich hinterlegt habe, noch zu?",
      "",
      punkte,
    );
  }

  // Die eigene Fundstelle steht NACH der Aufzählung, nicht davor: Erst die
  // Frage, dann der Ort zum Nachsehen. Umgekehrt läse der erste Blick eine
  // Adresse von uns, und das ist der Moment, in dem eine Behördenmail als
  // Werbung einsortiert wird.
  if (c.unsereSeite) {
    teile.push("", `So steht das Programm derzeit bei mir: ${c.unsereSeite}`);
  }

  teile.push(
    "",
    "Es genügt mir eine formlose Antwort. Falls das Programm ausgelaufen ist oder die Mittel erschöpft sind, ist auch das eine hilfreiche Auskunft — dann nehme ich es aus der Berechnung.",
    "",
    "Vielen Dank für Ihre Mühe.",
    "",
    "Viele Grüße",
    SIGNATURE,
    "",
    // WARUM DIESE DREI ZEILEN AUCH IN EINER SACHFRAGE STEHEN: Der Auslöser für
    // Art. 14 DSGVO ist nicht die Mail, sondern dass wir die Adresse der Stelle
    // in unserer Kontakttabelle führen — erhoben aus ihrem Impressum. Diese
    // Pflicht besteht unabhängig davon, ob die Nachricht Werbung ist; die Mail
    // ist nur die Gelegenheit, ihr nachzukommen.
    "Impressum: https://solar-check.io/impressum",
    "Datenschutz: https://solar-check.io/datenschutz",
    "Ihre Adresse stammt aus dem Impressum Ihrer Website (Herkunftshinweis nach Art. 14 DSGVO). Wenn Sie keine weitere Nachricht wünschen, genügt eine kurze Antwort.",
  );

  return { subject: inquirySubject(c), body: teile.join("\n") };
}
