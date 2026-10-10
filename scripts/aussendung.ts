/**
 * Der eine Versandlauf für Aussendungen an jede Zielgruppe — jede Mail wird VOR
 * dem Senden in der Datenbank vermerkt (lib/aussendung.ts).
 *
 *   npm run aussendung -- --zielgruppe <name>                      wer hat was bekommen
 *   npm run aussendung -- --setup                                  Tabelle anlegen / alten Stand umziehen
 *   npm run aussendung -- --zielgruppe presse --nachtragen <datei> alte Mails aus dem Gesendet-Ordner eintragen
 *   npm run aussendung -- --zielgruppe <name> --senden <mails.json> --schub <name> [--nur a@b,c@d]
 *
 * Die Mails baut ein Entwurfslauf der Zielgruppe (Presse: scripts/presse-kreise.ts);
 * dieser Lauf verschickt nur, was dort entworfen und abgenommen wurde. Jede Mail
 * in der Datei: { an, betreff, text, anlass, bezug }.
 *
 * Gemeinden und Förderstellen haben ihre eigenen, älteren Versandläufe mit
 * eigenem Protokoll; jede andere Zielgruppe geht hierüber. Einen zweiten Weg
 * gibt es nicht — der Grund steht in lib/aussendung.ts.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
import { adresseAus, leseSmtpKonfig } from "../lib/outreach-mail";
import { dkimAktiv } from "../lib/outreach-dkim";
import {
  AUSSENDUNG_DDL, AUSSENDUNG_UMZUG_SQL, anlassAusBetreff, aussendungsMaengel, hatWidersprochen, bestaetigeVersand, schonAngeschrieben, vermerkeVorVersand,
} from "../lib/aussendung";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

function env() {
  // A worktree has no .env.local of its own; read the main checkout's.
  const pfad = resolve(MAIN_CHECKOUT, ".env.local");
  if (!existsSync(pfad)) return;
  for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Db = Awaited<ReturnType<typeof db>>;

async function setup(c: Db) {
  const { error } = await c.rpc("exec_sql", { sql: `${AUSSENDUNG_UMZUG_SQL}\n${AUSSENDUNG_DDL}` });
  if (error) throw new Error(error.message);
  console.log("✓ Tabelle für das Versandprotokoll steht");
}

/** Die Kreise, die der Presse-Katalog einem Medium zuordnet — für alte Mails ohne eigene Angabe. */
async function kreiseJeDomain(c: Db): Promise<Map<string, string[]>> {
  const raus = new Map<string, string[]>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await c.from("presse_medien").select("domain, kreise").order("domain").range(von, von + 999);
    if (error) throw new Error(error.message);
    for (const z of (data ?? []) as { domain: string; kreise: string[] | null }[]) raus.set(z.domain, z.kreise ?? []);
    if ((data ?? []).length < 1000) return raus;
  }
}

/**
 * Mails, die schon draußen sind, nachträglich eintragen — mit ihrem ECHTEN
 * Versandzeitpunkt und ihrer Kennung aus dem Gesendet-Ordner, und mit der
 * Herkunft „nachgetragen", damit niemand sie für einen Lauf dieses Skripts hält.
 * Bisher nur für die Presse gebraucht (September 2026).
 */
async function nachtragen(c: Db, zielgruppe: string, datei: string) {
  if (zielgruppe !== "presse") throw new Error("Nachtragen ist bisher nur für die Presse eingerichtet");
  const mails = JSON.parse(readFileSync(datei, "utf8")) as { an: string; betreff: string; datum: string; messageId: string | null; text: string }[];
  const kreise = await kreiseJeDomain(c);
  let neu = 0, schon = 0;
  for (const m of mails) {
    const anlass = anlassAusBetreff(m.betreff);
    if (!anlass) continue;
    const empfaenger = m.an.trim().toLowerCase();
    const domain = empfaenger.split("@")[1];
    const { error } = await c.from("aussendungen").insert({
      zielgruppe, empfaenger, domain, anlass, bezug: kreise.get(domain) ?? [], schub: null,
      betreff: m.betreff, text: m.text, message_id: m.messageId, gesendet_am: m.datum, vermerkt_am: m.datum,
      herkunft: "nachgetragen aus dem Gesendet-Ordner (Protokoll verloren)",
    });
    if (error?.code === "23505") { schon++; continue; }
    if (error) throw new Error(`${empfaenger}: ${error.message}`);
    neu++;
  }
  console.log(JSON.stringify({ gelesen: mails.length, neu, schon_vorhanden: schon }));
}

async function senden(c: Db, zielgruppe: string, datei: string, schub: string) {
  const mails = JSON.parse(readFileSync(datei, "utf8")) as { an: string; betreff: string; text: string; anlass: string; bezug?: string[]; kreise?: string[] }[];
  const nur = arg("nur") ? new Set(arg("nur")!.split(",").map((s) => s.trim().toLowerCase())) : null;
  // Every mail is checked BEFORE the first one goes out: a batch with one
  // broken letter stops whole, instead of half sent.
  const kaputt = mails
    .filter((m) => !nur || nur.has(m.an.trim().toLowerCase()))
    .map((m) => ({ an: m.an, maengel: aussendungsMaengel(m.betreff, m.text) }))
    .filter((x) => x.maengel.length);
  if (kaputt.length) {
    for (const x of kaputt.slice(0, 10)) console.error(`✗ ${x.an}: ${x.maengel.join(", ")}`);
    throw new Error(`${kaputt.length} Mails mit fehlenden Pflichtangaben oder Lücken — nichts verschickt`);
  }
  const vorher = await schonAngeschrieben(c, zielgruppe);
  const k = leseSmtpKonfig(process.env);
  if (!k.ok) throw new Error(k.fehler.join("; "));
  const dkim = await dkimAktiv(adresseAus(k.konfig.from).split("@")[1]);
  if (!dkim.ok) throw new Error(`Kein Versand ohne DKIM: ${dkim.hinweis}`);
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: k.konfig.host, port: k.konfig.port, secure: k.konfig.port === 465,
    auth: { user: k.konfig.user, pass: k.konfig.pass },
  });
  await transport.verify();
  const { ImapFlow } = await import("imapflow");
  const imap = new ImapFlow({
    host: process.env.OUTREACH_IMAP_HOST!, port: Number(process.env.OUTREACH_IMAP_PORT ?? 993), secure: true,
    auth: { user: process.env.OUTREACH_IMAP_USER!, pass: process.env.OUTREACH_IMAP_PASS! }, logger: false,
  });
  await imap.connect();
  const MailComposer = (await import("nodemailer/lib/mail-composer")).default;
  let erste = true;
  try {
    for (const m of mails) {
      const an = m.an.trim().toLowerCase();
      if (nur && !nur.has(an)) continue;
      // Wer schon DIESELBE Mail hat, überspringt der Vermerk ohnehin; hier wird
      // zusätzlich gemeldet, wer in dieser Zielgruppe überhaupt schon etwas bekam.
      const bisher = vorher.get(an.split("@")[1]);
      if (hatWidersprochen(bisher)) { console.log(`– ${an}: diese Redaktion hat widersprochen`); continue; }
      if (bisher?.some((b) => b.betreff === m.betreff)) { console.log(`– ${an}: schon verschickt`); continue; }
      if (!erste) await new Promise((r) => setTimeout(r, 60_000 + Math.floor(Math.random() * 90_000))); // uneven gaps, 1–2.5 min
      erste = false;
      // FIRST the record, THEN the mail. A failed record means no mail.
      const id = await vermerkeVorVersand(c, {
        zielgruppe, empfaenger: an, anlass: m.anlass, bezug: m.bezug ?? m.kreise ?? [], schub, betreff: m.betreff, text: m.text,
      });
      const nachricht = { from: k.konfig.from, to: an, replyTo: k.konfig.replyTo, subject: m.betreff, text: m.text };
      const info = await transport.sendMail(nachricht);
      await bestaetigeVersand(c, id, info.messageId);
      // A copy in "Gesendet" for the human reading the mailbox — the record is the table.
      const roh = await new MailComposer({ ...nachricht, messageId: info.messageId, date: new Date() }).compile().build();
      await imap.append("Gesendet", roh, ["\\Seen"]).catch((e: unknown) => console.warn(`  Kopie in Gesendet fehlgeschlagen: ${String(e)}`));
      console.log(`✓ ${an}${bisher ? ` (hatte schon: ${bisher.length})` : ""}`);
    }
  } finally {
    await imap.logout().catch(() => undefined);
    transport.close();
  }
}

async function uebersicht(c: Db, zielgruppe: string) {
  const alle = await schonAngeschrieben(c, zielgruppe);
  const zeilen = [...alle.values()].flat();
  const jeTag: Record<string, number> = {};
  for (const z of zeilen) jeTag[(z.am ?? "?").slice(0, 10)] = (jeTag[(z.am ?? "?").slice(0, 10)] ?? 0) + 1;
  console.log(`${zielgruppe}: ${zeilen.length} Mails an ${alle.size} Domains`);
  for (const [t, n] of Object.entries(jeTag).sort()) console.log(`  ${t}: ${n}`);
}

async function main() {
  env();
  const c = await db();
  if (process.argv.includes("--setup")) return setup(c);
  const zielgruppe = arg("zielgruppe");
  if (!zielgruppe) throw new Error("--zielgruppe <name> angeben — jede Aussendung gehört zu einem Empfängerkreis");
  if (arg("nachtragen")) return nachtragen(c, zielgruppe, arg("nachtragen")!);
  if (arg("senden")) {
    const schub = arg("schub");
    if (!schub) throw new Error("--schub <name> angeben — jeder Versand gehört zu einem benannten Schub");
    return senden(c, zielgruppe, arg("senden")!, schub);
  }
  return uebersicht(c, zielgruppe);
}

main().catch((e) => { console.error(e); process.exit(1); });
