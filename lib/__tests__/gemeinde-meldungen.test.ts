import { describe, it, expect } from "vitest";
import {
  MIN_ANLAGEN_FUER_AUSLAUF,
  gemeindeMeldungen,
  hatNachricht,
  type MeldungsDaten,
} from "../gemeinde-meldungen";
import { FEED_IN_YEARS } from "../constants";

// Die Schranken sind der Inhalt dieser Datei, nicht die Formulierungen.
//
// Jede geprüfte Regel steht hier, weil ihr Bruch von außen UNSICHTBAR wäre: Ein
// Superlativ auf drei Anlagen sieht aus wie einer auf dreihundert, „1 neue
// Anlagen" sieht aus wie ein Tippfehler und ist ein Rechenfehler in Worten, und
// eine Meldung ohne Nenner liest sich flüssiger als eine mit.

const JAHR = 2026;

const BASIS: MeldungsDaten = {
  name: "Musterdorf",
  regionId: "06440012",
  population: 8000,
  solar: {
    total_count: 400,
    total_kwp: 4000,
    by_segment: [{ segment: "privat_dach", count: 300, kwp: 2400 }],
    by_year: [
      { year: 2025, count: 40, kwp: 380 },
      { year: 2024, count: 25, kwp: 240 },
    ],
    by_year_segment: [],
  },
  speicher: { kwh_batterie: 900, by_segment: [{ segment: "batterie_privat", count: 90 }] },
  standIso: "2026-08-05",
};

/** Referenzfall mit gezielt geänderten Teilen. */
function daten(o: {
  name?: string;
  population?: number | null;
  solar?: Partial<MeldungsDaten["solar"]>;
  speicher?: Partial<MeldungsDaten["speicher"]>;
} = {}): MeldungsDaten {
  return {
    ...BASIS,
    ...(o.name !== undefined ? { name: o.name } : {}),
    ...(o.population !== undefined ? { population: o.population } : {}),
    solar: { ...BASIS.solar, ...o.solar },
    speicher: { ...BASIS.speicher, ...o.speicher },
  };
}

/** Nur der Zubau-Jahrgang, der ausläuft — der Rest bleibt der Referenzfall. */
function mitAuslauf(anzahl: number, segment = "privat_dach"): MeldungsDaten {
  return daten({
    solar: { by_year_segment: [{ year: JAHR - FEED_IN_YEARS, segment, count: anzahl, kwp: anzahl * 4.7 }] },
  });
}

describe("Mindestgrößen", () => {
  it("meldet keinen Zubau unterhalb der Schwelle", () => {
    // Der Fall aus dem Kommunen-Outreach: 16 Einwohner, ein Balkonkraftwerk,
    // „Platz 1 von 150". Der Superlativ entstand vollständig im Nenner.
    const m = gemeindeMeldungen({
      daten: daten({ solar: { by_year: [{ year: 2025, count: 3, kwp: 22 }] } }),
      heuteJahr: JAHR,
    });
    expect(m.map((x) => x.schluessel)).not.toContain("zubau-2025");
  });

  it("meldet den Auslauf erst ab der eigenen, höheren Schwelle", () => {
    const knappDrunter = gemeindeMeldungen({
      daten: mitAuslauf(MIN_ANLAGEN_FUER_AUSLAUF - 1),
      heuteJahr: JAHR,
    });
    expect(knappDrunter.some((x) => x.art === "stichtag")).toBe(false);

    const genau = gemeindeMeldungen({
      daten: mitAuslauf(MIN_ANLAGEN_FUER_AUSLAUF),
      heuteJahr: JAHR,
    });
    expect(genau.some((x) => x.art === "stichtag")).toBe(true);
  });

  it("zählt für den Auslauf NUR private Dächer", () => {
    // Eine Freiflächenanlage von 2006 gehört einem Betreiber, der seine
    // Vermarktung kennt. Sie mitzuzählen würde die Meldung an Orten auslösen,
    // an denen kein einziger Haushalt betroffen ist.
    const m = gemeindeMeldungen({
      daten: mitAuslauf(50, "freiflaeche"),
      heuteJahr: JAHR,
    });
    expect(m.some((x) => x.art === "stichtag")).toBe(false);
  });
});

describe("Grammatik ist Teil der Richtigkeit", () => {
  it("schreibt nie „1 Anlagen“", () => {
    const m = gemeindeMeldungen({
      daten: daten({
        solar: {
          by_segment: [{ segment: "privat_dach", count: 1, kwp: 9 }],
          by_year: [{ year: 2025, count: 1, kwp: 9 }],
          by_year_segment: [{ year: JAHR - FEED_IN_YEARS, segment: "privat_dach", count: 1, kwp: 4 }],
        },
      }),
      heuteJahr: JAHR,
    });
    const alles = m.map((x) => `${x.titel} ${x.text}`).join(" ");
    expect(alles).not.toMatch(/\b1 Anlagen\b/);
  });
});

describe("Der Nenner steht dabei", () => {
  it("nennt bei einer Platzierung immer die Gruppengröße", () => {
    // „Platz 1 in Hessen" ohne „von 53" behauptet den ersten Platz unter allen
    // hessischen Kommunen — im Kommunen-Outreach real passiert.
    const m = gemeindeMeldungen({
      daten: daten(),
      platzierung: {
        messgroesse: "der privaten Solarleistung je Einwohner",
        rang: 1,
        ausN: 53,
        gruppe: "im Landkreis Fulda",
      },
      heuteJahr: JAHR,
    });
    const platz = m.find((x) => x.schluessel.startsWith("platz-"));
    expect(platz).toBeDefined();
    expect(platz!.text).toContain("von 53");
  });

  it("meldet keine hinteren Plätze", () => {
    // Lob mit Namen, Kritik ohne. Ein hinterer Rang wäre eine Bloßstellung —
    // und beendet den Outreach in einer ganzen Region.
    const m = gemeindeMeldungen({
      daten: daten(),
      platzierung: { messgroesse: "der Solarleistung je Einwohner", rang: 47, ausN: 53, gruppe: "im Landkreis Fulda" },
      heuteJahr: JAHR,
    });
    expect(m.some((x) => x.schluessel.startsWith("platz-"))).toBe(false);
  });
});

describe("Förderung", () => {
  it("nennt nur Programme, die gerade zählen", () => {
    // Ob ein Programm zählt, entscheidet eine Stelle im Projekt — hier wird das
    // Urteil hereingereicht, nie nachgebaut. Ein abgelaufener Beleg macht aus
    // einer Auskunft eine Behauptung.
    const m = gemeindeMeldungen({
      daten: daten(),
      foerderung: [
        { name: "Solarbonus Musterdorf", zaehlt: true },
        { name: "Altes Programm", zaehlt: false },
      ],
      heuteJahr: JAHR,
    });
    const f = m.find((x) => x.schluessel.startsWith("foerderung-"));
    expect(f!.text).toContain("Solarbonus Musterdorf");
    expect(f!.text).not.toContain("Altes Programm");
  });

  it("schweigt, wenn kein Programm zählt", () => {
    const m = gemeindeMeldungen({
      daten: daten(),
      foerderung: [{ name: "Abgelaufen", zaehlt: false }],
      heuteJahr: JAHR,
    });
    expect(m.some((x) => x.schluessel.startsWith("foerderung-"))).toBe(false);
  });
});

describe("Reihenfolge und Leerfall", () => {
  it("stellt den Stichtag vor den Bestand", () => {
    const m = gemeindeMeldungen({
      daten: mitAuslauf(40),
      heuteJahr: JAHR,
    });
    expect(m[0].art).toBe("stichtag");
  });

  it("liefert für einen Ort ohne Substanz gar nichts", () => {
    // Leer ist ein zulässiges Ergebnis. Eine erzwungene Aussage wäre genau der
    // Fehler, gegen den die Schranken gebaut sind.
    const m = gemeindeMeldungen({
      daten: daten({
        population: 60,
        solar: {
          total_count: 2,
          total_kwp: 14,
          by_segment: [{ segment: "privat_dach", count: 2, kwp: 14 }],
          by_year: [{ year: 2025, count: 1, kwp: 7 }],
          by_year_segment: [],
        },
        speicher: { kwh_batterie: 0, by_segment: [] },
      }),
      heuteJahr: JAHR,
    });
    expect(m).toHaveLength(0);
  });
});

describe("Wann eine Mail überhaupt rausgeht", () => {
  it("ein reiner Bestand ist keine Nachricht", () => {
    // Der Bestand stand beim letzten Mal genauso da. Ihn zu verschicken wäre
    // die Sorte Mail, nach der man sich abmeldet.
    const nurBestand = gemeindeMeldungen({
      daten: daten({ solar: { by_year: [] } }),
      heuteJahr: JAHR,
    });
    expect(nurBestand.length).toBeGreaterThan(0);
    expect(nurBestand.every((m) => m.art === "bestand")).toBe(true);
    expect(hatNachricht(nurBestand)).toBe(false);
  });

  it("eine Bewegung ist eine Nachricht", () => {
    expect(hatNachricht(gemeindeMeldungen({ daten: daten(), heuteJahr: JAHR }))).toBe(true);
  });
});

describe("Grammatik: die Ortsangabe", () => {
  // GEMESSEN AM 05.09.2026, live in der Abo-Mail seit dem 01.09.: Alle fünf
  // Meldungen setzten die Ortsangabe mit ihrer Präposition ein UND schrieben
  // davor noch einmal eine — „2025 gingen in in Heringen (Werra) 124 Anlagen
  // ans Netz". Kein Typfehler, kein roter Test, keine kaputte Seite; sichtbar
  // erst, als dieselbe Rechnung zum ersten Mal auf einer Seite stand.
  //
  // Zwei Formen des Fehlers, und nur die erste sieht man beim Überfliegen:
  // die doppelte Präposition — und der Ort als SUBJEKT mit Präposition davor
  // („in Heringen fördert Solaranlagen"), der grammatisch gar kein Subjekt mehr
  // hat.
  //
  // Geprüft wird über mehrere Ortsnamen, weil die Präposition wechselt: „in"
  // bei einer Gemeinde, „im" bei einem Neutrum, „in der" bei einem Femininum.
  // Ein Test auf ein einziges „in in" fände die anderen beiden nicht.
  const ORTE = ["Musterdorf", "Saarland", "Pfalz"];

  it("keine doppelte Ortspräposition", () => {
    for (const name of ORTE) {
      for (const m of gemeindeMeldungen({ daten: daten({ name }), heuteJahr: JAHR })) {
        const text = `${m.titel} ${m.text}`;
        expect(text, `${name}: ${text}`).not.toMatch(/\b(in|im)\s+(in|im)\s+der\s/i);
        expect(text, `${name}: ${text}`).not.toMatch(/\b(in|im)\s+(in|im)\b/i);
      }
    }
  });

  it("der Ort steht als Subjekt ohne Präposition", () => {
    // „fördert" und „steht" haben den Ort als Subjekt. Eine Präposition davor
    // macht den Satz kopflos — und beides stand so im Code.
    for (const name of ORTE) {
      for (const m of gemeindeMeldungen({
        daten: daten({ name }),
        heuteJahr: JAHR,
        foerderung: [{ name: "Solarbonus", zaehlt: true }],
        platzierung: {
          messgroesse: "Solarleistung je Einwohner",
          rang: 1,
          ausN: 12,
          gruppe: "im Landkreis Fulda",
        },
      })) {
        const text = `${m.titel} ${m.text}`;
        expect(text, `${name}: ${text}`).not.toMatch(/\b(in|im|in der)\s+\S+\s+(fördert|steht)\b/i);
      }
    }
  });
});
