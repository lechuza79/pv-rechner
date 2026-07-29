import { describe, it, expect } from "vitest";
import { classifySolarSegment, classifyStorage } from "../../scripts/mastr-bnetza-refresh";

// Die Einordnung „privat" entscheidet, wer in den Bürger-Ranglisten auftaucht.
// Sie kam bis zum 29.07.2026 allein aus einem angekreuzten Feld im Register.
const HAUSHALT = "713";
const FREIFLAECHE = "852";
const BALKON = "2961";
const leer = new Map<string, "privat" | "gewerbe">();

describe("classifySolarSegment", () => {
  it("nimmt ein Wohnhausdach als privat", () => {
    expect(classifySolarSegment({ Nutzungsbereich: HAUSHALT }, leer, 9.8)).toBe("privat_dach");
    expect(classifySolarSegment({ Nutzungsbereich: HAUSHALT }, leer, 30)).toBe("privat_dach");
  });

  it("nimmt ein zu grosses Dach als gewerblich — auch wenn „Haushalt“ angekreuzt ist", () => {
    // Der echte Fall: Dolgesheim, 88 „private" Daecher mit im Schnitt 107 kWp.
    expect(classifySolarSegment({ Nutzungsbereich: HAUSHALT }, leer, 30.1)).toBe("gewerbe_dach");
    expect(classifySolarSegment({ Nutzungsbereich: HAUSHALT }, leer, 107)).toBe("gewerbe_dach");
    expect(classifySolarSegment({ Nutzungsbereich: HAUSHALT }, leer, 300)).toBe("gewerbe_dach");
  });

  it("greift auch, wenn die Einordnung sonst vom Betreiber käme", () => {
    const privatBetreiber = new Map<string, "privat" | "gewerbe">([["ABC", "privat"]]);
    const row = { AnlagenbetreiberMastrNummer: "ABC" };
    expect(classifySolarSegment(row, privatBetreiber, 12)).toBe("privat_dach");
    expect(classifySolarSegment(row, privatBetreiber, 80)).toBe("gewerbe_dach");
  });

  it("lässt Freifläche und Balkon unberührt — dort sagt die Größe nichts", () => {
    // Ein Solarpark DARF gross sein, ein Balkonkraftwerk ist per Gesetz klein.
    expect(classifySolarSegment({ ArtDerSolaranlage: FREIFLAECHE }, leer, 90_000)).toBe("freiflaeche");
    expect(classifySolarSegment({ ArtDerSolaranlage: BALKON }, leer, 0.8)).toBe("steckersolar");
    // Auch eine unplausibel grosse Freiflaeche bleibt Freiflaeche.
    expect(classifySolarSegment({ ArtDerSolaranlage: FREIFLAECHE, Nutzungsbereich: HAUSHALT }, leer, 500)).toBe(
      "freiflaeche",
    );
  });

  it("verliert nichts — was kein privates Dach ist, wird gewerbliches Dach", () => {
    // Die Gesamtleistung bleibt gleich, sie sitzt nur im richtigen Topf.
    const gross = classifySolarSegment({ Nutzungsbereich: HAUSHALT }, leer, 500);
    expect(["privat_dach", "gewerbe_dach"]).toContain(gross);
    expect(gross).toBe("gewerbe_dach");
  });
});


// Speicher: dieselbe Luecke, dieselbe Loesung.
const BATTERIE = "524";
const PUMPSPEICHER = "1537";

describe("classifyStorage", () => {
  const privatBetreiber = new Map<string, "privat" | "gewerbe">([["ABC", "privat"]]);
  const zeile = { Technologie: BATTERIE, AnlagenbetreiberMastrNummer: "ABC" };

  it("nimmt einen Kellerspeicher als privat", () => {
    expect(classifyStorage(zeile, privatBetreiber, 8.9)).toBe("batterie_privat");
    expect(classifyStorage(zeile, privatBetreiber, 30)).toBe("batterie_privat");
  });

  it("nimmt eine zu grosse Batterie als gewerblich — auch bei privatem Betreiber", () => {
    // Gemessen: 66 Gemeinden haben "private" Batterien ueber 30 kWh im Schnitt,
    // die Spitze bei 243. Finsing (bisher Einzelfall im Code) ist eine davon.
    expect(classifyStorage(zeile, privatBetreiber, 30.1)).toBe("batterie_gewerbe");
    expect(classifyStorage(zeile, privatBetreiber, 243)).toBe("batterie_gewerbe");
  });

  it("bleibt bei der Betreiber-Auskunft, wenn die Kapazitaet fehlt", () => {
    // Nicht pruefbar heisst nicht falsch — sonst wanderte jede Anlage ohne
    // gemeldete Kapazitaet stillschweigend ins Gewerbe.
    expect(classifyStorage(zeile, privatBetreiber, 0)).toBe("batterie_privat");
  });

  it("laesst Pumpspeicher und andere Technik unberuehrt", () => {
    expect(classifyStorage({ Technologie: PUMPSPEICHER }, privatBetreiber, 8_700_000)).toBe("pumpspeicher");
    expect(classifyStorage({ Technologie: "999" }, privatBetreiber, 500)).toBe("sonstige");
  });
});
