import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVENTS } from "../analytics";

// ─── Der Trichter darf nicht gegen die Schritte verrutschen. ─────────────────
//
// DIESER FEHLER IST PASSIERT, DREI WOCHEN LANG UNBEMERKT. Die Ereignisliste des
// PV-Rechners entstand am 06.07.2026 für die damaligen Schritte. Am 07.08.2026
// kam „Dein Dach" als Schritt 1 dazu, die Liste wurde nicht nachgezogen — und
// weil sie kürzer war als die Schrittliste, zählte ab da JEDER Name den
// falschen Schritt: „Speicher erreicht" war in Wahrheit das Dach, und der
// letzte Schritt wurde gar nicht mehr gemessen.
//
// Von außen war das unsichtbar: kein Absturz, kein roter Test, eine Zahl im
// Auswertungsbild, die genauso aussah wie vorher. Die Fehlerklasse
// „Beschriftung sagt etwas anderes, als die Zahl misst" — im Projekt die
// schwerste, weil man ihr nichts ansieht.
//
// Der Test liest deshalb BEIDE Listen aus den Rechner-Dateien und hält sie
// aneinander. Er prüft nicht Formatierung, sondern Länge, Reihenfolge und
// Zugehörigkeit — ein Umformatieren lässt ihn kalt, ein eingefügter Schritt
// macht ihn rot.

const wurzel = process.cwd();
const lies = (p: string) => readFileSync(join(wurzel, p), "utf8");

/** Jeder Rechner mit Frage-Flow. Wächst die Liste, wächst der Test mit. */
const RECHNER = [
  { name: "PV-Rechner", datei: "app/(site)/photovoltaik-rechner/rechner.tsx" },
  { name: "Empfehlung", datei: "app/(site)/pv-bedarf-berechnen/empfehlung.tsx" },
  { name: "Wärmepumpe", datei: "app/(site)/waermepumpe-rechner/waermepumpe.tsx" },
  { name: "Klimaanlage", datei: "app/(site)/klimaanlage-stromkosten/klimaanlage.tsx" },
  { name: "Balkonkraftwerk", datei: "app/(site)/balkonkraftwerk/rechner/balkon.tsx" },
];

/** Einträge eines Array-Literals: Strings als Text, `null` als null. */
function eintraege(quelle: string, deklaration: RegExp): (string | null)[] | null {
  const start = quelle.match(deklaration);
  if (!start) return null;
  const ab = quelle.slice(start.index! + start[0].length);
  const ende = ab.indexOf("]");
  if (ende < 0) return null;
  return ab
    .slice(0, ende)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t === "null" ? null : t.replace(/^["'`]|["'`]$/g, "")));
}

describe("Trichter je Rechner", () => {
  for (const r of RECHNER) {
    describe(r.name, () => {
      const quelle = lies(r.datei);
      const schritte = eintraege(quelle, /const STEPS(?::[^=]+)?\s*=\s*\[/);
      const trichter = eintraege(quelle, /const FUNNEL(?::[^=]+)?\s*=\s*\[/);

      it("hat überhaupt einen Trichter", () => {
        // Die Gegenrichtung, und sie ist der Anlass des Ganzen: Vier von fünf
        // Rechnern meldeten bis 29.08.2026 nur „Ergebnis erreicht". Ohne diese
        // Prüfung wächst die Lücke beim nächsten neuen Rechner stillschweigend
        // wieder — ein fehlender Trichter sieht wie ein fertiger Rechner aus.
        expect(schritte, `${r.datei}: STEPS nicht gefunden`).not.toBeNull();
        expect(trichter, `${r.datei}: FUNNEL nicht gefunden`).not.toBeNull();
      });

      it("hat genau einen Eintrag je Schritt plus das Ergebnis", () => {
        expect(
          trichter!.length,
          `${r.name}: ${schritte!.length} Schritte, aber ${trichter!.length} Ereignisse — ` +
            `nach einem eingefügten Schritt zählt sonst jeder Name den falschen`,
        ).toBe(schritte!.length + 1);
      });

      it("zählt den Startschritt nicht mit", () => {
        // Schritt 0 sieht jeder, der die Seite öffnet. Ihn zu zählen hieße, den
        // Seitenaufruf ein zweites Mal zu zählen.
        expect(trichter![0]).toBeNull();
      });

      it("endet auf dem Ergebnis", () => {
        expect(trichter![trichter!.length - 1]).toMatch(/_ergebnis$/);
      });

      it("kennt nur angemeldete Ereignisse", () => {
        for (const e of trichter!) {
          if (e === null) continue;
          expect(EVENTS as readonly string[], `${e} steht nicht in EVENTS`).toContain(e);
        }
      });

      it("trägt durchgehend dasselbe Präfix", () => {
        // Sonst landet ein Schritt des einen Rechners in der Auswertung des
        // anderen — und das fällt in einer Balkenreihe niemandem auf.
        const praefix = trichter![trichter!.length - 1]!.replace(/_ergebnis$/, "");
        for (const e of trichter!) {
          if (e === null) continue;
          expect(e, `${e} gehört nicht zu ${praefix}`).toMatch(new RegExp(`^${praefix}_`));
        }
      });
    });
  }

  it("misst niemand am geteilten Baustein vorbei", () => {
    // Ein direkter `trackEvent("…_schritt_…")` wäre die Rückkehr zur
    // Einzellösung — und damit zur Verschiebung, gegen die es diesen Test gibt.
    const treffer = execSync(
      `git grep -n --untracked 'trackEvent("[a-z_]*_schritt_' -- "*.tsx" || true`,
      { cwd: wurzel, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
    expect(treffer, `Schritt-Ereignis am Trichter vorbei gezählt:\n${treffer.join("\n")}`).toEqual([]);
  });
});
