/**
 * Sachfragen an Förderstellen — stellen, protokollieren, offene nachhalten.
 *
 * WARUM ES DAS GIBT (09.09.2026): Der Entwurfstext existierte seit August, der
 * Versand nie. „Entwurf, kein Versand" war damals die vorsichtige Wahl; in der
 * Praxis heißt sie, dass die Frage nie gestellt wird. Bei Waldalgesheim stand
 * deshalb monatelang eine Zahl im Katalog, von der wir wussten, dass sie
 * womöglich die falsche ist — und die einzige Auflösung war ein Telefonat, das
 * niemand führt.
 *
 * Nutzung:
 *   npm run foerder:anfrage -- --programm=<kennung>            Entwurf ansehen
 *   npm run foerder:anfrage -- --programm=<kennung> --senden   einzeln abschicken
 *   npm run foerder:anfrage -- --auto                          fällige zeigen
 *   npm run foerder:anfrage -- --auto --senden                 fällige abschicken
 *   npm run foerder:anfrage -- --liste                         was ging raus, was ist offen
 *
 * DER VERSAND IST IMMER EINE EIGENE ANSAGE. Ohne `--senden` wird nur gezeigt —
 * dieselbe Bauform wie beim Kommunen-Versand und bei der Umstellungs-Nachricht.
 *
 * WAS DER AUTOMATISMUS DARF UND WAS NICHT:
 *
 *   Er verschickt ausschließlich den Fall „wir kommen seit drei Läufen nicht an
 *   die Amtsseite". Den erkennt das System selbst (lib/funding-verify-state.ts),
 *   und die Zählung ist gemessen, nicht geurteilt.
 *
 *   Den zweiten Fall — die Seite ist erreichbar und sagt zwei verschiedene
 *   Dinge — kann er NICHT erkennen: Der Seiten-Wächter weiß, DASS sich eine
 *   Seite bewegt hat, nie WAS darauf steht. Widersprüche stehen deshalb in einer
 *   Liste, die ein Lauf mit Urteilsvermögen füllt (OFFENE_FRAGEN), und werden
 *   einzeln verschickt.
 *
 * WAS VOM KOMMUNEN-ANSCHREIBEN NICHT ÜBERNOMMEN WIRD, und warum:
 *
 *   Schulferien, Wochentag, Tagespensum — das sind Bremsen gegen KALTAKQUISE.
 *   Eine sachliche Rückfrage zu einem laufenden Förderprogramm ist keine Werbung
 *   (§ 7 UWG greift nicht), sie geht an ein Rollen-Postfach, und sie betrifft
 *   eine Auskunft, die die Stelle ohnehin öffentlich gibt. Sie in den
 *   Ferienkalender zu hängen wäre keine Rücksicht, sondern hielte eine Korrektur
 *   wochenlang zurück, die auf unserer Seite live falsch steht.
 *
 *   Kein Nachfassen — das bleibt, und es hängt am Protokoll: Ein Programm, zu
 *   dem schon einmal eine Frage hinausging, bekommt nie eine zweite.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function ladeEnv() {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/**
 * Was bei welchem Programm zu klären ist.
 *
 * BEWUSST EINE LISTE IM CODE, kein Freitext auf der Kommandozeile: Eine Frage,
 * die beim Aufruf getippt wird, ist beim nächsten Mal eine andere — und was an
 * eine Behörde hinausgeht, soll dieselbe Prüfung durchlaufen wie jeder andere
 * Text des Projekts. Die Fundstellen hier müssen zu dem passen, was auf der
 * Stadtseite als Bedingung steht; ein Test hält beides aneinander.
 */
export const OFFENE_FRAGEN: Record<string, { fundstelle: string; wert: string }[]> = {
  "waldalgesheim-balkon-pv": [
    { fundstelle: "im Text der Förderseite", wert: "100 € je Haushalt" },
    { fundstelle: "in der Förderrichtlinie daneben (Beschluss Juni 2026)", wert: "200 € je Haushalt" },
  ],
};

function arg(name: string): string | undefined {
  const t = process.argv.find((a) => a.startsWith(`--${name}=`));
  return t ? t.slice(name.length + 3) : undefined;
}
const hatFlag = (n: string) => process.argv.includes(`--${n}`);

/** Abbruch mit Grund. `never`, damit danach nichts mehr als erreichbar gilt. */
function abbruch(grund: string): never {
  console.error(grund);
  process.exit(1);
}

// ─── Datenbank ───────────────────────────────────────────────────────────────

type Db = { url: string; kopf: Record<string, string> };

function db(): Db {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) abbruch("Kein Datenbankzugang — ohne ihn gibt es weder Empfänger noch Protokoll.");
  return { url, kopf: { apikey: key, Authorization: `Bearer ${key}` } };
}

async function hole<T>(d: Db, pfad: string): Promise<T[]> {
  const r = await fetch(`${d.url}/rest/v1/${pfad}`, { headers: d.kopf });
  if (!r.ok) abbruch(`Datenbank antwortet ${r.status} auf ${pfad}`);
  return (await r.json()) as T[];
}

// ─── Den Brief bauen ─────────────────────────────────────────────────────────

/**
 * Wo bei UNS steht, was wir zu diesem Programm ausweisen?
 *
 * ABGELEITET, NICHT GETIPPT — und das ist hier keine Förmlichkeit: Ein Programm
 * bekommt nur dann eine eigene Ortsseite, wenn es Dach-Photovoltaik fördert.
 * Wer die Adresse von Hand einträgt, verlinkt bei einem reinen Balkon-Programm
 * eine Seite, die es nicht gibt — die Behörde klickt ins Leere, und das ist der
 * Beleg, der die Mail eigentlich tragen sollte.
 */
async function unsereSeiteZu(id: string): Promise<string | undefined> {
  const { ATLAS_CITIES, cityPath, fundingFor, foerderseiteTraegt } = await import("../lib/atlas-cities");
  const ort = ATLAS_CITIES.find((c) => fundingFor(c)?.id === id);
  if (ort && foerderseiteTraegt(ort)) return `https://solar-check.io${cityPath(ort)}`;
  const { FUNDING_PROGRAMS } = await import("../lib/funding-programs");
  const foerdert = FUNDING_PROGRAMS[id]?.foerdert ?? ["pv"];
  // Balkon-Programme ohne eigene Ortsseite stehen in der Länder-Übersicht.
  return foerdert.includes("balkon") ? "https://solar-check.io/balkonkraftwerk/foerderung" : undefined;
}

type Fertig = {
  id: string;
  traeger: string;
  an: string;
  anlass: "widerspruch" | "unerreichbar";
  subject: string;
  body: string;
};

async function baueAnfrage(d: Db, id: string): Promise<Fertig> {
  const { FUNDING_PROGRAMS } = await import("../lib/funding-programs");
  const { renderInquiryDraft } = await import("../lib/funding-inquiry-draft");
  const { fehlendePflichtangaben, postfachBefund } = await import("../lib/outreach-mail");

  const p = FUNDING_PROGRAMS[id];
  if (!p) abbruch(`Unbekanntes Programm: ${id}`);

  // Was die Stelle bestätigen soll, kommt aus dem Katalog — nicht aus einer
  // zweiten Aufzählung, die beim nächsten Satz vergessen würde.
  const saetze = (p.rates ?? []).map((r) => `${r.label}: ${r.value}`);
  // Der Höchstbetrag entfällt, wenn er nur den Satz wiederholt. Bei einer
  // Pauschale je Haushalt sind beide dieselbe Zahl — sie zweimal aufzuzählen
  // sieht in einer Mail, die genau diese Zahl zur Diskussion stellt, aus wie
  // eine Behauptung, die man doppelt betont.
  const nurZiffern = (s: string) => s.replace(/\D+/g, "");
  const hoechst =
    p.maxFoerderung && !saetze.some((s) => nurZiffern(s).includes(nurZiffern(p.maxFoerderung!)))
      ? `Höchstbetrag: ${p.maxFoerderung}`
      : null;
  const hinterlegt = [
    ...saetze,
    hoechst,
    p.endetIso ? `Programmlaufzeit bis ${p.endetIso.split("-").reverse().join(".")}` : null,
  ].filter((z): z is string => !!z);

  // DAS PRÜFDATUM KOMMT AUS DER DATENBANK, nicht aus dem Code-Seed. Der trägt
  // keins — würde man ihn fragen, stünde in der Mail „einen belegten Stand haben
  // wir bisher nicht", während unsere eigene Seite ein Prüfdatum ausweist. Eine
  // Behörde, die beides nebeneinander sieht, hat allen Grund, uns nicht zu
  // glauben.
  const prog = await hole<{ last_verified: string | null }>(d, `funding_programs?id=eq.${id}&select=last_verified`);
  const standIso = prog[0]?.last_verified ?? p.lastVerified ?? null;

  const angaben = OFFENE_FRAGEN[id];
  const entwurf = renderInquiryDraft({
    programName: p.name,
    traeger: p.traeger,
    url: p.url,
    hinterlegt,
    standIso,
    anlass: angaben ? { art: "widerspruch", angaben } : { art: "unerreichbar" },
    unsereSeite: await unsereSeiteZu(id),
  });

  const fehlt = fehlendePflichtangaben(entwurf.body);
  if (fehlt.length) abbruch(`Pflichtangaben fehlen: ${fehlt.join(", ")}`);

  const an = await empfaengerFuer(d, id);
  if (!an) abbruch(`Kein Rollen-Postfach für ${p.traeger} (${p.agsCode}) hinterlegt.`);
  const zeilen = await hole<{ website: string | null }>(
    d,
    `kommunen_kontakt?region_id=eq.${p.agsCode}&select=website`,
  );
  const befund = postfachBefund(an, p.region, zeilen[0]?.website ?? undefined);
  if (!befund.ok) abbruch(`Postfach abgewiesen: ${befund.grund}`);

  return {
    id,
    traeger: p.traeger,
    an,
    anlass: angaben ? "widerspruch" : "unerreichbar",
    subject: entwurf.subject,
    body: entwurf.body,
  };
}

/**
 * Das Rollen-Postfach der zuständigen Stelle.
 *
 * Geraten wird nichts — eine erfundene Amtsadresse kommt als Unzustellbarkeit
 * zurück, im besten Fall.
 */
async function empfaengerFuer(d: Db, id: string): Promise<string | null> {
  const { FUNDING_PROGRAMS } = await import("../lib/funding-programs");
  const ags = FUNDING_PROGRAMS[id]?.agsCode;
  if (!ags) return null;
  const zeilen = await hole<{ rollen_email: string | null }>(
    d,
    `kommunen_kontakt?region_id=eq.${ags}&select=rollen_email`,
  );
  return zeilen[0]?.rollen_email ?? null;
}

// ─── Verschicken und protokollieren ──────────────────────────────────────────

/**
 * DER EINTRAG ENTSTEHT VOR DEM VERSAND, nicht danach.
 *
 * Bricht der Lauf zwischen zwei Empfängern ab, darf der Neustart niemanden ein
 * zweites Mal anschreiben. Der Preis ist ein Eintrag ohne Beleg im Fehlerfall —
 * und das ist die günstigere Richtung: Ein Protokoll, das eine Mail zu viel
 * behauptet, kostet eine Nachfrage; eines, das eine verschweigt, kostet die
 * Zusage „kein Nachfassen". Dieselbe Bauform wie im Abo-Versandlauf und in der
 * Umstellungs-Nachricht.
 */
async function merkeAnfrage(d: Db, f: Fertig): Promise<number> {
  const r = await fetch(`${d.url}/rest/v1/funding_anfragen`, {
    method: "POST",
    headers: { ...d.kopf, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      program_id: f.id,
      traeger: f.traeger,
      empfaenger: f.an,
      anlass: f.anlass,
      betreff: f.subject,
      text: f.body,
    }),
  });
  if (!r.ok) abbruch(`Protokoll-Eintrag fehlgeschlagen (${r.status}) — es wird nichts verschickt.`);
  const [zeile] = (await r.json()) as { id: number }[];
  return zeile.id;
}

async function belegNachtragen(d: Db, eintragId: number, beleg: string | undefined) {
  await fetch(`${d.url}/rest/v1/funding_anfragen?id=eq.${eintragId}`, {
    method: "PATCH",
    headers: { ...d.kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ beleg: beleg ?? null }),
  });
}

async function baueTransport() {
  const { leseSmtpKonfig } = await import("../lib/outreach-mail");
  const smtp = leseSmtpKonfig(process.env);
  if (!smtp.ok) abbruch(`Versandweg nicht einsatzbereit: ${smtp.fehler.join(" · ")}`);
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: smtp.konfig.host,
    port: smtp.konfig.port,
    secure: smtp.konfig.port === 465,
    auth: { user: smtp.konfig.user, pass: smtp.konfig.pass },
  });
  // Verbindung PRÜFEN, bevor die erste Mail gebaut wird — sonst scheitert der
  // Lauf an Mail 1 von 3 und hinterlässt einen halben Schub.
  await transport.verify();
  return { transport, konfig: smtp.konfig };
}

async function verschicke(d: Db, fertige: Fertig[]) {
  const { transport, konfig } = await baueTransport();
  try {
    for (const f of fertige) {
      const eintragId = await merkeAnfrage(d, f);
      const info = await transport.sendMail({
        from: konfig.from,
        to: f.an,
        replyTo: konfig.replyTo,
        subject: f.subject,
        text: f.body,
      });
      await belegNachtragen(d, eintragId, info.messageId);
      console.log(`  verschickt an ${f.an} · ${f.id} · Beleg ${info.messageId}`);
    }
  } finally {
    transport.close();
  }
}

// ─── Die drei Betriebsarten ──────────────────────────────────────────────────

async function zeigeListe(d: Db) {
  const { ohneAntwort, offenSeitTagen, OHNE_ANTWORT_AB_TAGEN } = await import("../lib/funding-anfragen");
  const { heuteInBerlin } = await import("../lib/zeit");
  const zeilen = await hole<{
    program_id: string;
    traeger: string | null;
    empfaenger: string;
    anlass: string;
    gesendet_am: string;
    antwort_am: string | null;
    antwort_art: string | null;
  }>(d, "funding_anfragen?select=program_id,traeger,empfaenger,anlass,gesendet_am,antwort_am,antwort_art&order=gesendet_am.desc");

  if (!zeilen.length) {
    console.log("Es ist noch keine Anfrage hinausgegangen.");
    return;
  }

  console.log(`Verschickte Anfragen: ${zeilen.length}\n`);
  for (const z of zeilen) {
    const antwort = z.antwort_am ? `beantwortet ${z.antwort_am.slice(0, 10)} (${z.antwort_art ?? "—"})` : "ohne Antwort";
    console.log(`  ${z.gesendet_am.slice(0, 10)}  ${z.program_id}  ${z.traeger ?? ""}  → ${z.empfaenger}  [${z.anlass}]  ${antwort}`);
  }

  const anfragen = zeilen.map((z) => ({
    programId: z.program_id,
    empfaenger: z.empfaenger,
    gesendetAm: z.gesendet_am,
    antwortAm: z.antwort_am,
    antwortArt: z.antwort_art,
  }));
  const heute = heuteInBerlin();
  const offen = ohneAntwort(anfragen, heute);
  console.log(`\nOhne Antwort seit mehr als ${OHNE_ANTWORT_AB_TAGEN} Tagen: ${offen.length}`);
  for (const a of offen) {
    console.log(`  ${a.programId}  →  ${a.empfaenger}  ·  ${offenSeitTagen(a, heute)} Tage`);
  }
  if (offen.length) {
    // KEINE zweite Mail. Was hier steht, ist Arbeitsvorrat für einen Menschen:
    // anrufen, oder das Programm auf „unsicher" nehmen und den Abzug streichen.
    console.log('\n  Kein Nachfassen per Mail — entweder anrufen oder das Programm auf „unsicher" setzen.');
  }
}

async function autoLauf(d: Db, senden: boolean) {
  const { FUNDING_PROGRAMS } = await import("../lib/funding-programs");
  const { arbeitsvorrat } = await import("../lib/funding-verify-state");
  const { faelligeAnfragen } = await import("../lib/funding-anfragen");
  const { heuteInBerlin } = await import("../lib/zeit");

  // Die Spalte heißt in der Tabelle `source` und im Modell `erreichbarkeit` —
  // dieselbe Umbenennung nimmt der Prüflauf vor, aus dem der Zustand stammt.
  const versuche = await hole<{ program_id: string; checked_at: string; source: string }>(
    d,
    "funding_checks?select=program_id,checked_at,source&order=checked_at.asc",
  );
  const programme = await hole<{ id: string; last_verified: string | null }>(
    d,
    "funding_programs?select=id,last_verified&archived=eq.false",
  );

  const katalog = programme
    .filter((z) => FUNDING_PROGRAMS[z.id])
    .map((z) => ({
      id: z.id,
      level: FUNDING_PROGRAMS[z.id].level,
      lastVerified: z.last_verified ?? undefined,
    }));

  const stand = arbeitsvorrat(
    katalog,
    versuche.map((v) => ({
      programId: v.program_id,
      checkedAt: v.checked_at,
      erreichbarkeit: v.source as never,
    })),
    heuteInBerlin(),
  );

  const gefragt = new Set(
    (await hole<{ program_id: string }>(d, "funding_anfragen?select=program_id")).map((z) => z.program_id),
  );

  const kandidaten = [];
  for (const s of stand.filter((x) => x.eskalation)) {
    kandidaten.push({
      programId: s.programId,
      eskaliert: true,
      empfaenger: await empfaengerFuer(d, s.programId),
    });
  }

  const { senden: zuSenden, uebersprungen } = faelligeAnfragen(kandidaten, gefragt);

  console.log(`Eskaliert (drei Läufe ohne Amtsquelle): ${kandidaten.length}`);
  for (const u of uebersprungen) console.log(`  übersprungen: ${u.programId} — ${u.grund}`);
  if (!zuSenden.length) {
    console.log("Nichts zu fragen.");
    return;
  }
  console.log(`Fällig: ${zuSenden.join(", ")}`);

  const fertige = [];
  for (const id of zuSenden) fertige.push(await baueAnfrage(d, id));

  if (!senden) {
    for (const f of fertige) console.log(`\n--- ${f.id} → ${f.an}\n${f.subject}\n\n${f.body}`);
    console.log("\n— nur angesehen. Zum Abschicken: --senden");
    return;
  }
  await verschicke(d, fertige);
}

async function main() {
  ladeEnv();
  const d = db();

  if (hatFlag("liste")) return zeigeListe(d);
  if (hatFlag("auto")) return autoLauf(d, hatFlag("senden"));

  const id = arg("programm");
  if (!id) abbruch("Aufruf: npm run foerder:anfrage -- [--programm=<kennung> | --auto | --liste] [--senden]");

  const gefragt = await hole<{ gesendet_am: string }>(
    d,
    `funding_anfragen?program_id=eq.${id}&select=gesendet_am`,
  );
  if (gefragt.length && hatFlag("senden")) {
    abbruch(
      `Zu ${id} ging am ${gefragt[0].gesendet_am.slice(0, 10)} schon eine Frage hinaus. Kein Nachfassen — das ist die Zusage, die den Weg trägt.`,
    );
  }

  const f = await baueAnfrage(d, id);
  console.log(`An:      ${f.an}`);
  console.log(`Träger:  ${f.traeger}`);
  console.log(`Betreff: ${f.subject}`);
  console.log("");
  console.log(f.body);
  console.log("");

  if (!hatFlag("senden")) {
    console.log("— nur angesehen. Zum Abschicken: --senden");
    return;
  }
  await verschicke(d, [f]);
}

// NUR LOSLAUFEN, WENN DIESE DATEI DER AUFGERUFENE BEFEHL IST.
//
// Der Test importiert die Liste der offenen Fragen aus dieser Datei. Ohne diese
// Grenze startete dabei der ganze Lauf — im günstigen Fall bricht er ab und
// nimmt den Testlauf mit, im ungünstigen fragt er die Datenbank. Genau diese
// Fehlerklasse hat im Repo schon einmal einen CI-Schritt gekippt, und lokal war
// sie unsichtbar.
const direktAufgerufen = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direktAufgerufen) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
