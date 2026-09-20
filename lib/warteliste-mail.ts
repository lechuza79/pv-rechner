// The confirmation mail of a waitlist. Built on the shared mail shell, like
// every other mail to users (lib/mail-huelle.ts).
import { escapeHtml } from "./html-escape";
import { huelle, knopf, C, T, SITE } from "./mail-huelle";
import { WARTELISTE_TITEL, type WartelisteName } from "./warteliste-einwilligung";

export function wartelisteBestaetigungsMail(o: {
  liste: WartelisteName;
  bestaetigenUrl: string;
  abmeldeUrl: string;
}): { subject: string; html: string; text: string } {
  const titel = WARTELISTE_TITEL[o.liste];
  const subject = `Bitte bestätigen: Warteliste ${titel}`;
  const inhalt = `
    <p style="margin:0 0 14px;font-size:${T.titel};font-weight:800;line-height:1.25;color:${C.text};letter-spacing:-0.02em">Noch ein Klick</p>
    <p style="margin:0 0 14px">
      Du möchtest Bescheid bekommen, sobald der ${escapeHtml(titel)} auf solar-check.io startet.
      Bestätige das bitte einmal. Danach schreiben wir dir nur noch zum Start. Kein Newsletter.
    </p>
    ${knopf(o.bestaetigenUrl, "Ja, auf die Warteliste")}
    <p style="margin:0 0 8px;font-size:${T.fuss};color:${C.leise}">Der Link gilt 48 Stunden.</p>
    <p style="margin:0 0 8px;font-size:${T.fuss};color:${C.leise}">
      Wenn du das nicht warst, ist nichts passiert: Ohne diesen Klick verschicken wir nichts,
      und die Eintragung wird nach sieben Tagen von selbst gelöscht.
    </p>
    <p style="margin:0;font-size:${T.fuss};color:${C.leise}">
      Doch kein Interesse mehr? <a href="${o.abmeldeUrl}" style="color:${C.leise}">Hier austragen</a>, jederzeit, auch nach der Bestätigung.
    </p>`;
  const html = huelle({
    vorschau: `Ein Klick, dann sagen wir Bescheid, sobald der ${titel} startet.`,
    inhalt,
    grundzeile:
      `Diese E-Mail bekommst du, weil diese Adresse auf solar-check.io für die Warteliste „${titel}" eingetragen wurde. ` +
      "Sie wurde bei uns eingegeben und nicht aus einer anderen Quelle übernommen (Art. 13 DSGVO).",
  });
  const text = [
    `Noch ein Klick.`,
    ``,
    `Du möchtest Bescheid bekommen, sobald der ${titel} auf solar-check.io startet.`,
    `Bitte bestätige das einmal:`,
    o.bestaetigenUrl,
    ``,
    `Danach schreiben wir dir nur noch zum Start. Kein Newsletter.`,
    `Der Link gilt 48 Stunden. Wenn du das nicht warst, ist nichts passiert.`,
    ``,
    `Austragen: ${o.abmeldeUrl}`,
    `Impressum: ${SITE}/impressum · Datenschutz: ${SITE}/datenschutz`,
  ].join("\n");
  return { subject, html, text };
}
