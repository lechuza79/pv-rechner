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

    // Verglichen werden die STEMPEL der Adressen, die in beiden Läufen
    // vorkommen — nicht die Menge der Adressen (26.08.2026).
    //
    // Der Unterschied ist keine Bequemlichkeit, sondern der Zuschnitt der
    // Frage: Dieser Test klärt, ob `lastmod` ein echtes Datum trägt oder die
    // Bauzeit. Wie VIELE Seiten in der Sitemap stehen, ist eine andere Frage,
    // und dort gehört sie auch hin — `atlas-funding-sync.test.ts` hält die Zahl
    // der freigegebenen Seiten und ihre Identität fest.
    //
    // Dass die Menge zeitabhängig IST, ist Absicht: Ein Schub des Releaseplans
    // trägt ein Datum, und vor diesem Tag gibt er seine Orte nicht frei. Der
    // ursprüngliche Vergleich der ganzen Map wurde deshalb rot, sobald irgendein
    // Schub zwischen den beiden gestellten Uhrzeiten liegt — er hätte künftig
    // bei JEDER Freischaltung angeschlagen und dabei etwas gemeldet, das er gar
    // nicht prüfen will.
    const gemeinsam = [...erster.keys()].filter((u) => zweiter.has(u));
    expect(gemeinsam.length).toBeGreaterThan(10);
    for (const url of gemeinsam) {
      expect(zweiter.get(url), `${url} hat je nach Bauzeitpunkt ein anderes Datum`).toBe(erster.get(url));
    }
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

// Zweite Frage an dieselbe Datei: Steht jede Adresse genau EINMAL darin?
//
// Der Anlass (19.08.2026): Der Speicher-Ratgeber ist beides — Registry-Eintrag
// (und damit automatisch in `ratgeberPages`) UND eine Seite mit eigenem
// Wertstand (und damit von Hand in der Liste unten). Ohne Filter stand er
// zweimal drin, mit zwei verschiedenen `lastmod`. Das ist kein doppelter
// Eintrag, sondern ein widersprüchlicher: Welches Datum gilt, entschiede dann
// die Reihenfolge statt die Wahrheit — und genau die Verlässlichkeit des
// Signals ist der Grund, warum es die ganze lastmod-Regel gibt.
describe("Sitemap: jede Adresse genau einmal", () => {
  it("enthält keine doppelte URL", async () => {
    const eintraege = await sitemap();
    const gesehen = new Map<string, number>();
    for (const e of eintraege) gesehen.set(e.url, (gesehen.get(e.url) ?? 0) + 1);
    const doppelt = [...gesehen.entries()].filter(([, n]) => n > 1).map(([url]) => url);
    expect(doppelt, `doppelte Sitemap-Einträge: ${doppelt.join(", ")}`).toEqual([]);
  });
});
