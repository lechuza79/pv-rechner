import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { abschliessendesErgebnis, notizMitHerkunft } from "../funding-altergebnis";
import { ABSCHLIESSENDE_ERGEBNISSE, pendingFundingSources } from "../funding-source-review";

/**
 * Am 20.09.2026 gemessener Bestand: alle Freitext-Urteile, die eine gelesene
 * Quellzeile im Vorrat stehen ließen, mit ihrer Stückzahl. Der Test rechnet die
 * Tabelle dagegen — ohne diesen Anker prüft er nur sich selbst.
 */
const GEMESSEN: { ergebnis: string; notiz: string | null; zeilen: number; erwartet: string | null }[] = [
  { ergebnis: "keine kommunale Solarfoerderung", notiz: null, zeilen: 170, erwartet: "keine-foerderung" },
  { ergebnis: "klaerung", notiz: null, zeilen: 132, erwartet: null },
  { ergebnis: "Adresse entfernt (404/410 beim Gegenlesen)", notiz: null, zeilen: 85, erwartet: null },
  { ergebnis: "Adresse entfernt (HTTP 404), keine Foerderseite", notiz: null, zeilen: 56, erwartet: null },
  { ergebnis: "Quelle gehoert einer anderen Gemeinde", notiz: null, zeilen: 22, erwartet: "keine-foerderung" },
  { ergebnis: "Fachlich geprüft: blocked", notiz: null, zeilen: 10, erwartet: null },
  { ergebnis: "unklar", notiz: null, zeilen: 6, erwartet: null },
  { ergebnis: "beendet – Gemeinde hat die PV-Förderung zum 31.01.2024 nicht verlängert", notiz: null, zeilen: 4, erwartet: "ausgelaufen" },
  { ergebnis: "Programm gefunden, ausgelaufen 31.12.2023", notiz: null, zeilen: 1, erwartet: "ausgelaufen" },
  {
    ergebnis:
      "Programm gelesen: Balkonkraftwerk MIT Speicher, 100 EUR je Wohneinheit, Laufzeit 2026-2027, " +
      "Hauptwohnsitz Fritzlar. Aufnahme im naechsten Lauf - die Foerderrichtlinie haengt an JavaScript " +
      "und braucht einen echten Browser.",
    notiz: null,
    zeilen: 1,
    erwartet: "aufgenommen",
  },
  { ergebnis: "verworfen", notiz: "Programm gehört der Gemeinde Berkenthin, nicht diesen Orten des Amtes", zeilen: 24, erwartet: "keine-foerderung" },
  { ergebnis: "verworfen", notiz: "Kreisprogramm Bernkastel-Wittlich, unter dem Kreisschlüssel geführt", zeilen: 7, erwartet: "keine-foerderung" },
  { ergebnis: "verworfen", notiz: "Gemeinde hat das Programm am 04.05.2026 eingestellt", zeilen: 6, erwartet: "ausgelaufen" },
  { ergebnis: "verworfen", notiz: "Klimaschutzfonds nimmt Steckersolar ausdrücklich aus", zeilen: 6, erwartet: "keine-foerderung" },
  { ergebnis: "verworfen", notiz: "Programm zum 31.12.2024 abgelaufen, Programmseite entfernt", zeilen: 6, erwartet: "ausgelaufen" },
  { ergebnis: "verworfen", notiz: "Programm nur für Vereine, zum 31.12.2025 ausgelaufen", zeilen: 5, erwartet: "keine-foerderung" },
  { ergebnis: "verworfen", notiz: "Programm gehört der Ortsgemeinde Windhagen, nicht Buchholz", zeilen: 5, erwartet: "keine-foerderung" },
  { ergebnis: "verworfen", notiz: "Kreisprogramm Trier-Saarburg, unter dem Kreisschlüssel geführt", zeilen: 5, erwartet: "keine-foerderung" },
  { ergebnis: "verworfen", notiz: "Balkon-Förderung 2025 ausgelaufen, kein Nachfolger", zeilen: 4, erwartet: "ausgelaufen" },
  { ergebnis: "verworfen", notiz: "kein kommunales Programm, nur Hinweis auf ein Landesprogramm", zeilen: 1, erwartet: "keine-foerderung" },
];

describe("Alte Freitext-Urteile umdeuten", () => {
  it("bildet den gemessenen Bestand genau so ab, wie er von Hand entschieden wurde", () => {
    for (const fall of GEMESSEN) {
      expect(abschliessendesErgebnis({ ergebnis: fall.ergebnis, notiz: fall.notiz }), fall.ergebnis + " / " + fall.notiz).toBe(fall.erwartet);
    }
  });

  it("hakt 267 der 556 blockierten Zeilen ab und lässt 289 stehen", () => {
    const abgehakt = GEMESSEN.filter((f) => f.erwartet).reduce((s, f) => s + f.zeilen, 0);
    const bleibt = GEMESSEN.filter((f) => !f.erwartet).reduce((s, f) => s + f.zeilen, 0);
    expect(abgehakt).toBe(267);
    // 132 Klärung + 10 geblockt + 6 unklar + 141 tote Adressen: jede sagt, dass
    // nichts entschieden ist bzw. dass eine frische Messung nötig ist.
    expect(bleibt).toBe(289);
    expect(abgehakt + bleibt).toBe(556);
    // Nur 21 der 267 sind „es gab eine Förderung, sie ist beendet". Der
    // Übergabezettel hätte alle 69 „verworfen"-Zeilen auf „keine Förderung"
    // geschoben und damit 16 beendete Programme als nie dagewesen ausgewiesen.
    const ausgelaufen = GEMESSEN.filter((f) => f.erwartet === "ausgelaufen").reduce((s, f) => s + f.zeilen, 0);
    expect(ausgelaufen).toBe(21);
  });

  it("schreibt nur Wörter, die eine Zeile wirklich aus dem Vorrat nehmen", () => {
    for (const fall of GEMESSEN) {
      if (!fall.erwartet) continue;
      expect(ABSCHLIESSENDE_ERGEBNISSE.has(fall.erwartet)).toBe(true);
      // Die Gegenprobe am echten Filter: die Zeile darf danach nicht mehr im
      // Vorrat liegen. Ein Wort, das in der Liste steht, aber der Filter nicht
      // greift, wäre von außen unsichtbar.
      const zeile = {
        region_id: "01001000",
        url: "beispiel.de/foerderung",
        gelesen_am: "2026-09-20",
        gelesen_ergebnis: fall.erwartet,
        gelesen_notiz: null,
        seite_geaendert_am: null,
      };
      expect(pendingFundingSources([zeile])).toEqual([]);
    }
  });

  it("deutet ein Urteil, das nichts entschieden hat, NIE um", () => {
    for (const offen of ["klaerung", "Fachlich geprüft: blocked", "unklar", "Klaerung", " UNKLAR "]) {
      expect(abschliessendesErgebnis({ ergebnis: offen, notiz: "irgendwas" })).toBeNull();
    }
  });

  it("deutet eine Messung von damals NIE um — tote Adressen werden frisch gemessen", () => {
    expect(abschliessendesErgebnis({ ergebnis: "Adresse entfernt (404/410 beim Gegenlesen)", notiz: null })).toBeNull();
    expect(abschliessendesErgebnis({ ergebnis: "Adresse entfernt (HTTP 404), keine Foerderseite", notiz: null })).toBeNull();
  });

  it("lässt ein bereits abschließendes Urteil unangetastet", () => {
    for (const wort of ABSCHLIESSENDE_ERGEBNISSE) {
      expect(abschliessendesErgebnis({ ergebnis: wort, notiz: null })).toBeNull();
    }
  });

  it("deutet ein blankes „verworfen“ nur mit bekannter Notiz um, nie nach Muster", () => {
    expect(abschliessendesErgebnis({ ergebnis: "verworfen", notiz: null })).toBeNull();
    expect(abschliessendesErgebnis({ ergebnis: "verworfen", notiz: "Programm 2027 ausgelaufen" })).toBeNull();
    expect(abschliessendesErgebnis({ ergebnis: "verworfen", notiz: "Kreisprogramm Musterkreis" })).toBeNull();
    expect(abschliessendesErgebnis({ ergebnis: "verworfen", notiz: "Programm gehört der Gemeinde Musterdorf" })).toBeNull();
  });

  it("kennt kein leeres Urteil", () => {
    expect(abschliessendesErgebnis({ ergebnis: null, notiz: "egal" })).toBeNull();
    expect(abschliessendesErgebnis({ ergebnis: "   ", notiz: "egal" })).toBeNull();
  });

  it("rettet den alten Wortlaut in eine Fließtext-Notiz", () => {
    expect(notizMitHerkunft("Seite hat nichts dazu", "verworfen")).toBe("Seite hat nichts dazu [vorheriges Ergebnis: verworfen]");
    expect(notizMitHerkunft(null, "verworfen")).toBe("[vorheriges Ergebnis: verworfen]");
  });

  it("rettet den alten Wortlaut in eine JSON-Notiz, ohne ihre Struktur zu verlieren", () => {
    const alt = JSON.stringify({ url: "https://x.de", quote: "Bahrenhof", reviewed_at: "2026-08-01T10:00:00Z" });
    const neu = notizMitHerkunft(alt, "Quelle gehoert einer anderen Gemeinde");
    const geparst = JSON.parse(neu);
    expect(geparst.reviewed_at).toBe("2026-08-01T10:00:00Z");
    expect(geparst.quote).toBe("Bahrenhof");
    expect(geparst.vorheriges_ergebnis).toBe("Quelle gehoert einer anderen Gemeinde");
  });

  it("verliert das Wiederaufmachen nicht: eine umgedeutete JSON-Notiz wird weiter gelesen", () => {
    const alt = JSON.stringify({ reviewed_at: "2026-08-01T10:00:00Z" });
    const zeile = {
      region_id: "01001000",
      url: "beispiel.de/foerderung",
      gelesen_am: "2026-08-01",
      gelesen_ergebnis: "keine-foerderung",
      gelesen_notiz: notizMitHerkunft(alt, "verworfen"),
      // Die Seite hat sich NACH der Prüfung bewegt: die Zeile muss zurückkommen.
      seite_geaendert_am: "2026-09-01T10:00:00Z",
    };
    expect(pendingFundingSources([zeile])).toHaveLength(1);
    expect(pendingFundingSources([{ ...zeile, seite_geaendert_am: "2026-07-01T10:00:00Z" }])).toEqual([]);
  });
});

describe("Das Werkzeug benutzt die Tabelle wirklich", () => {
  // Dieselbe Lehre wie bei der Abhak-Sperre: Der erste Unit-Test dort kannte die
  // Liste, aber nicht ihren Einsatz — er blieb grün, während die Sperre im
  // Werkzeug ausgebaut war. Deshalb wird hier die VERWENDUNG geprüft.
  const quelle = readFileSync(resolve(__dirname, "..", "..", "scripts", "funding-screen.ts"), "utf8");

  it("ruft die Umdeutung auf und rettet dabei den Wortlaut", () => {
    expect(quelle).toMatch(/abschliessendesErgebnis\s*\(/);
    expect(quelle).toMatch(/notizMitHerkunft\s*\(/);
  });

  it("schreibt nur auf ausdrückliche Ansage", () => {
    // Ohne diese Bremse deutet ein versehentlicher Lauf 267 fremde Urteile um.
    expect(quelle).toMatch(/--schreiben/);
  });
});
