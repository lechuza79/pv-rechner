import { describe, expect, it } from "vitest";
import {
  kanalText,
  kanalVorgabe,
  moeglicheKanaele,
  pruefeKanalwahl,
} from "../social-kanalwahl";
import {
  HALTBARKEIT_VORGABE,
  darfNachgereichtWerden,
  haltbarkeitText,
} from "../social-haltbarkeit";

describe("Mögliche Kanäle", () => {
  it("nimmt Instagram heraus, wenn kein Bild da ist", () => {
    // Nicht erst beim Senden abweisen: Ein Haken, der aussieht wie eine
    // Möglichkeit und keine ist, kostet einen Anlauf und eine Fehlermeldung.
    expect(moeglicheKanaele(["linkedin", "instagram"], false)).toEqual(["linkedin"]);
    expect(moeglicheKanaele(["linkedin", "instagram"], true)).toEqual(["linkedin", "instagram"]);
  });

  it("erfindet keinen Kanal, den die Story nicht vorsieht", () => {
    expect(moeglicheKanaele(["linkedin"], true)).toEqual(["linkedin"]);
  });
});

describe("Voreinstellung", () => {
  it("wählt ALLE möglichen Kanäle vor", () => {
    // Die Gegenrichtung — nichts vorausgewählt — hieße, dass ein vergessener
    // Haken stillschweigend die halbe Reichweite kostet. Das merkt niemand.
    expect(kanalVorgabe(["linkedin", "instagram"], true)).toEqual(["linkedin", "instagram"]);
  });
});

describe("Prüfung der Wahl", () => {
  it("weist eine leere Wahl ab", () => {
    // Ein belegter Tag, an dem nichts passiert, ist genau der verstrichene Plan,
    // den dieser Kalender sichtbar machen soll — nur von Anfang an eingebaut.
    const b = pruefeKanalwahl([], ["linkedin"], true);
    expect(b.ok).toBe(false);
  });

  it("weist Instagram ohne Bild ab und sagt warum", () => {
    const b = pruefeKanalwahl(["instagram"], ["linkedin", "instagram"], false);
    expect(b.ok).toBe(false);
    expect(b.ok === false && b.grund).toContain("reinen Textbeitrag");
  });

  it("lässt eine bewusste Einschränkung durch", () => {
    const b = pruefeKanalwahl(["linkedin"], ["linkedin", "instagram"], true);
    expect(b).toEqual({ ok: true, kanaele: ["linkedin"] });
  });
});

describe("Beschriftung", () => {
  it("sagt ausdrücklich, wo eingeschränkt wurde", () => {
    expect(kanalText(["linkedin"])).toBe("nur LinkedIn");
    expect(kanalText(["linkedin", "instagram"])).toBe("LinkedIn + Instagram");
  });
});

describe("Nachreichen auf einen späteren Kanal", () => {
  it("erlaubt es, solange nichts gesendet wurde", () => {
    // Ohne ersten Versand gibt es nichts nachzureichen — der Beitrag läuft den
    // normalen Weg.
    expect(darfNachgereichtWerden(HALTBARKEIT_VORGABE, null, "2026-12-01")).toEqual({ darf: true });
  });

  it("erlaubt es für eine dauerhafte Aussage auch nach Monaten", () => {
    const h = { art: "dauerhaft" } as const;
    expect(darfNachgereichtWerden(h, "2026-01-05T09:00:00Z", "2026-12-01")).toEqual({ darf: true });
  });

  it("verweigert es, wenn die Zeitbindung abgelaufen ist", () => {
    const h = { art: "zeitgebunden", tage: 28, grund: "nennt ein Zwölf-Monats-Fenster" } as const;
    const b = darfNachgereichtWerden(h, "2026-09-01T09:00:00Z", "2026-11-01");
    expect(b.darf).toBe(false);
    expect(b.darf === false && b.grund).toContain("Zwölf-Monats-Fenster");
  });

  it("erlaubt es am letzten Tag der Frist noch", () => {
    // Die Grenze wird geprüft, nicht angenommen: „nach 28 Tagen" heißt, dass
    // der 28. noch trägt und der 29. nicht mehr.
    const h = { art: "zeitgebunden", tage: 28, grund: "x" } as const;
    expect(darfNachgereichtWerden(h, "2026-09-01T09:00:00Z", "2026-09-29").darf).toBe(true);
    expect(darfNachgereichtWerden(h, "2026-09-01T09:00:00Z", "2026-09-30").darf).toBe(false);
  });

  it("behandelt Unbekanntes vorsichtig, nicht großzügig", () => {
    // Die Vorgabe ist zeitgebunden. Ein Beitrag, den niemand eingeordnet hat,
    // wird nicht Monate später nachgereicht.
    expect(HALTBARKEIT_VORGABE.art).toBe("zeitgebunden");
    expect(darfNachgereichtWerden(HALTBARKEIT_VORGABE, "2026-01-01T09:00:00Z", "2026-12-01").darf).toBe(
      false,
    );
  });

  it("beschriftet beide Fälle lesbar", () => {
    expect(haltbarkeitText({ art: "dauerhaft" })).toBe("dauerhaft");
    expect(haltbarkeitText({ art: "zeitgebunden", tage: 28, grund: "x" })).toBe("trägt 28 Tage");
  });
});
