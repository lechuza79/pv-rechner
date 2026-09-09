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

describe("Skripte, die ein Test importiert", () => {
  const skripte = importierteSkripte();

  it("es gibt überhaupt welche", () => {
    // Gegenprobe gegen einen Wächter, der nichts findet und trotzdem grün meldet.
    expect(skripte.length).toBeGreaterThan(0);
  });

  it.each(skripte)("%s lädt ohne Zugangsdaten", async (pfad) => {
    const gesichert: Record<string, string | undefined> = {};
    for (const name of ZUGANG) {
      gesichert[name] = process.env[name];
      delete process.env[name];
    }
    // Die Zugangsdatei liegt nur lokal; damit der Lauf hier dasselbe sieht wie
    // der Prüfrechner, wird sie über das Arbeitsverzeichnis ausgeblendet.
    const cwd = process.cwd();
    process.chdir(resolve(WURZEL, "lib"));
    try {
      await expect(import(/* @vite-ignore */ resolve(WURZEL, pfad))).resolves.toBeDefined();
    } finally {
      process.chdir(cwd);
      for (const name of ZUGANG) {
        if (gesichert[name] === undefined) delete process.env[name];
        else process.env[name] = gesichert[name];
      }
    }
  });
});
