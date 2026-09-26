import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * EIN SKRIPT, DAS EIN TEST IMPORTIERT, DARF BEIM LADEN NICHTS TUN.
 *
 * Am 09.09.2026 hat der Ortsabgleich die gesamte Testprüfung umgeworfen: Er
 * baute die Datenbankverbindung beim Laden des Moduls auf und beendete den
 * Prozess, wenn die Zugangsdaten fehlen. Ein Test prüft seine Namensauflösung
 * — eine reine Rechnung ohne Datenbank — und riss durch den Import die ganze
 * Datei mit.
 *
 * LOKAL FÄLLT DAS NIE AUF: Dort liegt eine Zugangsdatei, das Modul lädt
 * anstandslos, und alles ist grün. Sichtbar wird es erst auf dem Prüfrechner,
 * wo nichts gesetzt ist — dieselbe Klasse wie beim Spalten-Abgleich und der
 * Kostenwache.
 *
 * GEPRÜFT WIRD DAS VERHALTEN, nicht ein Muster im Text: Das Modul wird
 * wirklich geladen, mit geleerten Zugangsdaten. Eine Textsuche nach
 * `process.exit` bliebe grün, sobald jemand denselben Abbruch anders
 * formuliert — ein fehlender Schlüssel, ein Wurf, ein Netzaufruf.
 */

const WURZEL = resolve(__dirname, "..", "..");
const ZUGANG = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "CRON_SECRET",
];

/**
 * NICHT NUR ZUGANGSDATEN FEHLEN AUF DEM PRÜFRECHNER, sondern auch ORTE.
 *
 * Am 23.09.2026 ist der Lauf trotz dieser Prüfung umgekippt: Der Kostenlauf
 * scheiterte nicht an einem fehlenden Schlüssel, sondern an einem Ordner, den
 * es nur auf dem Rechner des Betreibers gibt — und beendete daraufhin den
 * Prüfprozess. Lokal war alles grün, weil der Ordner hier liegt.
 *
 * Ein Pfad, der ins Leere zeigt, stellt lokal denselben Zustand her wie der
 * Prüfrechner. Wer einen neuen ortsgebundenen Lauf baut, trägt seine Variable
 * hier ein.
 */
const ORTE = ["BUCHHALTUNG_PFAD"];
const NIRGENDWO = "/gibt-es-auf-keinem-rechner";

/** Die Skripte, die überhaupt ein Test importiert — nur die sind hier gemeint. */
function importierteSkripte(): string[] {
  const treffer = new Set<string>();
  for (const datei of readdirSync(__dirname)) {
    if (!datei.endsWith(".test.ts") && !datei.endsWith(".test.tsx")) continue;
    const inhalt = readFileSync(join(__dirname, datei), "utf8");
    for (const t of inhalt.matchAll(/from\s+["']\.\.\/\.\.\/(scripts\/[^"']+)["']/g)) {
      treffer.add(t[1].replace(/\.tsx?$/, ""));
    }
  }
  return [...treffer].sort();
}

/**
 * 30 Sekunden statt der voreingestellten fünf.
 *
 * Diese Prüfungen lesen den halben Bestand ein — den Förderkatalog, das
 * Ortsverzeichnis, jede Datei des Repos. Auf einer ruhigen Maschine kosten sie
 * Sekundenbruchteile; auf einer belegten reißen sie das Vorgabelimit, und zwar
 * ohne dass irgendetwas am Code falsch wäre. Genau dafür gibt es im Projekt
 * schon das Vorbild in `energy-api.test.ts` („generous headroom so CPU load
 * can't trip the 5s default").
 *
 * Das Limit misst NICHTS Fachliches — es schützt vor einem hängenden Test.
 * Es anzuheben schwächt die Prüfung also nicht; ein Fehlschlag daran kostet
 * dagegen eine Stunde Suche nach einer Ursache, die es nicht gibt.
 */
const REPO_WEIT_MS = 30_000;

describe("Skripte, die ein Test importiert", () => {
  const skripte = importierteSkripte();

  it("es gibt überhaupt welche", () => {
    // Gegenprobe gegen einen Wächter, der nichts findet und trotzdem grün meldet.
    expect(skripte.length).toBeGreaterThan(0);
  });

  // EIGENES ZEITBUDGET, und das ist keine aufgeweichte Schwelle: Gemessen wird,
  // ob das Modul beim Laden etwas TUT — nicht, wie schnell es lädt. Ein Skript
  // durch die Übersetzung zu ziehen kostet auf einer ruhigen Maschine 2 bis 3
  // Sekunden, und der Standard liegt bei fünf. Unter Last (gemessen: 186 auf
  // acht Kernen) reißt das, und dann meldet der Lauf einen Fehler, den es nicht
  // gibt — genau die Sorte Rot, an die man sich gewöhnt.
  it.each(skripte)("%s lädt ohne Zugangsdaten", { timeout: 30_000 }, async (pfad) => {
    const gesichert: Record<string, string | undefined> = {};
    for (const name of ZUGANG) {
      gesichert[name] = process.env[name];
      delete process.env[name];
    }
    for (const name of ORTE) {
      gesichert[name] = process.env[name];
      process.env[name] = NIRGENDWO;
    }
    // Die Zugangsdatei liegt nur lokal; damit der Lauf hier dasselbe sieht wie
    // der Prüfrechner, wird sie über das Arbeitsverzeichnis ausgeblendet.
    const cwd = process.cwd();
    process.chdir(resolve(WURZEL, "lib"));

    // DAS ABBRECHEN WIRD ABGEFANGEN, NICHT ERWARTET. Ein Skript, dessen Ablauf
    // beim Laden anläuft, ist meist `async`: Der Import ist dann längst
    // aufgelöst, während der Ablauf noch läuft, und sein `process.exit` trifft
    // den Prüflauf ERST NACH dem Test. Der meldet dann „alle Tests grün" und
    // daneben einen Fehler ohne Zuordnung — genau so ist es am 23.09.2026
    // passiert. Ohne diese Falle ist der Wächter an dieser Stelle blind.
    const echtesExit = process.exit;
    let abgebrochen: number | null = null;
    process.exit = ((code?: number) => {
      abgebrochen = code ?? 0;
      return undefined as never;
    }) as typeof process.exit;

    try {
      await expect(import(/* @vite-ignore */ resolve(WURZEL, pfad))).resolves.toBeDefined();
      // Dem angelaufenen Ablauf Gelegenheit geben, sein Ende zu erreichen.
      await new Promise((f) => setTimeout(f, 50));
      expect(abgebrochen, `${pfad} beendet beim Laden den Prozess`).toBeNull();
    } finally {
      process.exit = echtesExit;
      process.chdir(cwd);
      for (const name of [...ZUGANG, ...ORTE]) {
        if (gesichert[name] === undefined) delete process.env[name];
        else process.env[name] = gesichert[name];
      }
    }
  });
}, REPO_WEIT_MS);
