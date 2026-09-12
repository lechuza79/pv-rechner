import { readMail } from "./lib/read-mail";
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
 *   npm run kommunen:ruecklauf -- --melden     Befund an die Ablage/Mail geben
 *   npm run kommunen:ruecklauf -- --tage=14    Zeitraum (Standard 7)
 *
 * Der tägliche Lauf in GitHub Actions setzt alle drei; von Hand gestartet
 * meldet er nichts, damit ein Probelauf keine Mail auslöst.
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
import { ordneEin, notizZeile, notizMitText, STATUS_ZU_ART, type Ruecklaufart, type RohMail } from "../lib/outreach-ruecklauf";
import { berichtAblegen } from "../lib/alert-senden";
import { ruecklaufBericht } from "../lib/outreach-ruecklauf-bericht";
import { heuteInBerlin } from "../lib/zeit";
import { istAntwortAufSachfrage } from "../lib/outreach-sachfrage";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// DAS POSTFACH IST NICHT NUR FÜR DEN OUTREACH DA.
//
// hey@solar-check.io steht auch bei Dritten als Kontaktadresse (Awin), deren
// Nachrichten jeden Lauf in der Liste „bitte selbst ansehen" auftauchen. Eine
// Liste, die zur Hälfte aus Bekanntem besteht, liest irgendwann niemand mehr —
// dieselbe Erfahrung wie beim Förder-Screening.
//
// ENG HALTEN: nur Absender-Domains, von denen sicher keine Gemeinde schreibt.
// Eine großzügige Liste macht die Prüfung wertlos, ohne dass es auffällt.
// Aufgenommen wird nur, was am echten Postfach als wiederkehrender Fehltreffer
// GEMESSEN wurde (09.09.2026, 30-Tage-Abruf): die drei Affiliate-Plattformen,
// bei denen das Projekt angemeldet ist. Sie schrieben zusammen neun Mails, jede
// davon als „Antwort" eingestuft und keiner Gemeinde zuzuordnen.
//
// NICHT aufgenommen: Hersteller und Behörden (Solakon, IT.NRW). Von dort kann
// etwas Inhaltliches kommen, und eine Ausblendung, die einmal zu weit ging,
// merkt niemand mehr.
const FREMD_ABSENDER = ["awin.com", "mail.awin.com", "adcell.de", "goaffpro.com"];

function istFremdverkehr(von: string): boolean {
  const domain = von.split("@")[1]?.toLowerCase() ?? "";
  return FREMD_ABSENDER.includes(domain);
}

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
      .select("region_id, sent_to, rollen_email, presse_email, notes, mastr_regions!inner(name)")
      .not("contacted_at", "is", null)
      .order("region_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data as unknown as { region_id: string; sent_to: string | null; rollen_email: string | null; presse_email: string | null; notes: string | null; mastr_regions: { name: string } | { name: string }[] }[]) {
      const reg = Array.isArray(r.mastr_regions) ? r.mastr_regions[0] : r.mastr_regions;
      // New sends have an immutable recipient. Legacy notes can retain repaired bounce addresses.
      const addresses = r.sent_to ? [r.sent_to] : [r.rollen_email, r.presse_email, ...((r.notes ?? "").match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [])];
      for (const address of new Set(addresses.filter((x): x is string => !!x))) {
        const email = address.toLowerCase();
        if (email.endsWith("@solar-check.io")) continue;
        out.push({ region_id: r.region_id, name: reg?.name ?? r.region_id, email, domain: email.split("@")[1] ?? "" });
      }
    }
    if (data.length < 1000) break;
  }
  return out;
}

type Befund = {
  art: Ruecklaufart;
  von: string;
  betreff: string;
  /**
   * Der Tag, an dem die Mail ANKAM — nicht der Tag, an dem wir nachgesehen
   * haben. Beides zu verwechseln ist dieselbe Fehlerklasse wie das erfundene
   * Förder-Prüfdatum: Der Verlauf behauptet sonst, eine Antwort sei an dem Tag
   * eingegangen, an dem zufällig ein Abruf lief.
   */
  datum: string;
  region_id: string | null;
  name: string | null;
  /**
   * Der Rohtext der Mail — was davon aufgehoben wird, entscheidet
   * `notizMitText` (eigener Teil ohne Zitat, gekürzt).
   *
   * Bis zum 26.08.2026 gab es dieses Feld nicht, und damit war der Inhalt jeder
   * Antwort nach dem Lauf verloren: gespeichert wurde nur, DASS jemand
   * geschrieben hat. Bei Nidda kostete das drei Links, einen Hinweis auf den
   * Newsletter mit den Programm-Neuauflagen und den Vier-Jahres-Ertrag einer
   * echten Anlage.
   */
  text: string;
};

/**
 * Antworten auf die Sachfragen an Förderstellen nachtragen.
 *
 * WARUM HIER UND NICHT IN EINEM EIGENEN LAUF: Es gibt genau ein Postfach und
 * genau einen Weg, es zu lesen. Ein zweiter Abruf wäre eine zweite Fassung
 * derselben Mechanik — und die läuft irgendwann auseinander, während beide
 * behaupten, vollständig zu sein.
 *
 * Ohne diesen Schritt bliebe im Protokoll JEDE Anfrage für immer „ohne
 * Antwort". Das ist schlimmer als keine Auswertung: Es sähe aus wie eine
 * Messung und wäre eine Konstante.
 */
async function foerderAnfragenZuordnen(
  db: Awaited<ReturnType<typeof makeClient>>,
  mails: { von: string; betreff: string; roh: string; datum: string; text: string }[],
  schreiben: boolean,
): Promise<void> {
  const { ordneAnfrageZu } = await import("../lib/funding-anfragen");
  const { data, error } = await db
    .from("funding_anfragen")
    .select("program_id, empfaenger, betreff, gesendet_am, antwort_am, antwort_art")
    .is("antwort_am", null);
  if (error) {
    // Kein Abbruch: Der Kommunen-Rücklauf ist der Hauptzweck dieses Laufs und
    // darf nicht an einer Tabelle scheitern, die es womöglich noch nicht gibt.
    log(`Förder-Anfragen nicht lesbar (${error.message}) — übersprungen.`, "warn");
    return;
  }
  const offene = (data ?? []).map((z) => ({
    programId: z.program_id as string,
    empfaenger: z.empfaenger as string,
    gesendetAm: z.gesendet_am as string,
    antwortAm: null,
    antwortArt: null,
  }));
  if (!offene.length) return;
  const betreffe = new Map((data ?? []).map((z) => [z.program_id as string, z.betreff as string]));

  const treffer: { programId: string; datum: string; von: string; text: string }[] = [];
  for (const m of mails) {
    const id = ordneAnfrageZu(m, offene, betreffe);
    if (id) treffer.push({ programId: id, datum: m.datum, von: m.von, text: m.text });
  }

  log();
  log(`Offene Sachfragen an Förderstellen: ${offene.length}, davon beantwortet in diesem Zeitraum: ${treffer.length}`);
  for (const t of treffer) log(`${t.programId} — Antwort von ${t.von} am ${t.datum}`);
  if (!schreiben || !treffer.length) return;

  for (const t of treffer) {
    const { error: e } = await db
      .from("funding_anfragen")
      .update({
        // Der Tag der ANTWORT, nicht der des Abrufs — dieselbe Trennung wie
        // beim Kommunen-Rücklauf.
        antwort_am: new Date(`${t.datum}T12:00:00Z`).toISOString(),
        antwort_art: "antwort",
        // Der eigene Teil ohne Zitat: Was die Stelle wirklich geschrieben hat,
        // ist die Auskunft, wegen der gefragt wurde. Sie später nur als „hat
        // geantwortet" vorzufinden wäre derselbe Verlust wie bei Nidda.
        antwort_notiz: t.text.slice(0, 2000),
      })
      .eq("program_id", t.programId)
      .is("antwort_am", null);
    if (e) log(`${t.programId}: ${e.message}`, "err");
  }
  log(`${treffer.length} ${treffer.length === 1 ? "Antwort" : "Antworten"} an Förder-Anfragen nachgetragen`, "ok");
}

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
  log(`${new Set(ziele.map(z => z.region_id)).size} angeschriebene Gemeinden als Zuordnungsbasis`);

  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({ host, port, secure: port === 993, auth: { user, pass }, logger: false });
  await client.connect();
  // AUCH DER SPAM-ORDNER. Der Filter des Postfachs legt Zustellberichte fremder
  // Systeme regelmäßig dorthin; die betroffenen Gemeinden blieben sonst
  // dauerhaft als „kontaktiert" stehen, ohne dass jemand den Bounce sieht.
  //
  // Die Namen sind am 19.08.2026 am echten Postfach abgelesen (All-Inkl:
  // INBOX, Gesendet, Entwürfe, Archiv, Spam, Papierkorb). Die beiden anderen
  // Schreibweisen stehen als Rückfallebene für ein anderes Postfach; einen
  // Ordner, den es nicht gibt, überspringt die Schleife ohne Fehler.
  const ordner = ["INBOX", "Spam", "Junk", "INBOX.Spam"];

  const befunde: Befund[] = [];
  const unklar: Befund[] = [];
  const fremd: Befund[] = [];
  /** Antworten auf die Sachfragen an Förderstellen — nicht auf unseren Brief. */
  const sachfragen: Befund[] = [];
  /** Jede gelesene Mail — Grundlage für die Zuordnung zu Förder-Sachfragen. */
  const alleMails: { von: string; betreff: string; roh: string; datum: string; text: string }[] = [];
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
      const parsed = await readMail(msg.source ?? Buffer.from(roh));
      const text = parsed.text;
      const mail: RohMail = { ...parsed, von, betreff };
      const art = ordneEin(mail);

      // Zuordnung: erst über die Absender-Domain, sonst über eine im Text
      // zitierte Empfängeradresse (Unzustellbarkeiten kommen vom eigenen
      // Mailserver, nicht von der Gemeinde).
      let treffer = [...new Map((perDomain.get(von.split("@")[1] ?? "") ?? []).map(x => [x.region_id, x])).values()];
      if (treffer.length !== 1) {
        const gefunden = ziele.filter((z) => (roh + "\n" + text).toLowerCase().includes(z.email));
        treffer = [...new Map(gefunden.map(z => [z.region_id, { region_id: z.region_id, name: z.name }])).values()];
      }
      // DASSELBE POSTFACH TRÄGT ZWEI GESPRÄCHE: die Antworten auf den
      // Kommunen-Brief und die auf die Sachfragen an Förderstellen
      // (scripts/funding-anfrage.ts). Letztere kommen oft von Orten, die nie
      // einen Brief bekommen haben — sie landen hier also in „nicht
      // zuzuordnen", wenn niemand sie mitliest. Deshalb wird JEDE Mail
      // aufgehoben, nicht nur die zuordenbaren.
      alleMails.push({ von, betreff, roh, datum: heuteInBerlin(msg.envelope?.date ?? new Date()), text });

      const b: Befund = {
        art,
        von,
        betreff,
        // Deutscher Kalendertag — der Tag, an dem die Antwort hier ankam, wird
        // von Menschen in Deutschland gelesen (siehe lib/zeit.ts).
        datum: heuteInBerlin(msg.envelope?.date ?? new Date()),
        region_id: treffer.length === 1 ? treffer[0].region_id : null,
        name: treffer.length === 1 ? treffer[0].name : null,
        text,
      };
      // EINE ANTWORT AUF EINE SACHFRAGE IST KEINE ANTWORT AUF DEN BRIEF.
      //
      // Beide Gespräche laufen über dasselbe Postfach UND dieselben
      // Amtsadressen: Gemessen am 10.09.2026 tragen 64 der 289 angeschriebenen
      // Gemeinden ein Förderprogramm im Katalog, im offenen Topf 19 von 175.
      // Ohne diese Weiche verbucht der Lauf die Antwort einer Förderstelle als
      // Reaktion auf unser Anschreiben — setzt den Status, schreibt den
      // Zeitstempel und meldet eine ENTSCHEIDUNG, die es nicht gibt. Damit wäre
      // ausgerechnet die einzige Kennzahl verdorben, an der wir den Erfolg des
      // Briefes ablesen.
      //
      // Sie fliegt NICHT aus der Liste, sondern wird eigens gezählt: Eine
      // stumme Ausblendung wäre von einem leeren Postfach nicht zu
      // unterscheiden. Der nachgelagerte Schritt trägt sie ihrer Sachfrage
      // nach; ihm wird jede Mail gereicht, auch diese.
      if (istAntwortAufSachfrage({ betreff, roh })) sachfragen.push(b);
      else if (b.region_id) befunde.push(b);
      else if (istFremdverkehr(von)) fremd.push(b);
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
  // Gezählt, nicht verschwunden: Wer die Liste kürzt, muss sagen, um wie viel.
  // Sonst ist eine zu weit geratene Ausblendung von einem leeren Postfach nicht
  // zu unterscheiden — und genau das soll die Liste ja beantworten.
  if (fremd.length) {
    log();
    log(`${fremd.length} Mails gehören nicht zum Outreach (${FREMD_ABSENDER.join(", ")}) — ausgeblendet.`);
  }
  // Gezählt statt stumm übergangen: Eine ausgeblendete Antwort und ein leeres
  // Postfach sähen sonst gleich aus. Der nachgelagerte Schritt trägt sie ihrer
  // Sachfrage nach — hier steht nur, dass sie nicht zum Brief gehören.
  if (sachfragen.length) {
    log();
    log(
      `${sachfragen.length} ${sachfragen.length === 1 ? "Antwort" : "Antworten"} auf eine Sachfrage an eine Förderstelle — ` +
        `nicht als Brief-Rückmeldung gewertet:`,
    );
    for (const b of sachfragen) log(`    ${b.name ?? b.von} — „${b.betreff}"`);
  }

  await foerderAnfragenZuordnen(db, alleMails, hat("schreiben"));

  if (!hat("schreiben")) {
    log();
    log("Nichts geschrieben. Zum Nachtragen: --schreiben", "warn");
    return;
  }

  let geschrieben = 0;
  const geschriebeneOrte: string[] = [];
  // Die BEFUNDE, nicht nur ihre Kennungen: Der Tagesbericht muss sagen, WER
  // was geschrieben hat — eine Liste von Ortsschlüsseln liest niemand.
  const neueBefunde: Befund[] = [];
  for (const b of befunde) {
    const status = STATUS_ZU_ART[b.art];
    if (!status || !b.region_id) continue;
    const patch: Record<string, unknown> = { outreach_status: status, updated_at: new Date().toISOString() };
    // Der Tag der ANTWORT, nicht der des Abrufs — sonst misst jede Auswertung
    // der Antwortzeit in Wahrheit, wann zuletzt jemand ins Postfach gesehen hat.
    // Bei Nidda ergab das 98 Stunden statt der tatsaechlichen vier.
    if (status === "geantwortet") patch.responded_at = new Date(`${b.datum}T12:00:00Z`).toISOString();
    // Die Notiz sagt, WORAUS der Status entstanden ist. Ein „gesperrt" ohne
    // Beleg ist später nicht mehr von einem Versehen zu unterscheiden.
    //
    // ANGEHÄNGT, NICHT ERSETZT: Vorher überschrieb jede neue Rückmeldung den
    // Beleg der vorigen — ausgerechnet den, den dieser Kommentar sichern will.
    const { data: vorher } = await db
      .from("kommunen_kontakt")
      .select("notes")
      .eq("region_id", b.region_id)
      .maybeSingle();
    const neueNotiz = notizZeile({
      datum: b.datum,
      art: b.art,
      betreff: b.betreff,
      von: b.von,
    });
    // NUR EINMAL EINTRAGEN.
    //
    // Der Lauf sieht dasselbe Postfach jeden Tag an und findet dieselbe Antwort
    // wieder. Ohne diese Pruefung waechst die Notiz bei jedem Lauf um eine
    // identische Zeile — nach einer Woche steht dieselbe Rueckmeldung siebenmal
    // da und sieht aus wie sieben. Genau so ist es Nidda ergangen.
    //
    // Verglichen wird die fertige Zeile: Sie traegt Datum, Art, Betreff und
    // Absender. Eine echte zweite Antwort am selben Tag kommt durch, weil ihr
    // Betreff sich unterscheidet.
    if ((vorher?.notes ?? "").split("\n").includes(neueNotiz)) continue;
    // Verglichen wird die ZEILE, angehängt wird Zeile PLUS Text (26.08.2026).
    // Die Dublettenprüfung darf den Textblock nicht mitlesen: Sie sucht
    // zeilenweise, und ein mehrzeiliger Block hätte nie eine Übereinstimmung
    // ergeben — dieselbe Antwort stünde nach einer Woche siebenmal da, also
    // genau der Fehler, den die Prüfung verhindern soll.
    const neuerEintrag = notizMitText(
      { datum: b.datum, art: b.art, betreff: b.betreff, von: b.von },
      b.text,
    );
    patch.notes = vorher?.notes ? `${vorher.notes}\n${neuerEintrag}` : neuerEintrag;
    // „GESPERRT" IST EINE EINBAHNSTRASSE.
    //
    // Ohne diese Bedingung hob die nächste Mail derselben Stelle den Widerspruch
    // wieder auf: erst „bitte keine weiteren Nachrichten" → gesperrt, zwei Tage
    // später eine Rückfrage → geantwortet, und die Gemeinde stünde beim nächsten
    // Schub wieder auf der Liste. Innerhalb eines Laufs hätte sogar die
    // Reihenfolge der Befunde entschieden.
    const { error } = await db
      .from("kommunen_kontakt")
      .update(patch)
      .eq("region_id", b.region_id)
      .neq("outreach_status", "gesperrt");
    if (error) log(`${b.name}: ${error.message}`, "err");
    else {
      geschrieben++;
      geschriebeneOrte.push(b.region_id);
      neueBefunde.push(b);
    }
  }
  // Singular mitbauen: „1 Gemeinden nachgetragen" ist derselbe Fehler wie
  // „1 neue Anlagen" im Atlas — Grammatik ist Teil der Richtigkeit.
  // Gemeinden zaehlen, nicht Schreibvorgaenge. Drei Mails aus Nidda meldeten
  // vorher „3 Gemeinden nachgetragen" — es war eine.
  const orte = new Set(geschriebeneOrte).size;
  log(
    `${geschrieben} ${geschrieben === 1 ? "Rückmeldung" : "Rückmeldungen"} nachgetragen ` +
      `(${orte} ${orte === 1 ? "Gemeinde" : "Gemeinden"})`,
    "ok",
  );

  // ─── Melden ────────────────────────────────────────────────────────────────
  //
  // OHNE DIESEN TEIL IST DER LAUF EIN SELBSTGESPRÄCH. Er trug den Status
  // zuverlässig nach und endete im Protokoll eines Terminals; die eine Antwort
  // aus Trier lag darin genauso unsichtbar wie vierzehn Urlaubsnotizen.
  //
  // Die Bremse ist ausdrücklich: Ohne `--melden` geht nichts an die Ablage. Ein
  // Probelauf von Hand soll keine Mail auslösen — und eine Option, die man
  // setzen MUSS, ist ehrlicher als eine Automatik, die am Vorhandensein eines
  // Geheimnisses hängt und sich beim Fehlen stillschweigend abschaltet.
  if (!hat("melden")) return;
  const bericht = ruecklaufBericht({
    neu: neueBefunde.map((b) => ({
      art: b.art,
      name: b.name,
      betreff: b.betreff,
      von: b.von,
      datum: b.datum,
    })),
    unklar: unklar.length,
    tage,
  });
  log();
  await berichtAblegen(
    {
      tag: "kommunen-ruecklauf",
      subject: "Kommunen-Outreach: Rücklauf",
      audience: bericht.audience,
      decisions: bericht.decisions,
      done: bericht.done,
      details: bericht.details,
    },
    process.env.CRON_SECRET ?? "",
    { basis: process.env.ALERT_BASE_URL, log: (z) => log(z) },
  );
}

main().catch((e) => {
  log((e as Error).message, "err");
  process.exit(1);
});
