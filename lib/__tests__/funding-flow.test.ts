import { describe, it, expect } from "vitest";
import { getFundingProgram, allFundingPrograms } from "../funding-programs";
import {
  fragenFuer,
  pruefeProgramm,
  werteAus,
  alleGroessenSchwellen,
  erfuelltGebaeude,
  GROESSEN_STUFEN,
} from "../funding-flow";

const frankfurt = getFundingProgram("frankfurt-klimabonus")!;
const nullsteuer = getFundingProgram("bund-nullsteuer")!;
const kfw = getFundingProgram("bund-kfw270")!;
const darmstadt = getFundingProgram("darmstadt-pv")!; // bewusst nicht erfasst

describe("Fragen entstehen aus den Bedingungen, nicht aus einer festen Liste", () => {
  it("fragt nur, was für diese Programme etwas entscheidet", () => {
    const fragen = fragenFuer([frankfurt]).map((f) => f.id);
    // Frankfurt hat Zeitpunkt, Speicher- und Balkonregel — aber keine Größen-
    // oder Gebäudebedingung. Nach der Anlagengröße zu fragen, ohne dass sie
    // etwas ändert, wäre ein Schritt, den niemand braucht.
    expect(fragen).toEqual(["auftrag", "anlage"]);
  });

  it("nimmt die Größenfrage dazu, sobald ein Programm sie braucht", () => {
    const fragen = fragenFuer([frankfurt, nullsteuer]).map((f) => f.id);
    expect(fragen).toContain("kwp");
    expect(fragen).toContain("gebaeude");
  });

  it("der Zeitpunkt wird zuerst gefragt", () => {
    // Als einzige Bedingung lässt er sich nach einer falschen Antwort nicht
    // mehr heilen — deshalb steht er vorn, nicht am Ende.
    expect(fragenFuer([frankfurt, nullsteuer, kfw])[0].id).toBe("auftrag");
  });

  it("stellt gar keine Frage, wenn nichts zu entscheiden ist", () => {
    expect(fragenFuer([])).toEqual([]);
  });
});

describe("Größenstufen liegen eindeutig zu jeder Schwelle", () => {
  it("keine erfasste Schwelle liegt innerhalb einer Stufe", () => {
    // Die Stufen ersetzen die freie Eingabe. Ihr Zahlenwert entscheidet die
    // Schwellenprüfung — läge eine Schwelle innerhalb einer Stufe (etwa
    // „bis 12 kWp" bei der Stufe 10–20 kWp), bekäme ein Teil der Auswählenden
    // eine falsche Auskunft, ohne dass es jemandem auffiele.
    const alle = allFundingPrograms();
    const schwellen = alleGroessenSchwellen(alle);
    // Die Grenzen kommen aus den Stufen selbst. Sie hier ein zweites Mal zu
    // tippen war der eigentliche Fehler dieser Datei: Beim Teilen der ersten
    // Stufe meldete der Test einen Konflikt mit einer Stufe, die es nicht mehr
    // gab — er prüfte seine eigene veraltete Kopie.
    const grenzen: [number, number][] = GROESSEN_STUFEN.map((s) => [s.von, s.bis]);
    for (const s of schwellen) {
      for (const [von, bis] of grenzen) {
        expect(
          s > von && s < bis && bis !== Infinity,
          `Die Schwelle ${s} kWp liegt innerhalb der Stufe ${von}–${bis} kWp — ` +
            `die Stufen in GROESSEN_STUFEN müssen daran angepasst werden.`,
        ).toBe(false);
      }
    }
  });

  it("jede Stufe hat einen Wert, der zu ihrer Beschriftung passt", () => {
    // Beschriftung und gerechneter Wert dürfen nicht auseinanderlaufen —
    // dieselbe Regel wie bei jeder anderen Zahl mit Einheit im Projekt.
    for (const stufe of GROESSEN_STUFEN) {
      // Der gerechnete Wert muss INNERHALB der eigenen Stufe liegen — sonst
      // rechnet die Auswahl „4 – 10 kWp" mit einer Zahl, die dort nicht
      // vorkommt. Die untere Grenze ist ausgeschlossen, weil eine Anlage von
      // genau 4 kWp bereits zur nächsten Stufe gehört.
      expect(stufe.kwp, `${stufe.label}: Wert ${stufe.kwp} liegt nicht in ${stufe.von}–${stufe.bis}`).toBeGreaterThan(stufe.von);
      expect(stufe.kwp, `${stufe.label}: Wert ${stufe.kwp} liegt nicht in ${stufe.von}–${stufe.bis}`).toBeLessThan(stufe.bis);
      expect(Number(stufe.wert)).toBe(stufe.kwp);
    }

    // Die Stufen müssen lückenlos aneinandergrenzen: Jede Lücke ist eine
    // Anlagengröße, für die es keine Antwortmöglichkeit gibt, jede
    // Überlappung eine Größe mit zwei Antworten.
    for (let i = 1; i < GROESSEN_STUFEN.length; i++) {
      expect(GROESSEN_STUFEN[i].von, `Lücke oder Überlappung vor „${GROESSEN_STUFEN[i].label}"`).toBe(GROESSEN_STUFEN[i - 1].bis);
    }
    expect(GROESSEN_STUFEN[0].von).toBe(0);
    expect(GROESSEN_STUFEN[GROESSEN_STUFEN.length - 1].bis).toBe(Infinity);
  });
});

describe("Befund je Programm", () => {
  it("vergebener Auftrag schließt das Programm aus, das den Bescheid vorher verlangt", () => {
    const b = pruefeProgramm(frankfurt, { auftragVergeben: true, anlage: "pv" });
    expect(b.befund).toBe("ausgeschlossen");
    expect(b.gruende[0]).toContain("Bewilligungsbescheid");
  });

  it("ohne vergebenen Auftrag steht die Reihenfolge als Schrittfolge da", () => {
    const b = pruefeProgramm(frankfurt, { auftragVergeben: false, anlage: "pv" });
    expect(b.befund).toBe("moeglich");
    expect(b.schritte[0]).toContain("online");
    expect(b.schritte).toContain("Bewilligungsbescheid abwarten");
    // Die Reihenfolge ist der Inhalt: erst Bescheid, dann Auftrag.
    expect(b.schritte.indexOf("Bewilligungsbescheid abwarten")).toBeLessThan(
      b.schritte.indexOf("Erst danach den Auftrag vergeben"),
    );
  });

  it("Balkonkraftwerk fällt in Frankfurt heraus, die Anlage selbst nicht", () => {
    expect(pruefeProgramm(frankfurt, { auftragVergeben: false, anlage: "balkon" }).befund).toBe("ausgeschlossen");
    expect(pruefeProgramm(frankfurt, { auftragVergeben: false, anlage: "pv-speicher" }).befund).toBe("moeglich");
  });

  it("die Nullsteuer kennt keine Auftragsfrist und bleibt bestehen", () => {
    // Sie gilt unabhängig davon, ob schon beauftragt wurde — wer das
    // zusammenwirft, nimmt Leuten eine Vergünstigung, die ihnen zusteht.
    const b = pruefeProgramm(nullsteuer, { auftragVergeben: true, anlage: "pv", kwp: 10 });
    expect(b.befund).toBe("moeglich");
  });

  it("über 30 kWp entfällt nur die Vermutung, nicht die Begünstigung", () => {
    // Der Fehler, den dieser Test ersetzt: Er hieß „die Nullsteuer endet bei
    // 30 kWp" und erwartete bei 40 kWp „ausgeschlossen" — er hat den Fehler
    // im Code mit sich selbst verglichen und war deshalb grün, während der
    // Fördercheck zwei falsche Auskünfte gab.
    //
    // § 12 Abs. 3 Nr. 1 Satz 1 UStG verlangt die Anlage an einer Wohnung oder
    // einem dem Gemeinwohl dienenden Gebäude. Satz 2 sagt, diese Voraussetzung
    // „gilt als erfüllt" bis 30 kW (peak). Eine Fiktion wirkt nur in eine
    // Richtung: Über der Schwelle muss die Belegenheit nachgewiesen statt
    // vermutet werden — begünstigt bleibt die Anlage.
    // Im Volltext geprüft am 25.08.2026: § 12 Abs. 3 Nr. 1 UStG, dazu
    // UStAE 12.18 Abs. 5 Satz 2 und Abs. 6 Satz 2 („entweder … oder").

    // Groß und auf einem Wohnhaus: begünstigt, die Vermutung wird nur nicht mehr gebraucht.
    expect(pruefeProgramm(nullsteuer, { kwp: 40, gebaeude: "wohn" }).befund).toBe("moeglich");
    // Klein: begünstigt, ohne dass die Gebäudeart geprüft würde.
    expect(pruefeProgramm(nullsteuer, { kwp: 12, gebaeude: "wohn" }).befund).toBe("moeglich");
  });

  it("vermutet die Gebäudeart bis 30 kWp — auch ohne Wohngebäude", () => {
    // Genau der Fall, für den die Vermutungsregel geschaffen wurde, und die
    // zweite falsche Auskunft der alten Fassung: eine kleine Anlage auf einem
    // Gebäude, dessen Art der Fördercheck nicht als „wohn" führt, galt als
    // ausgeschlossen.
    expect(pruefeProgramm(nullsteuer, { kwp: 8, gebaeude: "mfh" }).befund).toBe("moeglich");
  });

  it("ein Einfamilienhaus ist ein Wohngebäude", () => {
    // Der Fehler, den das verhindert: Die Nullsteuer verlangt „Wohngebäude".
    // Wurden Auswahl und Anforderung als gleichrangige Werte verglichen, fiel
    // sie für JEDES Einfamilienhaus heraus — eine falsche Auskunft, die jemanden
    // eine Vergünstigung kostet, auf die er Anspruch hat.
    expect(erfuelltGebaeude("efh", ["wohn"])).toBe(true);
    expect(erfuelltGebaeude("mfh", ["wohn"])).toBe(true);
    expect(pruefeProgramm(nullsteuer, { kwp: 8, gebaeude: "efh" }).befund).toBe("moeglich");
    expect(pruefeProgramm(nullsteuer, { kwp: 8, gebaeude: "mfh" }).befund).toBe("moeglich");
  });

  it("umgekehrt gilt das nicht — „nur Mehrfamilienhaus\" schließt das Einfamilienhaus aus", () => {
    expect(erfuelltGebaeude("efh", ["mfh"])).toBe(false);
    expect(erfuelltGebaeude("wohn", ["mfh"])).toBe(false);
  });

  it("nicht erfasste Programme werden nicht beurteilt", () => {
    // Lieber „wissen wir nicht" als eine geratene Berechtigung.
    const b = pruefeProgramm(darmstadt, { auftragVergeben: true, anlage: "balkon", kwp: 99 });
    expect(b.befund).toBe("ungeprueft");
    expect(b.gruende).toEqual([]);
  });
});

describe("Gesamtergebnis", () => {
  it("weist gesondert aus, was durch die Beauftragung verloren ging", () => {
    const e = werteAus([frankfurt, nullsteuer, kfw, darmstadt], {
      auftragVergeben: true,
      anlage: "pv",
      kwp: 10,
      gebaeude: "wohn",
    });
    const verloren = e.durchBeauftragungVerloren.map((b) => b.program.id);
    expect(verloren).toContain("frankfurt-klimabonus");
    expect(verloren).toContain("bund-kfw270");
    expect(e.moeglich.map((b) => b.program.id)).toContain("bund-nullsteuer");
    expect(e.ungeprueft.map((b) => b.program.id)).toContain("darmstadt-pv");
  });

  it("ohne Beauftragung ist nichts verloren", () => {
    const e = werteAus([frankfurt, nullsteuer, kfw], {
      auftragVergeben: false,
      anlage: "pv",
      kwp: 10,
      gebaeude: "wohn",
    });
    expect(e.durchBeauftragungVerloren).toEqual([]);
    expect(e.moeglich.length).toBe(3);
  });

  it("jedes Programm taucht in genau einer Gruppe auf", () => {
    const alle = [frankfurt, nullsteuer, kfw, darmstadt];
    const e = werteAus(alle, { auftragVergeben: true, anlage: "balkon", kwp: 40, gebaeude: "efh" });
    const summe =
      e.moeglich.length + e.ausgeschlossen.length + e.ungeprueft.length + e.durchBeauftragungVerloren.length;
    expect(summe).toBe(alle.length);
  });
});
