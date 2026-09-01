import { describe, it, expect, vi, beforeEach } from "vitest";
import { datenFormVerstanden } from "../funding-data";
import {
  FUNDING_PROGRAMS, bedingungenFuer, type FundingCondition,
} from "../funding-programs";

/**
 * Die Datenbank ist EINE, die Codestände sind viele.
 *
 * Anlass (27.08.2026): Die Bedingungen bekamen am 26.08. neben dem blanken Satz
 * die Objektform `{ text, nur }`, und der Abgleich schrieb sie in die
 * Produktions-Datenbank. Jeder Arbeitsstand ohne diese Änderung las dieselbe
 * Tabelle weiter als `string[]` — und Niddas Stadtseite antwortete dort mit
 * HTTP 500 („Objects are not valid as a React child, keys {nur, text}"). Im
 * Entwicklungsserver eines solchen Zweigs nachgestellt, nicht hergeleitet.
 *
 * Die Fehlerklasse ist von außen unsichtbar: kein Typfehler (an der
 * Datenbank-Grenze wird die Form per `as` behauptet, nicht geprüft), kein roter
 * Test, kein kaputtes Aussehen — der Bau bricht erst beim Vorrendern ab, und
 * dann komplett.
 */

describe("Datenform aus der Datenbank", () => {
  it("der Code-Seed besteht seine eigene Prüfung", () => {
    // Die wichtigste Richtung: Wer FundingCondition oder `rates` erweitert und
    // die Prüfung vergisst, wird hier rot — statt dass später JEDES Programm
    // still auf den Seed zurückfällt und der Katalog einfriert.
    const durchgefallen = Object.values(FUNDING_PROGRAMS)
      .filter((p) => !datenFormVerstanden(p))
      .map((p) => p.id);
    expect(durchgefallen, durchgefallen.join(", ")).toEqual([]);
  });

  it("beide heutigen Bedingungsformen sind verstanden", () => {
    expect(datenFormVerstanden({ conditions: ["Antrag vor Auftragsvergabe"] })).toBe(true);
    // Genau die Zeile, an der die alte Fassung starb.
    expect(datenFormVerstanden({ conditions: [{ text: "Mindestens 4 kWp", nur: ["pv"] }] })).toBe(true);
  });

  it("eine Bedingung ohne Wortlaut wird abgewiesen", () => {
    // Der Fall „neue Form, alter Code": Ein Feld, das diese Fassung nicht kennt,
    // darf keine Oberfläche erreichen.
    expect(datenFormVerstanden({ conditions: [{ wortlaut: "Mindestens 4 kWp" }] })).toBe(false);
    expect(datenFormVerstanden({ conditions: [{ nur: ["pv"] }] })).toBe(false);
    expect(datenFormVerstanden({ conditions: [42] })).toBe(false);
    expect(datenFormVerstanden({ conditions: "kein Feld, sondern ein Satz" })).toBe(false);
  });

  it("zusätzliche Felder sind erlaubt", () => {
    // Sonst wäre jede spätere Erweiterung ein stiller Programm-Abschalter: Die
    // Prüfung fragt nach der Renderbarkeit, nicht nach der exakten Form.
    expect(datenFormVerstanden({
      conditions: [{ text: "Mindestens 4 kWp", nur: ["pv"], quelle: "Richtlinie Nr. 3" }],
      rates: [{ label: "PV-Anlage", value: "200 €/kWp", nur: ["pv"], fussnote: "brutto" }],
    })).toBe(true);
  });

  it("ein Satz ohne Beschriftung oder Wert wird abgewiesen", () => {
    expect(datenFormVerstanden({ rates: [{ label: "PV-Anlage" }] })).toBe(false);
    expect(datenFormVerstanden({ rates: [{ label: "PV-Anlage", value: 200 }] })).toBe(false);
    expect(datenFormVerstanden({ rates: "200 €/kWp" })).toBe(false);
  });

  it("was durchkommt, ist im Ergebnis Text — und nur Text", () => {
    // Das Band zwischen Prüfung und Oberfläche: Die Seiten rendern, was
    // bedingungenFuer liefert. Wenn dort etwas anderes als ein String
    // herauskäme, hätte die Prüfung ihren Zweck verfehlt.
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      for (const technik of [undefined, "pv", "balkon", "waermepumpe"] as const) {
        for (const t of bedingungenFuer(p.conditions, technik)) {
          expect(typeof t, `${p.id}`).toBe("string");
        }
      }
    }
  });
});

// ── Der Lader fällt zurück, statt die Seite umzuwerfen ────────────────────────

const zeilen = vi.hoisted(() => ({ wert: [] as Record<string, unknown>[] }));

vi.mock("../supabase-server", () => ({
  supabase: { from: () => ({ select: async () => ({ data: zeilen.wert, error: null }) }) },
}));
vi.mock("../db-timeout", () => ({
  DB_SOFT_READ_TIMEOUT_MS: 3000,
  DB_READ_TIMEOUT_MS: 8000,
  withDbTimeout: async (p: unknown) => await p,
}));

describe("Lader bei einer Form, die dieser Code nicht kennt", () => {
  beforeEach(async () => {
    const { invalidateFundingCache } = await import("../funding-data");
    invalidateFundingCache();
    vi.restoreAllMocks();
  });

  it("ein Programm in fremder Form kommt aus dem Code-Seed — ohne Prüfdatum", async () => {
    const { getFundingPrograms } = await import("../funding-data");
    const echt = FUNDING_PROGRAMS["nidda-solar"];
    zeilen.wert = [{
      // Dieselbe Zeile, nur mit einer Bedingungsform, die diese Fassung nicht
      // anzeigen kann.
      data: { ...echt, conditions: [{ wortlaut: "Mindestens 4 kWp" }] as unknown as FundingCondition[] },
      last_verified: "2026-08-26",
      page_seen_at: "2026-08-27T00:00:00Z",
      page_changed_at: null,
    }];
    const warnung = vi.spyOn(console, "warn").mockImplementation(() => {});

    const geladen = await getFundingPrograms();
    const nidda = geladen.find((p) => p.id === "nidda-solar");

    expect(nidda).toBeDefined();
    expect(nidda!.conditions).toEqual(echt.conditions);
    // Ohne Beleg zählt das Programm nicht mit: Wir können den Stand gerade nicht
    // lesen, also ziehen wir auch kein Geld ab. Lieber kein Betrag als einer aus
    // einer Form, die wir nicht verstehen.
    expect(nidda!.lastVerified).toBeUndefined();
    expect(nidda!.pageSeenAt).toBeUndefined();
    // Und sichtbar gemacht, nicht verschluckt.
    expect(warnung).toHaveBeenCalledOnce();
    expect(String(warnung.mock.calls[0][0])).toContain("nidda-solar");
  });

  it("verstandene Zeilen behalten ihren Beleg", async () => {
    const { getFundingPrograms } = await import("../funding-data");
    const echt = FUNDING_PROGRAMS["nidda-solar"];
    zeilen.wert = [{ data: echt, last_verified: "2026-08-26", page_seen_at: "2026-08-27T00:00:00Z", page_changed_at: null }];

    const nidda = (await getFundingPrograms()).find((p) => p.id === "nidda-solar");

    expect(nidda!.lastVerified).toBe("2026-08-26");
    expect(nidda!.conditions.some((c) => typeof c !== "string")).toBe(true);
  });
});
