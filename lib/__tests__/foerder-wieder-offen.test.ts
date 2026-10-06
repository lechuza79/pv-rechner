import { describe, it, expect } from "vitest";
import { wiederOffenSeit, type HistorieEintrag } from "../funding-history";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fuerAboMailFreigegeben, gemeindeMeldungen, hatNachricht, meldungenFuerAbo, type MeldungsDaten } from "../gemeinde-meldungen";

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

describe("Zubau und Auslauf gehen einmal je Jahr hinaus, nicht bei jedem Lauf", () => {
  // Before 27.09.2026 the build-out of the last full year was an undated
  // "movement": every send run would have mailed it again.
  const d2: MeldungsDaten = {
    ...daten,
    solar: {
      total_count: 400, total_kwp: 4000,
      by_segment: [{ segment: "privat_dach", count: 400, kwp: 4000 }] as MeldungsDaten["solar"]["by_segment"],
      by_year: [{ year: 2025, count: 60, kwp: 600 }, { year: 2024, count: 50, kwp: 500 }] as MeldungsDaten["solar"]["by_year"],
      by_year_segment: [{ year: 2006, segment: "privat_dach", count: 40, kwp: 200 }] as MeldungsDaten["solar"]["by_year_segment"],
    },
    standIso: "2026-09-05",
  };
  const meldungen = gemeindeMeldungen({ daten: d2, heuteJahr: 2026 });
  const basis = { quelle: "gemeinde" as const, technikenGewaehlt: ["pv", "balkon", "waermepumpe"] as ("pv" | "balkon" | "waermepumpe")[] };
  const hat = (l: ReturnType<typeof meldungenFuerAbo>, praefix: string) => l.some((x) => x.schluessel.startsWith(praefix));

  it("beide Meldungen existieren im Beispiel überhaupt", () => {
    expect(hat(meldungen, "zubau-2025")).toBe(true);
    expect(hat(meldungen, "auslauf-2026")).toBe(true);
  });

  it("nach der ersten Mail im Jahr kommt keine von beiden noch einmal", () => {
    const l = meldungenFuerAbo(meldungen, { ...basis, bestaetigtAm: "2025-06-01T00:00:00Z", letzteMailAm: "2026-03-01T17:00:00Z" });
    expect(hat(l, "zubau-")).toBe(false);
    expect(hat(l, "auslauf-")).toBe(false);
    expect(hatNachricht(l)).toBe(false);
  });

  it("wer sich im Herbst anmeldet, bekommt den Zubau nicht als Neuigkeit — den Auslauf-Stichtag aber schon", () => {
    const l = meldungenFuerAbo(meldungen, { ...basis, bestaetigtAm: "2026-09-16T09:00:00Z", letzteMailAm: null });
    expect(hat(l, "zubau-")).toBe(false);
    expect(hat(l, "auslauf-")).toBe(true);
  });
});

// Operator decision 27.09.2026: only the reopening message may go out by mail;
// build-out, payment end, ranking and stock wait for the editorial rebuild.
describe("Abo-Mail: nur freigegebene Meldungen", () => {
  const voll = gemeindeMeldungen({
    daten,
    heuteJahr: 2026,
    foerderung: [{ name: "Klimabonus Solar", zaehlt: true }],
    platzierung: { messgroesse: "Solarleistung je Einwohner", rang: 1, ausN: 40, gruppe: "im Landkreis X" },
    wiederOffen: [{ name: "Klimabonus Solar", festgestelltAm: "2026-09-20T03:40:00+00:00", foerdert: ["pv"] }],
  });

  it("lässt nur die Wiederöffnung durch", () => {
    // Guard against a vacuous pass: the input must carry other types too.
    expect(voll.some((m) => !m.schluessel.startsWith("wieder-offen-"))).toBe(true);
    const frei = fuerAboMailFreigegeben(voll);
    expect(frei.length).toBeGreaterThan(0);
    expect(frei.every((m) => m.schluessel.startsWith("wieder-offen-"))).toBe(true);
  });

  it("ohne Wiederöffnung gibt es nichts zu schicken, auch wenn Zubau und Auslauf anstehen", () => {
    const ohne = gemeindeMeldungen({
      daten: {
        ...daten,
        solar: {
          total_count: 400, total_kwp: 4000,
          by_segment: [{ segment: "privat_dach", count: 400, kwp: 4000 }] as MeldungsDaten["solar"]["by_segment"],
          by_year: [{ year: 2025, count: 60, kwp: 600 }, { year: 2024, count: 50, kwp: 500 }] as MeldungsDaten["solar"]["by_year"],
          by_year_segment: [{ year: 2006, segment: "privat_dach", count: 40, kwp: 200 }] as MeldungsDaten["solar"]["by_year_segment"],
        },
      },
      heuteJahr: 2026,
    });
    expect(hatNachricht(ohne)).toBe(true);
    expect(hatNachricht(fuerAboMailFreigegeben(ohne))).toBe(false);
  });

  it("der Versandlauf filtert, bevor er entscheidet", () => {
    const quelle = readFileSync(resolve(__dirname, "../abo-lauf.ts"), "utf8");
    expect(quelle).toMatch(/meldungen:\s*fuerAboMailFreigegeben\(meldungen\)/);
  });
});
