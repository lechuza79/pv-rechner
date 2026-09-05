import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  WOHNFLAECHEN,
  HAUSTYP_WP,
  PERSONEN,
  INSULATION_BESTAND,
  INSULATION_NEUBAU,
} from "../constants";

/**
 * Der Teilen-Link des Wärmepumpen-Rechners.
 *
 * Zwei Fehlerklassen, beide am 05.09.2026 von einer Gegenprüfung gefunden,
 * beide von außen unsichtbar: Die Seite sieht in beiden Fällen normal aus.
 *
 * 1. INDIZES OHNE GRENZE. Vier Parameter (Fläche, Haustyp, Dämmstufe,
 *    Personen) sind Positionen in Auswahllisten. Ein ungeprüfter Wert greift
 *    ins Leere, und `WOHNFLAECHEN[99].m2` wirft — die Ergebnisseite fällt in
 *    die Fehlergrenze. Es braucht dafür keinen Angreifer: Ein Link, bei dem
 *    beim Kopieren eine Ziffer verlorengeht, genügt.
 *
 * 2. UNVOLLSTÄNDIGE ADRESSE. Wer einen Wert von Hand setzt, sieht eine andere
 *    Zahl als der Empfänger seines Links — solange dieser Wert nicht in der
 *    Adresse steht. Das ist schlimmer als ein fehlender Link: Beide sehen eine
 *    Zahl, beide halten sie für dieselbe.
 */

const RECHNER = path.resolve(
  __dirname,
  "..",
  "..",
  "app",
  "(site)",
  "waermepumpe-rechner",
  "waermepumpe.tsx",
);

const quelle = () => fs.readFileSync(RECHNER, "utf-8");

/**
 * Der Index-Leser des Rechners, nachgebaut.
 *
 * Nachgebaut statt importiert, weil er in der Komponente steckt und dort an
 * `useSearchParams` hängt. Der Test unten hält beide Fassungen aneinander —
 * ein Nachbau, den niemand mit dem Original vergleicht, prüft sich selbst.
 */
const i0 = (roh: string | null, fallback: number, laenge: number) => {
  if (roh === null) return fallback;
  const n = Number.parseInt(roh, 10);
  return Number.isInteger(n) && n >= 0 && n < laenge ? n : fallback;
};

describe("Indizes aus der Adresse", () => {
  it("hält jeden Wert innerhalb seiner Liste", () => {
    for (const [roh, erwartet] of [
      ["0", 0],
      ["3", 3],
      ["4", 1], // = WOHNFLAECHEN.length → Startwert
      ["99", 1],
      ["-1", 1],
      ["1.5", 1],
      ["abc", 1],
      ["", 1],
      [null, 1],
    ] as const) {
      expect(i0(roh, 1, WOHNFLAECHEN.length), `Eingabe ${JSON.stringify(roh)}`).toBe(erwartet);
    }
  });

  it("greift bei keiner Eingabe ins Leere", () => {
    // Die Gegenprobe zur Regel: Für jede der vier Listen muss der gelieferte
    // Index einen echten Eintrag treffen — sonst wirft der Zugriff daneben.
    const listen: [readonly unknown[], number][] = [
      [WOHNFLAECHEN, 1],
      [HAUSTYP_WP, 0],
      [PERSONEN, 2],
      [INSULATION_BESTAND, 1],
      [INSULATION_NEUBAU, 1],
    ];
    for (const [liste, start] of listen) {
      for (const roh of ["0", "1", "2", "3", "4", "10", "99", "-5", "1.5", "x", null]) {
        const idx = i0(roh, start, liste.length);
        expect(liste[idx], `Liste(${liste.length}) mit ${JSON.stringify(roh)}`).toBeDefined();
      }
    }
  });

  it("kennt die kürzere Dämmstufen-Liste des Neubaus", () => {
    // Bestand hat vier Stufen, Neubau drei. Eine feste Grenze ließe
    // `?si=neubau&da=3` durch — einen Index, den es dort nicht gibt.
    expect(INSULATION_NEUBAU.length).toBeLessThan(INSULATION_BESTAND.length);
    expect(INSULATION_NEUBAU[i0("3", 1, INSULATION_NEUBAU.length)]).toBeDefined();
    expect(i0("3", 1, INSULATION_NEUBAU.length)).toBe(1);
    expect(i0("3", 1, INSULATION_BESTAND.length)).toBe(3);
  });

  it("liest im Rechner wirklich über die Grenze, nicht roh", () => {
    const t = quelle();
    // Jeder der vier Indizes nennt seine Liste beim Lesen.
    expect(t).toMatch(/i0\("fl", 1, WOHNFLAECHEN\.length\)/);
    expect(t).toMatch(/i0\("ht", 0, HAUSTYP_WP\.length\)/);
    expect(t).toMatch(/i0\("pe", 2, PERSONEN\.length\)/);
    expect(t).toMatch(/i0\("da", 1, daemmstufenAnzahl\)/);
    // Und der frühere ungeprüfte Leser ist weg.
    expect(t).not.toMatch(/\bz0\(/);
  });
});

/**
 * Der Betrag in der Wege-Reiterzeile.
 *
 * Vier Reiter teilen sich 480 px, die volle Zahl passt nicht. Die erste Fassung
 * rundete hart auf Tausender — und erzeugte damit Anzeigen ohne Aussage: 400 €
 * Gewinn wurden zu "+0k €", 400 € Verlust zu "-0k €". Der Bereich ist real, der
 * Rechner hat für knappe Fälle einen eigenen Zweig. Vier Reiter, von denen
 * mehrere "0k €" tragen, sind keine Auswahl.
 */
describe("Betrag im Wege-Reiter", () => {
  // Nachgebaut; der letzte Test hält den Nachbau ans Original.
  const reiterBetrag = (euro: number): string => {
    if (Math.abs(euro) < 1000) {
      const hundert = Math.round(euro / 100) * 100;
      return `${hundert > 0 ? "+" : ""}${hundert.toLocaleString("de-DE")} €`;
    }
    const tausend = Math.round(euro / 1000);
    return `${tausend > 0 ? "+" : ""}${tausend.toLocaleString("de-DE")}k €`;
  };

  it("rundet große Beträge auf Tausender", () => {
    expect(reiterBetrag(23810)).toBe("+24k €");
    expect(reiterBetrag(-1600)).toBe("-2k €");
    expect(reiterBetrag(1200)).toBe("+1k €");
  });

  it("zeigt unter 1.000 € den Betrag statt einer Null", () => {
    // Genau die Werte, an denen die erste Fassung scheiterte.
    expect(reiterBetrag(400)).toBe("+400 €");
    expect(reiterBetrag(-400)).toBe("-400 €");
    expect(reiterBetrag(0)).toBe("0 €");
    expect(reiterBetrag(950)).toBe("+1.000 €");
  });

  it("erzeugt nie eine Null mit Vorzeichen", () => {
    // Die Fehlerklasse als solche: "+0k €" und "-0k €" sagen nichts und sehen
    // nach einem Defekt aus.
    for (let euro = -1500; euro <= 1500; euro += 50) {
      const t = reiterBetrag(euro);
      expect(t, `bei ${euro} €`).not.toMatch(/^[+-]?0k/);
    }
  });

  it("wird im Rechner wirklich benutzt", () => {
    const t = quelle();
    expect(t).toMatch(/function reiterBetrag\(/);
    expect(t).toMatch(/\{reiterBetrag\(w\.r\.tcoEinsparung\)\}/);
    // Die harte Tausender-Rundung an der Anzeigestelle ist weg.
    expect(t).not.toMatch(/Math\.round\(w\.r\.tcoEinsparung \/ 1000\)/);
  });
});

describe("Vollständigkeit des Teilen-Links", () => {
  /**
   * Jeder Zustand, der die angezeigte Zahl verändert, mit seinem Kürzel.
   *
   * Wer hier einen Eintrag ergänzt, ergänzt ihn im Rechner mit — der Test
   * prüft beide Richtungen. Das ist der Punkt: Ein neuer editierbarer Wert
   * fällt sonst still aus dem Link, und niemandem fällt es auf, weil die Seite
   * beim Absender richtig aussieht.
   */
  const IM_LINK: [string, string][] = [
    ["si", "Situation (Bestand/Neubau)"],
    ["fl", "Wohnfläche"],
    ["cf", "Wohnfläche von Hand"],
    ["ht", "Haustyp"],
    ["da", "Dämmstufe"],
    ["pe", "Personen"],
    ["hz", "Heizsystem"],
    ["wt", "Wärmequelle"],
    ["wg", "gewählter Weg"],
    ["sz", "Preis-Szenario"],
    ["br", "Referenzheizung"],
    ["hk", "Heizkörpertausch"],
    ["sn", "Selbstnutzung"],
    ["ki", "Kind im Haushalt"],
    ["eu", "EU-Ursprung"],
    ["pv", "Solaranlage"],
    ["pk", "Anlagengröße der Solaranlage"],
    ["ps", "Speichergröße"],
    ["plz", "Postleitzahl"],
    ["iv", "Investition von Hand"],
    ["qg", "Heizwärme von Hand"],
    ["hl", "Heizlast von Hand"],
    ["gp", "Gaspreis von Hand"],
    ["sp", "Strompreis von Hand"],
    ["jz", "Jahresarbeitszahl von Hand"],
    ["fi", "neue fossile Heizung von Hand"],
    ["ah", "ersetzte Altheizung"],
    ["ek", "Haushaltseinkommen"],
    ["bs", "Förderstand (heute / ab Stichtag)"],
  ];

  it("schreibt jeden ergebnisrelevanten Wert", () => {
    const t = quelle();
    const fehlen = IM_LINK.filter(([k]) => !t.includes(`p.set("${k}"`)).map(([k, was]) => `${k} (${was})`);
    expect(fehlen, `Nicht im Teilen-Link:\n${fehlen.join("\n")}`).toEqual([]);
  });

  it("liest jeden davon auch wieder ein", () => {
    const t = quelle();
    const fehlen = IM_LINK.filter(([k]) => !new RegExp(`["']${k}["']`).test(t)).map(
      ([k, was]) => `${k} (${was})`,
    );
    expect(fehlen, `Wird geschrieben, aber nicht gelesen:\n${fehlen.join("\n")}`).toEqual([]);
  });

  it("nimmt die von Hand gesetzten Werte mit — sie sind der eigentliche Grund", () => {
    // Ohne sie rechnet der Empfänger mit unseren Schätzungen, sieht aber
    // dieselbe Überschrift. Vier davon fehlten in der ersten Fassung.
    const t = quelle();
    for (const k of ["gp", "sp", "jz", "fi", "iv", "qg", "hl"]) {
      expect(t, `von Hand gesetzter Wert ${k} fehlt`).toContain(`p.set("${k}"`);
    }
  });

  it("nimmt den Förderstand mit — Vorgabe der Projektanleitung", () => {
    // CLAUDE.md: „Wer den Teilen-Link nachrüstet, nimmt den Förderstand mit
    // auf." Ohne ihn bekäme der Empfänger unsere Förderannahme auf seine
    // eigenen Gebäudewerte gerechnet.
    expect(quelle()).toContain('p.set("bs"');
  });
});
