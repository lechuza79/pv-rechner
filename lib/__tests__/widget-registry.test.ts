import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { allWidgets, brandLabel, embedPath, sharePath, widgetForPlace, WIDGETS } from "../widget-registry";

// Der Baukasten lebt davon, dass jeder Eintrag vollständig ist: fehlt eine
// Quelle, fehlt sie im geteilten Bild (Lizenzpflicht); fehlt der Teilen-Link,
// teilt jemand ein Bild ohne Weg zurück. Das fällt sonst erst auf, wenn das
// Bild schon unterwegs ist.

describe("Widget-Register", () => {
  it("jeder Eintrag ist vollständig", () => {
    for (const w of allWidgets()) {
      expect(w.id, "id fehlt").toBeTruthy();
      expect(w.id).toMatch(/^[a-z0-9-]+$/);
      expect(w.title.length, `${w.id}: Titel zu kurz`).toBeGreaterThan(2);
      expect(w.shareUrl, `${w.id}: Teilen-Ziel muss absolut sein`).toMatch(/^https:\/\/solar-check\.io/);
      expect(w.shareText.length, `${w.id}: Teilen-Text fehlt`).toBeGreaterThan(10);
      expect(w.sources.length, `${w.id}: mindestens eine Datenquelle`).toBeGreaterThan(0);
      for (const s of w.sources) expect(s.name, `${w.id}: Quelle ohne Namen`).toBeTruthy();
    }
  });

  it("Handlungsaufforderungen sind konkret, nicht „Mehr erfahren“", () => {
    const leer = ["mehr erfahren", "hier klicken", "weiter", "mehr"];
    for (const w of allWidgets()) {
      if (!w.cta) continue;
      expect(w.cta.label.length, `${w.id}: CTA zu kurz`).toBeGreaterThan(6);
      expect(leer, `${w.id}: nichtssagende CTA`).not.toContain(w.cta.label.toLowerCase());
      expect(w.cta.href, `${w.id}: CTA muss auf eine eigene Seite zeigen`).toMatch(/^\//);
      // Der Pfeil kommt aus dem Baustein — sonst steht er zweimal im Knopf.
      expect(w.cta.label).not.toMatch(/[→>]/);
    }
  });

  it("die Zeile im Bild verspricht das Richtige", () => {
    // Ein Chart kann man ansehen, ein Werkzeug rechnet mit eigenen Zahlen. Die
    // Einladung im Bild darf nichts versprechen, was das Ziel nicht einlöst.
    expect(brandLabel("tool")).toBe("Interaktiv selbst rechnen:");
    expect(brandLabel("chart")).toBe("Interaktives Chart:");
    expect(WIDGETS.rechner.kind).toBe("tool");
    expect(WIDGETS.foerderCheck.kind).toBe("tool");
    expect(WIDGETS.simulation.kind).toBe("tool");
    expect(WIDGETS.strommix.kind).toBe("chart");
    expect(WIDGETS.pvZubau.kind).toBe("chart");
    expect(WIDGETS.gruengasHeizkosten.kind).toBe("chart");
  });

  it("jeder angebotene Einbett-Link führt auch irgendwohin", () => {
    // Die Presseseite listet die Einbett-Fassung aus dem Register. Ein Eintrag
    // ohne eigene Embed-Route (das Ergebnis-Chart des Rechners) würde dort als
    // toter Link landen — genau vor dem Publikum, das wir gewinnen wollen.
    const fehlend = allWidgets()
      .map((w) => embedPath(w))
      .filter((pfad): pfad is string => !!pfad)
      .filter((pfad) => !existsSync(join(__dirname, "..", "..", "app/(embed)", pfad, "page.tsx")));
    expect(fehlend, `Einbett-Route fehlt:\n${fehlend.join("\n")}`).toEqual([]);
  });

  it("Teilen-Ziele lassen sich als interner Pfad verlinken", () => {
    for (const w of allWidgets()) {
      expect(sharePath(w), `${w.id}: Pfad muss mit / beginnen`).toMatch(/^\//);
    }
  });

  it("ortsbezogene Widgets tragen den Ort in Titel und Teilen-Text", () => {
    // Ein Gemeinde-Chart ohne Ortsnamen ist als geteiltes Bild und als Zitat
    // wertlos: Man sieht Zahlen, aber nicht, wovon. Deshalb muss jede Vorlage
    // den Platzhalter wirklich enthalten — und die eingesetzte Fassung den Ort,
    // ohne dabei Quellen oder nächsten Schritt zu verlieren.
    const ortsbezogen = allWidgets().filter((w) => w.place);
    expect(ortsbezogen.length, "keine ortsbezogenen Einträge gefunden").toBeGreaterThan(0);
    for (const w of ortsbezogen) {
      expect(w.place!.title, `${w.id}: Titel-Vorlage ohne {ort}`).toContain("{ort}");
      expect(w.place!.shareText, `${w.id}: Teilen-Vorlage ohne {ort}`).toContain("{ort}");
      const konkret = widgetForPlace(w, "Höchberg", "https://solar-check.io/solar-atlas/b/k/hoechberg");
      expect(konkret.title, `${w.id}: Ort fehlt im Titel`).toContain("Höchberg");
      expect(konkret.shareText, `${w.id}: Ort fehlt im Teilen-Text`).toContain("Höchberg");
      expect(konkret.shareUrl).toBe("https://solar-check.io/solar-atlas/b/k/hoechberg");
      expect(konkret.sources).toEqual(w.sources);
      expect(konkret.cta).toEqual(w.cta);
      // Ohne Ortsseite bleibt der Gattungs-Link stehen statt eines toten Links.
      expect(widgetForPlace(w, "Höchberg").shareUrl).toBe(w.shareUrl);
    }
  });

  it("Widgets ohne Bild-Export sind als solche markiert", () => {
    // Karte und Einzel-Kennzahl haben kein aufnehmbares SVG — dort darf kein
    // Herunterladen-Knopf erscheinen, der ein leeres Bild liefert.
    expect(WIDGETS.karte.exportable).toBe(false);
    expect(WIDGETS.kennzahl.exportable).toBe(false);
  });
});
