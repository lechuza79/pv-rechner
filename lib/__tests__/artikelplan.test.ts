import { describe, it, expect } from "vitest";
import {
  ARTIKELPLAN,
  offeneVorhaben,
  verworfeneVorhaben,
  volumenGesamt,
  istLive,
  aeltesteMessung,
  ZUSTAND_LABEL,
  type ArtikelVorhaben,
} from "../artikelplan";
import { RATGEBER } from "../ratgeber";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("Artikelplan", () => {
  it("hat Einträge", () => {
    expect(ARTIKELPLAN.length).toBeGreaterThan(0);
  });

  // Der Kern: Ein Vorhaben ohne Messung ist eine Meinung, kein Plan. Genau
  // diese Trennung ist der Grund für die Datei — die frühere Fassung lag als
  // Fließtext in einem Bericht, wo niemand prüfen konnte, ob eine Zahl je
  // erhoben wurde.
  it("jedes Vorhaben nennt einen gemessenen Begriff mit Erhebungstag", () => {
    for (const v of ARTIKELPLAN) {
      expect(v.messung.begriff.trim().length, `${v.thema}: kein Begriff`).toBeGreaterThan(0);
      expect(v.messung.gemessenAm, `${v.thema}: Erhebungstag fehlt oder ist kein Datum`).toMatch(
        ISO,
      );
      expect(v.messung.volumen, `${v.thema}: Volumen fehlt`).toBeGreaterThanOrEqual(0);
      expect(v.messung.schwierigkeit, `${v.thema}: Schwierigkeit außerhalb 0–100`).toBeLessThanOrEqual(
        100,
      );
      expect(v.messung.schwierigkeit).toBeGreaterThanOrEqual(0);
    }
  });

  it("kein Erhebungstag in der Zukunft", () => {
    const heute = new Date().toISOString().slice(0, 10);
    for (const v of ARTIKELPLAN) {
      expect(v.messung.gemessenAm.localeCompare(heute), `${v.thema}`).toBeLessThanOrEqual(0);
    }
  });

  // Ohne ausgeschriebenen Grund ist ein verworfenes Thema in drei Monaten
  // wieder ein Vorschlag — und die Messung war umsonst. Dieselbe Systematik
  // wie `gelesen_am` im Förderkatalog: Was beurteilt wurde, bleibt beurteilt.
  it("jedes verworfene Vorhaben trägt einen Grund, der ohne Kontext trägt", () => {
    const verworfen = verworfeneVorhaben();
    expect(verworfen.length, "keine verworfenen Themen — das Gedächtnis fehlt").toBeGreaterThan(0);
    for (const v of verworfen) {
      expect(v.verworfenWeil, `${v.thema}: kein Grund`).toBeTruthy();
      expect(
        (v.verworfenWeil ?? "").length,
        `${v.thema}: Grund zu kurz, um in Monaten noch zu tragen`,
      ).toBeGreaterThan(40);
    }
  });

  it("nur verworfene Vorhaben tragen einen Verwerfungsgrund", () => {
    for (const v of ARTIKELPLAN) {
      if (v.zustand !== "verworfen") {
        expect(v.verworfenWeil, `${v.thema}: Grund trotz Zustand ${v.zustand}`).toBeUndefined();
      }
    }
  });

  it("jedes Vorhaben begründet, warum es zu uns passt", () => {
    for (const v of ARTIKELPLAN) {
      expect((v.begruendung ?? "").length, `${v.thema}: keine Begründung`).toBeGreaterThan(40);
    }
  });

  // Ein Plan darf nicht zur zweiten Wahrheit über die Live-Artikel werden.
  it("ein Vorhaben im Zustand live hat einen Registry-Eintrag", () => {
    for (const v of ARTIKELPLAN) {
      if (v.zustand === "live") {
        expect(v.slug, `${v.thema}: live ohne Adresse`).toBeTruthy();
        expect(
          RATGEBER.some((r) => r.slug === v.slug),
          `${v.thema}: als live geführt, steht aber nicht in der Ratgeber-Registry`,
        ).toBe(true);
      }
    }
  });

  it("kein offenes Vorhaben ohne Adresse, kein verworfenes mit Adresse", () => {
    for (const v of offeneVorhaben()) {
      expect(v.slug, `${v.thema}: offenes Vorhaben ohne geplante Adresse`).toBeTruthy();
      expect(v.slug?.startsWith("/"), `${v.thema}: Adresse muss mit / beginnen`).toBe(true);
    }
    for (const v of verworfeneVorhaben()) {
      expect(v.slug, `${v.thema}: verworfen, trägt aber eine Adresse`).toBeUndefined();
    }
  });

  it("keine doppelten Themen und keine doppelten Adressen", () => {
    const themen = ARTIKELPLAN.map((v) => v.thema);
    expect(new Set(themen).size).toBe(themen.length);
    const slugs = ARTIKELPLAN.map((v) => v.slug).filter(Boolean);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("jeder Zustand hat eine Beschriftung", () => {
    for (const v of ARTIKELPLAN) {
      expect(ZUSTAND_LABEL[v.zustand], `${v.thema}: Zustand ${v.zustand} ohne Beschriftung`).toBeTruthy();
    }
  });

  it("volumenGesamt summiert Haupt- und Nebenbegriffe", () => {
    const v: ArtikelVorhaben = {
      thema: "x",
      zustand: "verworfen",
      verworfenWeil: "Ein Grund, der lang genug ist, um die Schranke des Tests zu überschreiten.",
      begruendung: "Eine Begründung, die lang genug ist, um die Schranke des Tests zu überschreiten.",
      messung: {
        begriff: "a",
        volumen: 100,
        schwierigkeit: 0,
        gemessenAm: "2026-01-01",
        nebenbegriffe: [
          { begriff: "b", volumen: 30, schwierigkeit: 0 },
          { begriff: "c", volumen: 7, schwierigkeit: 0 },
        ],
      },
    };
    expect(volumenGesamt(v)).toBe(137);
  });

  it("istLive erkennt einen Registry-Eintrag", () => {
    const inRegistry = RATGEBER[0].slug;
    expect(istLive({ ...ARTIKELPLAN[0], slug: inRegistry })).toBe(true);
    expect(istLive({ ...ARTIKELPLAN[0], slug: "/gibt-es-nicht" })).toBe(false);
    expect(istLive({ ...ARTIKELPLAN[0], slug: undefined })).toBe(false);
  });

  it("aeltesteMessung liefert den frühesten Erhebungstag", () => {
    const alle = ARTIKELPLAN.map((v) => v.messung.gemessenAm).sort();
    expect(aeltesteMessung()).toBe(alle[0]);
  });

  // Die Messung ist ein Jahresdurchschnitt und altert langsam — aber nicht gar
  // nicht. Wird der Test rot, ist nicht die Schranke zu erhöhen, sondern neu zu
  // messen (npm-Lauf im Wettbewerbsbericht beschrieben).
  it("die älteste Messung ist nicht älter als ein Jahr", () => {
    const grenze = new Date();
    grenze.setFullYear(grenze.getFullYear() - 1);
    expect(
      aeltesteMessung().localeCompare(grenze.toISOString().slice(0, 10)),
      "Suchvolumen im Artikelplan ist über ein Jahr alt — neu messen, nicht die Schranke ändern",
    ).toBeGreaterThan(0);
  });
});
