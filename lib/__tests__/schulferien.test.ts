import { describe, it, expect } from "vitest";
import {
  SCHULFERIEN,
  SCHULFERIEN_ABGEDECKT_BIS,
  SCHULFERIEN_QUELLE,
  ferienAm,
  versandfenster,
} from "../schulferien";

// Die Ferientabelle ist eine abgeschriebene amtliche Quelle. Ein Test kann
// nicht prüfen, ob sie stimmt — nur, ob sie in sich schlüssig ist und ob die
// Fälle richtig herauskommen, an denen der Versand hängt. Die Zellen selbst
// sind am 19.08.2026 gegen die beiden KMK-Kalender abgeglichen worden.

describe("Ferientabelle", () => {
  it("kennt alle 16 Länder", () => {
    expect(Object.keys(SCHULFERIEN)).toHaveLength(16);
    for (let i = 1; i <= 16; i++) {
      const key = String(i).padStart(2, "0");
      expect(SCHULFERIEN[key], key).toBeTruthy();
    }
  });

  it("jeder Zeitraum ist gültig und beginnt nicht nach seinem Ende", () => {
    for (const [bl, liste] of Object.entries(SCHULFERIEN)) {
      for (const f of liste) {
        expect(f.von, `${bl} ${f.name}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.bis, `${bl} ${f.name}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.von <= f.bis, `${bl} ${f.name}`).toBe(true);
      }
    }
  });

  it("Zeiträume eines Landes überschneiden sich nicht", () => {
    for (const [bl, liste] of Object.entries(SCHULFERIEN)) {
      const sortiert = [...liste].sort((a, b) => a.von.localeCompare(b.von));
      for (let i = 1; i < sortiert.length; i++) {
        expect(sortiert[i].von > sortiert[i - 1].bis, `${bl}: ${sortiert[i - 1].name} / ${sortiert[i].name}`).toBe(true);
      }
    }
  });

  it("beide Grenzen zählen mit — der letzte Ferientag ist noch Ferien", () => {
    // Hessen, Sommer 2026: 29.06. bis 07.08. (KMK)
    expect(ferienAm("06", "2026-06-29")?.name).toBe("Sommer 2026");
    expect(ferienAm("06", "2026-08-07")?.name).toBe("Sommer 2026");
    expect(ferienAm("06", "2026-08-08")).toBeNull();
    expect(ferienAm("06", "2026-06-28")).toBeNull();
  });
});

describe("Versandfenster", () => {
  it("gibt Hessen, Rheinland-Pfalz und Saarland am 19.08.2026 frei", () => {
    for (const bl of ["06", "07", "10"]) {
      expect(versandfenster(bl, "2026-08-19"), bl).toEqual({ frei: true });
    }
  });

  it("sperrt Baden-Württemberg und Bayern am selben Tag — dort sind noch Sommerferien", () => {
    for (const bl of ["08", "09"]) {
      const f = versandfenster(bl, "2026-08-19");
      expect(f.frei, bl).toBe(false);
      if (!f.frei) expect(f.grund, bl).toContain("Sommer 2026");
    }
  });

  it("nennt den Tag, an dem es wieder losgeht", () => {
    const f = versandfenster("06", "2026-10-06"); // mitten in den Herbstferien
    expect(f.frei).toBe(false);
    if (!f.frei) expect(f.wiederFrei).toBe("2026-10-18"); // letzter Ferientag 17.10.
  });

  // DER WICHTIGSTE FALL: Läuft die Tabelle aus, darf sie nicht „keine Ferien"
  // sagen. Eine still leer werdende Ferientabelle ist gefährlicher als gar
  // keine — sie gibt genau dann frei, wenn niemand mehr hinsieht.
  it("verweigert jenseits des erfassten Zeitraums, statt frei zu geben", () => {
    const f = versandfenster("06", "2027-12-01");
    expect(f.frei).toBe(false);
    if (!f.frei) expect(f.grund).toContain("erfasst");
  });

  // Fronleichnam fällt IMMER auf einen Donnerstag — also mitten in das
  // Versandfenster — und steht in keiner Ferienliste.
  it("sperrt Fronleichnam in den katholisch geprägten Ländern", () => {
    for (const bl of ["06", "07", "10"]) {
      const f = versandfenster(bl, "2027-05-27");
      expect(f.frei, bl).toBe(false);
      if (!f.frei) expect(f.grund).toContain("Fronleichnam");
    }
    // In Niedersachsen ist es ein normaler Donnerstag.
    expect(versandfenster("03", "2027-05-27")).toEqual({ frei: true });
  });

  it("sperrt bundesweite Feiertage überall", () => {
    for (const bl of ["03", "06", "14"]) {
      expect(versandfenster(bl, "2027-10-03").frei, bl).toBe(false);
    }
  });

  it("verweigert für ein unbekanntes Bundesland", () => {
    expect(versandfenster("99", "2026-08-19").frei).toBe(false);
  });

  it("der abgedeckte Zeitraum endet dort, wo das erste Land nichts mehr weiß", () => {
    // Hessen/RP/Saarland: Sommerferien 2027 enden am 06.08.2027; danach steht
    // für sie nichts mehr in der Tabelle.
    const letzte = SCHULFERIEN["06"][SCHULFERIEN["06"].length - 1];
    expect(SCHULFERIEN_ABGEDECKT_BIS).toBe(letzte.bis);
  });

  it("die Quelle ist benannt und datiert", () => {
    expect(SCHULFERIEN_QUELLE.herausgeber).toContain("Kultusministerkonferenz");
    expect(SCHULFERIEN_QUELLE.standDerQuelle).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(SCHULFERIEN_QUELLE.geprueftIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// Der erste Tag nach den Ferien ist formal ein Arbeitstag und der schlechteste
// Versandtag im Jahr: volle Postfächer, und ein Brief, den niemand liest, ist
// nicht neutral — die Gemeinde gilt danach als angeschrieben und bekommt keinen
// zweiten.
describe("Erster Tag nach den Ferien", () => {
  it("sperrt den Tag nach dem letzten Ferientag", () => {
    // Nordrhein-Westfalen: Sommerferien bis einschließlich 01.09.2026.
    expect(versandfenster("05", "2026-09-01").frei).toBe(false);
    const rueckkehr = versandfenster("05", "2026-09-02");
    expect(rueckkehr.frei).toBe(false);
    if (!rueckkehr.frei) expect(rueckkehr.grund).toContain("Erster Tag nach den Ferien");
  });

  it("gibt den zweiten Tag wieder frei", () => {
    expect(versandfenster("05", "2026-09-03").frei).toBe(true);
  });

  // Die Gegenrichtung: Ein Land, dessen Ferien länger her sind, darf nicht
  // mitgesperrt werden — sonst stünde der ganze Versand still.
  it("sperrt nicht, wo die Ferien länger her sind", () => {
    expect(versandfenster("03", "2026-09-02").frei).toBe(true);
    expect(versandfenster("06", "2026-09-02").frei).toBe(true);
  });
});
