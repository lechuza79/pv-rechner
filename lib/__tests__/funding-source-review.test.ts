import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ABSCHLIESSENDE_ERGEBNISSE, QUELLE_ENTFERNT, groupedPendingFundingSources, pendingFundingSources, urteilPasstZurMessung, type ReviewSource } from "../funding-source-review";
const source = (url: string, extra: Partial<ReviewSource> = {}): ReviewSource => ({region_id:"12345678",url,gelesen_am:null,gelesen_ergebnis:null,gelesen_notiz:null,seite_geaendert_am:null,...extra});
describe("Source-level review queue", () => {
  it("shares identical originals while retaining every municipal association", () => {
    const rows = [source("county.de/source"), source("county.de/source", {region_id:"87654321"}), source("town.de/other")];
    const groups = groupedPendingFundingSources(rows);
    expect(groups.map(g => g.associations)).toEqual([2, 1]);
    expect(groups[0].sources.map(s => s.region_id)).toEqual(["12345678", "87654321"]);
    expect(rows.every(s => s.gelesen_am === null)).toBe(true);
  });
  it("does not conflate documents or requeue resolved associations", () => {
    const groups = groupedPendingFundingSources([source("town.de/page?id=1"), source("town.de/page?id=2"), source("town.de/page?id=1", {region_id:"87654321", gelesen_am:"2026-09-16", gelesen_ergebnis:"keine-foerderung"})]);
    expect(groups).toHaveLength(2);
    expect(groups.every(g => g.associations === 1)).toBe(true);
  });
  it("keeps an unread second URL in an already reviewed municipality", () => {
    expect(pendingFundingSources([source("town.de/one", {gelesen_am:"2026-09-16",gelesen_ergebnis:"aufgenommen"}),source("town.de/two")]).map(x=>x.url)).toEqual(["town.de/two"]);
  });
  it("keeps unresolved and unrecognized legacy decisions visible", () => {
    expect(pendingFundingSources([source("town.de/one", {gelesen_am:"2026-09-16",gelesen_ergebnis:"unklar"}),source("town.de/two",{gelesen_am:"2026-09-16",gelesen_ergebnis:"Fachlich geprüft: blocked"})])).toHaveLength(2);
  });
  it("reopens a later same-day change, but not an older one", () => {
    const row=source("town.de/pv",{gelesen_am:"2026-09-16",gelesen_ergebnis:"aufgenommen",gelesen_notiz:JSON.stringify({reviewed_at:"2026-09-16T10:00:00Z"}),seite_geaendert_am:"2026-09-16T11:00:00Z"});
    expect(pendingFundingSources([row])).toHaveLength(1);
    expect(pendingFundingSources([{...row,seite_geaendert_am:"2026-09-16T09:00:00Z"}])).toEqual([]);
  });
  it("does not silently resolve a legacy same-day change with only a date", () => {
    expect(pendingFundingSources([source("town.de/pv",{gelesen_am:"2026-09-16",gelesen_ergebnis:"keine-foerderung",gelesen_notiz:"legacy note",seite_geaendert_am:"2026-09-16T15:00:00Z"})])).toHaveLength(1);
  });
});

describe("Das Urteil für eine entfernte Adresse", () => {
  it("nimmt die Zeile aus dem Vorrat — sonst wäre das Abhaken folgenlos", () => {
    expect(ABSCHLIESSENDE_ERGEBNISSE.has(QUELLE_ENTFERNT)).toBe(true);
    expect(pendingFundingSources([source("town.de/weg", { gelesen_am: "2026-09-20", gelesen_ergebnis: QUELLE_ENTFERNT })])).toEqual([]);
  });
  it("lässt eine gemessen tote Adresse nichts über die Gemeinde behaupten", () => {
    // Der gemessene Fehlgriff: 70 Zeilen wurden am 20.09.2026 auf eine 404 hin
    // als „keine-foerderung" abgehakt. Gelesen wurde dabei nichts.
    for (const wort of ["keine-foerderung", "ausgelaufen", "aufgenommen", "vorhanden"]) {
      expect(urteilPasstZurMessung(wort, true)).toMatch(/quelle-entfernt/);
    }
    expect(urteilPasstZurMessung(QUELLE_ENTFERNT, true)).toBeNull();
  });
  it("lässt das Wort nicht ohne Messung schreiben — sonst ist es ein Freifahrtschein", () => {
    expect(urteilPasstZurMessung(QUELLE_ENTFERNT, false)).toMatch(/Messung|--tot/);
    expect(urteilPasstZurMessung("KEINE-FOERDERUNG", false)).toBeNull();
  });
  it("urteilt über den Wortlaut, nicht über Schreibweise oder Leerzeichen", () => {
    expect(urteilPasstZurMessung("  Quelle-Entfernt  ", true)).toBeNull();
    expect(urteilPasstZurMessung("  Quelle-Entfernt  ", false)).not.toBeNull();
  });
});

describe("Das Abhak-Werkzeug wendet die Paarungsregel wirklich an", () => {
  // Geprüft wird die VERWENDUNG, nicht das Vorhandensein: Eine Regel, die nur
  // als Funktion existiert und im Werkzeug nicht aufgerufen wird, ist keine —
  // dieselbe Lehre wie bei der Abhak-Sperre und beim Datenbank-Wächter.
  const quelle = readFileSync(resolve(__dirname, "..", "..", "scripts", "funding-screen.ts"), "utf8");

  it("ruft sie auf, bevor es schreibt", () => {
    expect(quelle).toMatch(/urteilPasstZurMessung\s*\(\s*ergebnis\s*,\s*tot\s*\)/);
    const regel = quelle.indexOf("urteilPasstZurMessung(");
    const schreiben = quelle.indexOf('.from("funding_seiten").update(');
    expect(regel).toBeGreaterThan(-1);
    expect(schreiben).toBeGreaterThan(regel);
  });

  it("nennt im Anwendungsbeispiel ein Wort, das die Sperre durchlässt", () => {
    // Die erste Fassung des --tot-Wegs nannte „Adresse entfernt" — ein Wort,
    // das die Abhak-Sperre abweist. Der Weg war damit nie benutzbar.
    const beispiel = quelle.match(/--url [^\n]*--ergebnis (\S+) --tot/);
    expect(beispiel).not.toBeNull();
    expect(ABSCHLIESSENDE_ERGEBNISSE.has(beispiel![1].replace(/"/g, "").toLowerCase())).toBe(true);
  });
});
