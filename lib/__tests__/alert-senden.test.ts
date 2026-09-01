import { describe, it, expect } from "vitest";
import { berichtAblegen, nochmalVersuchen, ABLAGE_WARTEZEITEN_MS } from "../alert-senden";

/**
 * WARUM ES DIESEN TEST GIBT (gemessen am 30.08.2026, Lauf 33304098485)
 *
 * Der Tagesbericht der Förder-Erfassung war fertig gerechnet und stand im
 * Protokoll; zehn Sekunden später warf der einzige, ungeschützte `fetch` ein
 * nacktes „fetch failed". Das Skript endete mit 1, der Workflow wurde rot, und
 * die beiden Schritte DAHINTER — Screening und Leseliste, also die Arbeit an
 * der Katalog-Vollständigkeit — wurden übersprungen. Ein Wackler beim MELDEN
 * hat einen Tag ERFASSUNG gekostet.
 *
 * Der Test prüft beide Richtungen, weil beide schon einmal falsch waren:
 * Ein Aussetzer darf nicht durchschlagen — und ein dauerhafter Fehlschlag darf
 * NICHT stillschweigend als erledigt durchgehen.
 */

/** Antworten der Reihe nach ausgeben; merkt sich, wie oft gerufen wurde. */
function stubFetch(antworten: Array<number | Error>, body: unknown = {}) {
  const rufe: string[] = [];
  const impl = (async (url: unknown) => {
    rufe.push(String(url));
    const a = antworten[rufe.length - 1] ?? antworten[antworten.length - 1];
    if (a instanceof Error) throw a;
    return {
      ok: a >= 200 && a < 300,
      status: a,
      json: async () => body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, rufe };
}

/** Nie wirklich warten — aber mitschreiben, dass gewartet WURDE. */
function stubWarten() {
  const gewartet: number[] = [];
  return { gewartet, warte: async (ms: number) => void gewartet.push(ms) };
}

const NUTZLAST = { tag: "test", subject: "x", decisions: [], done: [], details: "" };

async function ablegen(antworten: Array<number | Error>, body: unknown = {}) {
  const { impl, rufe } = stubFetch(antworten, body);
  const { gewartet, warte } = stubWarten();
  const ausgabe: string[] = [];
  const fehler = await berichtAblegen(NUTZLAST, "geheim", {
    fetchImpl: impl,
    warte,
    wartezeiten: ABLAGE_WARTEZEITEN_MS,
    log: (z) => ausgabe.push(z),
  }).then(
    () => null,
    (e: Error) => e,
  );
  return { fehler, versuche: rufe.length, gewartet, ausgabe };
}

describe("Bericht in der Ablage abgeben", () => {
  it("gibt sich beim ersten Erfolg zufrieden", async () => {
    const { fehler, versuche } = await ablegen([200]);
    expect(fehler).toBeNull();
    expect(versuche).toBe(1);
  });

  it("übersteht den gemessenen Vorfall: ein Abbruch, dann geht es", async () => {
    // Genau der Ausgang vom 30.08.2026 — ein nacktes „fetch failed".
    const { fehler, versuche, gewartet } = await ablegen([new Error("fetch failed"), 200]);
    expect(fehler).toBeNull();
    expect(versuche).toBe(2);
    expect(gewartet).toEqual([ABLAGE_WARTEZEITEN_MS[0]]);
  });

  it("wiederholt auch bei 5xx und 429 — die können beim nächsten Mal anders ausgehen", async () => {
    expect((await ablegen([500, 200])).fehler).toBeNull();
    expect((await ablegen([429, 200])).fehler).toBeNull();
  });

  it("gibt nach den vorgesehenen Versuchen auf und WIRFT — grün ohne Eintrag wäre schlimmer", async () => {
    const { fehler, versuche } = await ablegen([new Error("fetch failed")]);
    expect(fehler).toBeInstanceOf(Error);
    expect(versuche).toBe(ABLAGE_WARTEZEITEN_MS.length + 1);
    expect(fehler?.message).toMatch(/nicht abgelegt/i);
  });

  it("behandelt einen Antwortcode ungleich 2xx als Fehlschlag, nicht als erledigt", async () => {
    // Vorher wurde der Status bloß ausgegeben und das Skript endete mit 0:
    // ein 500 aus unserer eigenen Ablage hätte einen grünen Lauf OHNE Eintrag
    // hinterlassen — nicht zu unterscheiden von „gar nicht gelaufen".
    const { fehler } = await ablegen([500]);
    expect(fehler).toBeInstanceOf(Error);
    expect(fehler?.message).toMatch(/HTTP 500/);
  });

  it("wiederholt NICHT bei 4xx — Warten macht ein falsches Geheimnis nicht richtig", async () => {
    const { fehler, versuche, gewartet } = await ablegen([401]);
    expect(fehler).toBeInstanceOf(Error);
    expect(versuche).toBe(1);
    expect(gewartet).toEqual([]);
    expect(nochmalVersuchen(401)).toBe(false);
    expect(nochmalVersuchen(400)).toBe(false);
    expect(nochmalVersuchen(429)).toBe(true);
    expect(nochmalVersuchen(503)).toBe(true);
  });

  it("nennt den zurückgehaltenen Bericht als abgelegt, nicht als verschickt", async () => {
    // Die Schleuse stellt ohne Entscheidung bewusst nichts zu. Das ist der
    // Normalfall und darf sich in der Ausgabe nicht wie ein Fehlschlag lesen.
    const { fehler, ausgabe } = await ablegen([200], { skipped: true });
    expect(fehler).toBeNull();
    expect(ausgabe.join("\n")).toMatch(/abgelegt, keine Mail/);
  });

  it("gibt das Geheimnis nicht in der Fehlermeldung preis", async () => {
    const { fehler } = await ablegen([new Error("fetch failed")]);
    expect(fehler?.message).not.toMatch(/geheim/);
  });
});
