import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Zwei eigene Seiten auf derselben Anfrage kosten beide Positionen — dieselbe
// Regel, die Atlas- und Förder-Ortsseiten auseinanderhält (Geld-Wörter gegen
// Bestands-Wörter). Hier ist das Paar ein anderes:
//
//   /photovoltaik-zubau-deutschland  → wie VIEL kam WANN dazu (Zubau, Ausbau,
//                                      Förderung, Zeitachse)
//   /photovoltaik-bestand-deutschland → wie VIELE stehen JETZT da (Bestand,
//                                      Anzahl, Verteilung)
//
// Beide leben auf denselben Registerdaten und wären ohne Trennlinie eine
// naheliegende Dublette. Die Trennung ist die Wortklasse im Titel und in der
// Beschreibung — also genau das, was in der Ergebnisliste steht.
//
// Gemessen am 26.08.2026 (DataForSEO, Deutschland): „wie viele
// photovoltaikanlagen gibt es in deutschland" 30/Monat, „wie viele
// balkonkraftwerke gibt es in deutschland" 90/Monat, „anzahl balkonkraftwerke
// deutschland" 50/Monat, „installierte leistung photovoltaik deutschland"
// 20/Monat — alle bei geringer Konkurrenz. „photovoltaik ausbau deutschland"
// (30/Monat) bleibt bewusst bei der Zubau-Seite.

const ROOT = join(__dirname, "..", "..");
const lies = (p: string) => readFileSync(join(ROOT, "app", "(site)", p, "page.tsx"), "utf8");

/** Titel und Beschreibung — das, was in der Ergebnisliste steht. */
function seitenText(quelle: string): string {
  const titel = /title:\s*"([^"]+)"/.exec(quelle)?.[1] ?? "";
  const beschreibung = /description:\s*\n?\s*"([^"]+)"/.exec(quelle)?.[1] ?? "";
  return `${titel} ${beschreibung}`.toLowerCase();
}

const ZUBAU_WOERTER = /\bzubau|\bausbau|\bgeformt|seit 2000/;
const BESTAND_WOERTER = /\bwie viele\b|\bbestand|\banzahl\b|\bgemeldet/;

describe("Bestandsseite und Zubau-Seite zielen nicht auf dieselben Anfragen", () => {
  const bestand = seitenText(lies("photovoltaik-bestand-deutschland"));
  const zubau = seitenText(lies("photovoltaik-zubau-deutschland"));

  it("beide Seiten haben überhaupt einen Titel", () => {
    // Ohne diese Gegenprobe prüfte der Test bei einer umbenannten Metadaten-
    // Form zwei leere Zeichenketten gegeneinander und bliebe grün.
    expect(bestand.trim().length).toBeGreaterThan(40);
    expect(zubau.trim().length).toBeGreaterThan(40);
  });

  it("die Bestandsseite verspricht keinen Zubau", () => {
    expect(bestand, `Zubau-Wort im Auftritt der Bestandsseite: „${bestand}"`).not.toMatch(ZUBAU_WOERTER);
  });

  it("die Zubau-Seite verspricht keine Bestandszahlen", () => {
    expect(zubau, `Bestands-Wort im Auftritt der Zubau-Seite: „${zubau}"`).not.toMatch(BESTAND_WOERTER);
  });

  it("die Bestandsseite trägt die gesuchte Frage wörtlich", () => {
    // „Wie viele … gibt es in Deutschland" ist die Formulierung, die getippt
    // wird. Ein Titel, der sie umschreibt, beantwortet dieselbe Frage und
    // bekommt sie trotzdem nicht.
    expect(bestand).toMatch(/wie viele solaranlagen gibt es in deutschland/);
  });
});
