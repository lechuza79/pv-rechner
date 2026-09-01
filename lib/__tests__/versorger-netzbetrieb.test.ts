import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * EIN NETZBETREIBER VERKAUFT NICHTS — er muss über die Anmeldung informieren.
 *
 * Gemessen am 29.08.2026: 209 der 937 Versorger sind am Namen als Netzbetrieb
 * erkennbar, 68 davon trugen ein Balkonkraftwerk-Merkmal. Zwölf von Hand
 * nachgelesen: **kein einziger verkauft**. Sieben informieren über die
 * Anmeldepflicht („Balkonkraftwerk anmelden", „Zur Anmeldung steckfertiger
 * Anlagen"), der Rest nennt das Wort ohne jedes Angebot.
 *
 * Das Merkmal maß dort „erwähnt" statt „bietet an" — dieselbe Fehlerklasse, vor
 * der CLAUDE.md an erster Stelle warnt: Die Beschriftung sagt etwas anderes, als
 * die Zahl misst. Aufgefallen ist es dem Betreiber an einem Link: Das
 * Balkonkraftwerk-Angebot der ovag steht beim VERTRIEB (ovag.de), erfasst hatten
 * wir die ovag Netz GmbH.
 *
 * Der Test hält die Regel fest, nicht ihr Ergebnis: Bei einem Netzbetreiber
 * braucht ein Geschäftsfeld Verkaufssprache daneben.
 */

const QUELLE = readFileSync(resolve(process.cwd(), "scripts", "utilities-refresh.ts"), "utf8");

describe("Versorger: die Erwähnung belegt kein Angebot", () => {
  it("beschriftet die Spalte als nennt, nicht als bietet-an", () => {
    // Vier Messversuche am 29.08.2026, keiner zuverlässig. Die ehrliche
    // Beschriftung ist das Ergebnis — ein fünftes Muster hätte dieselbe Quote
    // mit mehr Selbstvertrauen geliefert.
    expect(QUELLE).toMatch(/NICHT ZUVERLÄSSIG MESSEN/);
    expect(QUELLE).toMatch(/Von sechs von Hand gelesenen/);
  });

  it("hält die drei gescheiterten Messversuche fest, damit sie nicht wiederkommen", () => {
    expect(QUELLE).toMatch(/BEISPIELRECHNUNG/);
    expect(QUELLE).toMatch(/30 von 910/);
  });

  it("nimmt bei Versorgern die Adresse NICHT als Beleg", () => {
    // „/balkonkraftwerk" führt dort genauso oft auf eine reine Erklärseite.
    expect(QUELLE).toMatch(/ADRESSE KEIN BELEG/);
    expect(QUELLE).not.toMatch(/for \(const f of FELDER\) if \(f\.muster\.test\(adresseLesbar/);
  });

  it("hält die Netzbetrieb-Rolle fest, weil daran die offene Lücke hängt", () => {
    expect(QUELLE).toMatch(/const NETZBETRIEB =/);
    expect(QUELLE).toMatch(/ist_netzbetrieb: istNetz/);
  });

  it("benennt den Vorfall, damit die Regel nicht wieder ausgebaut wird", () => {
    expect(QUELLE).toMatch(/VERKAUFT NICHTS/);
    expect(QUELLE).toMatch(/ovag/i);
  });
});

describe("Die Muster treffen, was sie sollen", () => {
  // Nachgebaut, weil ein Wächter, der nur Text prüft, nichts über das Verhalten
  // aussagt. Beide Richtungen absichtlich kaputtgemacht und rot gesehen.
  const NETZBETRIEB = /\w*netz(e|es|en)?\b|netzgesellschaft|verteilnetz/i;

  it("erkennt echte Netzgesellschaften", () => {
    for (const n of [
      "ovag Netz GmbH",
      "Stromnetz Kulmbach GmbH & Co. KG",
      "Netzgesellschaft Schwerin mbH",
      "e-netz Südhessen AG",
      "wesernetz Bremen GmbH",
    ])
      expect(NETZBETRIEB.test(n), n).toBe(true);
  });

  it("hält Vertriebe und Stadtwerke heraus", () => {
    for (const n of ["Stadtwerke Norderstedt", "OVAG Energie AG", "Stadtwerke Ratingen GmbH"])
      expect(NETZBETRIEB.test(n), n).toBe(false);
  });

  it("prueft netz am WORTENDE, ohne Vernetzung und Netzwerk mitzunehmen", () => {
    // „wesernetz" fiel mit einer Wortgrenze VOR „netz" durch — gemessen, als der
    // Test rot wurde. Ein offenes Muster wäre die Gegenfalle: dieselbe, in die
    // bei den Fachbetrieben ein offenes „Solar*" mit „Solarma" lief.
    expect(NETZBETRIEB.test("wesernetz Bremen GmbH")).toBe(true);
    expect(NETZBETRIEB.test("enercity Netz GmbH")).toBe(true);
    expect(NETZBETRIEB.test("Vernetzung und Digitales")).toBe(false);
    expect(NETZBETRIEB.test("Netzwerk Energie eG")).toBe(false);
  });


});
