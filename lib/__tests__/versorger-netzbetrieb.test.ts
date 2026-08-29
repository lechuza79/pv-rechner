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

describe("Versorger: Netzbetrieb ist kein Anbieter", () => {
  it("erkennt den Netzbetrieb und verlangt dort Verkaufssprache", () => {
    expect(QUELLE).toMatch(/const NETZBETRIEB =/);
    expect(QUELLE).toMatch(/const VERKAUFSSPRACHE =/);
    expect(QUELLE).toMatch(/if \(!VERKAUFSSPRACHE\.test\(nah\)\) continue;/);
  });

  it("nimmt bei einem Netzbetrieb die Adresse NICHT als Beleg", () => {
    // „/balkonkraftwerk-anmelden" trägt das Wort und ist kein Angebot.
    expect(QUELLE).toMatch(/if \(!istNetz\)/);
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
  const VERKAUFSSPRACHE =
    /\b(kaufen|bestellen|shop|angebot anfordern|komplettset|rabatt|jetzt sichern|bei uns erh[äa]ltlich|unser angebot|preis(e|liste)?|ab \d|\d+\s*€)\b/i;

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

  it("unterscheidet Verkauf von Anmeldung", () => {
    expect(VERKAUFSSPRACHE.test("Balkonkraftwerk-Komplettset mit 10 % Rabatt")).toBe(true);
    expect(VERKAUFSSPRACHE.test("Mini-PV-Anlage für 499,00 € bei uns erhältlich")).toBe(true);
    expect(VERKAUFSSPRACHE.test("Balkonkraftwerk anmelden")).toBe(false);
    expect(VERKAUFSSPRACHE.test("Zur Anmeldung steckfertiger Anlagen (Balkonkraftwerk)")).toBe(false);
    expect(VERKAUFSSPRACHE.test("Balkonkraftwerk registrieren - Hauseigentümer")).toBe(false);
  });
});
