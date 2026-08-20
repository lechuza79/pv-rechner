import { describe, it, expect } from "vitest";
import {
  waehleTestballon,
  SCHUEBE,
  AKTUELLER_SCHUB,
  type Kandidat,
  type AuswahlRegeln,
} from "../kommunen-testballon";
import { versandfenster } from "../schulferien";

const K = (over: Partial<Kandidat> & { regionId: string }): Kandidat => ({
  name: over.regionId,
  population: 3000,
  verbundKey: null,
  hookKind: "sieger",
  hookRang: 1,
  hookTotal: 10,
  hatKanal: true,
  ...over,
});

// Kleine Regeln, damit sich die Verteilung von Hand nachrechnen lässt.
const REGELN: AuswahlRegeln = { ziel: 6, chargeGroesse: 3, kleinAnteil: 2 / 3, grenze: 10_000 };

describe("Versandliste", () => {
  it("nimmt nur erreichbare Gemeinden", () => {
    const r = waehleTestballon([K({ regionId: "a" }), K({ regionId: "b", hatKanal: false })], REGELN);
    expect(r.gewaehlt.map((g) => g.regionId)).toEqual(["a"]);
    expect(r.bericht.ohneKanal).toBe(1);
  });

  it("nimmt je Verwaltungs-Verbund nur die stärkste Gemeinde", () => {
    // Kastl und Unterneukirchen teilen sich eine Verwaltung — nur eine Mail.
    const r = waehleTestballon(
      [
        K({ regionId: "kastl", verbundKey: "unterneukirchen.de", hookRang: 3, hookTotal: 10 }),
        K({ regionId: "unterneukirchen", verbundKey: "unterneukirchen.de", hookRang: 1, hookTotal: 10 }),
      ],
      REGELN,
    );
    expect(r.gewaehlt.map((g) => g.regionId)).toEqual(["unterneukirchen"]);
    expect(r.bericht.verbundGeschwister).toBe(1);
  });

  it("hält die Mischung: zwei Drittel klein", () => {
    const kandidaten = [
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `klein${i}`, population: 2000, hookRang: i + 1, hookTotal: 10 })),
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 10 })),
    ];
    const r = waehleTestballon(kandidaten, REGELN);
    expect(r.bericht.kleinGewaehlt).toBe(4); // 6 × 2/3
    expect(r.bericht.grossGewaehlt).toBe(2);
  });

  it("Charge 1 nimmt die stärksten Aufhänger, anteilig aus beiden Größen", () => {
    // Jede Gemeinde in einem eigenen Landkreis (Stellen 1–5), damit hier die
    // Stärke-Reihenfolge geprüft wird und nicht die Kreis-Streuung.
    const kandidaten = [
      ...Array.from({ length: 10 }, (_, i) =>
        K({ regionId: `07${String(i).padStart(3, "0")}001`, name: `klein${i}`, population: 2000, hookRang: i + 1, hookTotal: 10 }),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        K({ regionId: `07${String(i + 50).padStart(3, "0")}001`, name: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 10 }),
      ),
    ];
    const nameVon = new Map(kandidaten.map((k) => [k.regionId, k.name]));
    const c1 = waehleTestballon(kandidaten, REGELN)
      .gewaehlt.filter((g) => g.charge === 1)
      .map((g) => nameVon.get(g.regionId)!);
    expect(c1).toHaveLength(3);
    expect(c1.filter((n) => n.startsWith("klein"))).toHaveLength(2);
    expect(c1.filter((n) => n.startsWith("gross"))).toHaveLength(1);
    // die stärksten, also Rang 1 und 2 je Topf
    expect(c1.slice().sort()).toEqual(["gross0", "klein0", "klein1"]);
  });

  // Vier „Platz 1 im Landkreis Birkenfeld" am selben Tag entlarven das
  // Verfahren bei allen vieren gleichzeitig — und in Rheinland-Pfalz landen
  // zwei Briefe aus einem Kreis oft auf demselben Schreibtisch.
  it("setzt nie zwei Gemeinden desselben Landkreises in dieselbe Charge", () => {
    const kandidaten = Array.from({ length: 6 }, (_, i) =>
      K({ regionId: `07134${String(i).padStart(3, "0")}`, population: 2000, hookRang: i + 1, hookTotal: 20 }),
    );
    const r = waehleTestballon(kandidaten, { ziel: 6, chargeGroesse: 3, kleinAnteil: 2 / 3, grenze: 10_000 });
    const proCharge = new Map<number, string[]>();
    for (const g of r.gewaehlt) proCharge.set(g.charge, [...(proCharge.get(g.charge) ?? []), g.regionId.slice(0, 5)]);
    for (const [charge, kreise] of proCharge) {
      expect(new Set(kreise).size, `Charge ${charge}`).toBe(kreise.length);
    }
    // Alle sechs bleiben in der Kampagne — nur auf sechs Tage verteilt.
    expect(r.gewaehlt).toHaveLength(6);
  });

  // Ein Versandtag ist eine Charge. Vorher war „Charge 1" die halbe Kampagne —
  // nach dem Versand ließ sich damit nicht mehr sagen, was an einem Tag
  // hinausgegangen ist.
  it("teilt die ganze Auswahl in Chargen von Tagespensum-Größe", () => {
    // Achtstellige Schlüssel mit VERSCHIEDENEN Kreisen (Stellen 1–5), sonst
    // greift die Kreis-Streuung und verteilt sie auf viele kleine Chargen.
    const kandidaten = Array.from({ length: 20 }, (_, i) =>
      K({ regionId: `07${String(i).padStart(3, "0")}001`, population: 2000, hookRang: i + 1, hookTotal: 20 }),
    );
    const r = waehleTestballon(kandidaten, { ziel: 9, chargeGroesse: 4, kleinAnteil: 2 / 3, grenze: 10_000 });
    const proCharge = new Map<number, number>();
    for (const g of r.gewaehlt) proCharge.set(g.charge, (proCharge.get(g.charge) ?? 0) + 1);
    expect(Array.from(proCharge.entries()).sort()).toEqual([
      [1, 4],
      [2, 4],
      [3, 1],
    ]);
  });

  // Ohne Mischung in JEDER Charge bestünde der erste Versandtag nur aus
  // Dörfern — und die erste Rückmeldung, an der sich alles Weitere ausrichtet,
  // käme aus einer Gruppe statt aus dem Querschnitt.
  it("jede Charge trägt beide Größen", () => {
    const kandidaten = [
      ...Array.from({ length: 20 }, (_, i) => K({ regionId: `klein${i}`, population: 2000, hookRang: i + 1, hookTotal: 20 })),
      ...Array.from({ length: 20 }, (_, i) => K({ regionId: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 20 })),
    ];
    const r = waehleTestballon(kandidaten, { ziel: 12, chargeGroesse: 6, kleinAnteil: 2 / 3, grenze: 10_000 });
    for (const charge of [1, 2]) {
      const c = r.gewaehlt.filter((g) => g.charge === charge);
      expect(c.filter((g) => g.regionId.startsWith("gross")).length).toBeGreaterThan(0);
      expect(c.filter((g) => g.regionId.startsWith("klein")).length).toBeGreaterThan(0);
    }
  });
});

// Ein Schub, der in die Ferien seines eigenen Ziel-Bundeslands fällt, ist der
// Fehler, den die Ferientabelle verhindern soll — er lässt sich aber genauso
// gut beim Festlegen des Schubs machen wie beim Senden.
describe("Schübe", () => {
  it("jeder Schub nennt Gebiet, Kanal und Grund", () => {
    for (const [key, s] of Object.entries(SCHUEBE)) {
      expect(s.kampagne, key).toBe(key);
      expect(s.bl.length, key).toBeGreaterThan(0);
      for (const bl of s.bl) expect(bl, key).toMatch(/^\d{2}$/);
      expect(s.grund.length, key).toBeGreaterThan(20);
    }
  });

  it("der aktuelle Schub existiert und läuft über Rollen-Postfächer", () => {
    const s = SCHUEBE[AKTUELLER_SCHUB];
    expect(s).toBeTruthy();
    expect(s.kanal).toBe("rollen-postfach");
  });

  it("kein Schub zielt in ein Land, das gerade Ferien hat (Stichtag: Freigabe des Schubs)", () => {
    // Der 19.08.2026 ist der Tag, an dem dieser Schub festgelegt wurde. Er
    // steht hier als Anker, nicht als „heute": Ein Test mit `new Date()` würde
    // im Oktober rot, obwohl sich nichts geändert hat.
    const stichtag = "2026-08-19";
    for (const bl of SCHUEBE[AKTUELLER_SCHUB].bl) {
      expect(versandfenster(bl, stichtag), `${bl} am ${stichtag}`).toEqual({ frei: true });
    }
  });

  it("meldet eine nicht erreichte Mischung, statt sie still zu füllen", () => {
    const kandidaten = [
      K({ regionId: "klein0", population: 2000 }),
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 10 })),
    ];
    const r = waehleTestballon(kandidaten, REGELN);
    expect(r.bericht.kleinFehlend).toBe(3); // 4 gewollt, 1 vorhanden
    expect(r.gewaehlt).toHaveLength(6); // trotzdem voll, aus dem anderen Topf
  });

  it("stärkerer Aufhänger kommt zuerst", () => {
    const r = waehleTestballon(
      [K({ regionId: "schwach", hookRang: 9, hookTotal: 10 }), K({ regionId: "stark", hookRang: 1, hookTotal: 10 })],
      { ...REGELN, ziel: 1, chargeGroesse: 1 },
    );
    expect(r.gewaehlt[0].regionId).toBe("stark");
  });
});
