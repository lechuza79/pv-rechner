import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sitemap from "../../app/sitemap";

// Warum es diesen Test gibt:
//
// `app/sitemap.ts` hatte ein `const now = new Date()` und schrieb es als
// <lastmod> an alle Atlas-Seiten (plus Zubau-Story und die beiden Live-Seiten).
// Damit meldete die Sitemap bei JEDEM Deploy "gerade eben geändert" — Google
// ignoriert einen lastmod, der sich nie von der Abrufzeit unterscheidet, und
// die Angabe verliert ihren Zweck für die Seiten, wo sie wirklich zählt.
//
// Der Test prüft die Eigenschaft, nicht die Formulierung: Ein zweiter Aufruf zu
// einer anderen Uhrzeit muss dieselben Daten liefern. Ein Datum, das mit der
// Uhr mitwandert, ist per Definition die Build-Zeit.

const QUELLE = readFileSync(join(__dirname, "../../app/sitemap.ts"), "utf8");

afterEach(() => {
  vi.useRealTimers();
});

/** lastModified als vergleichbarer String; "—" steht für "kein Datum". */
function stempel(eintraege: Awaited<ReturnType<typeof sitemap>>): Map<string, string> {
  return new Map(
    eintraege.map((e) => [
      e.url,
      e.lastModified === undefined ? "—" : new Date(e.lastModified as string | number | Date).toISOString(),
    ]),
  );
}

describe("Sitemap: lastmod trägt echte Daten, nie die Build-Zeit", () => {
  it("liefert für jeden Eintrag denselben Stempel, egal wann sie gebaut wird", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));
    const erster = stempel(await sitemap());

    vi.setSystemTime(new Date("2026-09-14T22:30:00Z"));
    const zweiter = stempel(await sitemap());

    expect(zweiter).toEqual(erster);
    expect(erster.size).toBeGreaterThan(10);
  });

  it("gibt keinem Atlas-Eintrag einen Zeitstempel aus dem Bauzeitpunkt", async () => {
    vi.useFakeTimers();
    const bauzeit = new Date("2026-05-20T11:22:33Z");
    vi.setSystemTime(bauzeit);

    for (const [url, wert] of stempel(await sitemap())) {
      if (!url.includes("/solar-atlas")) continue;
      // Entweder kein Datum (Datenstand nicht abrufbar) oder der Datenstand des
      // Marktstammdatenregisters — nur nicht der Moment, in dem gebaut wurde.
      if (wert === "—") continue;
      expect(Math.abs(new Date(wert).getTime() - bauzeit.getTime())).toBeGreaterThan(60 * 60 * 1000);
    }
  });

  it("setzt `new Date()` nirgends an ein lastModified", () => {
    // Zweite Sicherung auf der Textebene: Der Verhaltenstest oben kann eine
    // Ebene nicht sehen, die gerade nicht freigeschaltet ist (lib/atlas-index).
    expect(QUELLE).not.toMatch(/lastModified:\s*(now|new Date\(\))/);
  });
});
