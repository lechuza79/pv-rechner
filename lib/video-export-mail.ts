import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { escapeHtml } from "./html-escape";
import { huelle, knopf, C, T } from "./mail-huelle";
import { sendeAboMail } from "./abo-versand";
import { formatStoryDate } from "./story-format";
import { VIDEO_TTL } from "./video-export-config";

// The two mails of the video export: "please confirm" and "your video".
//
// TRANSACTIONAL, NOT A LIST: both answer a request the visitor just made.
// No subscription follows from them, no unsubscribe header, no newsletter —
// the address is cleared once the request has ended. They reuse the mail
// envelope and the mailbox of the subscription mails; the "bestaetigung" kind
// checks imprint, privacy link and the reason line, and forbids nothing we
// need.
//
// LOCAL SINK: with VIDEO_MAIL_SINK set (never on Vercel) mails are written as
// JSON files instead of being sent. That is the pilot's mail server.

export type VideoMail = { subject: string; html: string; text: string };

const GRUND = (label: string) =>
  `Diese E-Mail bekommen Sie, weil diese Adresse auf solar-check.io für den Download des Videos „${label}“ eingetragen wurde. ` +
  "Sie wurde bei uns eingegeben und nicht aus einer anderen Quelle übernommen (Art. 13 DSGVO). Ein Ortsabo entsteht nur, wenn Sie es zusätzlich ausgewählt haben.";

export function videoLabel(o: { widget?: string; place: string; period: string }): string {
  if(o.widget === "regional-race") return `Solaranlagen im regionalen Vergleich · ${o.place}`;
  return `Solarerzeugung im Tagesverlauf in ${o.place} · ${formatStoryDate(o.period)}`;
}

export function confirmMail(o: { label: string; confirmUrl: string; subscribe?: boolean }): VideoMail {
  const label = escapeHtml(o.label);
  const subject = "Bitte bestätigen: Ihr Video von Solar Check";
  const inhalt = `
    <p style="margin:0 0 14px;font-size:${T.titel};font-weight:800;line-height:1.25;color:${C.text}">Noch ein Klick</p>
    <p style="margin:0 0 14px">Sie möchten das Video <strong>${label}</strong> als MP4 herunterladen. Bestätigen Sie bitte Ihre E-Mail-Adresse — danach erstellen wir das Video und schicken Ihnen den Downloadlink.</p>
    ${o.subscribe ? "<p>Sie haben außerdem Neuigkeiten zu Ihrem Ort ausgewählt. Mit der Bestätigung aktivieren Sie auch dieses Abo. Sie können es jederzeit abbestellen.</p>" : ""}
    ${knopf(o.confirmUrl, "E-Mail-Adresse bestätigen")}
    <p style="margin:0 0 8px;font-size:${T.fuss};color:${C.leise}">Der Link gilt ${VIDEO_TTL.confirmMinutes} Minuten und nur einmal.</p>
    <p style="margin:0;font-size:${T.fuss};color:${C.leise}">Wenn Sie das nicht waren, ist nichts passiert: Ohne diesen Klick erstellen und verschicken wir nichts.</p>`;
  const html = huelle({ vorschau: "Ein Klick, dann erstellen wir Ihr Video.", inhalt, grundzeile: GRUND(o.label) });
  const text = [
    "Noch ein Klick.", "",
    `Sie möchten das Video "${o.label}" als MP4 herunterladen. Bitte bestätigen Sie Ihre E-Mail-Adresse:`,
    ...(o.subscribe ? ["Mit Ihrer Bestätigung aktivieren Sie auch die ausgewählten Neuigkeiten zu Ihrem Ort. Jederzeit abbestellbar."] : []),
    o.confirmUrl, "",
    `Der Link gilt ${VIDEO_TTL.confirmMinutes} Minuten und nur einmal. Wenn Sie das nicht waren, ist nichts passiert.`, "",
    "Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz",
  ].join("\n");
  return { subject, html, text };
}

export function readyMail(o: { label: string; downloadUrl: string; expiresAt: Date }): VideoMail {
  const label = escapeHtml(o.label);
  const bis = o.expiresAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const subject = "Ihr Video ist fertig";
  const inhalt = `
    <p style="margin:0 0 14px;font-size:${T.titel};font-weight:800;line-height:1.25;color:${C.text}">Ihr Video ist fertig</p>
    <p style="margin:0 0 14px"><strong>${label}</strong> steht als MP4 zum Download bereit.</p>
    ${knopf(o.downloadUrl, "Video herunterladen")}
    <p style="margin:0;font-size:${T.fuss};color:${C.leise}">Der Link gilt bis ${escapeHtml(bis)}. Danach löschen wir die Datei.</p>`;
  const html = huelle({ vorschau: "Ihr MP4 steht zum Download bereit.", inhalt, grundzeile: GRUND(o.label) });
  const text = [
    "Ihr Video ist fertig.", "", `${o.label} steht als MP4 zum Download bereit:`, o.downloadUrl, "",
    `Der Link gilt bis ${bis}. Danach löschen wir die Datei.`, "",
    "Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz",
  ].join("\n");
  return { subject, html, text };
}

export function failedMail(o: { label: string }): VideoMail {
  const label = escapeHtml(o.label);
  const subject = "Ihr Video konnte nicht erstellt werden";
  const inhalt = `
    <p style="margin:0 0 14px;font-size:${T.titel};font-weight:800;line-height:1.25;color:${C.text}">Das hat leider nicht geklappt</p>
    <p style="margin:0 0 14px">Das Video <strong>${label}</strong> konnte nicht erstellt werden. Wir haben den Fehler bemerkt. Sie können es später auf der Seite erneut anfordern.</p>`;
  const html = huelle({ vorschau: "Das Video konnte nicht erstellt werden.", inhalt, grundzeile: GRUND(o.label) });
  const text = [
    "Das hat leider nicht geklappt.", "", `Das Video "${o.label}" konnte nicht erstellt werden. Sie können es später erneut anfordern.`, "",
    "Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz",
  ].join("\n");
  return { subject, html, text };
}

/** Send one mail. `true` means the mail server (or the local sink) accepted it. */
export async function sendVideoMail(to: string, mail: VideoMail, kind: "confirm" | "ready" | "failed"): Promise<boolean> {
  const sink = process.env.VIDEO_MAIL_SINK;
  if (sink && !process.env.VERCEL) {
    const dir = path.resolve(sink);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${kind}-${Math.random().toString(36).slice(2, 8)}.json`);
    await writeFile(file, JSON.stringify({ to, kind, ...mail }, null, 2));
    return true;
  }
  const res = await sendeAboMail({ an: to, subject: mail.subject, html: mail.html, text: mail.text, art: "bestaetigung" });
  // Never log the address: only the outcome.
  if (!res.ok) console.error(`video-export mail (${kind}) failed: ${res.fehler}`);
  return res.ok;
}
