import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ZIELGRUPPEN } from "../zielgruppen";
import { ERLAUBTE_SENDER } from "../versand-wache";

/**
 * Eine Zielgruppe ist an allen Stellen eingetragen — oder der Lauf wird rot.
 *
 * Anlass: Eine neue Zielgruppe war an fünf Stellen einzutragen, und nichts hat
 * eine vergessene gemeldet. Bei der Presse fehlte das Versandprotokoll; 138
 * verschickte Mails standen danach nirgends (07.10.2026).
 */

const WURZEL = resolve(__dirname, "..", "..");
const lies = (p: string) => readFileSync(resolve(WURZEL, p), "utf8");
const eingecheckt = execSync("git ls-files scripts", { cwd: WURZEL, encoding: "utf8" }).split("\n").filter(Boolean);

describe("Zielgruppen: eine Liste, alle Stellen", () => {
  it("jedes Skript, das die gemeinsame Kontaktsuche ausführt, gehört zu einer Zielgruppe", () => {
    // Erkennungsmerkmal: Es holt den Ablauf `laufen` aus dem gemeinsamen Kern.
    const adapter = eingecheckt.filter(
      (d) => /\.(ts|mts)$/.test(d) && /import\s*\{[^}]*\blaufen\b[^}]*\}\s*from\s*"\.\/lib\/kontakt-lauf"/.test(lies(d)),
    );
    const bekannt = new Set(ZIELGRUPPEN.flatMap((z) => z.kontakte));
    expect(adapter.filter((d) => !bekannt.has(d)), "Kontaktsuche ohne Zielgruppe — in lib/zielgruppen.ts eintragen").toEqual([]);
    // Gegenprobe: Die Erkennung findet überhaupt etwas, sonst wäre die Prüfung oben leer.
    expect(adapter.length).toBeGreaterThanOrEqual(ZIELGRUPPEN.length);
  });

  it("jedes genannte Kontakt-Skript existiert und nutzt den gemeinsamen Kern", () => {
    for (const z of ZIELGRUPPEN) {
      for (const d of z.kontakte) {
        expect(eingecheckt, `${z.name}: ${d} fehlt`).toContain(d);
        expect(lies(d), `${z.name}: ${d} läuft nicht über die gemeinsame Kontaktsuche`).toMatch(/from\s*"\.\/lib\/kontakt-lauf"/);
      }
    }
  });

  it("jede Zielgruppe mit eigenen Domains steht in der Belegung UND im Bestände-Abgleich", () => {
    const belegung = lies("scripts/lib/bestand-belegung.ts");
    // Gezielt die LISTE des Abgleichs, nicht die ganze Datei: Das Wort steht
    // dort auch an anderen Stellen, und eine Suche über die Datei blieb grün,
    // als die Zielgruppe zur Probe aus der Liste genommen wurde.
    const liste = lies("scripts/bestaende-abgleich.ts").match(/const BESTAENDE: Bestand\[\] = \[([^\]]*)\]/)?.[1];
    expect(liste, "Liste der Bestände im Abgleich nicht gefunden").toBeDefined();
    for (const z of ZIELGRUPPEN) {
      if (!z.belegung) continue;
      expect(belegung, `${z.name} fehlt in der Domain-Belegung`).toMatch(new RegExp(`bestand: "${z.belegung}"`));
      expect(liste, `${z.name} fehlt im Bestände-Abgleich`).toMatch(new RegExp(`"${z.belegung}"`));
    }
  });

  it("jede Zielgruppe hat eine Freigabe vor dem Versand", () => {
    const freigabe = lies("scripts/kontakte-freigabe.ts");
    for (const z of ZIELGRUPPEN) {
      if (z.freigabe.art === "kontakte-freigabe") {
        expect(freigabe, `${z.name}: kein Eintrag in der gemeinsamen Freigabe`).toMatch(new RegExp(`^  ${z.freigabe.bestand}: \\{`, "m"));
      } else {
        expect(eingecheckt, `${z.name}: Versandlauf mit Freigabe fehlt`).toContain(z.freigabe.skript);
      }
    }
  });

  it("wer verschickt, verschickt über einen eingetragenen Versandweg mit seiner Tabelle", () => {
    for (const z of ZIELGRUPPEN) {
      if (!z.versand) continue;
      const s = ERLAUBTE_SENDER[z.versand.skript];
      expect(s, `${z.name}: ${z.versand.skript} steht nicht in lib/versand-wache.ts`).toBeDefined();
      expect(s.tabelle, `${z.name}: Protokoll-Tabelle weicht ab`).toBe(z.versand.tabelle);
    }
  });

  it("die Namen sind eindeutig", () => {
    const namen = ZIELGRUPPEN.map((z) => z.name);
    expect(new Set(namen).size).toBe(namen.length);
  });
});
