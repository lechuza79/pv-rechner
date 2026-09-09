/**
 * ERFASST, WAS DIESES PROJEKT GEKOSTET HAT — täglich, lokal.
 *
 * Der Lauf muss LOKAL laufen und lässt sich nicht in die Cloud verlagern: Die
 * Gesprächsprotokolle liegen auf dem Rechner des Betreibers und nirgends sonst.
 * Genau deshalb gibt es ihn — Claude Code räumt sie nach dreißig Tagen weg, und
 * die erste Projekthälfte (März bis Juli 2026) ist auf diese Weise bereits
 * verloren gegangen, ohne Sicherung und ohne dass es jemandem aufgefallen wäre.
 *
 * Aufruf:
 *   npm run stats:erfassen              — nur rechnen und zeigen
 *   npm run stats:erfassen -- --schreiben
 *   npm run stats:erfassen -- --schreiben --rueckrechnen
 *
 * DIE RÜCKRECHNUNG IST EINE EIGENE ANSAGE. Sie erfindet Tage, für die es keine
 * Protokolle gibt, und darf deshalb nicht beiläufig mitlaufen.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  type Statistiktag,
  type Bestandstag,
  kennwertAus,
  schaetzeTag,
  summiere,
  verteileZeit,
  tagVon,
  type Block,
} from "../lib/projekt-statistik";
import { heuteInBerlin } from "../lib/zeit";


const SCHREIBEN = process.argv.includes("--schreiben");
const RUECKRECHNEN = process.argv.includes("--rueckrechnen");

const PROTOKOLLE = join(homedir(), ".claude", "projects");
const PRAEFIX = "-Users-eule-projects-pv-rechner";

// Eine Lücke von mehr als einer Viertelstunde trennt zwei Arbeitsblöcke. Der
// Wert ist gegriffen, aber die Richtung stimmt: Eine kürzere Pause ist beim
// Warten auf einen Testlauf normal, eine längere ist keine Arbeit mehr.
const PAUSE_MS = 15 * 60 * 1000;

// Bis hierher gilt eine Nachricht als getippt. Die Mittellänge echter
// Eingaben liegt bei 132 Zeichen; darüber sind es Wächter-Aufträge und
// eingefügte Texte, und die hat kein Mensch geschrieben.
const GETIPPT_MAX = 800;

function textAus(inhalt: unknown): string | null {
  let t = "";
  if (typeof inhalt === "string") t = inhalt;
  else if (Array.isArray(inhalt)) {
    for (const b of inhalt) {
      if (b && typeof b === "object" && (b as any).type === "text") t += (b as any).text ?? "";
    }
  } else return null;
  t = t.replace(/<[^>]*system-reminder[^>]*>[\s\S]*?<\/system-reminder>/g, "");
  t = t.replace(/<command-[a-z-]+>[\s\S]*?<\/command-[a-z-]+>/g, "");
  t = t.replace(/<local-command[^>]*>[\s\S]*?<\/local-command[^>]*>/g, "");
  for (const marker of ["UserPromptSubmit hook success", "SessionStart:startup hook success"]) {
    const i = t.indexOf(marker);
    if (i >= 0) t = t.slice(0, i);
  }
  t = t.trim();
  if (!t || t.startsWith("Caveat:") || t.startsWith("[Request interrupted")) return null;
  return t;
}

/** Alle Protokolldateien dieses Projekts, samt aller Arbeitskopien. */
function protokolldateien(): string[] {
  if (!existsSync(PROTOKOLLE)) return [];
  const out: string[] = [];
  for (const d of readdirSync(PROTOKOLLE)) {
    if (!d.startsWith(PRAEFIX)) continue;
    const p = join(PROTOKOLLE, d);
    for (const f of readdirSync(p)) if (f.endsWith(".jsonl")) out.push(join(p, f));
  }
  return out;
}

interface Roh {
  tage: Map<string, Statistiktag>;
  bloecke: Block[];
}

function leseProtokolle(): Roh {
  const tage = new Map<string, Statistiktag>();
  const bloecke: Block[] = [];

  const leer = (tag: string): Statistiktag => ({
    tag, herkunft: "gemessen", tokensGelesen: 0, tokensNeu: 0, tokensEingabe: 0,
    tokensAusgabe: 0, sitzungen: 0, nachrichtenGetippt: 0, nachrichtenLang: 0,
    antworten: 0, werkzeugschritte: 0, arbeitsminuten: 0, commits: 0,
  });
  const hol = (tag: string) => {
    let t = tage.get(tag);
    if (!t) { t = leer(tag); tage.set(tag, t); }
    return t;
  };

  for (const datei of protokolldateien()) {
    const zeitpunkte: number[] = [];
    let ersterTag: string | null = null;
    let inhalt: string;
    try { inhalt = readFileSync(datei, "utf8"); } catch { continue; }

    for (const zeile of inhalt.split("\n")) {
      if (!zeile.startsWith("{")) continue;
      let o: any;
      try { o = JSON.parse(zeile); } catch { continue; }
      const ts: string | undefined = o.timestamp;
      if (!ts) continue;
      // Ein deutscher Kalendertag, nicht der Weltzeit-Tag: Zwischen Mitternacht
      // und zwei Uhr steht in der Weltzeit noch der Vortag, und dann liegt die
      // Arbeit eines Abends auf zwei Tagen.
      const tag = tagVon(Date.parse(ts));
      const t = hol(tag);
      zeitpunkte.push(Date.parse(ts));
      if (!ersterTag) ersterTag = tag;

      const m = o.message ?? {};
      if (o.type === "assistant") {
        t.antworten++;
        const u = m.usage;
        if (u && typeof u === "object") {
          t.tokensEingabe += u.input_tokens ?? 0;
          t.tokensAusgabe += u.output_tokens ?? 0;
          t.tokensNeu += u.cache_creation_input_tokens ?? 0;
          t.tokensGelesen += u.cache_read_input_tokens ?? 0;
        }
      } else if (o.type === "user") {
        const c = m.content;
        const istWerkzeug = Array.isArray(c) && c.some((b: any) => b?.type === "tool_result");
        if (istWerkzeug) { t.werkzeugschritte++; continue; }
        const s = textAus(c);
        if (!s) continue;
        if (s.length <= GETIPPT_MAX) t.nachrichtenGetippt++;
        else t.nachrichtenLang++;
      }
    }

    if (ersterTag) hol(ersterTag).sitzungen++;

    // Arbeitsblöcke dieser Sitzung sammeln. Zusammengelegt wird erst am Ende
    // über ALLE Sitzungen: An diesem Repo laufen regelmäßig bis zu elf
    // Arbeitsstände gleichzeitig, und wer ihre Dauern addiert, zählt dieselbe
    // Stunde mehrfach — gemessen 662 statt 261 Stunden.
    zeitpunkte.sort((a, b) => a - b);
    let start: number | null = null;
    let vorher: number | null = null;
    for (const z of zeitpunkte) {
      if (start === null) start = z;
      else if (vorher !== null && z - vorher > PAUSE_MS) { bloecke.push({ von: start, bis: vorher }); start = z; }
      vorher = z;
    }
    if (start !== null && vorher !== null) bloecke.push({ von: start, bis: vorher });
  }

  return { tage, bloecke };
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** Commits je Kalendertag, über die gesamte Projektgeschichte. */
function commitsJeTag(): Map<string, number> {
  const m = new Map<string, number>();
  for (const z of git("log", "--format=%ad", "--date=format:%Y-%m-%d").trim().split("\n")) {
    if (!z) continue;
    m.set(z, (m.get(z) ?? 0) + 1);
  }
  return m;
}

function zahl(...pathspec: string[]): number {
  const dateien = git("ls-files", ...pathspec).trim().split("\n").filter(Boolean);
  let n = 0;
  for (const f of dateien) {
    try { n += readFileSync(f, "utf8").split("\n").length; } catch { /* weg seit dem Index */ }
  }
  return n;
}

function bestandHeute(): Bestandstag {
  const dateien = git("ls-files").trim().split("\n").filter(Boolean).length;
  const testdateien = git("ls-files", "lib/__tests__/*", "e2e/*.spec.ts").trim().split("\n").filter(Boolean).length;
  const alleTs = zahl("*.ts", "*.tsx");
  const testzeilen = zahl("lib/__tests__/*", "e2e/*.spec.ts");
  let testfaelle = 0;
  for (const f of git("ls-files", "lib/__tests__/*", "e2e/*.spec.ts").trim().split("\n").filter(Boolean)) {
    try {
      const t = readFileSync(f, "utf8");
      testfaelle += (t.match(/^\s*(it|test)\s*\(/gm) ?? []).length;
    } catch { /* weg seit dem Index */ }
  }
  return {
    tag: heuteInBerlin(),
    dateien,
    codezeilen: alleTs - testzeilen,
    dokuzeilen: zahl("*.md"),
    testdateien,
    testfaelle,
    commitsGesamt: Number(git("rev-list", "--count", "HEAD").trim()),
  };
}

async function schreibe(pfad: string, zeilen: unknown[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Zugangsdaten für die Ablage fehlen");
  // ALLE Zeilen tragen dieselbe Feldmenge — das ist hier keine Nachlässigkeit,
  // sondern der Grund, warum kein Gruppieren nötig ist: Ein Batch mit
  // ungleichen Feldmengen setzt die fehlenden Felder der übrigen Zeilen auf
  // NULL und überschreibt damit stumm bestehende Werte.
  for (let i = 0; i < zeilen.length; i += 200) {
    const teil = zeilen.slice(i, i + 200);
    const r = await fetch(`${url}/rest/v1/${pfad}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(teil),
    });
    if (!r.ok) throw new Error(`${pfad}: ${r.status} ${await r.text()}`);
  }
}

function zeile(t: Statistiktag) {
  return {
    tag: t.tag,
    herkunft: t.herkunft,
    tokens_gelesen: t.tokensGelesen,
    tokens_neu: t.tokensNeu,
    tokens_eingabe: t.tokensEingabe,
    tokens_ausgabe: t.tokensAusgabe,
    sitzungen: t.sitzungen,
    nachrichten_getippt: t.nachrichtenGetippt,
    nachrichten_lang: t.nachrichtenLang,
    antworten: t.antworten,
    werkzeugschritte: t.werkzeugschritte,
    arbeitsminuten: t.arbeitsminuten,
    commits: t.commits,
  };
}

async function main() {
  const heute = heuteInBerlin();
  const { tage, bloecke } = leseProtokolle();
  verteileZeit(bloecke, tage);

  const commits = commitsJeTag();
  for (const [tag, t] of tage) t.commits = commits.get(tag) ?? 0;

  // Der laufende Tag ist unvollständig und wird NICHT abgelegt — sonst steht in
  // der Reihe ein schwacher Tag, der bloß noch nicht zu Ende ist.
  tage.delete(heute);

  const gemessen = [...tage.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  const geschaetzt: Statistiktag[] = [];

  if (RUECKRECHNEN) {
    const k = kennwertAus(gemessen);
    const erster = gemessen[0]?.tag;
    if (!k || !erster) {
      console.error("Ohne gemessene Tage lässt sich nichts hochrechnen.");
    } else {
      for (const [tag, n] of [...commits].sort()) {
        if (tag >= erster || tage.has(tag)) continue;
        geschaetzt.push(schaetzeTag(tag, n, k));
      }
    }
  }

  const s = summiere(gemessen);
  const g = summiere(geschaetzt);
  const bestand = bestandHeute();

  console.log(`Gemessen:   ${s.tage} Tage (${gemessen[0]?.tag} bis ${gemessen[gemessen.length - 1]?.tag})`);
  console.log(`  Tokens gesamt      ${s.tokensGesamt.toLocaleString("de-DE")}`);
  console.log(`  davon wiedergelesen ${s.tokensGelesen.toLocaleString("de-DE")}`);
  console.log(`  selbst geschrieben  ${s.tokensAusgabe.toLocaleString("de-DE")}`);
  console.log(`  Arbeitszeit        ${s.arbeitsstunden} h`);
  console.log(`  getippte Sätze     ${s.nachrichtenGetippt.toLocaleString("de-DE")}`);
  console.log(`  Antworten          ${s.antworten.toLocaleString("de-DE")}`);
  console.log(`  Werkzeugschritte   ${s.werkzeugschritte.toLocaleString("de-DE")}`);
  if (geschaetzt.length) {
    console.log(`Geschätzt:  ${g.tage} Tage, ${g.tokensGesamt.toLocaleString("de-DE")} Tokens, ${g.arbeitsstunden} h`);
  }
  console.log(`Bestand:    ${bestand.codezeilen.toLocaleString("de-DE")} Zeilen Code, ${bestand.testfaelle.toLocaleString("de-DE")} Prüfungen, ${bestand.commitsGesamt.toLocaleString("de-DE")} Änderungen`);

  if (!SCHREIBEN) {
    console.log("\nProbelauf — nichts geschrieben. Mit --schreiben ablegen.");
    return;
  }

  // Erst die Schätzungen, dann die Messungen: Eine Messung darf eine Schätzung
  // überschreiben, nie umgekehrt.
  if (geschaetzt.length) await schreibe("projekt_statistik", geschaetzt.map(zeile));
  await schreibe("projekt_statistik", gemessen.map(zeile));
  await schreibe("projekt_bestand", [{
    tag: bestand.tag,
    dateien: bestand.dateien,
    codezeilen: bestand.codezeilen,
    dokuzeilen: bestand.dokuzeilen,
    testdateien: bestand.testdateien,
    testfaelle: bestand.testfaelle,
    commits_gesamt: bestand.commitsGesamt,
  }]);
  console.log("\nAbgelegt.");
}

main().catch((e) => { console.error(e); process.exit(1); });
