import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { traegtRangliste, RANGLISTE_MIN_KOMMUNEN, vergleichsBasisPfad } from "../atlas-ranking";

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

  // DER ZWEITE LINKBAU, den der Fix vom 02.08.2026 nicht erfasst hat: Neben
  // jeder Zeile steht ihre Herkunft ("Kreis Nordfriesland"), und die ist auf
  // einer Landes- oder Bundesliste ebenfalls ein Link auf eine Kreis-Rangliste.
  // Er wendete die Regel nicht an. Gemessen am 05.08.2026 in den
  // Fehlerprotokollen: 404 auf die Herkunfts-Links der kreisfreien Städte
  // Flensburg, Schwerin, Düsseldorf, Kassel, Braunschweig, Chemnitz und
  // Neustadt an der Weinstraße — dieselbe Fehlerklasse, nur ein Feld weiter.
  it("auch der Herkunfts-Link neben einer Zeile wendet die Regel an", () => {
    const quelle = readFileSync(RANKING_PAGE, "utf8");
    expect(quelle, "der Herkunfts-Link verlinkt wieder ungeprüft jeden Kreis").toMatch(
      /href:\s*\n?\s*blSlug && kreisSlug && traegtRangliste\(kommunenJeKreis\.get\(kreisId\) \?\? 0\)/,
    );
  });
});

// Warum es diesen zweiten Block gibt:
//
// Die Vergleichstabelle auf einer Gemeindeseite ("Top Kommunen im Landkreis X")
// hängt den Slug jeder Zeile an einen festen Adress-Stamm. Bei einer
// kreisfreien Stadt und bei den Stadtstaaten steht die Vergleichsgruppe aber
// eine Ebene höher — die Zeilen sind dann Kreise bzw. Bundesländer. Der Stamm
// blieb trotzdem der Gemeinde-Stamm.
//
// Gemessen am 05.08.2026 in den Fehlerprotokollen von Produktion:
// "/solar-atlas/rheinland-pfalz/pirmasens/landkreis-cochem-zell" (und sieben
// weitere Kreise unter derselben Stadt), "/solar-atlas/sachsen/dresden/
// landkreis-leipzig", "/solar-atlas/berlin/berlin/bayern". Auf diesen Seiten
// war NICHT eine Zeile kaputt, sondern jede.
//
// Anders als die Ranglisten-Regel oben ist das keine Schwelle, sondern eine
// Ebenen-Zuordnung: Der Stamm ist immer der Pfad der Eltern-Ebene der Zeilen.
describe("Gemeindeseite: die Vergleichstabelle verlinkt die richtige Ebene", () => {
  it("normale Gemeinde — Zeilen sind Gemeinden des Kreises", () => {
    expect(vergleichsBasisPfad("gemeinde", "bayern", "landkreis-cham")).toBe(
      "/solar-atlas/bayern/landkreis-cham",
    );
  });

  it("kreisfreie Stadt — Zeilen sind die Kreise des Landes", () => {
    // Vorher: "/solar-atlas/rheinland-pfalz/pirmasens" + "/landkreis-cochem-zell" = 404.
    expect(vergleichsBasisPfad("landkreis", "rheinland-pfalz", "pirmasens")).toBe(
      "/solar-atlas/rheinland-pfalz",
    );
  });

  it("Stadtstaat — Zeilen sind die Bundesländer", () => {
    // Vorher: "/solar-atlas/berlin/berlin" + "/bayern" = 404.
    expect(vergleichsBasisPfad("bundesland", "berlin", "berlin")).toBe("/solar-atlas");
  });

  // Die eigentliche Zusicherung, unabhängig von den drei Beispielen: Der Stamm
  // plus ein Slug muss so viele Segmente haben, wie die Ebene der Zeile tief
  // liegt. Genau diese Rechnung stimmte vorher in zwei von drei Fällen nicht.
  it("Stamm plus Slug ergibt immer die Adresstiefe der Zeilen-Ebene", () => {
    const tiefe = (p: string) => p.split("/").filter(Boolean).length;
    expect(tiefe(vergleichsBasisPfad("bundesland", "berlin", "berlin")) + 1).toBe(2);
    expect(tiefe(vergleichsBasisPfad("landkreis", "rheinland-pfalz", "pirmasens")) + 1).toBe(3);
    expect(tiefe(vergleichsBasisPfad("gemeinde", "bayern", "landkreis-cham")) + 1).toBe(4);
  });

  it("die Seite baut den Stamm nicht wieder selbst zusammen", () => {
    const quelle = readFileSync(
      join(__dirname, "../../app/(site)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx"),
      "utf8",
    );
    expect(quelle, "die Vergleichstabelle bekommt den Stamm nicht mehr aus der Regel").toMatch(
      /basePath=\{vergleichsBasisPfad\(/,
    );
  });
});
