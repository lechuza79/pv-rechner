import { describe, it, expect } from "vitest";
import {
  pruefeGroesse, pruefeVollstaendigkeit, pruefePreis, geraetepreisVergleichbar, pruefeAngebot,
  type AusgelesenesAngebot,
} from "../angebot-check";
import { GESAMTKOSTEN, SPEZ_KOSTEN, ANGEBOTS_POSITIONEN } from "../angebot-check-config";

function angebot(teil: Partial<AusgelesenesAngebot> = {}): AusgelesenesAngebot {
  return { geraet: null, marke: null, leistungKw: null, gesamtpreisEur: null, positionen: [], rueckfragen: [], unsicher: [], ...teil };
}
const pos = (id: string | null, betragEur: number | null = null, enthaeltAuch: string[] = []) =>
  ({ id, wortlaut: id ?? "?", betragEur, enthaeltAuch });

describe("Anlagengröße", () => {
  // Gemessen wird gegen die AUSLEGUNG, nicht gegen die Norm-Heizlast. Wer gegen
  // die Heizlast prüft, meldet jedem Angebot pauschal eine Unterdimensionierung —
  // die Auslegung liegt bewusst darunter (Heizstab deckt die kältesten Tage).
  const gebaeude = { heizlastKw: 10, auslegungKw: 8.5 };

  it("nennt 8,5 kW passend, wenn 8,5 kW ausgelegt sind", () => {
    expect(pruefeGroesse(angebot({ leistungKw: 8.5 }), gebaeude).urteil).toBe("passend");
  });

  it("prüft NICHT gegen die Norm-Heizlast", () => {
    // 10 kW = exakt die Heizlast. Gegen die Heizlast gemessen wäre das "passend";
    // gegen die Auslegung sind es 18 % mehr — immer noch im Toleranzband, aber
    // die Abweichung muss sichtbar sein, sonst prüfen wir die falsche Größe.
    const b = pruefeGroesse(angebot({ leistungKw: 10 }), gebaeude);
    expect(b.erwartetKw).toBe(8.5);
    expect(b.abweichung).toBeGreaterThan(0.15);
  });

  it("meldet die doppelte Leistung als deutlich zu groß", () => {
    expect(pruefeGroesse(angebot({ leistungKw: 17 }), gebaeude).urteil).toBe("deutlich-groesser");
  });

  it("meldet knappe Bemessung", () => {
    expect(pruefeGroesse(angebot({ leistungKw: 6 }), gebaeude).urteil).toBe("knapp");
  });

  it("sagt „unbekannt“ statt zu raten, wenn keine Leistung im Angebot steht", () => {
    expect(pruefeGroesse(angebot(), gebaeude).urteil).toBe("unbekannt");
  });
});

describe("Vollständigkeit", () => {
  it("meldet die Pflichtpositionen eines leeren Angebots", () => {
    const b = pruefeVollstaendigkeit(angebot());
    expect(b.fehlend.length).toBe(b.gefordert);
    expect(b.ausgewiesen).toBe(0);
  });

  it("wertet eine Position als abgedeckt, wenn eine andere sie einschließt", () => {
    // Ein Pauschalangebot „Komplettpaket inkl. Montage und Elektro" darf nicht
    // als „Montage fehlt" gemeldet werden.
    const b = pruefeVollstaendigkeit(angebot({
      positionen: [pos("geraet", 12000, ["montage", "elektroinstallation"])],
    }));
    const fehlt = b.fehlend.map((f) => f.position.id);
    expect(fehlt).not.toContain("montage");
    expect(fehlt).not.toContain("elektroinstallation");
    // Sie sind trotzdem ein Befund: gebündelt, also nicht vergleichbar.
    expect(b.ohnePreis.map((f) => f.position.id)).toContain("montage");
  });

  it("unterscheidet „fehlt ganz“ von „genannt, aber ohne Preis“", () => {
    const b = pruefeVollstaendigkeit(angebot({ positionen: [pos("montage", null)] }));
    expect(b.fehlend.map((f) => f.position.id)).not.toContain("montage");
    expect(b.ohnePreis.map((f) => f.position.id)).toContain("montage");
  });

  it("macht aus einem fehlenden Heizkörpertausch keinen Mangel", () => {
    // Fehlt in 77 % der Angebote und ist dort meistens richtig so.
    const b = pruefeVollstaendigkeit(angebot());
    expect(b.fehlend.map((f) => f.position.id)).not.toContain("heizkoerpertausch");
    expect(b.moeglicherweiseNoetig.map((f) => f.position.id)).toContain("heizkoerpertausch");
  });

  it("führt den Zählerschrank als Möglichkeit, nicht als Mangel", () => {
    // Er ist in 31 % der Angebote enthalten — ihn pauschal einzufordern hieße,
    // 69 % der Angebote einen Mangel anzudichten, den sie oft nicht haben.
    const b = pruefeVollstaendigkeit(angebot());
    expect(b.moeglicherweiseNoetig.map((f) => f.position.id)).toContain("zaehlerschrank");
  });
});

describe("Preis", () => {
  // DER KERN: dieselben spezifischen Kosten sind bei kleiner Anlage normal und
  // bei großer auffällig. Ein Urteil gegen den Gesamtmedian (4.098 €/kW) würde
  // hier zweimal danebenliegen.
  it("nennt 6.000 €/kW bei 5 kW üblich", () => {
    const b = pruefePreis(angebot({ leistungKw: 5, gesamtpreisEur: 30000 }));
    expect(b.urteil).toBe("im-band");
  });

  it("nennt dieselben 6.000 €/kW bei 15 kW auffällig hoch", () => {
    const b = pruefePreis(angebot({ leistungKw: 15, gesamtpreisEur: 90000 }));
    expect(b.urteil).toBe("darueber");
  });

  it("legt bei 10 kW das mittlere Band an", () => {
    const b = pruefePreis(angebot({ leistungKw: 10, gesamtpreisEur: 40000 }));
    expect(b.band?.beschriftung).toBe("8 bis 12 kW");
    expect(b.urteil).toBe("im-band");
  });

  it("sagt „unbekannt“ ohne Leistungsangabe", () => {
    expect(pruefePreis(angebot({ gesamtpreisEur: 35000 })).urteil).toBe("unbekannt");
  });
});

describe("Rückfragen: die Zahl nennt ihre Position", () => {
  it("hängt den Namen der Position an die Zahlen", () => {
    // Frage und Zahl können verschiedene Positionen meinen — eine Frage nach den
    // Elektroarbeiten mit den Häufigkeiten des Zählerschranks darunter. Ohne den
    // Namen ist das unsichtbar, und dann steht eine Beschriftung über einer Zahl,
    // die etwas anderes misst.
    const b = pruefeAngebot(angebot({
      rueckfragen: [{ text: "Frag nach den Elektroarbeiten.", bezug: "zaehlerschrank" }],
    }), { heizlastKw: 10, auslegungKw: 8.5 });
    expect(b.rueckfragen[0].bezugName).toBe("Umbau des Zählerschranks");
    expect(b.rueckfragen[0].medianKosten).toBe(2966);
  });

  it("lässt den Namen weg, wo es keine Position gibt", () => {
    const b = pruefeAngebot(angebot({
      rueckfragen: [{ text: "Frag nach der Heizlastberechnung.", bezug: null }],
    }), { heizlastKw: 10, auslegungKw: 8.5 });
    expect(b.rueckfragen[0].bezugName).toBeNull();
    expect(b.rueckfragen[0].medianKosten).toBeNull();
  });
});

describe("Gerätepreis-Vergleich (BLOCKER)", () => {
  it("erlaubt den Vergleich nur bei einer reinen Geräteposition", () => {
    expect(geraetepreisVergleichbar(angebot({ positionen: [pos("geraet", 9000)] }))).toBe(true);
  });

  it("verbietet ihn, sobald die Position noch etwas anderes enthält", () => {
    // „Wärmepumpe inkl. Hydraulikmodul und Regelung 12.500 €" gegen einen
    // Onlinepreis für das nackte Gerät zu stellen, ist der irreführende Vergleich.
    expect(geraetepreisVergleichbar(angebot({ positionen: [pos("geraet", 12500, ["pufferspeicher"])] }))).toBe(false);
  });

  it("verbietet ihn ohne Einzelpreis", () => {
    expect(geraetepreisVergleichbar(angebot({ positionen: [pos("geraet", null)] }))).toBe(false);
  });
});

describe("Referenzwerte gegen die Auswertung (Anker)", () => {
  // Handgeprüft am 27.08.2026 im Volltext, Tabellen 1, 2, 3, 5, 7.
  it("hält die Gesamtkosten fest", () => {
    expect(GESAMTKOSTEN).toMatchObject({ anzahl: 160, min: 21099, max: 54168, mittel: 36397, median: 34898 });
  });

  it("hält die spezifischen Kosten fest — 156 Angebote, nicht 160", () => {
    // In vier Angeboten fehlt eine Leistungsangabe. Wer hier 160 einträgt,
    // schreibt einen Nenner hin, den die Quelle nicht hergibt.
    expect(SPEZ_KOSTEN).toMatchObject({ anzahl: 156, min: 2248, max: 8498, median: 4098 });
  });

  it("trägt für den reinen Gerätepreis bewusst keinen Median", () => {
    // Die Verbraucherzentrale konnte ihn an 320 Angeboten nicht vergleichbar
    // machen. Ein Wert hier wäre erfunden.
    const geraet = ANGEBOTS_POSITIONEN.find((p) => p.id === "geraet");
    expect(geraet?.medianKosten).toBeNull();
  });

  it("nennt zu jedem Median seine Fallzahl", () => {
    for (const p of ANGEBOTS_POSITIONEN) {
      if (p.medianKosten != null) expect(p.medianBasis, p.name).toBeGreaterThan(0);
    }
  });
});
