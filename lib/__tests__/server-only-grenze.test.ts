import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

/**
 * EINE BROWSER-KOMPONENTE DARF KEIN SERVER-MODUL BENUTZEN.
 *
 * Am 03.09.2026 real passiert: Die Beschriftungen der Fund-Stände standen bei
 * der Ablage, weil sie dort entstanden waren — und die Ablage liest die
 * Datenbank, trägt also `server-only`. Als die Liste im Browser sie
 * importierte, brach der Aufbau der ganzen Seite mit „You're importing a
 * component that needs server-only".
 *
 * DIE FEHLERKLASSE IST IM DIFF UNSICHTBAR: Die Typprüfung ist grün (die Typen
 * stimmen ja), die Tests sind grün (sie laufen ohne Bündelung), und der Fehler
 * erscheint erst, wenn jemand die Seite im Browser öffnet. Genau so ist er
 * gefunden worden — vom Betreiber, nicht von mir.
 *
 * TYP-IMPORTE SIND ERLAUBT: `import type` verschwindet beim Übersetzen und
 * landet nie im Bündel. Verboten ist der Wert-Import.
 *
 * Die Lösung ist immer dieselbe: Was beide Seiten brauchen, zieht in ein
 * Modul ohne Server-Bindung — dieselbe Trennung wie beim Aktualisierungsstand
 * der Rechner, wo das Auflösen auf dem Server bleibt und das Beschriften
 * überall passieren darf.
 */

const WURZEL = resolve(__dirname, "..", "..");

function dateien(ordner: string, endungen: string[]): string[] {
  const treffer: string[] = [];
  const lauf = (pfad: string) => {
    for (const eintrag of readdirSync(pfad)) {
      if (eintrag === "node_modules" || eintrag.startsWith(".")) continue;
      const voll = join(pfad, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (endungen.some((e) => eintrag.endsWith(e))) treffer.push(voll);
    }
  };
  lauf(resolve(WURZEL, ordner));
  return treffer;
}

/** Module, die `import "server-only"` tragen — relativ zur Wurzel, ohne Endung. */
function serverModule(): Set<string> {
  const gefunden = new Set<string>();
  for (const datei of dateien("lib", [".ts"])) {
    if (datei.includes("__tests__")) continue;
    const inhalt = readFileSync(datei, "utf8");
    if (/^\s*import\s+["']server-only["']/m.test(inhalt)) {
      gefunden.add(datei.replace(/\.ts$/, ""));
    }
  }
  return gefunden;
}

/** Die Wert-Importe einer Datei, als aufgelöste Pfade. */
function wertImporte(datei: string): string[] {
  const inhalt = readFileSync(datei, "utf8");
  const ziele: string[] = [];
  // Nur Wert-Importe: `import type { … }` fällt beim Übersetzen weg.
  const muster = /^\s*import\s+(?!type\s)(?:[^;]+?\s+from\s+)?["'](\.[^"']+)["']/gm;
  let treffer: RegExpExecArray | null;
  while ((treffer = muster.exec(inhalt)) !== null) {
    ziele.push(resolve(dirname(datei), treffer[1]));
  }
  return ziele;
}

describe("Die Grenze zwischen Browser und Server", () => {
  it("keine Browser-Komponente importiert ein Server-Modul", () => {
    const server = serverModule();
    expect(server.size).toBeGreaterThan(0); // Sonst prüft der Test nichts.

    const verstoesse: string[] = [];
    for (const datei of dateien("components", [".tsx", ".ts"])) {
      const inhalt = readFileSync(datei, "utf8");
      if (!/^\s*["']use client["']/m.test(inhalt)) continue;
      for (const ziel of wertImporte(datei)) {
        if (server.has(ziel)) {
          verstoesse.push(
            `${datei.replace(WURZEL + "/", "")} → ${ziel.replace(WURZEL + "/", "")}`,
          );
        }
      }
    }

    expect(
      verstoesse,
      "Eine Browser-Komponente importiert ein Modul mit server-only. Der Aufbau der " +
        "Seite bricht, sobald jemand sie öffnet — die Typprüfung sieht das nicht. " +
        "Was beide Seiten brauchen, gehört in ein Modul ohne Server-Bindung.",
    ).toEqual([]);
  });
});
