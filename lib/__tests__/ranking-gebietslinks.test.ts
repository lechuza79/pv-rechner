import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { traegtRangliste, RANGLISTE_MIN_KOMMUNEN } from "../atlas-ranking";

// Warum es diesen Test gibt:
//
// Die Ranglisten-Seite lehnt ein Gebiet mit nur einer Kommune bewusst ab — eine
// kreisfreie Stadt ist ihr eigener Landkreis, ihre "Rangliste" hätte genau eine
// Zeile. Die Übersicht darüber verlinkte diese Gebiete aber weiterhin unter
// "Nach Kreisen". Ergebnis: Wir verlinkten auf unsere eigenen 404er.
//
// Gemessen am 02.08.2026 in den Fehlerprotokollen von Produktion: 20 solcher
// Fehlaufrufe binnen 24 Stunden, alle auf kreisfreie Städte in Rheinland-Pfalz
// (Mainz, Koblenz, Trier, Ludwigshafen, Speyer, Landau, Pirmasens, Zweibrücken,
// Frankenthal, Neustadt an der Weinstraße) — und die Ranglisten-Seite des Landes
// enthielt die toten Adressen nachweislich selbst im HTML.
//
// Das zählt doppelt: Ein Nutzer landet im Nichts, und der Solar-Atlas ist der
// SEO-Hebel des Projekts — intern verlinkte 404er verbrennt der Crawler
// stellvertretend für Seiten, die es gibt.
//
// Der Test hält die REGEL fest (eine Schwelle, zwei Aufrufer) und die STRUKTUR:
// dass die Gebiets-Links die Regel auch anwenden. Die Zählquellen dürfen sich
// unterscheiden — die Seite zählt ihre geladenen Kinder, die Übersicht zählt aus
// den ohnehin vorhandenen Kennzahlen, um die Datenbank zu schonen.

const RANKING_PAGE = join(__dirname, "../../app/(site)/solar-atlas/ranking/[[...pfad]]/page.tsx");

describe("Rangliste: nur Gebiete verlinken, die es auch gibt", () => {
  it("ein Gebiet mit einer einzigen Kommune trägt keine Rangliste", () => {
    expect(traegtRangliste(0)).toBe(false);
    expect(traegtRangliste(1)).toBe(false);
    expect(traegtRangliste(2)).toBe(true);
    expect(traegtRangliste(24)).toBe(true);
  });

  it("die Schwelle steht bei zwei Kommunen — darunter wäre die Liste einzeilig", () => {
    expect(RANGLISTE_MIN_KOMMUNEN).toBe(2);
  });

  it("die Ablehnung der Seite benutzt die geteilte Regel, keine eigene Zahl", () => {
    const quelle = readFileSync(RANKING_PAGE, "utf8");
    expect(quelle, "die Seite prüft nicht mehr über traegtRangliste()").toMatch(
      /!traegtRangliste\(\(await getChildren\(region\)\)\.length\)/,
    );
    // Die alte, handgetippte Schwelle darf nicht zurückkommen.
    expect(quelle, "die Schwelle steht wieder direkt im Code").not.toMatch(
      /getChildren\(region\)\)\.length <= 1/,
    );
  });

  it("die Gebiets-Links wenden dieselbe Regel an", () => {
    const quelle = readFileSync(RANKING_PAGE, "utf8");
    // Die gefilterte Liste existiert und speist die Links.
    expect(quelle, "es gibt keine gefilterte Kinderliste mehr").toMatch(
      /const verlinkbareKinder = kinder\.filter\(/,
    );
    expect(quelle, "die Kinderliste wird ohne die Regel gefiltert").toMatch(/traegtRangliste\(kommunenJeKreis/);
    expect(quelle, "die Links kommen nicht aus der gefilterten Liste").toMatch(
      /\{verlinkbareKinder\.map\(\(k\) => \(/,
    );
    // Und der Block hängt an der gefilterten Länge, sonst bliebe eine leere
    // Überschrift "Nach Kreisen" ohne einen einzigen Link darunter stehen.
    expect(quelle, "der Block hängt noch an der ungefilterten Kinderzahl").not.toMatch(
      /\{kinder\.length > 0 && \(/,
    );
    expect(quelle).toMatch(/\{verlinkbareKinder\.length > 0 && \(/);
  });

  // DIE FALLE, in die der erste Anlauf dieses Fixes lief (gemessen am
  // 02.08.2026 lokal, bevor er live ging): Ein Stadtstaat hat genau eine
  // Kommune, ist als BUNDESLAND aber ein gültiges Ranking-Gebiet — seine Seite
  // antwortet mit 200. Wer die Ein-Kommune-Regel eine Ebene zu hoch anwendet,
  // heilt 20 tote Links und zerstört dafür die Einstiege nach Berlin und
  // Hamburg auf der bundesweiten Liste.
  it("wendet die Regel nur auf der Kreisebene an, nicht auf Bundesländer", () => {
    const quelle = readFileSync(RANKING_PAGE, "utf8");
    expect(quelle, "die Ebenen-Bedingung fehlt — Stadtstaaten fliegen aus der Liste").toMatch(
      /if \(region\.level !== "bundesland"\) return true;/,
    );
  });
});
