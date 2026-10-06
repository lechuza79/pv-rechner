/**
 * Kommunen-Anschreiben verschicken — gedrosselt, protokolliert, mit Bremsen.
 *
 * Der Brief selbst wird NICHT hier gebaut. Er kommt fertig aus
 * /api/admin/kommunen/versandpaket, also aus derselben Funktion, die das
 * Cockpit zeigt (lib/kommunen-brief.ts). Dieses Skript ist der Briefträger: Es
 * prüft, ob heute überhaupt gesendet werden darf, schickt langsam, und schreibt
 * sofort mit, was hinausgegangen ist.
 *
 * Nutzung:
 *   npm run kommunen:versand -- --liste                      Schub-Liste ansehen
 *   npm run kommunen:versand -- --vorschau --n=5             fünf echte Briefe lesen
 *   npm run kommunen:versand -- --pruefen                    VORFLUG: alle Bremsen ohne Senden,
 *                                                        endet mit BEREIT / NICHT BEREIT
 *   npm run kommunen:versand -- --test=adresse@example.org   EINE Probemail an sich selbst
 *   npm run kommunen:versand -- --senden --limit=20
 *                                                        Geprüften Schub senden
 *
 * Voraussetzungen: SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET sowie für
 * das Senden OUTREACH_SMTP_HOST/PORT/USER/PASS und OUTREACH_MAIL_FROM — alle
 * aus .env.local. Das Postfach-Passwort trägt der Betreiber selbst dort ein.
 *
 * DIE BREMSEN, jede aus einem Grund:
 *   · Schulferien des Ziel-Bundeslands  → lib/schulferien.ts
 *   · Wochentag Di–Do                   → montags liegt das Wochenende im Postfach,
 *                                         freitags liest es niemand mehr
 *   · Höchstmenge je Lauf               → lib/outreach-mail.ts (MAX_JE_LAUF)
 *   · Pause zwischen zwei Mails         → Zustellbarkeit, nicht Höflichkeit
 *   · Pflichtangaben im Text            → Klarname, Impressum, Art. 14 DSGVO
 *   · verbotener Anbieter / fremder Absender → lib/outreach-mail.ts
 *
 * KEIN NACHFASSEN. Wer nicht antwortet, wird nicht erinnert — das ist die
 * Zusage, mit der die ganze Aussendung rechtlich vertretbar ist.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import {
  leseSmtpKonfig,
  fehlendePflichtangaben,
  platzhalterLoecher,
  postfachBefund,
  mailKopfzeilen,
  adresseAus,
  PAUSE_MS,
  MAX_JE_LAUF,
  zustellprobeAdressen,
} from "../lib/outreach-mail";
import { versandfenster } from "../lib/schulferien";
import { kommunenVersandtag } from "../lib/kommunen-versandtag";
import { SCHUEBE, AKTUELLER_SCHUB } from "../lib/kommunen-testballon";
import { berlinOffset, heuteInBerlin } from "../lib/zeit";
import { execFileSync } from "node:child_process";
import { v2Urteil, type V2Urteil } from "../lib/contact-v2-gate";
import { RECHECK_MAX_AGE_DAYS, REPO_ROOT, outDir, rulesVersion } from "./lib/contact-v2-config";
import { handbelegLesen, handbelegNachpruefen } from "./lib/handbelege";
import { indexierbarBefund } from "../lib/verlinkte-seiten";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROTOKOLL_DIR = resolve(SCRIPT_DIR, ".cache", "versand");

// ─── Log ──────────────────────────────────────────────────────────────────────

function log(msg = "", level: "info" | "ok" | "err" | "warn" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : level === "warn" ? "! " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

// ─── Env ──────────────────────────────────────────────────────────────────────

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

// ─── Versandpaket holen ───────────────────────────────────────────────────────

type Brief = {
  region_id: string;
  name: string;
  empfaenger: string;
  /** Kind of mailbox (climate contact, press, general) — stored with the send. */
  empfaenger_rolle: string;
  subject: string;
  body: string;
  /** Dieselbe Nachricht als HTML, mechanisch aus dem Text erzeugt. */
  body_html: string;
  variante: string;
  /** Press letter (with placement) or short info letter (without). */
  briefart?: "platzierung" | "info";
  /** Belegte Domain der gemeinsamen Verwaltung, für die Empfängerprüfung. */
  verwaltung_domain: string | null;
  seite_url: string | null;
  rangliste_url: string | null;
  stand: string;
};

type Paket = {
  schub: string;
  kampagne: string;
  charge: number;
  heute: string;
  inCharge: number;
  paket: Brief[];
  uebersprungen: { region_id: string; name: string | null; grund: string }[];
};

async function holePaket(basis: string, schub: string, charge: number, limit: number): Promise<Paket> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET fehlt — ohne ihn gibt der Endpunkt nichts heraus.");
  const url = `${basis}/api/admin/kommunen/versandpaket?schub=${encodeURIComponent(schub)}&charge=${charge}&limit=${limit}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  if (!res.ok) throw new Error(`Versandpaket ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as Paket;
}

// ─── Bremsen ──────────────────────────────────────────────────────────────────

/** Alle Bremsen für einen einzelnen Brief. Leeres Ergebnis = darf hinaus. */
function bremsen(b: Brief, heute: string, kontakt?: V2Urteil): string[] {
  const gruende: string[] = [];
  // Die Kontaktsuche muss den Empfänger belegt und eben nachgeprüft haben.
  if (!kontakt) gruende.push("keine Kontaktprüfung für diesen Empfänger");
  else if (!kontakt.ok) gruende.push(`Kontaktprüfung: ${kontakt.grund}`);
  const fenster = versandfenster(b.region_id.slice(0, 2), heute);
  if (!fenster.frei) gruende.push(fenster.grund);
  const fehlt = fehlendePflichtangaben(b.body);
  if (fehlt.length) gruende.push(`Pflichtangaben fehlen: ${fehlt.join(", ")}`);
  const loecher = platzhalterLoecher(b.subject, b.body, b.body_html);
  if (loecher.length) gruende.push(`leerer Platzhalter im Brief: ${loecher.join(", ")}`);
  // Auch hier, obwohl das Paket es schon geprüft hat: Es ist die einzige
  // Bremse, die entscheidet, ob eine natürliche Person angeschrieben wird, und
  // die einzige, die bis eben nur an einer Stelle stand.
  const postfach = postfachBefund(b.empfaenger, b.name, b.verwaltung_domain, { belegteRolle: kontakt?.ok === true && kontakt.belegteRolle });
  if (!postfach.ok) gruende.push(postfach.grund);
  // Verlinkt der Brief auf eine Seite, die für Suchmaschinen gesperrt BLEIBT?
  //
  // Der Versand schaltet die Ortsseite normalerweise frei
  // (lib/atlas-outreach-freigabe.ts). Orte mit eigener Förderseite sind davon
  // ausgenommen — dort stünden sonst zwei eigene Seiten auf denselben Anfragen.
  // Der Brief zeigt aber trotzdem dorthin. Das ist derselbe Widerspruch, der am
  // 29.08.2026 aufgefallen ist, nur andersherum: eine Seite anbieten und
  // gleichzeitig sperren.
  //
  // HIER STAND EINE BREMSE, DEREN VORAUSSETZUNG ES NICHT MEHR GIBT.
  //
  // Sie meldete: „Dieser Ort hat eine eigene Förderseite, seine Atlas-Ortsseite
  // bleibt deshalb gesperrt." Diese Ausnahme wurde am 29.08.2026 abgeschafft
  // (Begründung in lib/atlas-outreach-freigabe.ts: Googles Site-Diversity-Regel
  // schließt das befürchtete Risiko aus, und die Ausnahme kostete eine zweite
  // Datenquelle im Seitenaufbau). Die Ortsseite geht seitdem mit dem Versand
  // live, ganz gleich ob der Ort eine Förderseite hat.
  //
  // Die Bremse beschrieb also einen Zustand, den es seit fünf Tagen nicht mehr
  // gibt — und hielt am 03.09.2026 Düsseldorf und Ennepetal zurück, die größte
  // Stadt des NRW-Schubs darunter. Wer eine Regel abschafft, sucht die Stellen,
  // die sie noch behaupten.
  return gruende;
}

// ─── Ausgabe ──────────────────────────────────────────────────────────────────

function zeigeListe(p: Paket): void {
  log(`Schub „${p.schub}" · Kampagne ${p.kampagne} · Charge ${p.charge} · Stichtag ${p.heute}`);
  log(`${p.inCharge} Gemeinden in dieser Charge, ${p.paket.length} versandfertig`);
  log();
  for (const [i, b] of p.paket.entries()) {
    log(`${String(i + 1).padStart(2)}. ${b.name} (${b.region_id})  →  ${b.empfaenger}`);
    log(`    Betreff: ${b.subject}  [${b.subject.length} Zeichen]`);
    log(`    Variante: ${b.variante} · Seite: ${b.seite_url ?? "—"}`);
  }
  if (p.uebersprungen.length) {
    log();
    log(`Übersprungen (${p.uebersprungen.length}):`, "warn");
    for (const u of p.uebersprungen) log(`    ${u.name ?? u.region_id}: ${u.grund}`);
  }
}

function zeigeVorschau(p: Paket, n: number): void {
  for (const b of p.paket.slice(0, n)) {
    log();
    log("═".repeat(78));
    log(`An:      ${b.empfaenger}   (${b.name}, ${b.region_id})`);
    log(`Betreff: ${b.subject}`);
    log("─".repeat(78));
    // eslint-disable-next-line no-console
    console.log(b.body);
    log("─".repeat(78));
    log(`Seite: ${b.seite_url ?? "—"}`);
    log(`Rangliste: ${b.rangliste_url ?? "—"}`);
  }
}

// ─── Senden ───────────────────────────────────────────────────────────────────

async function baueTransport() {
  const befund = leseSmtpKonfig(process.env);
  if (!befund.ok) {
    log("Versandweg nicht einsatzbereit:", "err");
    for (const f of befund.fehler) log(`    ${f}`, "err");
    throw new Error("SMTP-Konfiguration unvollständig oder unzulässig");
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: befund.konfig.host,
    port: befund.konfig.port,
    secure: befund.konfig.port === 465,
    auth: { user: befund.konfig.user, pass: befund.konfig.pass },
  });
  // Verbindung und Anmeldung PRÜFEN, bevor die erste Mail gebaut wird. Ohne das
  // scheitert der Lauf an Mail 1 von 20 und hinterlässt eine halbe Charge.
  await transport.verify();
  return { transport, konfig: befund.konfig };
}

function protokolliere(name: string, inhalt: unknown): string {
  mkdirSync(PROTOKOLL_DIR, { recursive: true });
  const pfad = resolve(PROTOKOLL_DIR, name);
  writeFileSync(pfad, JSON.stringify(inhalt, null, 2), "utf8");
  return pfad;
}

/**
 * Ist DKIM überhaupt aktiv?
 *
 * SPF bricht bei JEDER Weiterleitung, DKIM überlebt sie — und diese
 * Empfängerliste besteht überwiegend aus kleinen Ortsgemeinden, deren
 * `info@`-Adresse an ein anderes Postfach weitergeleitet wird. Ohne DKIM heißt
 * das am Zielsystem `spf=fail, dkim=none, dmarc=fail`, bei einer Absenderdomain,
 * die dort noch nie etwas geschickt hat.
 *
 * DER SELEKTOR MUSS ANGEGEBEN WERDEN, ER LÄSST SICH NICHT RATEN.
 *
 * Erste Fassung fragte fest `default._domainkey` ab — der Konvention nach der
 * naheliegende Name. All-Inkl vergibt aber einen datierten eigenen Selektor
 * (`kas202603240809`), und die Zone von solar-check.io trägt zusätzlich einen
 * Wildcard-Eintrag: Damit ANTWORTET jede beliebige Selektor-Abfrage, nur eben
 * mit dem Wildcard-Ziel statt mit einem Schlüssel. Das Ergebnis las sich wie
 * „DKIM ist halb eingerichtet und kaputt", während es in Wahrheit längst lief.
 *
 * Eine geratene Prüfung ist schlimmer als keine: Sie behauptet einen Befund.
 * Deshalb kommt der Selektor aus der Umgebung (`OUTREACH_DKIM_SELECTOR`, mehrere
 * durch Komma getrennt), und ohne Angabe verweigert die Prüfung die Aussage.
 * Zu finden im KAS unter Tools → DNS-Einstellungen: der TXT-Eintrag, dessen
 * Name auf `._domainkey` endet und dessen Wert mit `v=DKIM1` beginnt.
 */
/**
 * Selectors All-Inkl has used for solar-check.io, newest first. A selector is
 * public DNS, not a secret, so it may live in code. All-Inkl ROTATES the key
 * under a new dated name and drops the old record: on 20.09.2026
 * kas202603240809 became kas202609200150, and the first run after that (06.10.)
 * stopped here because only the old name was configured. When the check fails
 * again, look up the new name (KAS → Tools → DNS-Einstellungen → solar-check.io,
 * TXT record ending in ._domainkey) and add it at the top.
 */
const BEKANNTE_DKIM_SELEKTOREN = ["kas202609200150", "kas202603240809"];

async function dkimAktiv(domain: string): Promise<{ ok: boolean; hinweis: string }> {
  const selektoren = [
    ...(process.env.OUTREACH_DKIM_SELECTOR ?? "").split(",").map((s) => s.trim()),
    ...BEKANNTE_DKIM_SELEKTOREN,
  ].filter((s, i, a) => s && a.indexOf(s) === i);
  if (!selektoren.length) {
    return {
      ok: false,
      hinweis:
        "OUTREACH_DKIM_SELECTOR ist nicht gesetzt — welcher Selektor signiert, lässt sich nicht raten " +
        "(ein Wildcard-DNS-Eintrag beantwortet jede Abfrage). Im KAS unter Tools → DNS-Einstellungen den " +
        "TXT-Eintrag suchen, dessen Name auf ._domainkey endet, und den Teil davor eintragen.",
    };
  }
  for (const sel of selektoren) {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${sel}._domainkey.${domain}&type=TXT`, {
        headers: { accept: "application/dns-json" },
      });
      const json = (await res.json()) as { Answer?: { data: string }[] };
      // Der Wert MUSS `v=DKIM1` enthalten — ein Wildcard-Treffer tut das nicht.
      if ((json.Answer ?? []).some((a) => a.data.includes("v=DKIM1"))) {
        return { ok: true, hinweis: `DKIM-Schlüssel veröffentlicht (Selektor ${sel})` };
      }
    } catch (e) {
      return { ok: false, hinweis: `DKIM ließ sich nicht prüfen (${(e as Error).message}) — im Zweifel nicht senden.` };
    }
  }
  return {
    ok: false,
    hinweis: `Unter ${selektoren.map((s) => `${s}._domainkey.${domain}`).join(", ")} steht kein Schlüssel mit v=DKIM1.`,
  };
}

/**
 * Sperre gegen einen zweiten gleichzeitigen Lauf.
 *
 * Der Lauf steht bei 18 Mails eine halbe Stunde lang stumm da. „Läuft der
 * noch?" und ein zweites Fenster sind der naheliegende Bedienfehler — und beide
 * Läufe holen dasselbe Paket, lesen beide „noch nicht kontaktiert" und senden
 * beide. Bis zu achtzehn Gemeinden bekämen den Brief zweimal innerhalb von
 * Minuten, bei einer Aussendung, deren Vertretbarkeit auf „kein Nachfassen"
 * beruht.
 */
function sperreNehmen(): () => void {
  mkdirSync(PROTOKOLL_DIR, { recursive: true });
  const pfad = resolve(PROTOKOLL_DIR, ".laeuft");
  try {
    writeFileSync(pfad, `${process.pid} ${new Date().toISOString()}\n`, { flag: "wx" });
  } catch {
    const wer = existsSync(pfad) ? readFileSync(pfad, "utf8").trim() : "unbekannt";
    throw new Error(
      `Es läuft bereits ein Versand (${wer}). Wenn das ein Überbleibsel ist: ${pfad} löschen.`,
    );
  }
  return () => {
    try {
      rmSync(pfad);
    } catch {
      /* schon weg */
    }
  };
}

async function kontaktPruefung(briefe: Brief[]): Promise<Map<string, V2Urteil>> {
  const out = outDir();
  const urteile = new Map<string, V2Urteil>();
  // Proven by hand or by the follow-up search: recheck the publishing page here.
  const ueberContactSuche: Brief[] = [];
  for (const b of briefe) {
    const beleg = handbelegLesen(b.region_id);
    if (beleg && beleg.email.toLowerCase() === b.empfaenger.trim().toLowerCase()) {
      const recheck = await handbelegNachpruefen(b.region_id, beleg);
      if (!recheck.ok) console.log(`✗ ${b.region_id} ${b.empfaenger} — ${recheck.reason}`);
      // "now" AFTER the recheck: a check stamped later than "now" counts as negative age.
      urteile.set(b.region_id, v2Urteil(b.empfaenger, null, { ...recheck }, "", new Date(), RECHECK_MAX_AGE_DAYS, beleg));
    } else ueberContactSuche.push(b);
  }
  if (!ueberContactSuche.length) return urteile;
  const recipients = ueberContactSuche.map(b => ({ organizationId: b.region_id, email: b.empfaenger }));
  const file = resolve(out, `recheck-batch-${Date.now()}.json`);
  mkdirSync(out, { recursive: true });
  writeFileSync(file, JSON.stringify(recipients));
  try {
    execFileSync(resolve(REPO_ROOT, "node_modules/.bin/tsx"), [resolve(REPO_ROOT, "scripts/contact-municipal-v2.ts"), "--mode=recheck", `--recipients=${file}`], { stdio: "inherit", cwd: REPO_ROOT });
  } finally {
    rmSync(file, { force: true });
  }
  const read = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
  const rules = rulesVersion();
  const now = new Date();
  for (const b of ueberContactSuche) {
    urteile.set(b.region_id, v2Urteil(b.empfaenger, read(resolve(out, "results", `${b.region_id}.json`)), read(resolve(out, "recheck", `${b.region_id}.json`)), rules, now, RECHECK_MAX_AGE_DAYS));
  }
  return urteile;
}

async function senden(p: Paket, limit: number, pauseMs: number): Promise<void> {
  const sperreFrei = sperreNehmen();
  try {
    await sendenIntern(p, limit, pauseMs);
  } finally {
    sperreFrei();
  }
}

async function sendenIntern(p: Paket, limit: number, pauseMs: number): Promise<void> {
  // KONTAKTPRÜFUNG JE EMPFÄNGER, unmittelbar vor dem Versand: Die Seite, auf der
  // die Adresse steht, wird noch einmal abgerufen. Ersetzt die erste
  // Generation, die verlangte, dass bundesweit KEINE Gemeinde mehr offen ist —
  // ein Zustand, der nie eintrat und den Versand dauerhaft sperrte.
  const kontakt = await kontaktPruefung(p.paket.slice(0, limit));
  const { transport, konfig } = await baueTransport();
  const absenderDomain = adresseAus(konfig.from).split("@")[1];
  const dkim = await dkimAktiv(absenderDomain);
  if (!dkim.ok && !hat("ohne-dkim")) {
    log(dkim.hinweis, "err");
    log("Wenn es trotzdem sein muss (Probelauf an eigene Adressen): --ohne-dkim", "warn");
    transport.close();
    return;
  }
  log(dkim.hinweis, dkim.ok ? "ok" : "warn");
  const widerspruchAn = konfig.replyTo ?? adresseAus(konfig.from);
  const db = await makeClient();

  // TAGESPENSUM, nicht Laufpensum. Die Obergrenze begrenzte bisher nur den
  // einzelnen Lauf — zwei Chargen nacheinander ergaben 40 Mails an einem Tag,
  // ohne dass etwas angeschlagen hätte. Für ein Postfach ohne Sendehistorie ist
  // die Drosselung die halbe Zustellbarkeit.
  // Mit Zeitzonen-Angabe: Ohne sie liest Postgres den Zeitstempel als UTC, und
  // Mails zwischen Mitternacht und zwei Uhr zählten nicht mit.
  const tagesbeginn = `${heuteInBerlin()}T00:00:00${berlinOffset()}`;
  const { count: heuteSchon, error: zaehlFehler } = await db
    .from("kommunen_kontakt")
    .select("region_id", { count: "exact", head: true })
    .gte("contacted_at", tagesbeginn);
  // Auch hier: Ein Fehler machte die Bremse nicht vorsichtiger, sondern
  // schaltete sie ab (`count` null → `?? 0` → volles Pensum frei).
  if (zaehlFehler) {
    log(`Tagespensum nicht ermittelbar: ${zaehlFehler.message}`, "err");
    transport.close();
    return;
  }
  const rest = Math.max(0, MAX_JE_LAUF - (heuteSchon ?? 0));
  if (rest === 0) {
    log(`Heute sind bereits ${heuteSchon} Mails hinausgegangen — Tagespensum (${MAX_JE_LAUF}) erreicht.`, "warn");
    transport.close();
    return;
  }
  if (heuteSchon) log(`Heute schon ${heuteSchon} versendet — es bleiben ${rest}.`);
  const zuSenden = p.paket.slice(0, Math.min(limit, rest));
  // Der zuletzt verschickte Brief — Vorlage für die Zustellungsprobe am Ende.
  let letzterBrief: (typeof p.paket)[number] | null = null;
  log(`${zuSenden.length} Mails, Pause ${Math.round(pauseMs / 1000)} s — geschätzte Dauer ${Math.round((zuSenden.length * pauseMs) / 60000)} min`);
  log();

  const protokoll: Record<string, unknown>[] = [];
  let raus = 0;

  for (const [i, b] of zuSenden.entries()) {
    const halt = bremsen(b, p.heute, kontakt.get(b.region_id));
    if (halt.length) {
      log(`${b.name}: NICHT gesendet — ${halt.join(" · ")}`, "err");
      protokoll.push({ region_id: b.region_id, name: b.name, gesendet: false, grund: halt });
      continue;
    }
    // SPERRE UNMITTELBAR VOR DEM SENDEN NOCH EINMAL PRÜFEN. Das Paket wird
    // einmal geholt, der Lauf dauert bei 90 s Pause eine halbe Stunde. Ein
    // Widerspruch, der in dieser Zeit eingetragen wird, muss die Mail noch
    // aufhalten — die Sperre ist der eine Mechanismus, der nie danebengreifen
    // darf.
    const { data: jetzt, error: statusFehler } = await db
      .from("kommunen_kontakt")
      .select("outreach_status, contacted_at")
      .eq("region_id", b.region_id)
      .maybeSingle();
    // EIN LESEFEHLER IST KEIN GRÜNES LICHT. Vorher wurde der Fehler verworfen;
    // bei einem Netz-Aussetzer war `jetzt` undefined, beide Prüfungen fielen
    // durch, und die Mail ging hinaus — im schlimmsten Fall an eine Gemeinde,
    // die inzwischen widersprochen hatte, und der Status danach von „gesperrt"
    // auf „kontaktiert" überschrieben. Der Lauf dauert eine halbe Stunde, ein
    // Aussetzer darin ist nicht unwahrscheinlich.
    if (statusFehler || !jetzt) {
      log(`${b.name}: übersprungen — Status nicht lesbar (${statusFehler?.message ?? "keine Zeile"})`, "err");
      protokoll.push({ region_id: b.region_id, name: b.name, gesendet: false, grund: ["Status nicht lesbar"] });
      continue;
    }
    if (jetzt.outreach_status === "gesperrt" || jetzt.contacted_at) {
      log(`${b.name}: übersprungen — Status inzwischen „${jetzt.outreach_status}"`, "warn");
      protokoll.push({ region_id: b.region_id, name: b.name, gesendet: false, grund: ["Status geändert"] });
      continue;
    }
    try {
      // Für die Zustellungsprobe am Ende: der zuletzt tatsächlich verschickte
      // Brief. Ein eigens gebauter Testtext würde etwas anderes messen.
      letzterBrief = b;
      const info = await transport.sendMail({
        from: konfig.from,
        to: b.empfaenger,
        replyTo: konfig.replyTo,
        subject: b.subject,
        // BEIDE FASSUNGEN. Der Empfänger bekommt die, die sein Programm
        // bevorzugt; der Text ist dabei nicht die Notlösung, sondern die
        // Hauptfassung — das HTML unterscheidet sich allein durch den
        // abgesetzten Fuß. Eine Mail nur als HTML zu schicken ist bei einer
        // Erstansprache das schlechtere Signal.
        text: b.body,
        html: b.body_html,
        headers: mailKopfzeilen({ widerspruchAn }),
      });
      // ERST schreiben, dann weiter: Bricht der Lauf danach ab, ist die Mail
      // trotzdem draußen — eine Gemeinde, die als „offen" stehenbleibt, bekäme
      // sonst im nächsten Lauf dieselbe Mail ein zweites Mal.
      const { error } = await db
        .from("kommunen_kontakt")
        .update({
          outreach_status: "kontaktiert",
          contacted_at: new Date().toISOString(),
          channel: "mail",
          sent_to: b.empfaenger,
          sent_to_rolle: b.empfaenger_rolle,
          sent_message_id: info.messageId,
          versendet_variante: b.variante,
          // DEN VERSCHICKTEN TEXT AUFHEBEN.
          //
          // Das Cockpit erzeugte beim Öffnen bisher IMMER einen frischen
          // Entwurf — auch für längst angeschriebene Gemeinden. Wer nach einer
          // Antwort nachsehen wollte, was die Gemeinde bekommen hat, sah
          // stattdessen, was sie heute bekäme. Nach einem Tag mit einem Dutzend
          // Textänderungen ist das nicht dasselbe.
          //
          // `draft_manuell` verhindert genau dieses Neuerzeugen. Der Name meint
          // eigentlich „von Hand bearbeitet"; hier heißt er „das ist die echte
          // Fassung, fass sie nicht an" — dieselbe Wirkung, und die Alternative
          // wäre eine zweite Spalte für denselben Zweck.
          draft_subject: b.subject,
          draft_body: b.body,
          draft_manuell: true,
          updated_at: new Date().toISOString(),
        })
        .eq("region_id", b.region_id);
      raus++;
      log(`${String(i + 1).padStart(2)}/${zuSenden.length}  ${b.name} → ${b.empfaenger}`, error ? "warn" : "ok");
      protokoll.push({
        region_id: b.region_id,
        name: b.name,
        empfaenger: b.empfaenger,
        betreff: b.subject,
        variante: b.variante,
        messageId: info.messageId,
        gesendet: true,
        statusGeschrieben: !error,
        statusFehler: error?.message ?? null,
        at: new Date().toISOString(),
      });
      // EIN GESCHEITERTER SCHREIBVORGANG BEENDET DEN LAUF. Die Mail ist
      // draußen, die Gemeinde steht aber weiter auf „offen" — der nächste Lauf
      // schickte ihr denselben Brief ein zweites Mal. Bei einer Aussendung,
      // deren Vertretbarkeit auf „kein Nachfassen" beruht, ist das genau der
      // Fall, den es nicht geben darf. Also anhalten und den Menschen holen.
      if (error) {
        log(`Status für ${b.name} NICHT geschrieben: ${error.message}`, "err");
        log("Lauf angehalten. Die Mail ist draußen — Status von Hand nachtragen, bevor erneut gesendet wird.", "err");
        break;
      }
    } catch (e) {
      log(`${b.name}: Versand fehlgeschlagen — ${(e as Error).message}`, "err");
      protokoll.push({ region_id: b.region_id, name: b.name, gesendet: false, grund: [(e as Error).message] });
    }
    if (i < zuSenden.length - 1) await new Promise((r) => setTimeout(r, pauseMs));
  }

  // ZUSTELLUNGSPROBE — eine Mail an eigene Postfächer bei großen Anbietern.
  //
  // Sie geht MIT dem Schub raus, nicht davor oder danach: Was zählt, ist die
  // Einsortierung genau dieser Menge aus genau diesem Postfach zu genau dieser
  // Zeit. Eine Probe am Vortag misst einen anderen Zustand.
  //
  // Der Brief ist derselbe wie der letzte verschickte, mit einer Vorbemerkung —
  // ein eigens gebauter Testtext würde etwas anderes messen als das, was die
  // Gemeinden bekommen.
  //
  // Sie zählt NICHT gegen das Tagespensum: Sie geht an uns selbst, nicht an eine
  // Gemeinde, und eine Bremse, die sich selbst mitzählt, verschiebt die Messung.
  const probeAdressen = zustellprobeAdressen();
  if (probeAdressen.length && letzterBrief) {
    for (const an of probeAdressen) {
      try {
        await transport.sendMail({
          from: konfig.from,
          to: an,
          replyTo: konfig.replyTo,
          subject: `[ZUSTELLPROBE ${heuteInBerlin()}] ${letzterBrief.subject}`,
          text:
            `Zustellungsprobe zum Schub ${p.kampagne}, Charge ${p.charge}, ${raus} Mails an diesem Tag.\n` +
            `Bitte nachsehen: Posteingang oder Spam? Der Text darunter ist der echte Brief.\n\n` +
            `${"-".repeat(60)}\n\n${letzterBrief.body}`,
          html: letzterBrief.body_html,
        });
        log(`Zustellungsprobe an ${an} — bitte nachsehen, ob sie im Posteingang liegt`, "ok");
      } catch (e) {
        log(`Zustellungsprobe an ${an} fehlgeschlagen: ${(e as Error).message}`, "warn");
      }
    }
  } else if (!probeAdressen.length) {
    // Eine fehlende Messung wird GEMELDET, nicht verschwiegen. Sonst liest sich
    // ein stiller Lauf wie ein geprüfter.
    log("Keine Zustellungsprobe gesetzt — ohne sie merken wir eine Einsortierung in den Spam-Ordner nicht.", "warn");
  }

  transport.close();
  // MIT UHRZEIT: Zwei Läufe derselben Charge am selben Tag überschrieben sonst
  // den ersten Nachweis — ausgerechnet die Datei, in der ein nicht
  // geschriebener Status stünde.
  const pfad = protokolliere(`${p.kampagne}-charge${p.charge}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`, {
    kampagne: p.kampagne,
    charge: p.charge,
    at: new Date().toISOString(),
    eintraege: protokoll,
  });
  log();
  log(`${raus} von ${zuSenden.length} versendet · Protokoll: ${pfad}`, "ok");
  if (raus > 0) {
    const gesendet = new Set(protokoll.filter((e) => e.gesendet).map((e) => e.region_id));
    const seiten = zuSenden.filter((b) => gesendet.has(b.region_id)).map((b) => b.seite_url).filter((u): u is string => !!u);
    if (!(await seitenFreischalten(seiten))) process.exitCode = 1;
  }
}

/**
 * The letter links the town page, so the send releases it for search engines.
 * The release is a cached list; without invalidating it the pages keep their
 * "noindex" for up to a day (06.10.2026: all 95 still noindex hours later).
 * Measured on real pages afterwards — a 200 from the route proves nothing.
 */
async function seitenFreischalten(seiten: string[]): Promise<boolean> {
  const basis = arg("basis") ?? "https://solar-check.io";
  let offen = [...new Set(seiten.map((u) => u.split("?")[0]))];
  // EVERY sent page is checked, not a sample — the release is the point of
  // this step, and a sample of three let 92 others go unseen. A failed check
  // retries the release; after three rounds the run ends red.
  for (let runde = 1; runde <= 3 && offen.length; runde++) {
    const res = await fetch(`${basis}/api/atlas/revalidate?umfang=outreach`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => null);
    if (!res?.ok) log(`Freischaltung: Aufruf fehlgeschlagen (${res?.status ?? "kein Abruf"}), Runde ${runde}`, "warn");
    await new Promise((r) => setTimeout(r, 5000 * runde));
    const nochZu: string[] = [];
    for (const url of offen) {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": "solar-check-health-check" } }).catch(() => null);
      const befund = indexierbarBefund(r?.status ?? 0, r ? await r.text() : "");
      if (befund) nochZu.push(url);
    }
    offen = nochZu;
  }
  if (offen.length) {
    log(`${offen.length} von ${seiten.length} Ortsseiten stehen nach drei Freischalt-Runden noch auf noindex:`, "err");
    for (const u of offen) log(`  ${u}`, "err");
    return false;
  }
  log(`Alle ${seiten.length} Ortsseiten der verschickten Briefe sind für Google freigegeben (einzeln geprüft).`, "ok");
  return true;
}

async function probemail(an: string, p: Paket): Promise<void> {
  // `--ags=` picks a specific letter, so both variants (with and without 3D
  // scene) can be proofed before a run.
  const wahl = arg("ags");
  const b = wahl ? p.paket.find((x) => x.region_id === wahl) : p.paket[0];
  if (!b) throw new Error(wahl ? `Kein Brief für ${wahl} im Paket.` : "Kein Brief im Paket — erst die Charge festschreiben.");
  // NIE AN EINE GEMEINDE. Der Probemail-Zweig läuft vor allen Bremsen — ein
  // Tippfehler im Parameter schickte den Brief mit „[PROBE]" im Betreff an ein
  // echtes Rathaus, und das wäre verbrannt.
  //
  // Geprüft wird gegen den Kontaktbestand, NICHT gegen die eigene Domain: Die
  // Probe muss bei einem fremden Anbieter ankommen (Gmail, Outlook), sonst
  // prüft unser Mailserver sich selbst und die Kopfzeile
  // `Authentication-Results` sagt nichts über die Ausrichtung aus.
  const ziel = an.trim().toLowerCase();
  if (!/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(ziel)) throw new Error(`${an} ist keine Adresse.`);
  const db = await makeClient();
  // `ilike` statt `eq`: Die Spalte ist nicht garantiert kleingeschrieben, und
  // ein buchstabengenauer Vergleich hätte „Info@Musterdorf.de" durchgelassen.
  const [rollen, allgemein] = await Promise.all([
    db.from("kommunen_kontakt").select("region_id").ilike("rollen_email", ziel).limit(1),
    db.from("kommunen_kontakt").select("region_id").ilike("email", ziel).limit(1),
  ]);
  // Und ein Abfragefehler heißt „ich weiß es nicht", nicht „keine Kollision".
  if (rollen.error || allgemein.error) {
    throw new Error(
      `Konnte nicht prüfen, ob ${an} einer Gemeinde gehört (${rollen.error?.message ?? allgemein.error?.message}).`,
    );
  }
  if (rollen.data?.length || allgemein.data?.length) {
    throw new Error(`${an} ist die Kontaktadresse einer Gemeinde — dorthin geht keine Probemail.`);
  }
  const { transport, konfig } = await baueTransport();
  const info = await transport.sendMail({
    from: konfig.from,
    to: an,
    replyTo: konfig.replyTo,
    subject: `[PROBE] ${b.subject}`,
    text: b.body,
    html: b.body_html,
    headers: mailKopfzeilen({ widerspruchAn: konfig.replyTo ?? adresseAus(konfig.from) }),
  });
  transport.close();
  log(`Probemail an ${an} — ${info.messageId}`, "ok");
  log("Jetzt im Empfangspostfach den Quelltext ansehen: Authentication-Results muss");
  log("spf=pass, dkim=pass und dmarc=pass mit derselben Domain zeigen.");
}

// ─── Hauptlauf ────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const t = process.argv.find((a) => a.startsWith(`--${name}=`));
  return t ? t.slice(name.length + 3) : undefined;
}
const hat = (name: string) => process.argv.includes(`--${name}`);

/** Zahl aus einem Parameter — eine unlesbare Angabe bricht ab, statt still zu
 *  null zu werden (`slice(0, NaN)` schickt kommentarlos nichts). */
function zahl(name: string, standard: number): number {
  const roh = arg(name);
  if (roh === undefined) return standard;
  const n = parseInt(roh, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error(`--${name}=${roh} ist keine Zahl.`);
  return n;
}

/** Preflight; true when the charge may go out today as it stands. */
async function vorflug(p: Paket, limit: number): Promise<boolean> {
  const maengel: string[] = [];
  const briefe = p.paket.slice(0, limit);
  log(`Vorflug ${p.schub}, Charge ${p.charge}: ${briefe.length} Briefe im Paket`);

  const tag = kommunenVersandtag(new Date());
  if (!tag.ok) maengel.push(`Versandtag: ${tag.grund}`);
  log(tag.ok ? "Versandtag in Ordnung" : `Versandtag: ${tag.grund}`, tag.ok ? "ok" : "err");

  const { transport, konfig } = await baueTransport();
  transport.close();
  const dkim = await dkimAktiv(adresseAus(konfig.from).split("@")[1]);
  log(dkim.hinweis, dkim.ok ? "ok" : "err");
  if (!dkim.ok) maengel.push("DKIM");

  // Same evidence check and per-letter brakes as the real run.
  const kontakt = await kontaktPruefung(briefe);
  let gehalten = 0;
  for (const b of briefe) {
    const halt = bremsen(b, p.heute, kontakt.get(b.region_id));
    if (halt.length) {
      gehalten++;
      log(`${b.name} (${b.region_id}) ${b.empfaenger} — ${halt.join(" · ")}`, "err");
    }
  }
  log(`${briefe.length - gehalten} von ${briefe.length} Briefen bestehen alle Bremsen.`, gehalten ? "warn" : "ok");

  // Which letter goes out, counted — and towns dropped because the batch
  // declares no letter for them are an OPEN DECISION, not a silent skip. The
  // short letter for towns without a placement was decided once in a chat and
  // lost; this is where such a gap now shows up before the go.
  const proArt = new Map<string, number>();
  for (const b of briefe) proArt.set(b.briefart ?? "platzierung", (proArt.get(b.briefart ?? "platzierung") ?? 0) + 1);
  log(
    `Briefarten: ${[...proArt].map(([a, n]) => `${n} ${a === "info" ? "Kurzbrief ohne Platzierung" : "Pressebrief mit Platzierung"}`).join(", ")}`,
    "ok",
  );
  const ohneBrief = p.uebersprungen.filter((u) => /nicht vorgesehen/.test(u.grund));
  if (ohneBrief.length) {
    maengel.push(`${ohneBrief.length} Orte ohne festgelegte Briefart`);
    log(
      `${ohneBrief.length} Orte der Charge bekämen keinen Brief, weil der Schub ihre Briefart nicht festlegt: ` +
        ohneBrief.map((u) => u.name ?? u.region_id).join(", "),
      "err",
    );
  }

  // Scenes are a separate session's work. The letter mentions the 3D view only
  // where a scene is published, so this is information, not a brake — but the
  // number has to be read BEFORE the go, not discovered after it.
  const ohneSzene = briefe.filter((b) => !b.body.includes("3D-Ansicht"));
  log(
    `${briefe.length - ohneSzene.length} von ${briefe.length} Briefen zeigen eine 3D-Szene` +
      (ohneSzene.length ? ` — ohne: ${ohneSzene.map((b) => b.name).join(", ")}` : ""),
    ohneSzene.length ? "warn" : "ok",
  );

  // Every link a recipient can click, called once as a recipient would. This
  // also warms the cold pages before the first real click.
  const links = [...new Set(briefe.flatMap((b) => (b.body.match(/https:\/\/solar-check\.io[^\s)"<>]*/g) ?? []).map((u) => u.replace(/[.,]$/, ""))))];
  const kaputt: string[] = [];
  for (let i = 0; i < links.length; i += 6) {
    await Promise.all(
      links.slice(i, i + 6).map(async (u) => {
        try {
          const r = await fetch(u, { headers: { "user-agent": "solar-check-health-check" }, redirect: "follow" });
          if (r.status !== 200) kaputt.push(`${r.status} ${u}`);
        } catch (e) {
          kaputt.push(`${(e as Error).message} ${u}`);
        }
      }),
    );
  }
  for (const k of kaputt) log(k, "err");
  log(`${links.length - kaputt.length} von ${links.length} Links antworten.`, kaputt.length ? "err" : "ok");
  if (kaputt.length) maengel.push(`${kaputt.length} Links`);

  log();
  if (maengel.length) {
    log(`NICHT BEREIT: ${maengel.join(" · ")}${gehalten ? ` · ${gehalten} Briefe würden zurückgehalten` : ""}`, "err");
    return false;
  }
  if (gehalten) log(`BEREIT für ${briefe.length - gehalten} Briefe; ${gehalten} würden zurückgehalten (siehe oben).`, "warn");
  else log(`BEREIT: alle ${briefe.length} Briefe.`, "ok");
  return true;
}

async function main(): Promise<void> {
  loadEnvFile();

  const schub = arg("schub") ?? AKTUELLER_SCHUB;
  if (!SCHUEBE[schub]) throw new Error(`Unbekannter Schub „${schub}" — bekannt: ${Object.keys(SCHUEBE).join(", ")}`);
  const charge = zahl("charge", 1);
  const limit = Math.min(MAX_JE_LAUF, zahl("limit", MAX_JE_LAUF));
  const basis = arg("basis") ?? "https://solar-check.io";
  // Der Aufruf trägt CRON_SECRET als Bearer. Ein Tippfehler im Hostnamen gäbe
  // den Schlüssel an einen fremden Server — deshalb nur die eigene Adresse und
  // der eigene Rechner.
  if (!/^https:\/\/solar-check\.io($|\/)|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?($|\/)/.test(basis)) {
    throw new Error(`--basis=${basis} ist weder solar-check.io noch localhost — der Cron-Schlüssel bleibt hier.`);
  }
  const pauseMs = arg("pause") ? zahl("pause", PAUSE_MS / 1000) * 1000 : PAUSE_MS;

  const paket = await holePaket(basis, schub, charge, limit);

  if (hat("liste")) return zeigeListe(paket);
  if (hat("vorschau")) {
    zeigeListe(paket);
    return zeigeVorschau(paket, zahl("n", 5));
  }

  // PREFLIGHT: every brake of the send run, without sending. One command, one
  // verdict. Before 06.10.2026 "ready" meant "links and texts look fine"; the
  // send then stopped at a rotated DKIM selector, after 31 letters had been
  // found carrying "undefined". A check that only runs inside --senden is found
  // out at the worst possible moment.
  if (hat("pruefen")) {
    process.exitCode = (await vorflug(paket, limit)) ? 0 : 1;
    return;
  }

  const test = arg("test");
  if (test) return probemail(test, paket);

  if (!hat("senden")) {
    zeigeListe(paket);
    log();
    log("Nichts versendet. Zum Senden: --senden (vorher --vorschau lesen).", "warn");
    return;
  }

  const tag = kommunenVersandtag(new Date());
  if (!tag.ok && !hat("trotzdem")) {
    log(`Heute wird nicht versendet: ${tag.grund}`, "err");
    log("Wenn es trotzdem sein muss: --trotzdem", "warn");
    return;
  }
  await senden(paket, limit, pauseMs);
}

main().catch((e) => {
  log((e as Error).message, "err");
  process.exit(1);
});
