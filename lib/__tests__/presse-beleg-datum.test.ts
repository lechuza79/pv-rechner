import { describe, it, expect } from "vitest";
import { belegDatumAus, belegAlterTage } from "../presse-beleg-datum";

const HEUTE = new Date("2026-09-06T12:00:00Z");

describe("Datum des gelesenen Beitrags", () => {
  it("liest die drei Schreibweisen, die in den Analysen wirklich vorkommen", () => {
    expect(belegDatumAus("Vom 03.09.2026, Autor Martin Jendrischik.")).toBe("2026-09-03");
    expect(belegDatumAus("17. August 2023, 17:48 Uhr, von Felix Mildner")).toBe("2023-08-17");
    expect(belegDatumAus("Stand auf der Seite: 15. September 2025.")).toBe("2025-09-15");
  });

  it("nimmt das ERSTE Datum, nicht das jüngste", () => {
    // Die Analysen beginnen mit dem Erscheinungsdatum; spätere Daten sind
    // Stichtage aus dem Beitrag (Gesetzestermine, Fristen). Wer das jüngste
    // nähme, träfe regelmäßig einen Termin in der Zukunft.
    const a = "Beitrag vom 30.07.2026 über die Sätze, die ab dem 01.02.2027 gelten.";
    expect(belegDatumAus(a)).toBe("2026-07-30");
  });

  it("gibt null zurück, wo kein Datum steht — statt eines geratenen", () => {
    expect(belegDatumAus("Undatierter Ratgeber von Björn Ohmer.")).toBeNull();
    expect(belegDatumAus(null)).toBeNull();
    expect(belegDatumAus("")).toBeNull();
  });

  it("verwirft ein Datum, das der Kalender nicht kennt", () => {
    expect(belegDatumAus("Am 31.02.2026 erschienen.")).toBeNull();
  });

  it("rechnet das Alter in Tagen", () => {
    expect(belegAlterTage("Vom 03.09.2026, Autor …", HEUTE)).toBe(3);
    expect(belegAlterTage("17. August 2023, 17:48 Uhr", HEUTE)).toBe(1116);
  });

  // „vor -12 Tagen erschienen" prüft niemand nach — es sähe nur aus wie ein
  // sehr frischer Beitrag und wäre in Wahrheit ein Termin aus dem Text.
  it("meldet ein Datum in der Zukunft als unbekannt, nicht als negatives Alter", () => {
    expect(belegAlterTage("Die Regel gilt ab dem 01.01.2027.", HEUTE)).toBeNull();
  });
});
