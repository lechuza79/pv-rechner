import { describe, it, expect } from "vitest";
import { werteAus, versandtage } from "../kommunen-auswertung";

const ABOS = new Map([
  ["06535008", { bestaetigt: 3, mitAngabeVerwaltung: 1 }],
  ["03241013", { bestaetigt: 1, mitAngabeVerwaltung: 0 }],
]);

describe("Auswertung des Outreach", () => {
  it("trennt verschickt von offen", () => {
    const { gesamt } = werteAus(
      [
        { region_id: "a", kampagne: "s1", contacted_at: "2026-08-20", responded_at: null, outreach_status: "kontaktiert" },
        { region_id: "b", kampagne: "s1", contacted_at: null, responded_at: null, outreach_status: "offen" },
      ],
      new Map(),
    );
    expect(gesamt.verschickt).toBe(1);
    expect(gesamt.offen).toBe(1);
  });

  // DIE WICHTIGE UNTERSCHEIDUNG: Eine Veröffentlichung wird über die Verweise
  // gefunden und setzt kein Antwortdatum. Wer beides über dasselbe Feld zählt,
  // verliert genau das Ergebnis, auf das der ganze Outreach zielt.
  it("zählt eine Veröffentlichung ohne Antwortdatum mit", () => {
    const { gesamt } = werteAus(
      [
        {
          region_id: "06632009",
          kampagne: "s1",
          contacted_at: "2026-08-20",
          responded_at: null,
          outreach_status: "veroeffentlicht",
        },
      ],
      new Map(),
    );
    expect(gesamt.veroeffentlicht).toBe(1);
    expect(gesamt.antworten).toBe(0);
  });

  it("zählt eine Antwort über Datum oder Status", () => {
    const { gesamt } = werteAus(
      [
        { region_id: "a", kampagne: "s1", contacted_at: "2026-08-20", responded_at: "2026-08-21", outreach_status: "kontaktiert" },
        { region_id: "b", kampagne: "s1", contacted_at: "2026-08-20", responded_at: null, outreach_status: "geantwortet" },
      ],
      new Map(),
    );
    expect(gesamt.antworten).toBe(2);
  });

  it("summiert die Eintragungen der Gemeinden einer Kampagne", () => {
    const { gesamt, jeKampagne } = werteAus(
      [
        { region_id: "06535008", kampagne: "s1", contacted_at: "2026-08-20", responded_at: null, outreach_status: "kontaktiert" },
        { region_id: "03241013", kampagne: "s2", contacted_at: "2026-08-27", responded_at: null, outreach_status: "kontaktiert" },
      ],
      ABOS,
    );
    expect(gesamt.abos).toBe(4);
    expect(gesamt.abosMitAngabeVerwaltung).toBe(1);
    expect(jeKampagne.find((k) => k.kampagne === "s1")!.abos).toBe(3);
    expect(jeKampagne.find((k) => k.kampagne === "s2")!.abosMitAngabeVerwaltung).toBe(0);
  });

  // Ein Schub, der bewusst wartet, ist ein anderer Zustand als einer, der nicht
  // funktioniert hat. Ihn wegzulassen macht aus „geparkt" ein „gibt es nicht".
  it("führt einen Schub ohne Versand mit seiner Null auf", () => {
    const { jeKampagne } = werteAus(
      [
        { region_id: "a", kampagne: "live", contacted_at: "2026-08-20", responded_at: null, outreach_status: "kontaktiert" },
        { region_id: "b", kampagne: "geparkt", contacted_at: null, responded_at: null, outreach_status: "offen" },
      ],
      new Map(),
    );
    expect(jeKampagne.map((k) => k.kampagne)).toContain("geparkt");
    expect(jeKampagne.find((k) => k.kampagne === "geparkt")!.verschickt).toBe(0);
  });

  it("zählt eine Gemeinde ohne Kampagne nicht unter den Tisch", () => {
    const { jeKampagne } = werteAus(
      [{ region_id: "a", kampagne: null, contacted_at: "2026-08-20", responded_at: null, outreach_status: "kontaktiert" }],
      new Map(),
    );
    expect(jeKampagne.map((k) => k.kampagne)).toContain("ohne Kampagne");
  });

  it("liefert Nullen statt nichts, wenn es keine Zeilen gibt", () => {
    const { gesamt, jeKampagne } = werteAus([], new Map());
    expect(gesamt.verschickt).toBe(0);
    expect(jeKampagne).toEqual([]);
  });
});

describe("Versandhistorie", () => {
  const ZEILEN = [
    { region_id: "a", kampagne: "s1", contacted_at: "2026-08-20T09:00:00Z", responded_at: null, outreach_status: "kontaktiert" },
    { region_id: "b", kampagne: "s1", contacted_at: "2026-08-20T09:02:00Z", responded_at: "2026-08-21", outreach_status: "kontaktiert" },
    { region_id: "c", kampagne: "s2", contacted_at: "2026-08-27T10:00:00Z", responded_at: null, outreach_status: "veroeffentlicht" },
    { region_id: "d", kampagne: "s2", contacted_at: null, responded_at: null, outreach_status: "offen" },
  ];

  it("fasst je Versandtag zusammen, neueste zuerst", () => {
    const tage = versandtage(ZEILEN, new Map());
    expect(tage.map((t) => t.tag)).toEqual(["2026-08-27", "2026-08-20"]);
    expect(tage[1].verschickt).toBe(2);
  });

  it("lässt Gemeinden ohne Versandtag weg", () => {
    const tage = versandtage(ZEILEN, new Map());
    expect(tage.reduce((n, t) => n + t.verschickt, 0)).toBe(3);
  });

  // DIE ENTSCHEIDENDE ZUORDNUNG: Eine Reaktion zählt zum Tag des VERSANDS, nicht
  // zum Tag der Reaktion. Anders wäre die Frage „lief der größere Schub so gut
  // wie der kleine?" nicht zu beantworten — die Antwort landete in einer Zeile,
  // in der gar nichts verschickt wurde.
  it("zählt eine Antwort zum Versandtag, nicht zum Antworttag", () => {
    const tage = versandtage(ZEILEN, new Map());
    expect(tage.find((t) => t.tag === "2026-08-20")!.antworten).toBe(1);
    expect(tage.find((t) => t.tag === "2026-08-21")).toBeUndefined();
  });

  it("nennt alle Schübe eines Tages", () => {
    const tage = versandtage(
      [
        { region_id: "a", kampagne: "s1", contacted_at: "2026-09-01T09:00:00Z", responded_at: null, outreach_status: "kontaktiert" },
        { region_id: "b", kampagne: "s2", contacted_at: "2026-09-01T11:00:00Z", responded_at: null, outreach_status: "kontaktiert" },
      ],
      new Map(),
    );
    expect(tage[0].schuebe).toEqual(["s1", "s2"]);
  });

  it("summiert die Eintragungen der an dem Tag angeschriebenen Gemeinden", () => {
    const tage = versandtage(ZEILEN, new Map([["a", { bestaetigt: 2, mitAngabeVerwaltung: 1 }]]));
    expect(tage.find((t) => t.tag === "2026-08-20")!.abos).toBe(2);
    expect(tage.find((t) => t.tag === "2026-08-20")!.abosMitAngabeVerwaltung).toBe(1);
    expect(tage.find((t) => t.tag === "2026-08-27")!.abos).toBe(0);
  });
});
