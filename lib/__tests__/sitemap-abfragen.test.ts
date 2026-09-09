import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Die Sitemap darf nicht mit der Zahl der Anschreiben teurer werden.
//
// DER ANLASS IST EIN ABGEBROCHENER PRODUKTIONSBAU (05.09.2026, zweimal an
// einem Tag, an verschiedenen Ständen). Sie löste jede angeschriebene Gemeinde
// einzeln auf, und eine Auflösung kostet drei Abfragen nacheinander
// (Gemeinde → Kreis → Bundesland). Gemessen: 289 Gemeinden, also 867 Abfragen
// in Reihe, 60,4 Sekunden von einer schnellen Leitung aus. Auf dem Prüf-Rechner
// reicht das über die Zeitgrenze, die der Bau je Seite hat — und dann bricht
// der GANZE Bau ab, mit „Export encountered an error" und ohne Hinweis worauf.
//
// DIE ZAHL WÄCHST MIT JEDEM BRIEF. Deshalb ist die Bremse eine Regel und kein
// Merksatz: Drei Abfragen für alle Orte zusammen (0,24 s) hängen an nichts.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const sitemap = lies("app/sitemap.ts");

describe("Sitemap: die Kosten hängen nicht an der Zahl der Orte", () => {
  it("löst die Gemeindepfade GEMEINSAM auf, nicht einzeln", () => {
    expect(sitemap).toMatch(/getGemeindePfade\(/);
    // Der Einzelabruf darf hier gar nicht mehr vorkommen — er ist die
    // Bauweise, die den Bau umgeworfen hat.
    expect(sitemap).not.toMatch(/getGemeindePfad\b(?!e)/);
  });

  it("ruft in der Ortsschleife nichts mit await auf", () => {
    // Auch ein anderer Aufruf je Ort wäre wieder eine Kette, die mit den
    // Anschreiben wächst. Geprüft wird die SCHLEIFE, nicht der Funktionsname —
    // sonst fängt die Regel nur den einen Fall, den wir schon kennen.
    const ab = sitemap.indexOf("for (const ags of einzelOrte)");
    expect(ab).toBeGreaterThan(0);
    const schleife = sitemap.slice(ab, sitemap.indexOf("\n    }", ab));
    expect(schleife, "kein await je Ort — sonst wächst die Sitemap mit den Briefen").not.toMatch(/await/);
  });

  it("die Sammelabfrage macht DREI Abfragen, unabhängig von der Ortszahl", () => {
    const atlas = lies("lib/atlas.ts");
    const stelle = atlas.slice(atlas.indexOf("async function getGemeindePfadeUncached"));
    const koerper = stelle.slice(0, stelle.indexOf("\n}\n"));
    // Drei Stufen, jede genau einmal aufgerufen.
    expect((koerper.match(/await hole\(/g) ?? []).length).toBe(3);
    expect(koerper, "die Schlüssel gehen als Menge in EINE Abfrage").toMatch(/\.in\("region_id"/);
    expect(koerper).not.toMatch(/for\s*\([^)]*\)\s*{[^}]*await hole/);
  });
});
