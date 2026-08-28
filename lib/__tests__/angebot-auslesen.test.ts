import { describe, it, expect } from "vitest";
import { leseErgebnisAus, meisterAnweisung, leseAngebot } from "../angebot-auslesen";

const gelesen = (angebot: Record<string, unknown>) => JSON.stringify({ art: "gelesen", angebot });

describe("Antwort des Meisters prüfen", () => {
  it("nimmt den Abbruch entgegen, wenn es kein Angebot ist", () => {
    const r = leseErgebnisAus('{"art":"kein-angebot","grund":"Eine Stromrechnung."}');
    expect(r).toEqual({ art: "kein-angebot", grund: "Eine Stromrechnung." });
  });

  it("übersteht einen Codeblock um das JSON", () => {
    const r = leseErgebnisAus("```json\n" + gelesen({ leistungKw: 9 }) + "\n```");
    expect(r.art).toBe("gelesen");
  });

  it("wirft erfundene Kategorien weg, statt sie durchzureichen", () => {
    // Sonst zählt die Vollständigkeitsprüfung gegen eine Liste, die es nicht gibt.
    const r = leseErgebnisAus(gelesen({
      positionen: [{ id: "wartungsvertrag", wortlaut: "Wartung", betragEur: 200, enthaeltAuch: ["kaffeemaschine"] }],
    }));
    if (r.art !== "gelesen") throw new Error("erwartet: gelesen");
    expect(r.angebot.positionen[0].id).toBeNull();
    expect(r.angebot.positionen[0].enthaeltAuch).toEqual([]);
  });

  it("behält gültige Kategorien samt Einschluss", () => {
    const r = leseErgebnisAus(gelesen({
      positionen: [{ id: "geraet", wortlaut: "WP inkl. Montage", betragEur: 14200, enthaeltAuch: ["montage"] }],
    }));
    if (r.art !== "gelesen") throw new Error("erwartet: gelesen");
    expect(r.angebot.positionen[0]).toMatchObject({ id: "geraet", betragEur: 14200, enthaeltAuch: ["montage"] });
  });

  it("macht aus einer Text-Zahl kein stilles Ergebnis", () => {
    // "ca. 35.000" darf nicht als Zahl durchgehen — lieber keine Angabe.
    const r = leseErgebnisAus(gelesen({ gesamtpreisEur: "ca. 35000" }));
    if (r.art !== "gelesen") throw new Error("erwartet: gelesen");
    expect(r.angebot.gesamtpreisEur).toBeNull();
  });

  it("überlebt fehlende Felder ohne Absturz", () => {
    const r = leseErgebnisAus('{"art":"gelesen","angebot":{}}');
    if (r.art !== "gelesen") throw new Error("erwartet: gelesen");
    expect(r.angebot).toMatchObject({ geraet: null, leistungKw: null, positionen: [], unsicher: [] });
  });

  it("wirft bei unbrauchbarer Antwort, statt etwas zu erfinden", () => {
    expect(() => leseErgebnisAus("Tut mir leid, das kann ich nicht.")).toThrow();
  });
});

describe("Anweisung an den Meister", () => {
  const text = meisterAnweisung();

  it("verlangt Abbruch, wenn es kein Angebot ist", () => {
    expect(text).toContain("kein-angebot");
  });

  it("verbietet erfundene Zahlen", () => {
    expect(text).toMatch(/ERFINDE KEINE ZAHL/);
  });

  it("verbietet jede Aussage über den Betrieb", () => {
    // Die Grenze zwischen Verbraucherinformation und Herabsetzung eines
    // Wettbewerbers. Sie muss in der Anweisung stehen, nicht nur im Kommentar.
    expect(text).toMatch(/SCHREIBE NICHTS ÜBER DEN BETRIEB/);
  });

  it("nennt die Kategorien aus der Referenz, nicht getippte", () => {
    expect(text).toContain("zaehlerschrank");
    expect(text).toContain("hydraulischer-abgleich");
  });
});

describe("Ein Angebot lesen lassen", () => {
  it("reicht Anweisung und Dokument an den Dienst durch", async () => {
    let gesehen: { anweisung: string; mediaType: string } | null = null;
    const r = await leseAngebot(async (anweisung, dok) => {
      gesehen = { anweisung, mediaType: dok.mediaType };
      return gelesen({ leistungKw: 8 });
    }, { mediaType: "application/pdf", base64: "AAA" });
    expect(gesehen!.mediaType).toBe("application/pdf");
    expect(gesehen!.anweisung).toContain("Heizungsbaumeister");
    expect(r.art).toBe("gelesen");
  });
});
