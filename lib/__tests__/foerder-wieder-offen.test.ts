import { describe, it, expect } from "vitest";
import { wiederOffenSeit, type HistorieEintrag } from "../funding-history";
import { gemeindeMeldungen, hatNachricht, meldungenFuerAbo, type MeldungsDaten } from "../gemeinde-meldungen";

// The subscriber message "Förderprogramm nimmt wieder Anträge an".
//
// Two ways it goes wrong, both invisible on the page: it fires on something
// that is not a reopening (our first sighting, a relabel), or it lands in
// every mail forever because nothing ties it to the subscriber's last mail.
// The per-subscriber filter lives in lib/abo-lauf.ts (server-only); its logic
// is tested through the same rule re-stated here as data.

const eintrag = (feld: HistorieEintrag["feld"], alt: string | null, neu: string | null, am: string): HistorieEintrag => ({
  programId: "x", feld, bedeutung: "inhalt", alt, neu, festgestelltAm: am, quelle: null, belegtAm: null,
});

describe("wiederOffenSeit", () => {
  it("findet den Wechsel von ausgeschöpft auf aktiv", () => {
    expect(wiederOffenSeit([eintrag("status", "ausgeschöpft", "aktiv", "2026-09-20T03:40:00+00:00")]))
      .toBe("2026-09-20T03:40:00+00:00");
  });

  it("nimmt den jüngsten von mehreren Wiederöffnungen", () => {
    expect(wiederOffenSeit([
      eintrag("status", "pausiert", "aktiv", "2026-05-01T00:00:00+00:00"),
      eintrag("status", "aktiv", "ausgeschöpft", "2026-07-01T00:00:00+00:00"),
      eintrag("status", "ausgeschöpft", "aktiv", "2026-09-01T00:00:00+00:00"),
    ])).toBe("2026-09-01T00:00:00+00:00");
  });

  it("die Aufnahme in den Katalog ist keine Wiederöffnung", () => {
    // We started looking; the municipality did not reopen anything.
    expect(wiederOffenSeit([eintrag("aufnahme", null, "aufgenommen", "2026-09-20T00:00:00+00:00")])).toBeNull();
    expect(wiederOffenSeit([eintrag("status", null, "aktiv", "2026-09-20T00:00:00+00:00")])).toBeNull();
  });

  it("ein Schließen ist keine Wiederöffnung", () => {
    expect(wiederOffenSeit([eintrag("status", "aktiv", "ausgeschöpft", "2026-09-20T00:00:00+00:00")])).toBeNull();
  });

  it("andere Felder zählen nicht", () => {
    expect(wiederOffenSeit([eintrag("rates", "100 €", "aktiv", "2026-09-20T00:00:00+00:00")])).toBeNull();
  });
});

const daten: MeldungsDaten = {
  name: "Wedemark", regionId: "03241021", population: 30000,
  solar: { total_count: 0, total_kwp: 0, by_segment: [], by_year: [], by_year_segment: [] },
  speicher: { kwh_batterie: 0 },
  standIso: "2026-09-05",
};

describe("Meldung „nimmt wieder Anträge an“", () => {
  const meldungen = gemeindeMeldungen({
    daten,
    heuteJahr: 2026,
    wiederOffen: [{ name: "Klimabonus Balkon", festgestelltAm: "2026-09-20T03:40:00+00:00", foerdert: ["balkon"] }],
  });
  const m = meldungen.find((x) => x.schluessel.startsWith("wieder-offen"))!;

  it("ist eine Nachricht, trägt ihr Feststellungsdatum und ihre Technik", () => {
    expect(m).toBeDefined();
    expect(m.art).toBe("bewegung");
    expect(hatNachricht(meldungen)).toBe(true);
    expect(m.festgestelltAm).toBe("2026-09-20T03:40:00+00:00");
    expect(m.techniken).toEqual(["balkon"]);
  });

  it("sagt, dass WIR es festgestellt haben — nie „seit“ als Beschlussdatum", () => {
    expect(m.text).toContain("haben wir");
    expect(m.text).toContain("20. September 2026");
    expect(m.text).not.toMatch(/\bseit dem\b/i);
    expect(m.text).toContain("Verbindlich ist immer die Auskunft der Gemeinde");
  });

  it("ohne Wiederöffnung entsteht keine solche Meldung", () => {
    expect(gemeindeMeldungen({ daten, heuteJahr: 2026 }).some((x) => x.schluessel.startsWith("wieder-offen"))).toBe(false);
  });
});

describe("meldungenFuerAbo — je Abonnent nur, was neu ist", () => {
  const meldungen = gemeindeMeldungen({
    daten,
    heuteJahr: 2026,
    wiederOffen: [{ name: "Klimabonus Balkon", festgestelltAm: "2026-09-20T03:40:00+00:00", foerdert: ["balkon"] }],
  });
  const basis = { quelle: "gemeinde" as const, technikenGewaehlt: ["pv", "balkon", "waermepumpe"] as ("pv" | "balkon" | "waermepumpe")[] };
  const hat = (l: ReturnType<typeof meldungenFuerAbo>) => l.some((x) => x.schluessel.startsWith("wieder-offen"));

  it("kommt, wenn die Feststellung nach der letzten Mail liegt", () => {
    expect(hat(meldungenFuerAbo(meldungen, { ...basis, bestaetigtAm: "2026-09-01T00:00:00+00:00", letzteMailAm: "2026-09-10T17:00:00.000Z" }))).toBe(true);
  });

  it("kommt NICHT ein zweites Mal nach der Mail, die sie schon trug", () => {
    expect(hat(meldungenFuerAbo(meldungen, { ...basis, bestaetigtAm: "2026-09-01T00:00:00+00:00", letzteMailAm: "2026-09-20T17:00:00.000Z" }))).toBe(false);
  });

  it("wer sich nach der Wiederöffnung anmeldet, bekommt sie nicht als Neuigkeit", () => {
    expect(hat(meldungenFuerAbo(meldungen, { ...basis, bestaetigtAm: "2026-09-25T00:00:00+00:00", letzteMailAm: null }))).toBe(false);
  });

  it("vergleicht Zeitpunkte, nicht Texte („Z“ gegen „+00:00“)", () => {
    // Same instant written two ways: must count as "not after".
    expect(hat(meldungenFuerAbo(meldungen, { ...basis, bestaetigtAm: null, letzteMailAm: "2026-09-20T03:40:00.000Z" }))).toBe(false);
  });

  it("im Förder-Abo nur für gewählte Techniken", () => {
    const stand = { bestaetigtAm: "2026-09-01T00:00:00+00:00", letzteMailAm: null };
    expect(hat(meldungenFuerAbo(meldungen, { ...stand, quelle: "foerderung", technikenGewaehlt: ["pv"] }))).toBe(false);
    expect(hat(meldungenFuerAbo(meldungen, { ...stand, quelle: "foerderung", technikenGewaehlt: ["balkon"] }))).toBe(true);
    // The municipality subscription carries no choice: everything passes.
    expect(hat(meldungenFuerAbo(meldungen, { ...stand, quelle: "gemeinde", technikenGewaehlt: ["pv"] }))).toBe(true);
  });
});
