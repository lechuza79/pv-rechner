/**
 * Pressemitteilungen an Lokalredaktionen verschicken — und jede einzelne VOR dem
 * Senden in der Datenbank vermerken (lib/presse-versand.ts).
 *
 *   npm run presse:versand                                  Übersicht: wer hat was bekommen
 *   npm run presse:versand -- --setup                       Tabelle anlegen
 *   npm run presse:versand -- --nachtragen <datei.json>     alte Mails aus dem Gesendet-Ordner eintragen
 *   npm run presse:versand -- --senden <mails.json> --schub <name> [--nur a@b,c@d]
 *
 * Die Mails selbst baut ein anderer Lauf (scripts/presse-kreise.ts); dieser hier
 * verschickt nur, was dort entworfen und abgenommen wurde. Jede Mail in der
 * Datei: { an, betreff, text, anlass, kreise }.
 *
 * Es gibt KEINEN zweiten Weg, Presse-Mails zu verschicken. Das Skript, mit dem im
 * September die ersten 138 hinausgingen, schrieb sein Protokoll in einen
 * temporären Ordner, und der wurde aufgeräumt (siehe lib/presse-versand.ts).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
import { leseSmtpKonfig } from "../lib/outreach-mail";
import {
  PRESSE_VERSAND_DDL, anlassAusBetreff, bestaetigeVersand, schonAngeschrieben, vermerkeVorVersand,
  type PresseAnlass,
} from "../lib/presse-versand";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

function env() {
  // The worktree has no .env.local of its own; read the main checkout's.
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

/** Die Kreise, die der Katalog einem Medium zuordnet — für alte Mails ohne eigene Angabe. */
async function kreiseJeDomain(c: Db): Promise<Map<string, string[]>> {
  const raus = new Map<string, string[]>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await c.from("presse_medien").select("domain, kreise").order("domain").range(von, von + 999);
    if (error) throw new Error(error.message);
    for (const z of (data ?? []) as { domain: string; kreise: string[] | null }[]) raus.set(z.domain, z.kreise ?? []);
    if ((data ?? []).length < 1000) return raus;
  }
}

async function setup(c: Db) {
  const { error } = await c.rpc("exec_sql", { sql: PRESSE_VERSAND_DDL });
  if (error) throw new Error(error.message);
  console.log("✓ Tabelle für das Presse-Versandprotokoll steht");
}

/**
 * Mails, die schon draußen sind, nachträglich eintragen — mit ihrem ECHTEN
 * Versandzeitpunkt und ihrer Kennung aus dem Gesendet-Ordner, und mit der
 * Herkunft „nachgetragen", damit niemand sie für einen Lauf dieses Skripts hält.
 */
async function nachtragen(c: Db, datei: string) {
  const mails = JSON.parse(readFileSync(datei, "utf8")) as { an: string; betreff: string; datum: string; messageId: string | null; text: string }[];
  const kreise = await kreiseJeDomain(c);
  let neu = 0, schon = 0;
  for (const m of mails) {
    const anlass = anlassAusBetreff(m.betreff);
    if (!anlass) continue;
    const empfaenger = m.an.trim().toLowerCase();
    const domain = empfaenger.split("@")[1];
    const { error } = await c.from("presse_versand").insert({
      empfaenger, domain, anlass, kreise: kreise.get(domain) ?? [], schub: null,
      betreff: m.betreff, text: m.text, message_id: m.messageId, gesendet_am: m.datum, vermerkt_am: m.datum,
      herkunft: "nachgetragen aus dem Gesendet-Ordner (Protokoll verloren)",
    });
    if (error?.code === "23505") { schon++; continue; }
    if (error) throw new Error(`${empfaenger}: ${error.message}`);
    neu++;
  }
  console.log(JSON.stringify({ gelesen: mails.length, neu, schon_vorhanden: schon }));
}

async function senden(c: Db, datei: string, schub: string) {
  const mails = JSON.parse(readFileSync(datei, "utf8")) as { an: string; betreff: string; text: string; anlass: PresseAnlass; kreise: string[] }[];
  const nur = arg("nur") ? new Set(arg("nur")!.split(",").map((s) => s.trim().toLowerCase())) : null;
  const vorher = await schonAngeschrieben(c);
  const k = leseSmtpKonfig(process.env);
  if (!k.ok) throw new Error(k.fehler.join("; "));
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
      // Eine Redaktion, die schon DIESELBE Mail hat, überspringt der Vermerk
      // ohnehin; hier wird zusätzlich gemeldet, wer überhaupt schon etwas bekam.
      const bisher = vorher.get(an.split("@")[1]);
      if (bisher?.some((b) => b.betreff === m.betreff)) { console.log(`– ${an}: schon verschickt`); continue; }
      if (!erste) await new Promise((r) => setTimeout(r, 60_000 + Math.floor(Math.random() * 90_000))); // uneven gaps, 1–2.5 min
      erste = false;
      // FIRST the record, THEN the mail. A failed record means no mail.
      const id = await vermerkeVorVersand(c, { empfaenger: an, anlass: m.anlass, kreise: m.kreise, schub, betreff: m.betreff, text: m.text });
      const nachricht = { from: k.konfig.from, to: an, replyTo: k.konfig.replyTo, subject: m.betreff, text: m.text };
      const info = await transport.sendMail(nachricht);
      await bestaetigeVersand(c, id, info.messageId);
      // A copy in "Gesendet" for the human reading the mailbox — the record is the table above.
      const roh = await new MailComposer({ ...nachricht, messageId: info.messageId, date: new Date() }).compile().build();
      await imap.append("Gesendet", roh, ["\\Seen"]).catch((e: unknown) => console.warn(`  Kopie in Gesendet fehlgeschlagen: ${String(e)}`));
      console.log(`✓ ${an}${bisher ? ` (hatte schon: ${bisher.length})` : ""}`);
    }
  } finally {
    await imap.logout().catch(() => undefined);
    transport.close();
  }
}

async function uebersicht(c: Db) {
  const alle = await schonAngeschrieben(c);
  const zeilen = [...alle.values()].flat();
  const jeTag: Record<string, number> = {};
  for (const z of zeilen) jeTag[(z.am ?? "?").slice(0, 10)] = (jeTag[(z.am ?? "?").slice(0, 10)] ?? 0) + 1;
  console.log(`${zeilen.length} Presse-Mails an ${alle.size} Redaktionen`);
  for (const [t, n] of Object.entries(jeTag).sort()) console.log(`  ${t}: ${n}`);
}

async function main() {
  env();
  const c = await db();
  if (process.argv.includes("--setup")) return setup(c);
  if (arg("nachtragen")) return nachtragen(c, arg("nachtragen")!);
  if (arg("senden")) {
    const schub = arg("schub");
    if (!schub) throw new Error("--schub <name> angeben — jeder Versand gehört zu einem benannten Schub");
    return senden(c, arg("senden")!, schub);
  }
  return uebersicht(c);
}

main().catch((e) => { console.error(e); process.exit(1); });
