import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Warum es diesen Test gibt:
//
// Eine erfundene Atlas-Adresse antwortete mit HTTP 200 und lieferte die
// 404-Seite im Body (gemessen am 29.07.2026 lokal UND auf Produktion:
// /solar-atlas/quatsch/quatsch/quatsch -> 200, /gibtsnicht -> 404). Ursache war
// `app/(site)/solar-atlas/loading.tsx`: Ein `loading.tsx` legt eine
// Suspense-Grenze um die GANZE Route, Next schickt die Hülle sofort raus, und
// damit steht der Statuscode fest, bevor die Seite weiß, ob es die Region gibt.
// Das spätere `notFound()` konnte nur noch Inhalt nachschieben. Dasselbe traf
// `redirect()` bei kreisfreien Städten — die lieferten 200 statt einer
// HTTP-Weiterleitung.
//
// Das zählt, weil der Solar-Atlas der SEO-Hebel des Projekts ist: Google wertet
// einen Soft-404 als gültige Seite und crawlt erfundene Adressen weiter. Und der
// Gesundheitscheck kann eine kaputte Atlas-Route am Statuscode nicht erkennen,
// solange jede Adresse 200 sagt.
//
// Der Test prüft die STRUKTUR, nicht den Statuscode — den misst der
// Gesundheitscheck am lebenden System. Hier steht die Bedingung, unter der er
// grün bleiben KANN: Die Routing-Entscheidung muss vor der Suspense-Grenze
// fallen, nicht dahinter.

const ATLAS_DIR = join(__dirname, "../../app/(site)/solar-atlas");
const PFAD_PAGE = join(ATLAS_DIR, "[[...pfad]]/page.tsx");
const GEMEINDE_PAGE = join(ATLAS_DIR, "[bundesland]/[kreis]/[gemeinde]/page.tsx");

/** Alle loading.tsx unterhalb der Atlas-Routen — auf jeder Ebene, nicht nur oben. */
function loadingDateien(dir: string, gefunden: string[] = []): string[] {
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    const pfad = join(dir, eintrag.name);
    if (eintrag.isDirectory()) loadingDateien(pfad, gefunden);
    else if (eintrag.name === "loading.tsx") gefunden.push(pfad);
  }
  return gefunden;
}

describe("Solar-Atlas: kein Soft-404", () => {
  it("hat kein loading.tsx unter den Atlas-Routen", () => {
    // Ein loading.tsx ist bequem, aber es macht JEDE Atlas-Adresse zu einem
    // Soft-404. Wer Lade-Feedback will, nimmt AtlasSkeleton in einem <Suspense>
    // INNERHALB der Seite — hinter der Routing-Entscheidung.
    expect(loadingDateien(ATLAS_DIR)).toEqual([]);
  });

  it("hält das Lade-Skelett als Komponente bereit", () => {
    // Ohne sie ist der einzige bequeme Weg zurück zum loading.tsx.
    expect(existsSync(join(__dirname, "../../components/atlas/AtlasSkeleton.tsx"))).toBe(true);
  });

  for (const [name, datei] of [
    ["Übersicht/Bundesland/Kreis", PFAD_PAGE],
    ["Gemeinde-Detail", GEMEINDE_PAGE],
  ] as const) {
    describe(name, () => {
      const quelle = readFileSync(datei, "utf8");

      it("entscheidet über notFound(), BEVOR das <Suspense> aufgeht", () => {
        const ersteEntscheidung = quelle.indexOf("notFound()");
        const erstesSuspense = quelle.indexOf("<Suspense");
        expect(ersteEntscheidung).toBeGreaterThan(-1);
        expect(erstesSuspense).toBeGreaterThan(-1);
        // Steht notFound() erst hinter der Suspense-Grenze, ist der Statuscode
        // längst raus — genau der Zustand vor dem 29.07.2026.
        expect(ersteEntscheidung).toBeLessThan(erstesSuspense);
      });

      it("streamt den teuren Teil hinter dem Lade-Skelett", () => {
        expect(quelle).toContain("fallback={<AtlasSkeleton />}");
      });
    });
  }

  it("entscheidet auch die Weiterleitung kreisfreier Städte vor dem <Suspense>", () => {
    // Sonst kommt statt einer HTTP-Weiterleitung eine 200 mit Umleitung im
    // Body — für Google derselbe Schaden wie der Soft-404.
    const quelle = readFileSync(PFAD_PAGE, "utf8");
    expect(quelle.indexOf("redirect(")).toBeLessThan(quelle.indexOf("<Suspense"));
  });
});
