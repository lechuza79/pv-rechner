/**
 * Rückläufer aus dem Anschreiben-Postfach abholen und zuordnen.
 *
 * Liest das Postfach über IMAP, ordnet jede eingegangene Mail ein
 * (lib/outreach-ruecklauf.ts) und trägt das Ergebnis an der Gemeinde nach:
 * Unzustellbar → `bounce`, Widerspruch → `gesperrt`, echte Antwort →
 * `geantwortet` samt Zeitstempel und Notiz.
 *
 * Nutzung:
 *   npm run kommunen:ruecklauf                 nur ansehen (schreibt nichts)
 *   npm run kommunen:ruecklauf -- --schreiben  Status nachtragen
 *   npm run kommunen:ruecklauf -- --tage=14    Zeitraum (Standard 7)
 *
 * Env: OUTREACH_IMAP_HOST, OUTREACH_IMAP_PORT (Standard 993),
 *      OUTREACH_IMAP_USER, OUTREACH_IMAP_PASS — dasselbe Postfach wie der
 *      Versand. Fehlen sie, bricht das Skript mit einer klaren Ansage ab statt
 *      „0 Rückläufer" zu melden.
 *
 * ES WIRD NICHTS GELÖSCHT UND NICHTS ALS GELESEN MARKIERT. Das Postfach gehört
 * dem Betreiber; ein Skript, das darin aufräumt, nimmt ihm die Möglichkeit,
 * dieselbe Mail selbst zu sehen. Zuordnung passiert allein über die
 * Absender-Domain und den zitierten Betreff.
 *
 * DIE ZUORDNUNG IST DIE SCHWACHSTELLE, und sie ist bewusst konservativ: Wo eine
 * Rückmeldung keiner angeschriebenen Gemeinde eindeutig zuzuordnen ist, wird
 * sie GEMELDET, nicht geraten. Ein falsch gesetztes „gesperrt" verliert eine
 * Gemeinde für immer; ein gemeldeter Zweifelsfall kostet eine Minute.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { ordneEin, STATUS_ZU_ART, type Ruecklaufart, type RohMail } from "../lib/outreach-ruecklauf";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg = "", level: "info" | "ok" | "err" | "warn" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : level === "warn" ? "! " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function makeClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

const arg = (name: string): string | undefined => {
  const t = process.argv.find((a) => a.startsWith(`--${name}=`));
  return t ? t.slice(name.length + 3) : undefined;
};
const hat = (name: string) => process.argv.includes(`--${name}`);

/** Angeschriebene Gemeinden mit ihrer Empfängerdomain — die Zuordnungsbasis. */
async function angeschriebene(db: Awaited<ReturnType<typeof makeClient>>) {
  const out: { region_id: string; name: string; email: string; domain: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("kommunen_kontakt")
      .select("region_id, rollen_email, mastr_regions!inner(name)")
      .not("contacted_at", "is", null)
      .not("rollen_email", "is", null)
      .order("region_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data as unknown as { region_id: string; rollen_email: string; mastr_regions: { name: string } | { name: string }[] }[]) {
      const reg = Array.isArray(r.mastr_regions) ? r.mastr_regions[0] : r.mastr_regions;
      const email = r.rollen_email.toLowerCase();
      out.push({ region_id: r.region_id, name: reg?.name ?? r.region_id, email, domain: email.split("@")[1] ?? "" });
    }
    if (data.length < 1000) break;
  }
  return out;
}

type Befund = {
  art: Ruecklaufart;
  von: string;
  betreff: string;
  region_id: string | null;
  name: string | null;
};

async function main(): Promise<void> {
  loadEnvFile();
  const host = process.env.OUTREACH_IMAP_HOST;
  const user = process.env.OUTREACH_IMAP_USER;
  const pass = process.env.OUTREACH_IMAP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "OUTREACH_IMAP_HOST/USER/PASS fehlen — ohne Postfach-Zugang lässt sich nicht sagen, ob Rückläufer da sind. " +
        "Nicht dasselbe wie „keine Rückläufer\".",
    );
  }
  const port = parseInt(process.env.OUTREACH_IMAP_PORT ?? "993", 10);
  const tage = parseInt(arg("tage") ?? "7", 10);
  const seit = new Date(Date.now() - tage * 86400_000);

  const db = await makeClient();
  const ziele = await angeschriebene(db);
  const perDomain = new Map<string, { region_id: string; name: string }[]>();
  for (const z of ziele) {
    const arr = perDomain.get(z.domain);
    if (arr) arr.push({ region_id: z.region_id, name: z.name });
    else perDomain.set(z.domain, [{ region_id: z.region_id, name: z.name }]);
  }
  log(`${ziele.length} angeschriebene Gemeinden als Zuordnungsbasis`);

  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({ host, port, secure: port === 993, auth: { user, pass }, logger: false });
  await client.connect();
  // AUCH DER JUNK-ORDNER. Der Spamfilter des Postfachs legt Zustellberichte
  // fremder Systeme regelmäßig dorthin; die betroffenen Gemeinden blieben sonst
  // dauerhaft als „kontaktiert" stehen, ohne dass jemand den Bounce sieht.
  const ordner = ["INBOX", "INBOX.Junk", "Junk", "Spam"];

  const befunde: Befund[] = [];
  const unklar: Befund[] = [];
  for (const name of ordner) {
    let lock;
    try {
      lock = await client.getMailboxLock(name);
    } catch {
      continue; // Ordner gibt es bei diesem Anbieter nicht — kein Fehler.
    }
    try {
    for await (const msg of client.fetch({ since: seit }, { envelope: true, source: true, headers: true })) {
      const roh = String(msg.source ?? "");
      const von = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
      const betreff = msg.envelope?.subject ?? "";
      // Kopfzeilen und Text grob trennen — für die Einordnung reicht das; ein
      // vollständiger MIME-Parser wäre eine zweite Abhängigkeit für nichts.
      const trenner = roh.indexOf("\r\n\r\n");
      const kopfRoh = trenner > 0 ? roh.slice(0, trenner) : roh.slice(0, 4000);
      const text = trenner > 0 ? roh.slice(trenner + 4) : "";
      const kopf: Record<string, string> = {};
      for (const zeile of kopfRoh.split(/\r?\n/)) {
        const m = zeile.match(/^([A-Za-z-]+):\s*(.*)$/);
        if (m) kopf[m[1].toLowerCase()] = m[2];
      }
      const mail: RohMail = { von, betreff, text, kopf };
      const art = ordneEin(mail);

      // Zuordnung: erst über die Absender-Domain, sonst über eine im Text
      // zitierte Empfängeradresse (Unzustellbarkeiten kommen vom eigenen
      // Mailserver, nicht von der Gemeinde).
      let treffer = perDomain.get(von.split("@")[1] ?? "") ?? [];
      if (treffer.length !== 1) {
        const gefunden = ziele.filter((z) => roh.toLowerCase().includes(z.email));
        treffer = gefunden.map((z) => ({ region_id: z.region_id, name: z.name }));
      }
      const b: Befund = {
        art,
        von,
        betreff,
        region_id: treffer.length === 1 ? treffer[0].region_id : null,
        name: treffer.length === 1 ? treffer[0].name : null,
      };
      if (b.region_id) befunde.push(b);
      else unklar.push(b);
    }
    } finally {
      lock.release();
    }
  }
  await client.logout();

  const zaehler: Record<string, number> = {};
  for (const b of befunde) zaehler[b.art] = (zaehler[b.art] ?? 0) + 1;
  log();
  log(`${befunde.length} zugeordnete Rückläufer der letzten ${tage} Tage: ${JSON.stringify(zaehler)}`);
  for (const b of befunde) log(`${b.art.padEnd(13)} ${b.name} — „${b.betreff}" (${b.von})`);
  if (unklar.length) {
    log();
    log(`${unklar.length} nicht zuzuordnen — bitte selbst ansehen:`, "warn");
    for (const b of unklar) log(`${b.art.padEnd(13)} ${b.von} — „${b.betreff}"`);
  }

  if (!hat("schreiben")) {
    log();
    log("Nichts geschrieben. Zum Nachtragen: --schreiben", "warn");
    return;
  }

  let geschrieben = 0;
  for (const b of befunde) {
    const status = STATUS_ZU_ART[b.art];
    if (!status || !b.region_id) continue;
    const patch: Record<string, unknown> = { outreach_status: status, updated_at: new Date().toISOString() };
    if (status === "geantwortet") patch.responded_at = new Date().toISOString();
    // Die Notiz sagt, WORAUS der Status entstanden ist. Ein „gesperrt" ohne
    // Beleg ist später nicht mehr von einem Versehen zu unterscheiden.
    patch.notes = `[${new Date().toISOString().slice(0, 10)}] ${b.art} aus Postfach: „${b.betreff}" (${b.von})`;
    const { error } = await db.from("kommunen_kontakt").update(patch).eq("region_id", b.region_id);
    if (error) log(`${b.name}: ${error.message}`, "err");
    else geschrieben++;
  }
  log(`${geschrieben} Gemeinden nachgetragen`, "ok");
}

main().catch((e) => {
  log((e as Error).message, "err");
  process.exit(1);
});
