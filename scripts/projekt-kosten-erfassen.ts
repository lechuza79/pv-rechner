/**
 * ERFASST, WAS DIESES PROJEKT AN GELD GEKOSTET HAT — aus der Buchhaltung.
 *
 * Schwesterlauf zu `projekt-statistik-erfassen.ts` und aus demselben Grund
 * LOKAL: Die Buchungsunterlagen liegen auf dem Rechner des Betreibers.
 *
 * Aufruf:
 *   npm run kosten:erfassen                 — nur rechnen und zeigen
 *   npm run kosten:erfassen -- --schreiben
 *   npm run kosten:erfassen -- --bilanz     — die Gesamtübersicht dazu
 *
 * ES WIRD NUR GELESEN, WAS HIERHER GEHÖRT — und das ist keine Höflichkeit,
 * sondern Datensparsamkeit: Die Buchungsunterlagen enthalten Honorare, Namen von
 * Kunden, Steuernummern und private Abhebungen. Abgelegt wird ausschließlich
 * eine Monatssumme je bekanntem Anbieter; jede Zeile, die auf kein Anbieter-
 * muster passt, wird verworfen, bevor irgendetwas geschrieben wird. Was nicht
 * abgelegt wird, kann auch nicht auslaufen.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import * as unzipper from "unzipper";
import {
  ANBIETER,
  anbieterFuer,
  summiereKosten,
  listenwertUsd,
  type Kostenmonat,
  type Listenwerttag,
} from "../lib/projekt-kosten";
import { bilanz, STUNDENSATZ_EUR, STUNDENSATZ_BELEG } from "../lib/projekt-bilanz";
import { schaetzeAufwand, type Zaehlstand } from "../lib/aufwand-schaetzung";
import { WIDGETS } from "../lib/widget-registry";
import { allFundingPrograms } from "../lib/funding-programs";
import { summiere, tagVon, type Statistiktag, type Bestandstag } from "../lib/projekt-statistik";
import { KURS_USD_EUR, PREISE_STAND } from "../lib/modellpreise";
import { heuteInBerlin } from "../lib/zeit";

const SCHREIBEN = process.argv.includes("--schreiben");
const BILANZ = process.argv.includes("--bilanz");

/**
 * Wo die Buchungsübersichten liegen.
 *
 * Überschreibbar, weil der Ort eine Eigenheit dieses einen Rechners ist und
 * kein Projektwissen. Fehlt er, sagt der Lauf das und hört auf — er rät nicht.
 */
const BUCHHALTUNG =
  process.env.BUCHHALTUNG_PFAD ??
  join(homedir(), "Dropbox", "01 Buha Freelance", "Rechnungen Freelance");

const PROTOKOLLE = join(homedir(), ".claude", "projects");
const PRAEFIX = "-Users-eule-projects-pv-rechner";

// ─── Buchungen lesen ─────────────────────────────────────────────────────────

interface Buchung {
  monat: string;
  betrag: number;
  gegenpartei: string;
  zweck: string;
}

/** Deutsches Zahlenformat („-1.234,56") in eine Zahl. */
function betragAus(roh: string): number | null {
  const s = roh.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Die Quartals-Übersichten im Textformat.
 *
 * Getrennt durch Semikolon, mit Kopfzeile. Zwischenüberschriften („== JANUAR ==")
 * tragen kein gültiges Datum und fallen deshalb von selbst heraus — es braucht
 * keine Sonderbehandlung, nur die Datumsprüfung.
 */
function leseCsv(datei: string): Buchung[] {
  const out: Buchung[] = [];
  let inhalt: string;
  try { inhalt = readFileSync(datei, "utf8"); } catch { return out; }
  const zeilen = inhalt.replace(/^\uFEFF/, "").split("\n");
  const kopf = zeilen[0]?.split(";").map((s) => s.trim()) ?? [];
  const i = {
    datum: kopf.indexOf("Datum"),
    betrag: kopf.findIndex((s) => s.startsWith("Betrag")),
    gegen: kopf.indexOf("Gegenpartei"),
    zweck: kopf.indexOf("Zweck"),
  };
  if (i.datum < 0 || i.betrag < 0) return out;

  for (const z of zeilen.slice(1)) {
    const f = z.split(";");
    const d = (f[i.datum] ?? "").trim().replace(/^"|"$/g, "");
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(d)) continue;
    const b = betragAus(f[i.betrag] ?? "");
    if (b === null) continue;
    out.push({
      monat: `${d.slice(6)}-${d.slice(3, 5)}`,
      betrag: b,
      gegenpartei: (f[i.gegen] ?? "").trim(),
      zweck: (f[i.zweck] ?? "").trim(),
    });
  }
  return out;
}

/**
 * Die Quartals-Übersichten im Tabellenformat.
 *
 * DIE VORZEICHEN STEHEN HIER IN EINER EIGENEN SPALTE, nicht am Betrag: Eine
 * Ausgabe ist als „Soll" mit positivem Betrag notiert. Wer das übersieht,
 * bekommt Ausgaben und Einnahmen mit gleichem Vorzeichen — und eine Summe, die
 * plausibel aussieht und das Doppelte behauptet.
 */
async function leseXlsx(datei: string): Promise<Buchung[]> {
  const out: Buchung[] = [];
  let dir: unzipper.CentralDirectory;
  try { dir = await unzipper.Open.buffer(readFileSync(datei)); } catch { return out; }

  const hol = async (name: string): Promise<string> => {
    const e = dir.files.find((f) => f.path === name);
    if (!e) return "";
    return (await e.buffer()).toString("utf8");
  };

  // Die Texte einer Tabelle stehen zentral, die Zellen verweisen nur mit einer
  // Nummer darauf.
  const texte: string[] = [];
  const sst = await hol("xl/sharedStrings.xml");
  for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    texte.push([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => entschaerft(x[1])).join(""));
  }

  for (const f of dir.files) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(f.path)) continue;
    const blatt = (await f.buffer()).toString("utf8");
    for (const zeile of blatt.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      // ZWEI FALLEN AUF EINMAL, beide von außen unsichtbar:
      //
      //  1. Der Zelltyp wird aus dem Tag-Kopf GESONDERT gelesen. Die Attribute
      //     stehen in beliebiger Reihenfolge, und ein Muster, das in einem Zug
      //     über sie hinwegliest, verschluckt das t="s" — dann steht statt des
      //     Textes seine laufende Nummer in der Zelle.
      //  2. Die Spalte kommt aus der ZELLADRESSE, nicht aus der Reihenfolge.
      //     Eine leere Zelle wird gar nicht erst geschrieben; wer die Zellen
      //     einer Zeile durchzählt, bekommt ab der ersten Lücke jede Angabe in
      //     der falschen Spalte — und die Zeile sieht dabei vollständig aus.
      const zellen: string[] = [];
      for (const c of zeile[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const kopf = c[1];
        const inhalt = c[2] ?? "";
        const typ = /\bt="([^"]*)"/.exec(kopf)?.[1];
        const roh = /<v>([\s\S]*?)<\/v>/.exec(inhalt)?.[1] ?? "";
        const wert =
          typ === "s" ? (texte[Number(roh)] ?? "")
          : typ === "inlineStr"
            ? [...inhalt.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => entschaerft(x[1])).join("")
            : entschaerft(roh);
        const spalte = spalteAus(/\br="([A-Z]+)\d+"/.exec(kopf)?.[1]);
        if (spalte === null) zellen.push(wert);
        else {
          while (zellen.length < spalte) zellen.push("");
          zellen[spalte] = wert;
        }
      }
      const d = (zellen[0] ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      const roh = Number(zellen[2]);
      if (!Number.isFinite(roh)) continue;
      const istAusgabe = (zellen[1] ?? "").trim().toLowerCase() === "soll";
      out.push({
        monat: d.slice(0, 7),
        betrag: istAusgabe ? -Math.abs(roh) : Math.abs(roh),
        gegenpartei: zellen[3] ?? "",
        zweck: zellen[4] ?? "",
      });
    }
  }
  return out;
}

/** Spaltenbuchstaben („A", „AB") in einen Index ab null. */
export function spalteAus(buchstaben: string | undefined): number | null {
  if (!buchstaben) return null;
  let n = 0;
  for (const c of buchstaben) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function entschaerft(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Alle Übersichtsdateien unter dem Buchhaltungsordner, gleich welcher Tiefe.
 *
 * DER NAME WIRD NORMALISIERT, BEVOR ER VERGLICHEN WIRD — BLOCKER auf dieser
 * Plattform. macOS legt Dateinamen in ZERLEGTER Form ab: Das „Ü" in „Übersicht"
 * ist dort ein U plus ein Trema-Zeichen, im Quelltext dagegen ein einzelnes
 * Zeichen. Beide sehen im Terminal identisch aus, und der Vergleich schlägt
 * trotzdem fehl. Beim Bauen genau so passiert: Der Lauf meldete „0 Buchungen
 * gelesen" und sah aus, als gäbe es die Dateien nicht.
 */
function uebersichten(wurzel: string): string[] {
  const out: string[] = [];
  const lauf = (v: string, tiefe: number) => {
    if (tiefe > 3) return;
    let e: string[];
    try { e = readdirSync(v); } catch { return; }
    for (const name of e) {
      const voll = join(v, name);
      let s;
      try { s = statSync(voll); } catch { continue; }
      if (s.isDirectory()) { lauf(voll, tiefe + 1); continue; }
      // Die Sperre für „~$…" gilt den Sicherungskopien, die ein
      // Tabellenprogramm neben einer geöffneten Datei anlegt.
      if (istUebersicht(name)) out.push(voll);
    }
  };
  lauf(wurzel, 0);
  return out.sort();
}

export function istUebersicht(dateiname: string): boolean {
  const n = dateiname.normalize("NFC");
  return /^Übersicht.*\.(csv|xlsx)$/i.test(n) && !n.startsWith("~$");
}

async function leseKosten(): Promise<{ zeilen: Kostenmonat[]; gelesen: number; verworfen: number }> {
  const dateien = uebersichten(BUCHHALTUNG);
  const roh: Buchung[] = [];
  for (const d of dateien) {
    roh.push(...(d.toLowerCase().endsWith(".xlsx") ? await leseXlsx(d) : leseCsv(d)));
  }

  const je = new Map<string, Kostenmonat>();
  let verworfen = 0;
  for (const b of roh) {
    const a = anbieterFuer(b.gegenpartei, b.zweck);
    if (!a) { verworfen++; continue; }
    const k = `${a.schluessel}|${b.monat}`;
    const z = je.get(k) ?? { monat: b.monat, anbieter: a.schluessel, betragEur: 0, buchungen: 0 };
    // Ausgaben stehen in der Buchhaltung negativ; hier zählen sie positiv, weil
    // eine Kostenreihe mit negativen Zahlen bei jeder Verwendung ein Vorzeichen
    // braucht. Erstattungen bleiben dadurch abziehend, und das ist richtig.
    z.betragEur += -b.betrag;
    z.buchungen++;
    je.set(k, z);
  }

  const zeilen = [...je.values()]
    .map((z) => ({ ...z, betragEur: Math.round(z.betragEur * 100) / 100 }))
    .sort((a, b) => a.monat.localeCompare(b.monat) || a.anbieter.localeCompare(b.anbieter));
  return { zeilen, gelesen: roh.length, verworfen };
}

// ─── Listenwert je Tag und Modell ────────────────────────────────────────────

/**
 * Was die Rechenleistung gekostet hätte — je Tag UND je Modell.
 *
 * DAS MODELL IST PFLICHT, nicht Zierde: Zwischen dem günstigsten und dem
 * teuersten hier verwendeten Modell liegt beim Eingabepreis das Zehnfache. Eine
 * Tagessumme ohne Modell ließe sich später keinem Preis mehr zuordnen — und die
 * Protokolle, aus denen sie stammt, sind nach dreißig Tagen weg.
 */
function leseListenwert(): Listenwerttag[] {
  const je = new Map<string, Listenwerttag>();
  let verzeichnisse: string[] = [];
  try {
    verzeichnisse = readdirSync(PROTOKOLLE).filter((d) => d.startsWith(PRAEFIX));
  } catch { return []; }

  for (const d of verzeichnisse) {
    let dateien: string[];
    try { dateien = readdirSync(join(PROTOKOLLE, d)).filter((f) => f.endsWith(".jsonl")); }
    catch { continue; }
    for (const f of dateien) {
      let inhalt: string;
      try { inhalt = readFileSync(join(PROTOKOLLE, d, f), "utf8"); } catch { continue; }
      for (const zeile of inhalt.split("\n")) {
        if (!zeile.startsWith("{")) continue;
        let o: any;
        try { o = JSON.parse(zeile); } catch { continue; }
        if (o.type !== "assistant") continue;
        const u = o.message?.usage;
        const modell: string | undefined = o.message?.model;
        if (!u || !modell || modell === "<synthetic>") continue;
        const ts = o.timestamp ? Date.parse(o.timestamp) : NaN;
        if (!Number.isFinite(ts)) continue;
        const tag = tagVon(ts);
        const k = `${tag}|${modell}`;
        const t = je.get(k) ?? {
          tag, modell, tokensGelesen: 0, tokensSchreibenKurz: 0,
          tokensSchreibenLang: 0, tokensEingabe: 0, tokensAusgabe: 0,
        };
        t.tokensGelesen += u.cache_read_input_tokens ?? 0;
        t.tokensSchreibenKurz += u.cache_creation?.ephemeral_5m_input_tokens ?? 0;
        t.tokensSchreibenLang += u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
        t.tokensEingabe += u.input_tokens ?? 0;
        t.tokensAusgabe += u.output_tokens ?? 0;
        je.set(k, t);
      }
    }
  }
  const heute = heuteInBerlin();
  return [...je.values()].filter((t) => t.tag !== heute).sort((a, b) => a.tag.localeCompare(b.tag));
}

// ─── Ablage ──────────────────────────────────────────────────────────────────

async function schreibe(pfad: string, zeilen: unknown[]): Promise<void> {
  if (!zeilen.length) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Zugangsdaten für die Ablage fehlen");
  for (let i = 0; i < zeilen.length; i += 200) {
    const r = await fetch(`${url}/rest/v1/${pfad}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(zeilen.slice(i, i + 200)),
    });
    if (!r.ok) throw new Error(`${pfad}: ${r.status} ${await r.text()}`);
  }
}

async function leseStatistik(): Promise<{ tage: Statistiktag[]; minuten: number; arbeitstage: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { tage: [], minuten: 0, arbeitstage: 0 };
  const hol = async (p: string) => {
    const r = await fetch(`${url}/rest/v1/${p}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return r.ok ? ((await r.json()) as any[]) : [];
  };
  const roh = await hol("projekt_statistik?select=*");
  const zeit = await hol("projekt_arbeitszeit?select=*");
  const tage: Statistiktag[] = roh.map((r) => ({
    tag: r.tag, werkzeug: r.werkzeug, herkunft: r.herkunft,
    tokensGelesen: Number(r.tokens_gelesen), tokensNeu: Number(r.tokens_neu),
    tokensEingabe: Number(r.tokens_eingabe), tokensAusgabe: Number(r.tokens_ausgabe),
    sitzungen: r.sitzungen, nachrichtenGetippt: r.nachrichten_getippt,
    nachrichtenLang: r.nachrichten_lang, antworten: r.antworten,
    werkzeugschritte: r.werkzeugschritte, commits: r.commits,
  }));
  return {
    tage,
    minuten: zeit.reduce((s, z) => s + Number(z.minuten), 0),
    arbeitstage: zeit.length,
  };
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function zahlDerDateien(...pathspec: string[]): number {
  return git("ls-files", ...pathspec).trim().split("\n").filter(Boolean).length;
}

/**
 * Die Mengen, mit denen die Aufwandsschätzung rechnet.
 *
 * GEZÄHLT, NICHT GEPFLEGT — bis auf die Rechner. Eine Liste, die jemand von
 * Hand nachziehen müsste, ist beim dritten Mal falsch; deshalb kommt alles aus
 * dem Dateibaum bzw. aus den Registern, die es ohnehin gibt.
 *
 * Die Rechner sind die Ausnahme, weil sie sich aus keinem Muster ableiten
 * lassen: Eine Rechnerseite sieht im Dateibaum aus wie jede andere Seite. Sie
 * stehen deshalb namentlich hier, und ein sechster fiele auf, weil ihn jemand
 * eintragen muss — das ist bei fünf Einträgen in einem halben Jahr vertretbar.
 */
function zaehlstand(): Zaehlstand {
  const RECHNER = [
    "Photovoltaik", "Wärmepumpe", "Balkonkraftwerk", "Klimaanlage", "Einspeisevergütung",
  ];
  return {
    rechner: RECHNER.length,
    seiten: zahlDerDateien("app/**/page.tsx"),
    widgets: Object.keys(WIDGETS).length,
    routen: zahlDerDateien("app/**/route.ts"),
    komponenten: zahlDerDateien("components/*.tsx", "components/**/*.tsx"),
    foerderprogramme: allFundingPrograms().length,
  };
}

async function bestandLesen(): Promise<Bestandstag | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/projekt_bestand?select=*&order=tag.desc&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) return null;
  const [z] = (await r.json()) as any[];
  if (!z) return null;
  return {
    tag: z.tag, dateien: z.dateien, codezeilen: z.codezeilen, dokuzeilen: z.dokuzeilen,
    testdateien: z.testdateien, testfaelle: z.testfaelle, commitsGesamt: z.commits_gesamt,
  };
}

// ─── Ausgabe ─────────────────────────────────────────────────────────────────

const z = (n: number) => n.toLocaleString("de-DE");
const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
const usd = (n: number) => `${Math.round(n).toLocaleString("de-DE")} $`;

async function main() {
  if (!existsSync(BUCHHALTUNG)) {
    console.error(`Die Buchungsunterlagen liegen nicht unter ${BUCHHALTUNG}.`);
    console.error("Anderer Ort: BUCHHALTUNG_PFAD setzen.");
    process.exit(1);
  }

  const { zeilen, gelesen, verworfen } = await leseKosten();
  const s = summiereKosten(zeilen);
  const listenwert = leseListenwert();
  const listenwertSumme = listenwert.reduce((x, t) => x + (listenwertUsd(t) ?? 0), 0);
  const ohnePreis = listenwert.filter((t) => listenwertUsd(t) === null);

  console.log(`Buchungen gelesen: ${z(gelesen)}, davon hierher gehörend ${z(gelesen - verworfen)}`);
  console.log(`Zeitraum:          ${zeilen[0]?.monat} bis ${zeilen[zeilen.length - 1]?.monat} (${s.monate} Monate)\n`);

  const proAnbieter = new Map<string, number>();
  for (const x of zeilen) proAnbieter.set(x.anbieter, (proAnbieter.get(x.anbieter) ?? 0) + x.betragEur);
  console.log("Anbieter                     alle Projekte   Anteil   Solar Check");
  for (const a of ANBIETER) {
    const g = proAnbieter.get(a.schluessel);
    if (g === undefined) continue;
    const kennzeichen = a.anteil.herkunft === "geschaetzt" ? " *" : "";
    console.log(
      `${a.name.padEnd(30)}${eur(g).padStart(10)}` +
      `${(Math.round(a.anteil.anteil * 100) + " %" + kennzeichen).padStart(10)}` +
      `${eur(g * a.anteil.anteil).padStart(12)}`,
    );
  }
  console.log(`${"".padEnd(30)}${eur(s.gesamtEur).padStart(10)}${"".padStart(10)}${eur(s.solarCheckEur).padStart(12)}`);
  console.log("  * geschätzter Anteil, kein messbarer Schlüssel\n");

  console.log(`Listenwert der Rechenleistung: ${usd(listenwertSumme)} an ${z(new Set(listenwert.map((t) => t.tag)).size)} Tagen`);
  console.log(`  (Preisliste vom ${PREISE_STAND}, Kurs ${KURS_USD_EUR} — nur dieses Projekt, nur erhaltene Protokolle)`);
  if (ohnePreis.length) {
    const namen = [...new Set(ohnePreis.map((t) => t.modell))];
    console.log(`  OHNE PREIS und deshalb nicht gerechnet: ${namen.join(", ")}`);
  }

  if (BILANZ) {
    const st = await leseStatistik();
    const bestand = await bestandLesen();
    if (!bestand) {
      console.log("\nFür die Übersicht fehlt der Bestand — erst die Statistik erfassen.");
    } else {
      const claude = summiere(st.tage.filter((t) => t.werkzeug === "claude"));
      const codex = summiere(st.tage.filter((t) => t.werkzeug === "codex"));
      const aufwand = schaetzeAufwand(bestand, zaehlstand());

      // Die Frühphase hat keine Zeitmessung — ihre Protokolle sind gelöscht.
      // Hochgerechnet wird über die Änderungen, mit dem Verhältnis, das im
      // gemessenen Zeitraum galt: dieselbe Regel wie bei den Tokens. Sie steht
      // getrennt und wird NICHT in die Messreihe geschrieben.
      const gemessen = st.tage.filter((t) => t.herkunft === "gemessen" && t.werkzeug === "claude");
      const geschaetzt = st.tage.filter((t) => t.herkunft === "geschaetzt");
      const commitsGemessen = gemessen.reduce((x, t) => x + t.commits, 0);
      const commitsGeschaetzt = geschaetzt.reduce((x, t) => x + t.commits, 0);
      const stundenHochgerechnet = commitsGemessen > 0
        ? Math.round((st.minuten / 60 / commitsGemessen) * commitsGeschaetzt)
        : 0;

      // Nur die Monate, für die BEIDE Größen vorliegen — sonst teilt das
      // Verhältnis eine Vierwochen-Rechenleistung durch ein halbes Jahr Kosten.
      const monateMitListenwert = new Set(listenwert.map((t) => t.tag.slice(0, 7)));
      const ueberlappendeMonate = [...new Set(zeilen.map((x) => x.monat))]
        .filter((m) => monateMitListenwert.has(m));
      const ueberlappung = {
        bezahltEur: summiereKosten(zeilen.filter((x) => ueberlappendeMonate.includes(x.monat))).solarCheckEur,
        listenwertUsd: listenwert
          .filter((t) => ueberlappendeMonate.includes(t.tag.slice(0, 7)))
          .reduce((x, t) => x + (listenwertUsd(t) ?? 0), 0),
        monate: ueberlappendeMonate.length,
      };

      const tageMitListenwert = [...new Set(listenwert.map((t) => t.tag))].sort();
      const b = bilanz({
        statistik: claude, codexStatistik: codex,
        arbeitsminuten: st.minuten, arbeitstage: st.arbeitstage,
        stundenHochgerechnet,
        kosten: s, listenwertUsd: listenwertSumme, ueberlappung, bestand, aufwand,
        zeitraum: {
          zeit: gemessen.length
            ? { von: gemessen[0].tag, bis: gemessen[gemessen.length - 1].tag }
            : null,
          geld: zeilen.length
            ? { von: zeilen[0].monat, bis: zeilen[zeilen.length - 1].monat }
            : null,
          listenwert: tageMitListenwert.length
            ? { von: tageMitListenwert[0], bis: tageMitListenwert[tageMitListenwert.length - 1] }
            : null,
        },
      });
      const raum = (r: { von: string; bis: string } | null) => (r ? ` [${r.von} bis ${r.bis}]` : "");
      const i = b.investiert;
      console.log("\n── Übersicht ──────────────────────────────────────────────");
      console.log("INVESTIERT");
      console.log(`  Zeit            ${z(i.stunden)} Stunden an ${z(i.arbeitstage)} Tagen${raum(i.zeitraum.zeit)}`);
      if (i.stundenHochgerechnet) {
        console.log(`                  + ${z(i.stundenHochgerechnet)} Stunden hochgerechnet für die Zeit ohne Protokolle`);
      }
      console.log(`  Geld            ${eur(i.bezahltEur)}${raum(i.zeitraum.geld)}`);
      console.log(`                  alle Projekte zusammen ${eur(i.bezahltAlleProjekteEur)}`);
      console.log(`  Rechenleistung  ${(i.tokens / 1e9).toFixed(1)} Mrd. Tokens (ganze Laufzeit, Frühphase hochgerechnet)`);
      console.log(`                  Listenwert ${usd(i.listenwertUsd)}${raum(i.zeitraum.listenwert)}`);
      console.log("ENTSTANDEN");
      console.log(`  ${z(b.entstanden.codezeilen)} Zeilen Code, ${z(b.entstanden.dokuzeilen)} Zeilen Doku`);
      console.log(`  ${z(b.entstanden.testfaelle)} Prüfungen, ${z(b.entstanden.dateien)} Dateien, ${z(b.entstanden.commits)} Änderungen`);
      console.log("WERT (geschätzt, nicht gemessen)");
      console.log(`  ${z(b.wert.personentage)} Personentage (${b.wert.personenjahre} Personenjahre)`);
      console.log(`  ${eur(b.wert.eur)} zum Satz ${eur(STUNDENSATZ_EUR)}/Stunde — Spanne ${eur(b.wert.vonEur)} bis ${eur(b.wert.bisEur)}`);
      console.log(`  Satz: ${STUNDENSATZ_BELEG}`);
      console.log("VERHÄLTNIS");
      if (b.hebelGeld) console.log(`  ${b.hebelGeld}× — Herstellwert je bezahltem Euro`);
      if (b.hebelRechenleistung) {
        console.log(`  ${b.hebelRechenleistung}× — Listenwert der Rechenleistung je bezahltem Euro` +
          ` (nur die ${b.hebelRechenleistungMonate} Monate, für die beide Zahlen vorliegen)`);
      }
      if (b.hebelZeit) console.log(`  ${b.hebelZeit}× — geschätzte gegen tatsächlich gearbeitete Personentage`);
    }
  }

  if (!SCHREIBEN) {
    console.log("\nProbelauf — nichts geschrieben. Mit --schreiben ablegen.");
    return;
  }

  await schreibe("projekt_kosten", zeilen.map((x) => ({
    monat: x.monat, anbieter: x.anbieter, betrag_eur: x.betragEur, buchungen: x.buchungen,
  })));
  await schreibe("projekt_listenwert", listenwert
    .filter((t) => listenwertUsd(t) !== null)
    .map((t) => ({
      tag: t.tag, modell: t.modell,
      tokens_gelesen: t.tokensGelesen,
      tokens_schreiben_kurz: t.tokensSchreibenKurz,
      tokens_schreiben_lang: t.tokensSchreibenLang,
      tokens_eingabe: t.tokensEingabe,
      tokens_ausgabe: t.tokensAusgabe,
      listenwert_usd: Math.round((listenwertUsd(t) ?? 0) * 100) / 100,
    })));
  console.log(`\nAbgelegt: ${z(zeilen.length)} Monatszeilen, ${z(listenwert.length)} Tageszeilen.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
