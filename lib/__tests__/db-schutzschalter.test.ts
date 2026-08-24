import { describe, it, expect, beforeEach } from "vitest";
import { withDbTimeout, schutzschalterZuruecksetzen, schutzschalterZustand } from "../db-timeout";

/**
 * Der Schutzschalter vor der Datenbank.
 *
 * Anlass (24.08.2026): Ein Nachbarprojekt auf derselben Plattform lag am 21.08.
 * zwei Stunden lahm. Die gemessene Kette: Ein fremder Crawler verdreifachte die
 * Last, die Datenbank ging in den Speichermangel, und dann kam der eigentliche
 * Schaden — die eigenen Server feuerten in der Spitzenstunde 2,08 Millionen
 * Anfragen gegen die bereits tote Datenbank. Der Ausfall hielt sich selbst am
 * Leben: Die Datenbank war zwanzig Minuten früher wieder gesund als die Seite.
 *
 * Unser Zeitlimit von acht Sekunden verhindert, dass EIN Aufruf hängenbleibt. Es
 * verhindert nicht, dass der nächste Aufruf sofort wieder anfährt. Diese Lücke
 * schließt der Schalter: Nach drei Fehlschlägen in Folge wird zehn Sekunden lang
 * gar nicht mehr angefragt.
 *
 * Der Test hält beide Richtungen fest — dass er auslöst, und dass er wieder
 * aufmacht. Ein Schutzschalter, der klemmt, wäre schlimmer als keiner: Er würde
 * die Seite tot halten, nachdem die Datenbank längst wieder da ist. Genau das
 * war im Nachbarprojekt das Teuerste am ganzen Vorfall.
 */
describe("Schutzschalter vor der Datenbank", () => {
  beforeEach(() => schutzschalterZuruecksetzen());

  const scheitern = () => withDbTimeout(Promise.reject(new Error("DB weg")), "test");
  const gelingen = () => withDbTimeout(Promise.resolve("daten"), "test");

  it("lässt einzelne Fehlschläge durch, ohne zu sperren", () => {
    // Ein Schluckauf ist kein Ausfall — nach zwei Fehlversuchen wird weiter
    // angefragt. Sonst würde jede kurze Störung die Seite abschalten.
    return scheitern().catch(() => scheitern().catch(() => {
      expect(schutzschalterZustand().offen).toBe(false);
    }));
  });

  it("sperrt nach drei Fehlschlägen in Folge", async () => {
    for (let i = 0; i < 3; i++) {
      await scheitern().catch(() => {});
    }
    expect(schutzschalterZustand().offen).toBe(true);
  });

  it("fragt bei gesperrtem Schalter gar nicht mehr an", async () => {
    for (let i = 0; i < 3; i++) {
      await scheitern().catch(() => {});
    }
    // Der Beweis, dass wirklich nicht angefragt wird: Die Abfrage darunter würde
    // gelingen — trotzdem kommt ein Fehler zurück, weil sie nie abgewartet wird.
    const abfrage = Promise.resolve("daten");
    await expect(withDbTimeout(abfrage, "test")).rejects.toThrow(/circuit open/);
  });

  it("lehnt ab, statt synchron zu werfen", async () => {
    // Wichtig für die Aufrufer: Sie fangen durchweg mit await bzw. .catch() ab.
    // Ein synchroner Wurf flöge daran vorbei und machte aus einer gedämpften
    // Störung einen ungefangenen Fehler — das Gegenteil des Zwecks.
    for (let i = 0; i < 3; i++) {
      await scheitern().catch(() => {});
    }
    let synchronGeworfen = false;
    let ergebnis: Promise<unknown> | null = null;
    try {
      ergebnis = withDbTimeout(Promise.resolve("daten"), "test");
    } catch {
      synchronGeworfen = true;
    }
    expect(synchronGeworfen).toBe(false);
    await expect(ergebnis!).rejects.toThrow(/circuit open/);
  });

  it("macht nach einem Erfolg wieder auf", async () => {
    for (let i = 0; i < 3; i++) {
      await scheitern().catch(() => {});
    }
    expect(schutzschalterZustand().offen).toBe(true);

    schutzschalterZuruecksetzen();
    await gelingen();
    expect(schutzschalterZustand().offen).toBe(false);
    expect(schutzschalterZustand().fehlerInFolge).toBe(0);
  });

  it("zählt nach einem Erfolg wieder bei null", async () => {
    // Zwei Fehlschläge, ein Erfolg, zwei Fehlschläge — das darf NICHT sperren.
    // Sonst würde eine Seite mit gelegentlichen Aussetzern nach und nach in die
    // Sperre laufen, obwohl die Datenbank überwiegend antwortet.
    await scheitern().catch(() => {});
    await scheitern().catch(() => {});
    await gelingen();
    await scheitern().catch(() => {});
    await scheitern().catch(() => {});
    expect(schutzschalterZustand().offen).toBe(false);
  });

  it("reicht erfolgreiche Daten unverändert durch", async () => {
    await expect(gelingen()).resolves.toBe("daten");
  });
});
