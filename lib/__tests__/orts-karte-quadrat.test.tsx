import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SocialKarte, type KartenStufe } from "../../components/social/SocialKarte";
import type { KartenPalette } from "../social-karten-stil";
import type { PostBild } from "../social-posts";

// Die quadratische Stufe, geprüft am gerenderten Markup.
//
// WARUM AM MARKUP UND NICHT AN DER LOGIK: Alle vier Fehler dieser Runde waren
// nur im Bild sichtbar und im Diff plausibel — ein Ring, der an seiner eigenen
// Zeichenfläche abgeschnitten wurde, ein Lizenzvermerk, der unten aus der Karte
// lief, eine Beschriftung auf der Trennlinie. Was sich davon in einer
// Zeichenkette festhalten lässt, steht hier; den Rest beurteilt weiterhin das
// Auge an `npm run orts:visual`.

const BILD = (art: PostBild["art"], serien = 2): PostBild => ({
  stil: "hell",
  art,
  aussage: "Eine Schlagzeile, die über mehrere Zeilen läuft und dabei nicht abreißt",
  gemessen: "Woran das gemessen ist",
  serien: Array.from({ length: serien }, (_, i) => ({
    label: `Wert ${i + 1}`,
    wert: 100 - i * 30,
    einheit: "%",
    stellen: 0,
    hervorgehoben: i === 0,
  })),
  ganzes: 100,
  quelle: "Marktstammdatenregister (Bundesnetzagentur), dl-de/by-2-0, aggregiert. Stand 5. August 2026. Eigene Berechnung.",
});

function markup(bild: PostBild, stufe: KartenStufe, palette: KartenPalette = "eigene"): string {
  return renderToStaticMarkup(
    <SocialKarte bild={bild} skala={1} stufe={stufe} palette={palette} />,
  );
}

/** Das style-Attribut der äußersten Karte. */
function wurzelStil(html: string): string {
  return /<div[^>]*data-social-karte[^>]*style="([^"]*)"/.exec(html)?.[1] ?? "";
}

describe("Die quadratische Stufe", () => {
  it("ist wirklich quadratisch, die volle bleibt 4:5", () => {
    expect(wurzelStil(markup(BILD("kennzahl"), "quadrat"))).toContain("height:1080px");
    expect(wurzelStil(markup(BILD("kennzahl"), "voll"))).toContain("height:1350px");
  });

  it("bringt mit der Seiten-Palette KEIN eigenes Farbschema mit", () => {
    // Der Kernfehler der drei gescheiterten Anläufe (05.09.2026): Die Karte
    // überschrieb die Tokens der Seite und stand abends als weißer Block auf
    // dunklem Grund.
    const seite = wurzelStil(markup(BILD("kennzahl"), "quadrat", "seite"));
    expect(seite).not.toMatch(/--color-bg:\s*#/);
    expect(seite).not.toMatch(/--color-text-primary:\s*#/);
    // Mit eigenem Schema steht die Palette weiterhin da — sonst wäre das Bild
    // im fremden Feed von der Tagesstufe der Seite abhängig.
    expect(wurzelStil(markup(BILD("kennzahl"), "quadrat", "eigene"))).toMatch(/--color-bg:\s*#/);
  });

  it("mit der Seiten-Palette kommen die Serienfarben aus Tokens, nicht als Hexwert", () => {
    // Ein fester Hexwert wäre auf dunklem Grund derselbe Fehler wie eine
    // mitgebrachte Palette, nur eine Ebene tiefer.
    const html = markup(BILD("donut"), "quadrat", "seite");
    expect(html).toContain("var(--color-accent)");
    expect(html).not.toContain("#96BCF8");
  });

  it("der Ring behält sein Koordinatensystem und schrumpft nur in der Ausgabe", () => {
    // AM BILD GELERNT: Der Höhenfaktor in die viewBox gerechnet stellte die
    // Ringradien (232, 152) außerhalb des Koordinatensystems — der Ring wurde
    // an seiner eigenen Zeichenfläche abgeschnitten und sah im Bild aus wie ein
    // blaues Quadrat.
    for (const stufe of ["voll", "quadrat"] as KartenStufe[]) {
      expect(markup(BILD("donut"), stufe)).toContain('viewBox="0 0 560 560"');
    }
    const breite = (html: string) => Number(/<svg[^>]*width="([\d.]+)"/.exec(html)?.[1]);
    expect(breite(markup(BILD("donut"), "quadrat"))).toBeLessThan(
      breite(markup(BILD("donut"), "voll")),
    );
  });

  it("der Fuß mit Quellenvermerk und Marke gibt nie nach", () => {
    // Ein beschnittener Lizenzvermerk ist schlimmer als eine zu kleine
    // Zeichnung — am Bild gesehen, als die zweizeilige Quellenzeile unten aus
    // der Karte lief und das Logo halb mitnahm.
    for (const stufe of ["voll", "quadrat"] as KartenStufe[]) {
      const html = markup(BILD("kennzahl"), stufe);
      expect(html, `Stufe ${stufe}`).toMatch(/flex-shrink:0[^"]*border-top|border-top[^"]*flex-shrink:0/);
    }
  });

  it("der Inhaltsbereich darf schrumpfen, sonst drückt er den Fuß hinaus", () => {
    // Ein Flex-Kind hält ohne `min-height: 0` seine Inhaltshöhe. Genau daran
    // lief die Quellenzeile heraus, obwohl der Fuß nicht nachgab.
    for (const art of ["kennzahl", "donut", "aufteilung", "verlauf"] as PostBild["art"][]) {
      expect(markup(BILD(art, 3), "quadrat"), art).toContain("min-height:0");
    }
  });

  it("in jeder Stufe steht der Quellenvermerk vollständig im Markup", () => {
    // Gekürzt wird die Quelle NIE beim Rendern — drei Teile müssen jede
    // Darstellung überleben: wer bereitstellt, unter welcher Lizenz, und dass
    // wir verändert haben.
    for (const stufe of ["voll", "quadrat"] as KartenStufe[]) {
      const html = markup(BILD("kennzahl"), stufe);
      expect(html).toContain("Bundesnetzagentur");
      expect(html).toContain("dl-de/by-2-0");
      expect(html).toContain("Eigene Berechnung");
    }
  });
});
