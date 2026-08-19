import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  FREIFLAECHE_AUSSCHREIBUNGEN,
  FREIFLAECHE_AUSSCHREIBUNG_JAHRE,
  FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR,
  FREIFLAECHE_AW_CT,
  FREIFLAECHE_GEPRUEFT_ISO,
  FREIFLAECHE_GESETZLICHER_BASISWERT_CT,
  FREIFLAECHE_HISTORIE,
  FREIFLAECHE_VALID_FROM,
  FREIFLAECHE_ZUSCHLAG_AB,
  freiflaecheZuschlagHerkunft,
} from "../freiflaeche-config";
import { PRUEFSTAND } from "../pruefstand";

const ROOT = join(__dirname, "..", "..");

/**
 * Realitäts-Anker für die Freiflächen-Zuschlagswerte (Wächter-Gate, Regel 7).
 *
 * Der Wächter `solar-check-freiflaeche-verify` darf diese Zahlen selbst
 * nachtragen — eine veröffentlichte Ausschreibungsrunde hat genau eine richtige
 * Antwort. Genau deshalb braucht es hier einen Anker: Was ein Automat schreibt,
 * liest vorher niemand mehr.
 *
 * Die Anker prüfen NICHT, ob eine Zahl plausibel aussieht (das wäre der
 * Handfaktor aus Regel 5), sondern ob sie zu den anderen belegten Zahlen passt.
 * Ein verrutschtes Komma, eine verwechselte Tabellenspalte oder ein zu früh
 * eingetragenes halbes Jahr reißen genau diese Beziehungen.
 */

describe("Freifläche: das gleitende Fenster der jüngsten Runden", () => {
  it("hält genau vier Runden, aufsteigend und ohne Dublette", () => {
    // Vier ist eine Modellentscheidung (ein Stichtagswert wäre kein Niveau) und
    // gehört dem Betreiber — der Wächter tauscht Runden aus, er ändert die
    // Fenstergröße nicht.
    expect(FREIFLAECHE_AUSSCHREIBUNGEN).toHaveLength(4);

    const termine = FREIFLAECHE_AUSSCHREIBUNGEN.map((r) => r.gebotstermin);
    expect(new Set(termine).size, "dieselbe Runde steht zweimal im Fenster").toBe(termine.length);
    expect([...termine].sort()).toEqual(termine);
  });

  it("spannt rund zwölf Monate — bei drei Gebotsterminen im Jahr", () => {
    // § 28a Abs. 1 EEG 2023: 1. März, 1. Juli, 1. Dezember. Vier Runden
    // einschließlich beider Ränder sind deshalb genau ein Jahr. Deckt das
    // Fenster mehr ab, ist eine Runde übersprungen worden; deckt es weniger ab,
    // wurde eine Runde doppelt gezählt oder ein fremdes Segment gelesen.
    const erste = Date.parse(FREIFLAECHE_AUSSCHREIBUNGEN[0].gebotstermin);
    const letzte = Date.parse(FREIFLAECHE_AUSSCHREIBUNGEN[FREIFLAECHE_AUSSCHREIBUNGEN.length - 1].gebotstermin);
    const monate = (letzte - erste) / (1000 * 60 * 60 * 24 * 30.44);
    expect(monate).toBeGreaterThan(10);
    expect(monate).toBeLessThan(14);
  });

  it("jede Runde trägt eine Menge und einen Zuschlagswert im belegten Band", () => {
    for (const r of FREIFLAECHE_AUSSCHREIBUNGEN) {
      expect(r.mengeKw, `${r.gebotstermin}: Menge fehlt oder ist negativ`).toBeGreaterThan(0);
      expect(r.zuschlagCt, `${r.gebotstermin}: Zuschlagswert nicht positiv`).toBeGreaterThan(0);
      // Der gesetzliche Basiswert ist die Obergrenze der Sinnhaftigkeit: Läge ein
      // Zuschlag darüber, hätte niemand ausgeschrieben statt den Gesetzessatz zu
      // nehmen — und die Begründung im Kopf der Config („die Auslassung der
      // Kleinanlagen geht zu unseren Ungunsten") wäre hinfällig.
      expect(
        r.zuschlagCt,
        `${r.gebotstermin}: Zuschlag über dem gesetzlichen Basiswert — falsche Spalte gelesen?`
      ).toBeLessThan(FREIFLAECHE_GESETZLICHER_BASISWERT_CT);
    }
  });

  it("kein Sprung über 30 % von Runde zu Runde", () => {
    // Die Sprunggrenze des Wächter-Gates, hier als Test: Ein solcher Sprung ist
    // eher ein Lesefehler als ein Marktereignis. Zum Maßstab — die Runden
    // 2024–2026 lagen alle zwischen 4,66 und 5,00 ct.
    for (let i = 1; i < FREIFLAECHE_AUSSCHREIBUNGEN.length; i++) {
      const vor = FREIFLAECHE_AUSSCHREIBUNGEN[i - 1];
      const jetzt = FREIFLAECHE_AUSSCHREIBUNGEN[i];
      const sprung = Math.abs(jetzt.zuschlagCt - vor.zuschlagCt) / vor.zuschlagCt;
      expect(sprung, `${vor.gebotstermin} → ${jetzt.gebotstermin}: Sprung ${(sprung * 100).toFixed(0)} %`).toBeLessThan(
        0.3
      );
    }
  });
});

describe("Freifläche: der heutige anzulegende Wert ist gerechnet, nicht getippt", () => {
  it("steht nirgends als Zahl im Quelltext", () => {
    // Wächter-Gate, Regel 5: kein Handfaktor. Wer den gerechneten Ausdruck durch
    // eine Zahl ersetzt, kappt die Verbindung zur Tabelle — und dann kann das
    // Fenster nachgeführt werden, ohne dass sich der Wert bewegt.
    const quelle = readFileSync(join(ROOT, "lib", "freiflaeche-config.ts"), "utf8");
    expect(
      /export const FREIFLAECHE_AW_CT\s*=\s*[\d.]+\s*;/.test(quelle),
      "FREIFLAECHE_AW_CT ist ein getippter Zahlenwert statt einer Rechnung"
    ).toBe(false);
  });

  it("liegt zwischen kleinstem und größtem Wert des Fensters", () => {
    // Eigenschaft jedes gewichteten Mittels. Fällt sie, stimmt die Gewichtung
    // nicht (etwa weil eine Menge in MW statt kW eingetragen wurde).
    const werte = FREIFLAECHE_AUSSCHREIBUNGEN.map((r) => r.zuschlagCt);
    expect(FREIFLAECHE_AW_CT).toBeGreaterThanOrEqual(Math.min(...werte));
    expect(FREIFLAECHE_AW_CT).toBeLessThanOrEqual(Math.max(...werte));
  });

  it("stimmt mit der unabhängig nachgerechneten Gewichtung überein", () => {
    let zaehler = 0;
    let nenner = 0;
    for (const r of FREIFLAECHE_AUSSCHREIBUNGEN) {
      zaehler += r.zuschlagCt * r.mengeKw;
      nenner += r.mengeKw;
    }
    expect(FREIFLAECHE_AW_CT).toBeCloseTo(zaehler / nenner, 9);
  });
});

describe("Freifläche: Fenster und Jahresreihe stammen aus derselben Tabelle", () => {
  it("das Fenstermittel liegt nicht weit neben dem jüngsten vollständigen Jahr", () => {
    // Der stärkste Anker, weil er zwei getrennt gepflegte Blöcke aneinandernagelt
    // — dieselbe Systematik wie der Kohärenz-Test zwischen feedin-archiv und
    // feedin-history. Beide lesen dieselbe Amtsspalte; sie dürfen sich um die
    // Marktbewegung eines Jahres unterscheiden, nicht um eine Größenordnung.
    const jung = FREIFLAECHE_AUSSCHREIBUNG_JAHRE[FREIFLAECHE_AUSSCHREIBUNG_JAHRE.length - 1];
    const abweichung = Math.abs(FREIFLAECHE_AW_CT - jung.ct) / jung.ct;
    expect(
      abweichung,
      `Fenster ${FREIFLAECHE_AW_CT.toFixed(2)} ct gegen Jahr ${jung.jahr} ${jung.ct} ct — ${(abweichung * 100).toFixed(0)} % auseinander`
    ).toBeLessThan(0.25);
  });

  it("die Jahresreihe ist lückenlos ab dem ersten Ausschreibungsjahr", () => {
    expect(FREIFLAECHE_AUSSCHREIBUNG_JAHRE[0].jahr).toBe(FREIFLAECHE_ZUSCHLAG_AB);
    FREIFLAECHE_AUSSCHREIBUNG_JAHRE.forEach((r, i) => {
      expect(r.jahr, "Lücke oder falsche Reihenfolge in der Jahresreihe").toBe(FREIFLAECHE_ZUSCHLAG_AB + i);
      expect(r.ct).toBeGreaterThan(0);
      expect(r.ct, `${r.jahr}: über dem gesetzlichen Basiswert`).toBeLessThan(FREIFLAECHE_GESETZLICHER_BASISWERT_CT * 1.5);
    });
  });

  it("das jüngste Jahr der Reihe ist nie das laufende", () => {
    // „Erst vollständig, dann eintragen": Der letzte Gebotstermin eines Jahres
    // ist der 1. Dezember, sein Ergebnis erscheint im Januar darauf. Ein Jahr X
    // kann also frühestens im Jahr X+1 vollständig belegt sein. Steht hier das
    // laufende Jahr, hat jemand ein halbes Jahr gemittelt — und das ist keine
    // vorläufige Zahl, sondern eine erfundene.
    expect(
      FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR,
      "unvollständiges Ausschreibungsjahr in der Reihe"
    ).toBeLessThan(new Date().getUTCFullYear());
  });

  it("die gesetzliche Ära endet, wo die Ausschreibung beginnt", () => {
    // Zwei Regime, keine Überlappung: bis 2014 Gesetzessatz, ab 2015 Zuschlag.
    for (const r of FREIFLAECHE_HISTORIE) {
      expect(r.jahr, "gesetzlicher Satz für ein Ausschreibungsjahr").toBeLessThan(FREIFLAECHE_ZUSCHLAG_AB);
    }
    expect(freiflaecheZuschlagHerkunft(FREIFLAECHE_ZUSCHLAG_AB - 1)).toBeNull();
  });

  it("gibt jedem Jahrgang ab 2015 einen Wert — auch jenseits der belegten Reihe", () => {
    // Die Randjahr-Regel: Nichts wird fortgeschrieben, aber es entsteht auch
    // keine Abbruchkante. Ein Jahrgang, für den beide Vorjahre fehlen, bekommt
    // das Randjahr und wird als „nicht vollständig" ausgewiesen — genau damit
    // der Begleittext keine Jahre behauptet, die den Wert nicht tragen.
    const weitDraussen = FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR + 5;
    const rand = freiflaecheZuschlagHerkunft(weitDraussen);
    expect(rand).not.toBeNull();
    expect(rand!.vollstaendig).toBe(false);
    expect(rand!.jahre).toEqual([FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR]);
    expect(rand!.ct).toBe(FREIFLAECHE_AUSSCHREIBUNG_JAHRE[FREIFLAECHE_AUSSCHREIBUNG_JAHRE.length - 1].ct);
  });
});

describe("Freifläche: das Sicherheitsnetz ist wirklich angeschlossen", () => {
  it("steht mit Wächter, Rhythmus und einem Runbook, das es gibt, im Prüfstand", () => {
    // Wächter-Gate, Regel 3: Eine Zusage über den eigenen Code gilt erst, wenn
    // sie am Code geprüft ist. Ohne diesen Test könnte der Eintrag im Prüfstand
    // auf ein Runbook zeigen, das niemand geschrieben hat — und der Wert stünde
    // wieder ohne Netz da, nur diesmal mit einer Zeile, die das Gegenteil sagt.
    const eintrag = PRUEFSTAND.find((e) => e.feld === "FREIFLAECHE_GEPRUEFT_ISO");
    expect(eintrag, "Freiflächen-Werte stehen nicht im Prüfstand").toBeDefined();
    expect(eintrag!.geprueftIso).toBe(FREIFLAECHE_GEPRUEFT_ISO);
    expect(existsSync(join(ROOT, eintrag!.runbook)), `${eintrag!.runbook} fehlt`).toBe(true);
  });

  it("das Prüfdatum liegt nie vor dem Wertstand", () => {
    // Werte, die jünger sind als die Prüfung, die sie bestätigt haben soll, gibt
    // es nicht. Andersherum ist normal: geprüft und unverändert.
    expect(FREIFLAECHE_GEPRUEFT_ISO >= FREIFLAECHE_VALID_FROM).toBe(true);
  });
});
