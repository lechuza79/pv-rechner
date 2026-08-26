import { describe, it, expect } from "vitest";
import { beurteile, empfehlungenFuer, type WpFall } from "../wp-empfehlung";
import type { WpGeraet } from "../wp-katalog";

const geraet = (ueber: Partial<WpGeraet> = {}): WpGeraet => ({
  id: "1",
  name: "Testgerät",
  marke: "TEST",
  leistungKw: 10,
  herkunft: "ausgeschrieben",
  bauart: "luft-wasser",
  preisEur: 9000,
  link: "https://www.awin1.com/x",
  bildUrl: null,
  lieferbar: true,
  vorlaufMaxC: 70,
  kaeltemittel: "r290",
  aufbau: "monoblock",
  umfang: "paket",
  ...ueber,
});

const altbau: WpFall = { auslegungKw: 10, vorlaufC: 55, wpType: "lwwp" };

describe("Leistung", () => {
  it("ein zu kleines Gerät ist ungeeignet, nicht bloß schlechter bewertet", () => {
    // Es bekommt das Haus am kältesten Tag nicht warm und heizt die Differenz
    // elektrisch nach — als günstigste Zeile der Liste wäre es ein Fehlkauf.
    const e = beurteile(geraet({ leistungKw: 7 }), altbau);
    expect(e.geeignet).toBe(false);
    expect(e.befunde).toContainEqual({ art: "leistung-knapp", fehltKw: 3 });
  });

  it("etwas zu groß ist erlaubt, weit zu groß wird benannt", () => {
    expect(beurteile(geraet({ leistungKw: 12 }), altbau).geeignet).toBe(true);
    const gross = beurteile(geraet({ leistungKw: 16 }), altbau);
    expect(gross.geeignet).toBe(true);
    expect(gross.befunde).toContainEqual({ art: "leistung-reichlich", ueberKw: 6 });
  });

  it("eine abgeleitete Leistung wird nicht auf Prozent genau bewertet", () => {
    const e = beurteile(geraet({ herkunft: "typenschluessel" }), altbau);
    expect(e.befunde).toContainEqual({ art: "leistung-unsicher" });
    expect(e.befunde.some((b) => b.art === "leistung-passt")).toBe(false);
  });
});

describe("Vorlauftemperatur", () => {
  it("ein Gerät, das den nötigen Vorlauf nicht schafft, fällt raus", () => {
    // 35-°C-Gerät an alten Heizkörpern: sähe nur billiger aus.
    const e = beurteile(geraet({ vorlaufMaxC: 35 }), altbau);
    expect(e.geeignet).toBe(false);
    expect(e.befunde).toContainEqual({ art: "vorlauf-zu-niedrig", geraetC: 35, noetigC: 55 });
  });

  it("knapp über dem Bedarf wird als knapp ausgewiesen", () => {
    const e = beurteile(geraet({ vorlaufMaxC: 58 }), altbau);
    expect(e.geeignet).toBe(true);
    expect(e.befunde).toContainEqual({ art: "vorlauf-knapp", geraetC: 58, noetigC: 55 });
  });

  it("eine fehlende Angabe schließt NICHT aus, sondern wird benannt", () => {
    // Zwischenzeitlich schloss sie aus. Die Regel kostete zwei Drittel der
    // Komplettpakete, weil die Angabe aus dem Serientext der Baureihe kommt:
    // Bosch und Vaillant nennen sie in ihren Paketnamen nicht, Remko schon —
    // von 28 Luft/Wasser-Paketen blieben 2 übrig. Das ist dieselbe
    // markenabhängige Verzerrung, gegen die der Katalog seine Typenschlüssel
    // baut, nur an anderer Stelle. Die Unsicherheit steht jetzt als Befund in
    // der Kachel.
    const e = beurteile(geraet({ vorlaufMaxC: null }), altbau);
    expect(e.geeignet).toBe(true);
    expect(e.befunde).toContainEqual({ art: "vorlauf-unbekannt" });
  });

  it("eine ZU NIEDRIGE Angabe schließt weiterhin aus", () => {
    // Der Unterschied ist der ganze Punkt: Wir wissen es nicht (durchlassen und
    // sagen) gegen wir wissen, dass es nicht reicht (ausschließen).
    const e = beurteile(geraet({ vorlaufMaxC: 45 }), altbau);
    expect(e.geeignet).toBe(false);
    expect(e.befunde).toContainEqual({ art: "vorlauf-zu-niedrig", geraetC: 45, noetigC: 55 });
  });

  it("ein 35-°C-Gerät scheitert am Warmwasser, auch bei Fußbodenheizung", () => {
    // Das Haus wird damit warm, das Duschwasser nicht. Ein Speicher braucht
    // rund 50 °C Ladetemperatur — die Anforderung ist unabhängig vom
    // Heizsystem und war in der ersten Fassung gar nicht vorgesehen.
    const neubau: WpFall = { auslegungKw: 10, vorlaufC: 35, wpType: "lwwp" };
    const e = beurteile(geraet({ vorlaufMaxC: 35 }), neubau);
    expect(e.geeignet).toBe(false);
    expect(e.befunde).toContainEqual({ art: "vorlauf-zu-niedrig", geraetC: 35, noetigC: 50 });
  });

  it("ein 55-°C-Gerät reicht im Neubau", () => {
    const neubau: WpFall = { auslegungKw: 10, vorlaufC: 35, wpType: "lwwp" };
    expect(beurteile(geraet({ vorlaufMaxC: 55 }), neubau).geeignet).toBe(true);
  });
});

describe("Auswahl", () => {
  it("sortiert nach dem Preis für den Nutzer", () => {
    const katalog = [
      geraet({ id: "teuer", marke: "C", preisEur: 14000 }),
      geraet({ id: "guenstig", marke: "A", preisEur: 8000 }),
      geraet({ id: "mittel", marke: "B", preisEur: 11000 }),
    ];
    const e = empfehlungenFuer(katalog, altbau);
    expect(e.map((x) => x.geraet.id)).toEqual(["guenstig", "mittel", "teuer"]);
  });

  it("zeigt höchstens ein Gerät je Hersteller", () => {
    // Sonst stehen drei Nachbarmodelle derselben Baureihe untereinander —
    // gemessen am echten Katalog lieferte der Altbau-Fall dreimal LG, zwei
    // davon preisgleich. Das ist keine Auswahl.
    const katalog = [
      geraet({ id: "lg-1", marke: "LG", preisEur: 3798 }),
      geraet({ id: "lg-2", marke: "LG", preisEur: 4679 }),
      geraet({ id: "lg-3", marke: "LG", preisEur: 4679 }),
      geraet({ id: "carrier", marke: "CARRIER", preisEur: 5098 }),
    ];
    const e = empfehlungenFuer(katalog, altbau);
    expect(e.map((x) => x.geraet.id)).toEqual(["lg-1", "carrier"]);
  });

  it("zeigt nur die gewählte Wärmequelle", () => {
    const katalog = [
      geraet({ id: "luft", bauart: "luft-wasser", preisEur: 8000 }),
      geraet({ id: "sole", bauart: "sole-wasser", preisEur: 7000 }),
    ];
    expect(empfehlungenFuer(katalog, altbau).map((x) => x.geraet.id)).toEqual(["luft"]);
    expect(
      empfehlungenFuer(katalog, { ...altbau, wpType: "swwp" }).map((x) => x.geraet.id),
    ).toEqual(["sole"]);
  });

  it("nimmt ungeeignete Geräte gar nicht erst auf", () => {
    const katalog = [
      geraet({ id: "zu-klein", leistungKw: 6, preisEur: 4000 }),
      geraet({ id: "zu-kalt", vorlaufMaxC: 35, preisEur: 5000 }),
      geraet({ id: "passt", preisEur: 9000 }),
    ];
    expect(empfehlungenFuer(katalog, altbau).map((x) => x.geraet.id)).toEqual(["passt"]);
  });

  it("liefert nichts statt irgendetwas, wenn nichts passt", () => {
    expect(empfehlungenFuer([geraet({ leistungKw: 4 })], altbau)).toEqual([]);
  });
});

describe("Komplettpakete vor Einzelgeräten", () => {
  it("zeigt Pakete, auch wenn ein Einzelgerät günstiger ist", () => {
    // Der reale Preisabstand: derselbe 10-kW-Fall kostet als Monoblock allein
    // 3.698 €, als Paket mit Speicher 7.879 €. Nach Preis sortiert stünde das
    // halbe Angebot immer oben — und wer nur Zahlen vergleicht, kauft es.
    const katalog = [
      geraet({ id: "nur-geraet", marke: "A", preisEur: 3698, umfang: "geraet" }),
      geraet({ id: "paket", marke: "B", preisEur: 7879, umfang: "paket" }),
    ];
    expect(empfehlungenFuer(katalog, altbau).map((x) => x.geraet.id)).toEqual(["paket"]);
  });

  it("fällt auf Einzelgeräte zurück, wenn es kein Paket gibt", () => {
    // Nicht jede Größenklasse hat ein Paket. Eine leere Liste wäre dann
    // schlechter als ein Gerät, dessen Umfang die Kachel ausschreibt.
    const katalog = [geraet({ id: "nur-geraet", umfang: "geraet" })];
    expect(empfehlungenFuer(katalog, altbau).map((x) => x.geraet.id)).toEqual(["nur-geraet"]);
  });
});
