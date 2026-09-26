import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Drei Lagen, drei Sätze — und keine davon behauptet etwas über einen Dritten,
 * das wir nicht belegen können.
 *
 * ANLASS (10.09.2026): Ein Arbeitsstand ohne Datenbankzugang zeigte unter der
 * Wärmepumpen-Prognose den Satz „Für diese Anlagengröße und Vorlauftemperatur
 * ist gerade kein passendes Gerät im Sortiment von Heizungsdiscount24" — eine
 * Aussage über das Sortiment eines Händlers, während wir dessen Katalog
 * überhaupt nicht gelesen hatten. Die Seite sah dabei vollkommen normal aus.
 *
 * Der Grund lag an zwei Stellen: Das Katalog-Modul warf „nicht erreichbar" und
 * „gelesen, leer" in denselben Rückgabewert, und die Anzeige las das Feld
 * `grund` gar nicht aus — es stand im Typ und wurde nie benutzt.
 *
 * Dieselbe Trennlinie gilt beim Förder-Wächter zwischen „hat sich geändert" und
 * „Abruf kam nicht durch": Eine unerreichbare Quelle als Befund auszuweisen
 * behauptet eine Beobachtung, die es nicht gab.
 */

const WURZEL = path.resolve(__dirname, "..", "..");
const lies = (p: string) => fs.readFileSync(path.join(WURZEL, p), "utf-8");

const KATALOG = "lib/wp-katalog-db.ts";
const ROUTE = "app/api/wp-geraete/route.ts";
const ANZEIGE = "components/WpGeraeteEmpfehlung.tsx";

describe("Katalog-Lage: gelesen oder nicht gelesen", () => {
  it("trennt im Katalog-Modul die beiden Zustände", () => {
    const t = lies(KATALOG);
    expect(t, "KatalogStand ohne Erreichbarkeit").toMatch(/erreichbar:\s*boolean/);
    // Ohne Zugang und bei gerissenem Zeitbudget: NICHT als leerer Katalog
    // zurückgeben — das wäre die Behauptung, wir hätten nachgesehen.
    expect(t).toMatch(/if\s*\(!supabase\)\s*return UNERREICHBAR/);
    expect(t).toMatch(/if\s*\(!antwort\)\s*return UNERREICHBAR/);
    // Und die Gegenrichtung: gelesen und leer bleibt eine echte Auskunft.
    expect(t).toMatch(/if\s*\(!zeilen \|\| zeilen\.length === 0\)\s*return LEER/);
  });

  it("meldet den Grund an der Schnittstelle, statt ihn zu verschlucken", () => {
    const t = lies(ROUTE);
    expect(t, "unerreichbarer Katalog wird nicht gemeldet").toMatch(/katalog-unerreichbar/);
    expect(t).toMatch(/katalog-veraltet/);
    // Der unerreichbare Fall muss VOR der Frischeprüfung liegen: Ein nie
    // gelesener Katalog trägt kein Abrufdatum und käme sonst als „veraltet"
    // durch — wieder eine Aussage über das Sortiment.
    expect(t.indexOf("katalog-unerreichbar")).toBeLessThan(t.indexOf("katalog-veraltet"));
  });

  it("sagt in der Anzeige je Lage etwas anderes", () => {
    const t = lies(ANZEIGE);
    expect(t, "der Grund wird nicht ausgewertet").toMatch(/grund === "katalog-unerreichbar"/);
    expect(t).toMatch(/grund === "katalog-veraltet"/);
  });

  it("nennt den Händler NUR dort, wo wir seinen Katalog gelesen haben", () => {
    // Die schärfste der vier Prüfungen: Der Satz über das Sortiment darf im
    // Zweig für den unerreichbaren Katalog nicht vorkommen.
    const t = lies(ANZEIGE);
    const block = t.slice(
      t.indexOf('grund === "katalog-unerreichbar"'),
      t.indexOf('grund === "katalog-veraltet"'),
    );
    //
    // GEPRÜFT WIRD DIE BEHAUPTUNG, NICHT DAS WORT. Die erste Fassung verbot
    // „Sortiment" überhaupt — und schlug damit an der richtigen Formulierung an
    // („Das sagt nichts über das Sortiment"). Ein Test, der auf den Wortlaut
    // statt auf die Aussage prüft, ist in beide Richtungen wertlos; dieselbe
    // Lehre wie bei der Vertrauens-Leiste.
    expect(block, "unerreichbarer Katalog nennt den Händler").not.toMatch(/WP_HAENDLER/);
    expect(block, "unerreichbarer Katalog behauptet etwas über das Sortiment").not.toMatch(
      /im Sortiment von/,
    );
    // Und er sagt ausdrücklich, dass er nichts darüber sagt.
    expect(block).toMatch(/sagt nichts über das Sortiment/);
  });
});
