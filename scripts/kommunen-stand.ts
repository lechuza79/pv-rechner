/**
 * Wo steht der Kommunen-Outreach? Der erste Befehl jeder neuen Sitzung.
 *
 * WOZU: Der Zustand liegt vollständig in der Datenbank, nicht in einer Sitzung.
 * Wer neu anfängt, musste ihn bisher aus drei Befehlen zusammensuchen — und wer
 * zusammensucht, übersieht etwas. Hier steht alles auf einem Bildschirm: was
 * verschickt ist, was zurückkam, was als Nächstes dran wäre und ob heute
 * überhaupt gesendet werden darf.
 *
 * Schreibt nichts. Reine Auskunft.
 *
 *   npm run kommunen:stand
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { versandfenster } from "../lib/schulferien";
import { SCHUEBE, AKTUELLER_SCHUB } from "../lib/kommunen-testballon";
import { OUTREACH_STATUS_LABEL, istUnbeantwortet, UNBEANTWORTET_TAGE } from "../lib/outreach-status";
import { liesNotiz } from "../lib/outreach-ruecklauf";
import { heuteInBerlin } from "../lib/zeit";
import { domainAus, verlinkendeDomains } from "./lib/verweise";
import { bilanz, quoteText, type Veroeffentlichung } from "../lib/kommunen-veroeffentlichung";
import { offeneHinweisZeilen } from "../lib/kommunen-hinweise";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg = "", level: "info" | "ok" | "err" | "warn" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : level === "warn" ? "! " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

function loadEnvFile(): void {
  const p = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const zeile of readFileSync(p, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

type Zeile = {
  region_id: string;
  charge: number | null;
  kampagne: string | null;
  outreach_status: string;
  contacted_at: string | null;
  responded_at: string | null;
  rollen_email: string | null;
  notes: string | null;
  website: string | null;
  mastr_regions: { name: string };
};

async function main(): Promise<void> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, charge, kampagne, outreach_status, contacted_at, responded_at, rollen_email, notes, website, mastr_regions!inner(name)")
    .not("kampagne", "is", null);
  if (error) throw new Error(`Konnte den Stand nicht lesen: ${error.message}`);
  const alle = (data ?? []) as unknown as Zeile[];
  const jetzt = new Date();

  // ─── Je Schub ───────────────────────────────────────────────────────────────
  const schuebe = [...new Set(alle.map((z) => z.kampagne!))].sort();
  for (const s of schuebe) {
    const zeilen = alle.filter((z) => z.kampagne === s);
    const raus = zeilen.filter((z) => z.contacted_at);
    // GEPARKT IST NICHT OFFEN. Der Testballon aus Baden-Württemberg und Bayern
    // steht mit 100 Gemeinden auf „nicht verschickt" — und genau so las sich die
    // erste Fassung dieser Ausgabe: als stünden 100 Briefe zum Versand bereit.
    // Der Name trägt die Entscheidung, also liest sie der Bericht auch daraus.
    const geparkt = s.endsWith("-geparkt");
    const marke = geparkt
      ? " (GEPARKT — nicht versenden)"
      : s === AKTUELLER_SCHUB
        ? " (aktuell)"
        : SCHUEBE[s]
          ? ""
          : " (nicht mehr im Code definiert)";
    log(`Schub „${s}"${marke}: ${raus.length} von ${zeilen.length} verschickt`, raus.length === zeilen.length ? "ok" : "info");

    // Chargen mit ihrem Stand — die offenen sind das, was als Nächstes ansteht.
    const chargen = [...new Set(zeilen.map((z) => z.charge ?? 0))].sort((a, b) => a - b);
    for (const c of chargen) {
      const inC = zeilen.filter((z) => (z.charge ?? 0) === c);
      const rausC = inC.filter((z) => z.contacted_at);
      const tag = rausC[0]?.contacted_at?.slice(0, 10);
      log(
        `    Charge ${c}: ${inC.length} ${inC.length === 1 ? "Gemeinde" : "Gemeinden"} — ` +
          (rausC.length === inC.length ? `verschickt am ${tag}` : rausC.length ? `${rausC.length} verschickt, ${inC.length - rausC.length} offen` : "OFFEN"),
      );
    }
  }

  // ─── Rückläufe über alles ───────────────────────────────────────────────────
  const raus = alle.filter((z) => z.contacted_at);
  const je: Record<string, number> = {};
  for (const z of raus) je[z.outreach_status] = (je[z.outreach_status] ?? 0) + 1;
  log();
  log("Stand der angeschriebenen Gemeinden:");
  for (const [k, v] of Object.entries(je).sort((a, b) => b[1] - a[1])) {
    log(`    ${OUTREACH_STATUS_LABEL[k] ?? k}: ${v}`);
  }
  const unbeantwortet = raus.filter((z) => istUnbeantwortet(z, jetzt)).length;
  log(`    davon ohne Antwort seit mehr als ${UNBEANTWORTET_TAGE} Tagen: ${unbeantwortet}`);

  // Wer geantwortet oder veröffentlicht hat, mit der letzten Verlaufszeile —
  // das ist die Liste, die ein Mensch wirklich lesen will.
  const bewegt = raus.filter((z) => z.outreach_status === "geantwortet" || z.outreach_status === "veroeffentlicht");
  if (bewegt.length) {
    log();
    log("Bewegung:");
    for (const z of bewegt) {
      const letzte = liesNotiz(z.notes).verlauf.at(-1);
      log(`    ${z.mastr_regions.name} (${OUTREACH_STATUS_LABEL[z.outreach_status]})${letzte ? ` — ${letzte.datum}: ${letzte.betreff}` : ""}`);
    }
  }

  // ─── Was daraus geworden ist ────────────────────────────────────────────────
  //
  // WARUM DIESER ABSCHNITT (09.09.2026): Die Wirkung des Outreach lag in drei
  // getrennten Quellen — Status hier, Besucherstatistik dort, Abos in einer
  // dritten Tabelle —, und niemand führte sie zusammen. Wer nur die
  // Besucherstatistik las, meldete „drei Veröffentlichungen, sonst nichts",
  // während 22 Rückmeldungen im Postfach lagen und Abos bestanden. Eine
  // Auswertung aus einer Quelle ist keine Auswertung, sondern ein Ausschnitt.
  //
  // Der Abschnitt zählt, was WIR wissen — und sagt am Ende, was er nicht sehen
  // kann. „Keine Veröffentlichung verzeichnet" heißt nicht „keine Reaktion".
  log();
  log("Was daraus geworden ist:");
  // Geantwortet heißt: Es kam eine Antwort — unabhängig davon, ob die Gemeinde
  // später auch veröffentlicht hat. Am Status gezählt fiel Nidda heraus, sobald
  // er von „geantwortet" auf „veröffentlicht" wechselte.
  const geantwortet = raus.filter((z) => z.responded_at || z.outreach_status === "geantwortet");
  const veroeffentlicht = raus.filter((z) => z.outreach_status === "veroeffentlicht");
  log(`    ${raus.length} ${raus.length === 1 ? "Brief" : "Briefe"} verschickt`);
  log(
    `    ${geantwortet.length} ${geantwortet.length === 1 ? "Gemeinde hat" : "Gemeinden haben"} geantwortet` +
      (geantwortet.length ? `: ${geantwortet.map((z) => z.mastr_regions.name).join(", ")}` : ""),
  );
  // Belegte Veröffentlichungen je BEITRAG (lib/kommunen-veroeffentlichung.ts) —
  // dieselbe Zählung wie die Übersicht im Admin-Bereich. Der Status an der
  // Gemeinde sagt nur „ja/nein", nicht wie oft und wo.
  const { data: pubs, error: pubFehler } = await db
    .from("kommunen_veroeffentlichung")
    .select("region_id, url, kanal, mit_link, gesehen_ab, noch_online");
  if (pubFehler) {
    log(`    Veröffentlichungen nicht lesbar: ${pubFehler.message}`, "warn");
  } else {
    const zugestellt = raus.filter(
      (z) => z.outreach_status !== "bounce" && !liesNotiz(z.notes).verlauf.some((v) => v.art === "unzustellbar"),
    );
    const b = bilanz((pubs ?? []) as Veroeffentlichung[], zugestellt.length);
    log(
      `    ${b.gemeinden} von ${b.angeschrieben} zugestellten Briefen haben zu einer Veröffentlichung geführt (${quoteText(b.quote)}): ` +
        `${b.beitraege} Beiträge, ${b.mitLink} mit Link, ${b.woanders} woanders als auf der Gemeindeseite`,
    );
    const name = new Map(raus.map((z) => [z.region_id, z.mastr_regions.name]));
    log(`      ${b.jeGemeinde.map((g) => `${name.get(g.region_id) ?? g.region_id} ${g.beitraege}`).join(" · ")}`);
    const ohneBeleg = veroeffentlicht.filter((z) => !b.jeGemeinde.some((g) => g.region_id === z.region_id));
    if (ohneBeleg.length) {
      log(`    Als veröffentlicht markiert, aber ohne belegten Beitrag: ${ohneBeleg.map((z) => z.mastr_regions.name).join(", ")}`, "warn");
    }
  }

  // The hand-set status misses every publication nobody noted: Nidda linked to
  // us for weeks and stood here as "answered" only (21.09.2026). The backlink
  // measurement is read every time; if it cannot be read, that is said.
  const login = process.env.DATAFORSEO_LOGIN, pass = process.env.DATAFORSEO_PASSWORD;
  if (!login || !pass) {
    log("Verlinkungen NICHT geprüft: Zugang zur Backlink-Prüfung fehlt", "warn");
  } else {
    try {
      const { domains } = await verlinkendeDomains(login, pass);
      const verlinkt = raus.filter((z) => { const d = domainAus(z.website); return !!d && domains.has(d); });
      log(
        `    ${verlinkt.length} ${verlinkt.length === 1 ? "angeschriebene Gemeinde verlinkt" : "angeschriebene Gemeinden verlinken"} uns (Backlink-Prüfung)` +
          (verlinkt.length ? `: ${verlinkt.map((z) => `${z.mastr_regions.name} (${domains.get(domainAus(z.website)!) || domainAus(z.website)})`).join(", ")}` : ""),
      );
      const nichtVermerkt = verlinkt.filter((z) => z.outreach_status !== "veroeffentlicht");
      if (nichtVermerkt.length) log(`Verlinkt, aber nicht als veröffentlicht vermerkt: ${nichtVermerkt.map((z) => z.mastr_regions.name).join(", ")}`, "warn");
    } catch (e) {
      log(`Verlinkungen NICHT geprüft: ${(e as Error).message}`, "warn");
    }
  }

  // Die Abos sind der eigentliche Ertrag: Wer sich einträgt, hat eingewilligt —
  // aus einem Einmalkontakt wird ein Kanal. Sie standen bisher in keiner
  // Outreach-Auswertung, obwohl der Brief sie anbietet.
  //
  // Ein Ausfall dieser Abfrage darf die Übersicht nicht umwerfen: Sie ist der
  // erste Befehl jeder Sitzung, und die Versandlage darunter ist wichtiger als
  // eine Zahl. Gemeldet wird er trotzdem — stumm zu scheitern hieße, „keine
  // Abos" und „nicht nachgesehen" gleich aussehen zu lassen.
  const { data: abos, error: aboFehler } = await db
    .from("gemeinde_abos")
    .select("region_id, status, ueber_brief, bestaetigt_am, abgemeldet_am");
  if (aboFehler) {
    log(`    Abos nicht lesbar: ${aboFehler.message}`, "warn");
  } else {
    const aktiv = (abos ?? []).filter((a) => a.bestaetigt_am && !a.abgemeldet_am);
    const ausBrief = aktiv.filter((a) => a.ueber_brief === true);
    const inAngeschriebenen = new Set(raus.map((z) => z.region_id));
    const inOrten = aktiv.filter((a) => inAngeschriebenen.has(a.region_id as string));
    log(
      `    ${aktiv.length} bestätigte ${aktiv.length === 1 ? "Anmeldung" : "Anmeldungen"} zum Gemeinde-Abo` +
        (aktiv.length
          ? ` — ${ausBrief.length} über ein Anschreiben, ${inOrten.length} in einer angeschriebenen Gemeinde`
          : ""),
    );
    // One row per PLACE, not per person. On 16.09.2026 one Samtgemeinde mailbox
    // subscribed four member municipalities in two minutes, and this line read
    // "6 subscriptions" for what were 3 people. This report may not read the
    // addresses (purpose binding), so it says what the number counts instead.
    if (aktiv.length) log(`    (je Ort gezählt — eine Person kann mehrere Orte abonnieren)`);
    const offen = (abos ?? []).filter((a) => !a.bestaetigt_am && !a.abgemeldet_am).length;
    // Unbestätigt ist im doppelten Bestätigungsverfahren ein Nein, kein
    // Zwischenstand — es steht hier, weil eine wachsende Zahl bedeutet, dass
    // die Bestätigungsmail nicht ankommt.
    if (offen) log(`    ${offen} unbestätigt (Bestätigungsmail nicht eingelöst)`);
  }
  log("    Nicht sichtbar: Veröffentlichungen ohne Verweis auf uns (App-Plattformen, Print).");

  // OFFENE HINWEISE aus dem wöchentlichen Lauf (Besucherherkunft + Websuche).
  // Sie stehen hier, weil dies der erste Befehl jeder Sitzung ist: Ein Hinweis,
  // den nur die Ablage kennt, liegt dort wie am 22.09.2026 Berkenthin in der
  // Besucherstatistik — gefunden und nie angesehen. Erledigt ist er, sobald
  // das Ergebnis in der Notiz der Gemeinde steht; der nächste Lauf meldet ihn
  // dann nicht mehr. Fehlt der Bericht ganz, sagt die Zeile das — ein stummer
  // Lauf ist von einem ausgefallenen sonst nicht zu unterscheiden.
  const { data: hinweisBerichte, error: hinweisFehler } = await db
    .from("waechter_reports")
    .select("created_at, subject, details")
    .eq("tag", "kommunen-hinweise")
    .order("created_at", { ascending: false })
    .limit(20);
  if (hinweisFehler) log(`    Hinweis-Berichte nicht lesbar: ${hinweisFehler.message}`, "warn");
  else if (!hinweisBerichte?.length) log("    Wöchentliche Hinweis-Suche: noch kein Bericht abgelegt", "warn");
  else {
    // Je Quelle nur der jüngste Lauf — zwei Läufe derselben Quelle
    // nebeneinander zeigten einen längst erledigten Stand als offen.
    const jeQuelle = new Map<string, { created_at: string; subject: string; details: string | null }>();
    for (const b of hinweisBerichte as { created_at: string; subject: string; details: string | null }[]) {
      if (!jeQuelle.has(b.subject)) jeQuelle.set(b.subject, b);
    }
    // Der abgelegte Bericht ist der Stand des LAUFS, nicht der von heute: Er
    // hält fest, was am Montag neu war. Wer einen Hinweis am Dienstag abarbeitet
    // und das Ergebnis in die Notiz schreibt, sah ihn hier bis zum nächsten
    // Montag weiter als offen — und hat ihn ein zweites Mal aufgerufen. Genau so
    // ist es am 23.09.2026 mit Bocholt passiert, zweimal geprüft und zweimal
    // verworfen. Gefiltert wird mit derselben Funktion, die auch der wöchentliche
    // Lauf benutzt; eine zweite Auslegung von „schon angesehen" wäre eine zweite
    // Wahrheit.
    const notizenJeName = new Map<string, (string | null)[]>();
    for (const z of alle) {
      const n = z.mastr_regions.name;
      if (!notizenJeName.has(n)) notizenJeName.set(n, []);
      notizenJeName.get(n)!.push(z.notes);
    }
    for (const b of jeQuelle.values()) {
      const roh = (b.details ?? "").split("\n").filter(Boolean);
      const zeilen = offeneHinweisZeilen(roh, notizenJeName);
      const erledigt = roh.length - zeilen.length;
      const quelle = b.subject.match(/\(([^)]+)\)/)?.[1] ?? b.subject;
      // „Seither erledigt" wird MITGEZÄHLT, nicht verschwiegen: Sonst sieht ein
      // Lauf, dessen Hinweise alle abgearbeitet sind, aus wie einer, der nichts
      // gefunden hat.
      const seither = erledigt ? ` (${erledigt} seither erledigt)` : "";
      log(
        `    ${quelle}, Lauf vom ${b.created_at.slice(0, 10)}: ${zeilen.length ? `${zeilen.length} offene Hinweise` : "nichts Offenes"}${seither}`,
        zeilen.length ? "warn" : undefined,
      );
      for (const z of zeilen.slice(0, 15)) log(`      ${z}`);
    }
  }

  // ─── Darf heute gesendet werden? ────────────────────────────────────────────
  //
  // Die Antwort kommt aus derselben Funktion, die auch der Versand fragt — eine
  // zweite Auslegung der Regeln hier waere eine zweite Wahrheit.
  log();
  const offeneSchuebe = schuebe.filter(
    (s) => !s.endsWith("-geparkt") && alle.some((z) => z.kampagne === s && !z.contacted_at),
  );
  if (!offeneSchuebe.length) {
    log("Nichts offen — alle festgeschriebenen Gemeinden sind angeschrieben.", "ok");
    log("Ein weiterer Schub muss erst festgeschrieben werden (neue Bundesländer, neue Auswahl).");
    return;
  }
  log(`Offen: ${offeneSchuebe.join(", ")}`);
  // Beispielhaft für Hessen geprüft; die Ferien gelten je Bundesland, der
  // Versand prüft sie je Gemeinde selbst.
  // Deutscher Kalendertag: Schulferien und Feiertage sind deutsche Daten (siehe
  // lib/zeit.ts) — mit der Weltzeit fiele die Auskunft nachts auf den Vortag.
  const heuteIso = heuteInBerlin(jetzt);
  const fenster = versandfenster("06", heuteIso);
  log(
    fenster.frei ? "Heute darf gesendet werden (Beispiel Hessen)." : `Heute nicht: ${fenster.grund}`,
    fenster.frei ? "ok" : "warn",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
