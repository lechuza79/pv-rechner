import { describe, it, expect } from "vitest";
import { allFundingPrograms } from "../funding-programs";
import {
  FUNDING_CHECKS,
  NOCH_NICHT_ERFASST,
  antragsZeitpunkt,
  antragsZeitpunktSatz,
  verpasstDurchBeauftragung,
} from "../funding-conditions";

// Der Auftrag des Betreibers (13.08.2026) zu den Förderbedingungen: „wir müssen
// nur sicherstellen dass die für jedes programm wirklich funktionieren."
// Genau das ist die Aufgabe dieser Datei — nicht die Prüfung einer einzelnen
// Zahl, sondern die Zusicherung, dass beim Erfassen NICHTS untergeht.

describe("Förderbedingungen — keine darf stillschweigend untergehen", () => {
  it("jede Bedingung eines erfassten Programms ist zugeordnet", () => {
    for (const p of allFundingPrograms()) {
      const checks = FUNDING_CHECKS[p.id];
      if (!checks) continue;

      const zugeordnet = new Set<string>([
        ...checks.pruefungen.map((b) => b.ausBedingung),
        ...checks.durchRegion,
        ...checks.hinweise.map((h) => h.ausBedingung),
      ]);

      for (const c of p.conditions) {
        expect(
          zugeordnet.has(c),
          `${p.id}: die Bedingung "${c}" ist weder als Prüfung erfasst noch als ` +
            `regionsgedeckt oder als Hinweis markiert. Zuordnen — nicht weglassen.`,
        ).toBe(true);
      }
    }
  });

  it("kein Beleg zeigt auf eine Bedingung, die es nicht (mehr) gibt", () => {
    // Fängt den Fall ab, dass eine Bedingung umformuliert wird und der Beleg
    // als Zitat einer verschwundenen Zeile zurückbleibt — dann prüft der Flow
    // gegen einen Stand, den die Seite nicht mehr zeigt.
    for (const p of allFundingPrograms()) {
      const checks = FUNDING_CHECKS[p.id];
      if (!checks) continue;
      const vorhanden = new Set(p.conditions);
      const belege = [
        ...checks.pruefungen.map((b) => b.ausBedingung),
        ...checks.durchRegion,
        ...checks.hinweise.map((h) => h.ausBedingung),
      ];
      for (const b of belege) {
        expect(vorhanden.has(b), `${p.id}: Beleg "${b}" steht in keiner conditions-Zeile`).toBe(true);
      }
    }
  });

  it("jedes Programm ist entweder erfasst oder ausdrücklich zurückgestellt", () => {
    // Der eigentliche Mechanismus: Ein NEU hinzugefügtes Programm kann nicht
    // still ohne Prüfform bleiben — es muss erfasst werden oder sichtbar in die
    // Rückstellliste. Die Liste zu verlängern ist damit eine Entscheidung.
    const zurueckgestellt = new Set(NOCH_NICHT_ERFASST);
    for (const p of allFundingPrograms()) {
      expect(
        Boolean(FUNDING_CHECKS[p.id]) || zurueckgestellt.has(p.id),
        `${p.id} hat keine Prüfform und steht nicht in NOCH_NICHT_ERFASST`,
      ).toBe(true);
    }
  });

  it("die Rückstellliste enthält nur Programme, die es gibt", () => {
    const ids = new Set(allFundingPrograms().map((p) => p.id));
    for (const id of NOCH_NICHT_ERFASST) {
      expect(ids.has(id), `NOCH_NICHT_ERFASST nennt "${id}" — dieses Programm existiert nicht`).toBe(true);
    }
  });

  it("ein Programm ist nicht gleichzeitig erfasst und zurückgestellt", () => {
    for (const id of NOCH_NICHT_ERFASST) {
      expect(FUNDING_CHECKS[id], `${id} ist erfasst UND zurückgestellt`).toBeUndefined();
    }
  });

  it("jedes erfasste Programm sagt etwas über den Antragszeitpunkt", () => {
    // Der Zeitpunkt ist die folgenreichste Bedingung: Wer ihn verpasst, verliert
    // die gesamte Förderung. Zulässig sind zwei Antworten — eine Frist oder die
    // ausdrückliche Feststellung, dass es kein Antragsverfahren gibt. Was fehlt,
    // ist Schweigen an der wichtigsten Stelle.
    for (const [id, checks] of Object.entries(FUNDING_CHECKS)) {
      expect(
        Boolean(antragsZeitpunkt(id)) || Boolean(checks.ohneAntrag),
        `${id}: weder ein Antragszeitpunkt noch die Feststellung "ohne Antragsverfahren"`,
      ).toBe(true);
    }
  });

  it("ohne Antragsverfahren steht immer eine Begründung", () => {
    for (const [id, checks] of Object.entries(FUNDING_CHECKS)) {
      if (!checks.ohneAntrag) continue;
      expect(checks.ohneAntrag.warum.length, `${id}: ohneAntrag ohne Begründung`).toBeGreaterThan(20);
      expect(antragsZeitpunkt(id), `${id}: ohneAntrag UND ein Zeitpunkt — das widerspricht sich`).toBeUndefined();
    }
  });
});

describe("Antragszeitpunkt — die Richtung stimmt nicht überall", () => {
  it("nach Inbetriebnahme beantragen ist kein Fehlerfall, sondern eine eigene Sorte", () => {
    // Anlass: Die verbreitete Regel „immer vor Auftragsvergabe beantragen" ist
    // falsch. Mehrere Programme verlangen den Antrag ausdrücklich danach. Würde
    // der Zeitpunkt als „vorher ja/nein" modelliert, bekämen deren Antragsteller
    // eine Warnung, die sie von einer Förderung abhält, die ihnen zusteht.
    const satz = antragsZeitpunktSatz("frankfurt-klimabonus");
    expect(satz).toContain("Bewilligungsbescheid");
    expect(verpasstDurchBeauftragung("frankfurt-klimabonus")).toBe(true);
  });

  it("ein bereits vergebener Auftrag schließt nur die Vorher-Programme aus", () => {
    expect(verpasstDurchBeauftragung("bund-kfw270")).toBe(true);
    // Die Nullsteuer hat keinen Zeitpunkt — sie gilt unabhängig davon.
    expect(verpasstDurchBeauftragung("bund-nullsteuer")).toBe(false);
  });

  it("ohne erfasste Daten wird kein Zeitpunkt behauptet", () => {
    // Lieber keine Aussage als eine geratene: Bei nicht erfassten Programmen
    // darf der Flow nichts über die Frist sagen.
    expect(antragsZeitpunktSatz("darmstadt-pv")).toBeNull();
    expect(verpasstDurchBeauftragung("darmstadt-pv")).toBe(false);
  });
});
