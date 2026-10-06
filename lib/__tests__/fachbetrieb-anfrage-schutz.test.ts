import { afterEach, describe, expect, it, vi } from "vitest";

const { seiteFuerKennung } = vi.hoisted(() => ({ seiteFuerKennung: vi.fn() }));
vi.mock("../fachbetrieb-seite", () => ({
  seiteFuerKennung,
  kurzname: (s: string) => s,
  anzeigename: () => "Testbetrieb",
}));
vi.mock("../fachbetrieb-anfrage-statistik", () => ({
  anfrageMerken: vi.fn(),
  ausErgebnisUrl: () => ({}),
}));

import { bildArtAusSignatur, pruefeFotos, MAX_FOTO_BASE64_ZEICHEN } from "../fachbetrieb-anfrage-fotos";
import { istVermutlichBot, MIN_FUELLZEIT_MS, zuSchnellAusgefuellt, honigtopfGefuellt } from "../formular-bremse";
import { POST } from "../../app/api/fachbetrieb/anfrage/route";

const b64 = (bytes: number[]) => Buffer.from(Uint8Array.from([...bytes, ...new Array(40).fill(0)])).toString("base64");
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];
const HEIC = [0, 0, 0, 0x18, ...Buffer.from("ftypheic")];
const AVIF = [0, 0, 0, 0x18, ...Buffer.from("ftypavif")];
const EXE = [0x4d, 0x5a, 0x90, 0x00];
const PDF = [...Buffer.from("%PDF-1.7")];

describe("Fotos: entschieden wird an den ersten Bytes", () => {
  it("erkennt die vier erlaubten Formate", () => {
    expect(bildArtAusSignatur(Buffer.from(b64(JPEG), "base64"))).toBe("jpeg");
    expect(bildArtAusSignatur(Buffer.from(b64(PNG), "base64"))).toBe("png");
    expect(bildArtAusSignatur(Buffer.from(b64(WEBP), "base64"))).toBe("webp");
    expect(bildArtAusSignatur(Buffer.from(b64(HEIC), "base64"))).toBe("heic");
  });

  it("weist Programm, PDF und AVIF ab — auch wenn der Name nach Bild aussieht", () => {
    for (const bytes of [EXE, PDF, AVIF]) {
      const r = pruefeFotos([{ name: "dach.jpg", inhalt: b64(bytes) }]);
      expect(r).toEqual({ ok: false, grund: "kein-bild" });
    }
  });

  it("die Endung folgt dem Inhalt, nicht dem Namen", () => {
    const r = pruefeFotos([{ name: "../../dach.exe", inhalt: b64(PNG) }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fotos[0].filename).toBe("dach.png");
  });

  it("höchstens zwei Fotos, jedes unter der Größengrenze", () => {
    const eins = { name: "a.jpg", inhalt: b64(JPEG) };
    expect(pruefeFotos([eins, eins]).ok).toBe(true);
    expect(pruefeFotos([eins, eins, eins])).toEqual({ ok: false, grund: "zu-viele" });
    const riesig = { name: "a.jpg", inhalt: b64(JPEG) + "A".repeat(MAX_FOTO_BASE64_ZEICHEN) };
    expect(pruefeFotos([riesig])).toEqual({ ok: false, grund: "zu-gross" });
  });

  it("kaputtes Base64 und falsche Formen fliegen raus", () => {
    expect(pruefeFotos([{ name: "a.jpg", inhalt: "<script>" }])).toEqual({ ok: false, grund: "ungueltig" });
    expect(pruefeFotos("nicht-liste")).toEqual({ ok: false, grund: "ungueltig" });
    expect(pruefeFotos([{ name: 1, inhalt: b64(JPEG) }])).toEqual({ ok: false, grund: "ungueltig" });
    expect(pruefeFotos(undefined)).toEqual({ ok: true, fotos: [] });
  });
});

describe("Formular-Bremse: Honigtopf und Mindest-Ausfüllzeit", () => {
  const jetzt = 1_800_000_000_000;

  it("Honigtopf", () => {
    expect(honigtopfGefuellt({ website: "http://spam" })).toBe(true);
    expect(honigtopfGefuellt({ website: "  " })).toBe(false);
    expect(honigtopfGefuellt({})).toBe(false);
  });

  it("zu schnell, ohne Zeitstempel oder aus der Zukunft gilt als Maschine", () => {
    expect(zuSchnellAusgefuellt({}, jetzt)).toBe(true);
    expect(zuSchnellAusgefuellt({ geoeffnetAm: "gestern" }, jetzt)).toBe(true);
    expect(zuSchnellAusgefuellt({ geoeffnetAm: jetzt - MIN_FUELLZEIT_MS + 1 }, jetzt)).toBe(true);
    expect(zuSchnellAusgefuellt({ geoeffnetAm: jetzt + 10 * 60_000 }, jetzt)).toBe(true);
    expect(zuSchnellAusgefuellt({ geoeffnetAm: jetzt - MIN_FUELLZEIT_MS }, jetzt)).toBe(false);
    expect(istVermutlichBot({ geoeffnetAm: jetzt - 60_000 }, jetzt)).toBe(false);
  });
});

describe("Route: eine Maschine bekommt Erfolg gemeldet und löst nichts aus", () => {
  afterEach(() => seiteFuerKennung.mockReset());

  function anfrage(body: Record<string, unknown>): Request {
    return new Request("http://localhost/api/fachbetrieb/anfrage", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
      body: JSON.stringify(body),
    });
  }
  const echt = { kennung: "abc", name: "Max Muster", kontakt: "max@example.com", geoeffnetAm: Date.now() - 60_000 };

  it("gefüllter Honigtopf: 200, aber kein Empfänger wird aufgelöst", async () => {
    const res = await POST(anfrage({ ...echt, website: "spam" }));
    expect(res.status).toBe(200);
    expect(seiteFuerKennung).not.toHaveBeenCalled();
  });

  it("zu schnell abgeschickt: 200, aber kein Empfänger wird aufgelöst", async () => {
    const res = await POST(anfrage({ ...echt, geoeffnetAm: Date.now() }));
    expect(res.status).toBe(200);
    expect(seiteFuerKennung).not.toHaveBeenCalled();
  });

  it("ein Nicht-Bild als Anhang wird mit 400 abgewiesen", async () => {
    const res = await POST(anfrage({ ...echt, fotos: [{ name: "dach.jpg", inhalt: b64(EXE) }] }));
    expect(res.status).toBe(400);
    expect(seiteFuerKennung).not.toHaveBeenCalled();
  });

  it("Gegenprobe: eine echte Anfrage erreicht die Empfänger-Auflösung", async () => {
    seiteFuerKennung.mockResolvedValue(null);
    const res = await POST(anfrage({ ...echt, fotos: [{ name: "dach.jpg", inhalt: b64(JPEG) }] }));
    expect(res.status).toBe(404);
    expect(seiteFuerKennung).toHaveBeenCalledWith("abc");
  });
});
