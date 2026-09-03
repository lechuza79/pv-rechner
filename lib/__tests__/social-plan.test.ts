import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { genannteOrte, planen, sendbar, type PlanEingabe } from "../social-plan";
import type { Pruefung } from "../social-pruefung-kern";
import type { PostBild, SocialPost } from "../social-posts";

/**
 * Die Warteschlange vor dem Versand.
 *
 * KEIN KALENDER — und das ist eine geprüfte Entscheidung, keine Bequemlichkeit.
 * Die Planungsansicht begründet es seit ihrem Bau: Ein Datum je Post ist eine
 * Zusage, die niemand einhält, sobald eine Woche voll ist, und ein Plan mit
 * verstrichenen Terminen wird nach dem dritten Mal nicht mehr gelesen.
 *
 * Das Argument richtet sich gegen TERMINE. Der Sendeweg braucht keinen Termin,
 * sondern eine Antwort auf „welcher darf als Nächstes raus" — und die gibt eine
 * Warteschlange, ohne etwas zu versprechen, das jemand reißen kann.
 */

const BILD: PostBild = {
  art: "vergleich",
  aussage: "Balkonkraftwerke stehen auf dem Land",
  gemessen: "Geräte je 1.000 Einwohner",
  serien: [
    { label: "Stadt", wert: 9.9, einheit: "je 1.000 Ew.", stellen: 1 },
    { label: "Land", wert: 22.8, einheit: "je 1.000 Ew.", stellen: 1 },
  ],
  quelle: "Marktstammdatenregister (Bundesnetzagentur), dl-de/by-2-0, aggregiert",
  stil: "hell",
};

const post = (id: string, text = "In kleinen Gemeinden stehen mehr Geräte."): SocialPost => ({
  id,
  titel: id,
  kategorie: "g13",
  kanal: ["linkedin"],
  text,
  bild: BILD,
  belege: [],
});

const p = (art: Pruefung["art"], abdruck: string, bestanden = true): Pruefung => ({
  post_id: "x",
  fassung_fingerabdruck: abdruck,
  art,
  bestanden,
  befund: "geprüft und nachgerechnet",
  geprueft_am: "2026-08-28T10:00:00.000Z",
});

const alleDrei = (abdruck: string) => [p("zahlen", abdruck), p("recht", abdruck), p("gegenpruefung", abdruck)];

const eingabe = (ueber: Partial<PlanEingabe> = {}): PlanEingabe => ({
  post: post("a"),
  abdruck: "abc",
  pruefungen: alleDrei("abc"),
  befunde: [],
  ...ueber,
});

const welt = (ueber: Partial<Parameters<typeof planen>[1]> = {}) => ({
  gesendet: () => false,
  orteMitAnschreiben: [],
  ...ueber,
});

describe("Was raus darf", () => {
  it("lässt einen vollständig geprüften Beitrag durch", () => {
    expect(sendbar(planen([eingabe()], welt()))).toHaveLength(1);
  });

  it("hält zurück, was die Mechanik sperrt", () => {
    const e = eingabe({ befunde: [{ regel: "jahr-trennzeichen", schwere: "sperre", text: "Stand 2.024" }] });
    expect(planen([e], welt())[0].hindernisse.map((h) => h.art)).toContain("mechanik");
  });

  it("ignoriert einen bloßen Hinweis", () => {
    // Ein Hinweis ist ein Urteil über die Welt. Er darf nicht sperren — sonst
    // wird er weggeklickt und nimmt die echten Sperren mit.
    const e = eingabe({ befunde: [{ regel: "sprachregel", schwere: "hinweis", text: "bitte lesen" }] });
    expect(sendbar(planen([e], welt()))).toHaveLength(1);
  });

  it("hält zurück, was keine gültige Freigabe hat", () => {
    const e = eingabe({ pruefungen: [p("zahlen", "abc")] });
    expect(planen([e], welt())[0].hindernisse.map((h) => h.art)).toContain("freigabe");
  });

  it("hält zurück, was für eine ÄLTERE Fassung freigegeben wurde", () => {
    const e = eingabe({ pruefungen: alleDrei("alt") });
    expect(planen([e], welt())[0].hindernisse.map((h) => h.art)).toContain("freigabe");
  });

  it("hält dieselbe Fassung ein zweites Mal zurück", () => {
    const w = welt({ gesendet: (_id: string, a: string) => a === "abc" });
    expect(planen([eingabe()], w)[0].hindernisse.map((h) => h.art)).toContain("schon-gesendet");
  });

  it("lässt eine ÜBERARBEITETE Fassung wieder zu", () => {
    // Die Sperre hängt an der Fassung, nicht am Beitrag. Sonst wäre ein Beitrag
    // nach der ersten Veröffentlichung für immer verbrannt.
    const w = welt({ gesendet: (_id: string, a: string) => a === "alt" });
    expect(sendbar(planen([eingabe()], w))).toHaveLength(1);
  });

  it("hält zurück, was eine Gemeinde mit laufendem Anschreiben nennt", () => {
    const e = eingabe({ post: post("a", "In Riedstadt stehen besonders viele Geräte.") });
    const w = welt({ orteMitAnschreiben: ["Riedstadt"] });
    expect(planen([e], w)[0].hindernisse.map((h) => h.art)).toContain("ort-kollision");
  });

  it("nennt ALLE Hindernisse, nicht nur das erste", () => {
    // „Warum steht der Vorrat still" ist die eigentliche Frage. Wer nur das
    // erste Hindernis zeigt, schickt jemanden dreimal um den Block.
    const e = eingabe({
      pruefungen: [],
      befunde: [{ regel: "kein-link", schwere: "sperre", text: "Adresse im Text" }],
    });
    expect(planen([e], welt())[0].hindernisse.map((h) => h.art).sort()).toEqual(["freigabe", "mechanik"]);
  });
});

describe("Ortsnamen im Beitrag", () => {
  it("findet einen genannten Ort in Text und Bild", () => {
    expect(genannteOrte(post("a", "In Riedstadt steht viel."), ["Riedstadt", "Nidda"])).toEqual(["Riedstadt"]);
  });

  it("sucht gegen eine LISTE, nicht nach Ortsmustern", () => {
    // „Hof" und „Essen" träfen sonst in jedem zweiten Satz. Steht der Ort nicht
    // auf der Liste, ist er hier keiner.
    expect(genannteOrte(post("a", "Beim Essen im Hof."), ["Riedstadt"])).toEqual([]);
  });
});

describe("Der Sendeweg protokolliert und sperrt den zweiten Versuch", () => {
  const SENDEN = readFileSync(resolve(__dirname, "../../app/api/linkedin/post/route.ts"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  it("fragt vor dem Senden, ob diese Fassung schon raus ist", () => {
    expect(SENDEN).toMatch(/schonGesendet\(/);
  });

  it("schreibt das Protokoll nach dem Senden", () => {
    const senden = SENDEN.indexOf("posteText(");
    const protokoll = SENDEN.indexOf("schreibeVersand(");
    expect(protokoll).toBeGreaterThan(senden);
  });

  it("verschweigt ein gescheitertes Protokoll nicht", () => {
    // Der Beitrag ist dann DRAUSSEN und die Doppelversand-Sperre greift nicht.
    // Ein stiller Fehler hier führt direkt zum zweiten Versand.
    expect(SENDEN).toMatch(/warnung/);
  });
});
