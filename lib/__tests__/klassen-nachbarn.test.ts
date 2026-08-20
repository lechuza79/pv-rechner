import { describe, it, expect } from "vitest";
import { MIN_ORTE_FUER_KLASSE, klassenNachbarn } from "../atlas";

// Der Fall, aus dem die Funktion entstanden ist (Melsungen, 20.08.2026): Die
// Nachbarschafts-Liste der Gemeindeseite führte alle 27 Gemeinden des
// Schwalm-Eder-Kreises gemeinsam — 13 kleine Gemeinden und 14 Gemeinden und
// Kleinstädte. Melsungen stand mit 14.000 Einwohnern auf Platz 27 von 27,
// direkt unter einem Satz, der sagte, der Ort liege 39 % über dem
// Landesschnitt. Beides stimmt; die Liste stellte nur eine Stadt gegen Dörfer.

const ort = (population: number | null) => ({ population });

/** Größenklassen: Dörfer < 1.000, Kleine Gemeinden < 5.000,
 *  Gemeinden und Kleinstädte < 20.000. */
const DORF = 400;
const KLEIN = 2_000;
const STADT = 12_000;

describe("Vergleichsgruppe nach Größenklasse", () => {
  it("nimmt nur Orte derselben Klasse", () => {
    const nachbarn = [
      ...Array(6).fill(ort(DORF)),
      ...Array(7).fill(ort(STADT)),
      ort(KLEIN),
    ];
    const g = klassenNachbarn(nachbarn, STADT, true);
    expect(g?.orte).toHaveLength(7);
    expect(g?.klasse.label).toBe("Gemeinden und Kleinstädte");
  });

  it("fällt auf die volle Liste zurück, wenn die Klasse zu dünn ist", () => {
    // „Platz 2 von 3" ist keine Einordnung, sondern eine Zufallszahl.
    const knappDarunter = [
      ...Array(MIN_ORTE_FUER_KLASSE - 1).fill(ort(STADT)),
      ...Array(20).fill(ort(DORF)),
    ];
    expect(klassenNachbarn(knappDarunter, STADT, true)).toBeNull();

    const genau = [...Array(MIN_ORTE_FUER_KLASSE).fill(ort(STADT)), ...Array(20).fill(ort(DORF))];
    expect(klassenNachbarn(genau, STADT, true)?.orte).toHaveLength(MIN_ORTE_FUER_KLASSE);
  });

  it("greift NICHT, wo die Nachbarn keine Gemeinden sind", () => {
    // Eine kreisfreie Stadt vergleicht sich mit Kreisen, ein Stadtstaat mit
    // Bundesländern. Eine Größenklasse darüberzulegen wäre eine erfundene
    // Einteilung — und würde eine Rangliste auf ein paar Zeilen eindampfen,
    // deren Grundgesamtheit nie so gemeint war.
    const kreise = Array(20).fill(ort(STADT));
    expect(klassenNachbarn(kreise, STADT, false)).toBeNull();
  });

  it("ohne eigene Einwohnerzahl gibt es keine Klasse", () => {
    const nachbarn = Array(20).fill(ort(STADT));
    expect(klassenNachbarn(nachbarn, null, true)).toBeNull();
    expect(klassenNachbarn(nachbarn, 0, true)).toBeNull();
  });

  it("Nachbarn ohne Einwohnerzahl fallen heraus statt in die falsche Klasse", () => {
    const nachbarn = [...Array(6).fill(ort(STADT)), ...Array(4).fill(ort(null))];
    expect(klassenNachbarn(nachbarn, STADT, true)?.orte).toHaveLength(6);
  });

  it("die eigene Kommune bleibt in ihrer Gruppe", () => {
    // Sonst zeigt die Liste eine Vergleichsgruppe ohne die Zeile, um die es
    // geht — und die Hervorhebung der eigenen Zeile läuft ins Leere.
    const selbst = { population: STADT, name: "Melsungen" };
    const nachbarn = [selbst, ...Array(8).fill({ population: STADT, name: "x" }), ...Array(13).fill({ population: DORF, name: "d" })];
    const g = klassenNachbarn(nachbarn, STADT, true);
    expect(g?.orte).toContain(selbst);
  });
});
