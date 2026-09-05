import { describe, expect, it } from "vitest";
import { entwurfAus, OFFENE_STELLE } from "../social-entwurf";
import { standMitAbleitung, type VorratsFund } from "../social-fundvorrat";

/**
 * Der Entwurf darf die Arbeit nicht vortäuschen, die er nicht leisten kann.
 *
 * Das Bild kann die Maschine bauen, den Textrumpf auch — den letzten Absatz
 * nicht. Ihn mit einer plausibel klingenden Zeile zu füllen wäre leicht und
 * wäre der eigentliche Fehler: Eine gefüllte Lücke merkt niemand, eine offene
 * sieht jeder.
 */

const fund = (ueber: Partial<VorratsFund> = {}): VorratsFund => ({
  kennung: "g15-wohnform-test",
  muster: "wohnform",
  kategorie: "g15",
  satz: "In den Orten mit Einfamilienhäusern stehen 1.947 Watt je Wohnung — anderswo 652.",
  staerke: 2.99,
  werte: [
    { name: "wenig Mehrfamilienhäuser", wert: 1947, einheit: "wattJeWohnung" },
    { name: "viele Mehrfamilienhäuser", wert: 652, einheit: "wattJeWohnung" },
  ],
  grundlage: "Verglichen werden die äußeren Fünftel; die Zuordnung Anlage zu Gebäude gibt es nicht.",
  orte: [],
  laender: [],
  evergreen: true,
  stand: "vorgemerkt",
  notiz: null,
  zuletztGesehen: "2026-09-02T00:00:00Z",
  erstmalsGesehen: "2026-09-01T00:00:00Z",
  // Die Überschreibungen ZULETZT — die erste Fassung ließ sie weg, und drei
  // Tests meldeten daraufhin einen Fehler im Entwurf, der keiner war.
  ...ueber,
});

describe("Entwurf aus einem Fund", () => {
  it("lässt die Stelle für den eigenen Gedanken sichtbar offen", () => {
    const e = entwurfAus(fund(), "Quelle: Marktstammdatenregister");
    expect(e.text).toContain(OFFENE_STELLE);
    expect(e.offen[0]).toContain("letzte Absatz");
  });

  it("trägt die Grundlage in den Beitrag, nicht nur in die Belege", () => {
    // Ein Satz ohne seinen Vorbehalt ist die halbe Wahrheit — und die fällt
    // beim ersten Widerspruch in den Kommentaren auf die Füße.
    const e = entwurfAus(fund(), "Quelle: X");
    expect(e.text).toContain("Zuordnung Anlage zu Gebäude gibt es nicht");
  });

  it("wählt die Bildform nach der EINHEIT, nicht nach dem Muster", () => {
    // Ein Ring behauptet ein Ganzes. Bei „1.947 gegen 652 Watt" gibt es keins:
    // Der ungefüllte Rest wäre eine Aussage über etwas, das nicht existiert.
    expect(entwurfAus(fund(), "Q").bild?.art).toBe("saeule");
    expect(entwurfAus(fund(), "Q").bild?.ganzes).toBeUndefined();

    const prozent = entwurfAus(
      fund({
        werte: [
          { name: "Landkreis A", wert: 80, einheit: "prozent" },
          { name: "Landkreis B", wert: 17, einheit: "prozent" },
        ],
      }),
      "Q",
    );
    expect(prozent.bild?.art).toBe("donut");
    expect(prozent.bild?.ganzes).toBe(100);
  });

  it("hebt den größeren Wert hervor, nicht den ersten", () => {
    // Die Reihenfolge im Fund folgt der Erzählung; die Hervorhebung soll die
    // Aussage tragen.
    const e = entwurfAus(
      fund({
        werte: [
          { name: "klein", wert: 10, einheit: "x" },
          { name: "groß", wert: 90, einheit: "x" },
        ],
      }),
      "Q",
    );
    expect(e.bild?.serien.find((s) => s.hervorgehoben)?.label).toBe("groß");
  });

  it("baut kein Bild, wo es keine Zahlen gibt — und sagt es", () => {
    const e = entwurfAus(fund({ werte: [] }), "Q");
    expect(e.bild).toBeNull();
    expect(e.offen.join(" ")).toContain("von Hand");
  });

  it("warnt bei zeitgebundenen Funden", () => {
    const e = entwurfAus(fund({ evergreen: false }), "Q");
    expect(e.offen.join(" ")).toContain("kalt");
  });

  it("erfindet keinen Titel, sondern nimmt den Anfang des Fundes", () => {
    // Ein ausgedachter Titel wäre eine zweite Aussage, die niemand geprüft hat.
    const e = entwurfAus(fund(), "Q");
    expect(fund().satz).toContain(e.titel);
  });
});

describe("Der Weg: Bucket → Entwurf → Beitrag → geplant", () => {
  it("leitet die späten Stände ab, statt sie zu speichern", () => {
    // Sie zusätzlich mitzuschreiben hieße, dieselbe Tatsache an zwei Orten zu
    // führen — und der zweite ist der falsche, sobald jemand vergisst, ihn
    // nachzuziehen. Dieselbe Fehlerklasse wie das Prüfdatum im Förderkatalog.
    const f = fund({ stand: "vorgemerkt" });
    expect(standMitAbleitung(f, new Set(), new Set())).toBe("vorgemerkt");
    expect(standMitAbleitung(f, new Set([f.kennung]), new Set())).toBe("beitrag");
    // Geplant schlägt Beitrag: Es ist der spätere Schritt.
    expect(standMitAbleitung(f, new Set([f.kennung]), new Set([f.kennung]))).toBe("geplant");
  });

  it("überschreibt ein Verworfen nicht stillschweigend", () => {
    // Wer einen Fund verworfen hat, soll ihn verworfen sehen. Läge dazu
    // zufällig ein gleichnamiger Beitrag vor, wäre „Beitrag" eine Aussage über
    // eine Entscheidung, die der Mensch anders getroffen hat.
    const f = fund({ stand: "verworfen" });
    expect(standMitAbleitung(f, new Set(), new Set())).toBe("verworfen");
  });
});
