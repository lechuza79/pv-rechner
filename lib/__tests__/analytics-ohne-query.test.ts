import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ─── Die Postleitzahl darf die Messung nicht erreichen. ──────────────────────
//
// GEMESSEN, NICHT VERMUTET (27.08.2026): Das Messskript von Vercel überträgt
// `location.href`, also die vollständige Adresse samt Abfrageteil. Die Rechner
// schreiben die Postleitzahl des Nutzers genau dorthin, damit sich ein Ergebnis
// teilen lässt. Damit erreichte jede eingegebene Postleitzahl die Messung —
// während die Datenschutzerklärung zusagte, sie tue das nicht.
//
// WARUM DIE BESTEHENDE REGEL DAS NICHT GEFANGEN HAT: Sie gilt den EIGENEN
// Ereignissen („tragen NIE Postleitzahl, Freitext, Personenbezug",
// `lib/analytics.ts`) und wurde eingehalten. Der Weg lief über den
// Seitenaufruf, den sie nicht erfasst. Deshalb hier ein Test auf den KANAL
// statt auf den Inhalt: Wer die Messung einbindet, muss durch den Baustein
// gehen, der den Abfrageteil wegwirft.

const wurzel = process.cwd();
const lies = (p: string) => readFileSync(join(wurzel, p), "utf8");

/** Alle Dateien, die das Messpaket importieren. */
function importierendeDateien(): string[] {
  // `git grep` statt eigenem Verzeichnisdurchlauf: kennt .gitignore, also
  // keine Treffer aus node_modules oder Build-Ausgaben. `--untracked`, damit
  // eine gerade erst angelegte Datei mitzählt — ohne das ist der Test genau
  // in der Sitzung blind, in der jemand einen zweiten Kanal aufmacht.
  const roh = execSync(
    'git grep -l --untracked "@vercel/analytics" -- "*.ts" "*.tsx" || true',
    { cwd: wurzel, encoding: "utf8" },
  );
  // Diese Datei nennt das Paket selbst — sonst prüfte der Test sich mit.
  return roh
    .split("\n")
    .filter(Boolean)
    .filter((p) => !p.includes("__tests__"));
}

describe("Reichweitenmessung ohne Abfrageteil", () => {
  it("nur zwei Dateien fassen das Messpaket überhaupt an", () => {
    // `lib/analytics.ts` für die eigenen Ereignisse, `components/WebAnalytics.tsx`
    // für den Seitenaufruf. Jede weitere Stelle wäre ein dritter Kanal, für den
    // niemand die Filterung mitdenkt — genau so ist der Befund entstanden.
    expect(importierendeDateien().sort()).toEqual([
      "components/WebAnalytics.tsx",
      "lib/analytics.ts",
    ]);
  });

  it("das Layout bindet den gefilterten Baustein ein, nicht das Paket direkt", () => {
    const layout = lies("app/(site)/layout.tsx");
    expect(layout).toContain("<WebAnalytics />");
    // Geprüft wird der IMPORT, nicht das Vorkommen von „<Analytics" im Text:
    // Der Kommentar darüber warnt ausdrücklich vor der direkten Einbindung und
    // enthält den Namen deshalb selbst.
    expect(
      /^\s*import\s.*from\s+["']@vercel\/analytics/m.test(layout),
      "Layout importiert das Messpaket direkt — damit läuft die Adresse ungefiltert in die Messung",
    ).toBe(false);
  });

  it("der Baustein entfernt den Abfrageteil, statt einzelne Felder zu filtern", () => {
    const quelle = lies("components/WebAnalytics.tsx");
    expect(quelle).toContain("beforeSend");
    // Der ganze Abfrageteil fällt weg. Eine Liste erlaubter Parameter wäre
    // eine zweite Wahrheit, die beim nächsten neuen Parameter still veraltet.
    expect(quelle).toMatch(/\.search\s*=\s*""/);
  });

  it("die Filterung tut, was sie soll — an der echten Rechner-Adresse", () => {
    // Nachgebaut statt die Komponente zu rendern: Es geht um die Rechenregel,
    // nicht um React. Die Adresse ist die, die ein Nutzer nach Eingabe seiner
    // Postleitzahl wirklich in der Leiste stehen hat.
    const eingehend =
      "https://solar-check.io/photovoltaik-rechner?plz=97204&kwp=10&speicher=5";
    const u = new URL(eingehend);
    u.search = "";
    const gefiltert = u.toString();

    expect(gefiltert).toBe("https://solar-check.io/photovoltaik-rechner");
    expect(gefiltert).not.toContain("97204");
    expect(gefiltert).not.toContain("plz");
  });

  it("die Datenschutzerklärung sagt weiterhin zu, dass die Postleitzahl nicht in die Messung fließt", () => {
    // Die Zusage darf nur stehen bleiben, solange die Filterung existiert —
    // beide Hälften hängen an diesem Test.
    expect(lies("app/(site)/datenschutz/page.tsx")).toContain(
      "fließen nicht in die Reichweitenmessung ein",
    );
  });
});
