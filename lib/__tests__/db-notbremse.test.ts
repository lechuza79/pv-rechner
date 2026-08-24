import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter gegen Datenbank-Reads ohne Zeitbudget im Seitenaufbau.
 *
 * Der Anlass ist ein gemessener Totalausfall bei einem Schwesterprojekt
 * (21.08.2026, dieselbe Kombination aus Vercel und Supabase): Ein fremder
 * Crawler fuhr zwanzig Stunden lang das Dreifache an Maschinen-Traffic, die
 * Datenbank ging in Speichermangel, normale Abfragen brauchten 10–30 s statt
 * Millisekunden. Umgeworfen hat das Projekt aber nicht die kranke Datenbank,
 * sondern die eigene Reaktion darauf: 2,08 Mio Anfragen in der Spitzenstunde
 * gegen eine Datenbank, die längst nicht mehr antwortete. Die Datenbank war um
 * 18:51 wieder schnell, der Endpunkt blieb bis 19:11 tot — der Ausfall hielt
 * sich zwanzig Minuten lang selbst am Leben.
 *
 * Zwei Bauweisen tragen das: ein Read ohne Zeitbudget (die Function wartet bis
 * zum 300-s-Limit und hält ihren Slot besetzt) und ein Fehlschlag ohne
 * Ruhepause (der nächste Aufbau feuert sofort wieder). Beides ist im Diff
 * unsichtbar und im Browser unauffällig, solange die Datenbank gesund ist —
 * also genau die Sorte Fehler, die ein Test halten muss und kein Merksatz.
 *
 * Geprüft wird die BAUWEISE, nicht das Verhalten: Jeder Supabase-Aufruf in den
 * unten genannten Lesepfaden läuft durch das Zeitbudget. Wo das im Einzelfall
 * nicht gilt, steht der Fall hier mit Grund — dann ist es eine Entscheidung.
 */

const ROOT = join(__dirname, "..", "..");

/**
 * Module, die im Seitenaufbau oder in einer öffentlichen Route aus der
 * Datenbank lesen. Wer hier ein Modul ergänzt, ergänzt auch das Zeitbudget.
 */
const LESEPFADE = [
  // Sitzt im Seitenrahmen und läuft damit bei JEDEM Aufbau JEDER Seite — die
  // teuerste Stelle der Liste, obwohl sie die kleinste Abfrage macht.
  "lib/theme-overrides-data.ts",
  "lib/funding-data.ts",
  "lib/funding-history.ts",
  "lib/prices-server.ts",
  "lib/solar-trend-data.ts",
  "lib/strommix-ytd.ts",
  "lib/pvgis.ts",
  // Nur Admin-Oberflächen, aber die schwersten Abfragen im Projekt: beide holen
  // über 20.000 Zeilen in Tausenderblöcken. Ohne Budget je Block hängt eine
  // einzige kränkelnde Abfrage die ganze Schleife bis zum Function-Limit.
  "lib/awards-server.ts",
  "lib/utilities-server.ts",
];

/**
 * Ein Aufruf auf dem Client (`supabase.auth.…`) oder eine Zeile, die nur den
 * Client durchreicht, ist kein Read. Erkannt wird der Read an `.from(`.
 */
function readsOhneBudget(quelle: string): string[] {
  const zeilen = quelle.split("\n");
  const treffer: string[] = [];

  // Über den GANZEN Quelltext suchen, nicht Zeile für Zeile: Ein umbrochener
  // Aufruf trägt `supabase` und `.from(` auf verschiedenen Zeilen, und genau
  // diese Bauform ist im Projekt die häufigste. Die erste Fassung dieses Tests
  // prüfte je Zeile — sie fand deshalb sechs der neun Lesestellen überhaupt
  // nicht und blieb grün, als zur Probe eine Notbremse entfernt wurde. Ein
  // Wächter, der die eigene Gegenprobe besteht, ohne etwas zu sehen, ist
  // schlimmer als keiner.
  const muster = /\bsupabase\s*\.from\s*\(/g;
  for (const fund of quelle.matchAll(muster)) {
    const zeilenNr = quelle.slice(0, fund.index).split("\n").length;
    const i = zeilenNr - 1;
    // Das Zeitbudget steht je nach Bauform an drei Stellen: in derselben Zeile,
    // darüber (umbrochener Aufruf) oder darunter (die Abfrage wird erst in
    // einer Variablen gebaut und dann übergeben — so in den beiden
    // Seitenschleifen). Das Fenster ist bewusst großzügig: Der Test soll die
    // fehlende Notbremse finden, nicht die Formatierung vorschreiben.
    const fenster = zeilen.slice(Math.max(0, i - 4), i + 8).join("\n");
    if (fenster.includes("withDbTimeout")) continue;
    treffer.push(`Zeile ${zeilenNr}: ${zeilen[i]?.trim()}`);
  }

  return treffer;
}

describe("Notbremse für Datenbank-Reads", () => {
  it.each(LESEPFADE)("%s liest nicht ohne Zeitbudget", (pfad) => {
    const quelle = readFileSync(join(ROOT, pfad), "utf8");
    const offen = readsOhneBudget(quelle);

    expect(
      offen,
      `${pfad}: Datenbank-Read ohne withDbTimeout. Ohne Zeitbudget wartet die ` +
        `Function bis zum 300-s-Limit und hält ihren Slot besetzt — aus einem ` +
        `Datenbank-Schluckauf wird ein Rückstau, der sich selbst am Leben hält. ` +
        `Gehört der Read wirklich ohne Budget hierher, kommt er mit Grund in ` +
        `die Ausnahmeliste dieses Tests.\n${offen.join("\n")}`,
    ).toEqual([]);
  });

  it("das kurze Budget ist kürzer als das lange und beide sind gesetzt", async () => {
    const { DB_READ_TIMEOUT_MS, DB_SOFT_READ_TIMEOUT_MS } = await import("../db-timeout");
    expect(DB_SOFT_READ_TIMEOUT_MS).toBeGreaterThan(0);
    expect(DB_SOFT_READ_TIMEOUT_MS).toBeLessThan(DB_READ_TIMEOUT_MS);
  });

  it("bricht ab, statt auf einen hängenden Read zu warten", async () => {
    const { withDbTimeout } = await import("../db-timeout");
    const haengt = new Promise<never>(() => {});
    const start = Date.now();
    await expect(withDbTimeout(haengt, "test", 50)).rejects.toThrow(/timeout/i);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("reicht einen schnellen Read unverändert durch", async () => {
    const { withDbTimeout } = await import("../db-timeout");
    await expect(withDbTimeout(Promise.resolve({ data: 1 }), "test", 50)).resolves.toEqual({
      data: 1,
    });
  });

  it("der Förderkatalog macht nach einem Fehlschlag eine Pause", () => {
    // Nicht das Verhalten, sondern die Bauweise: Ohne Ruhepause feuert jeder
    // Seitenaufbau sofort wieder gegen die kranke Datenbank — genau der
    // Verstärker aus dem Vorfall oben.
    const quelle = readFileSync(join(ROOT, "lib/funding-data.ts"), "utf8");
    expect(quelle).toMatch(/fehlerBis\s*=\s*Date\.now\(\)\s*\+/);
    expect(quelle).toMatch(/if\s*\(Date\.now\(\)\s*<\s*fehlerBis\)/);
    // Und die Pause muss aufhebbar sein, sonst zeigt das Cockpit nach einem
    // Resync bis zu einer halben Minute den alten Stand.
    expect(quelle).toMatch(/invalidateFundingCache[\s\S]{0,200}fehlerBis\s*=\s*0/);
  });
});
