import { describe, it, expect } from "vitest";
import { ordneKreiseZu, type Kreisregion } from "../kfw-kreis-zuordnung";
import { BUNDESLAENDER } from "../mastr-regions";

/**
 * Kreisnamen des Berichts auf Gebietsschlüssel abbilden.
 *
 * Das ist die Sorte Arbeit, bei der ein Fehler NICHT auffällt: Ein
 * fünfstelliger Schlüssel ist eine Zahl ohne Aussehen. Wer „Karlsruhe" der
 * Stadt statt dem Landkreis zuordnet, bekommt keinen Fehler, keinen roten Test
 * und keine kaputte Seite — nur die falsche Zahl unter dem richtigen Namen.
 *
 * Die Fälle unten sind alle aus dem echten Bericht (Jahrgang 2025) und haben
 * beim Bau je einen Fehlgriff ausgelöst.
 */

const LAND_AGS = new Map(BUNDESLAENDER.map((b) => [b.name, b.ags]));

const REGISTER: Kreisregion[] = [
  { region_id: "08212", name: "Karlsruhe", bezeichnung: "Stadtkreis" },
  { region_id: "08215", name: "Landkreis Karlsruhe", bezeichnung: "Landkreis" },
  { region_id: "13003", name: "Rostock", bezeichnung: "Kreisfreie Stadt" },
  { region_id: "13072", name: "Landkreis Rostock", bezeichnung: "Landkreis" },
  { region_id: "09162", name: "München", bezeichnung: "Kreisfreie Stadt" },
  { region_id: "09184", name: "Landkreis München", bezeichnung: "Landkreis" },
  { region_id: "09363", name: "Weiden i.d.OPf.", bezeichnung: "Kreisfreie Stadt" },
  { region_id: "08425", name: "Alb-Donau-Kreis", bezeichnung: "Landkreis" },
  { region_id: "05554", name: "Kreis Borken", bezeichnung: "Kreis" },
  { region_id: "03159", name: "Landkreis Göttingen", bezeichnung: "Landkreis" },
  // Zeile, die im Register steht, aber im Bericht kein Kreis mehr ist.
  { region_id: "03152", name: "Göttingen", bezeichnung: null },
  { region_id: "10041", name: "Regionalverband Saarbrücken", bezeichnung: "Regionalverband" },
];

function ordne(paare: string[]) {
  return ordneKreiseZu(paare, REGISTER, LAND_AGS);
}

describe("Stadt oder Landkreis", () => {
  it("erkennt den Zusatz hinter dem Komma als Stadt", () => {
    const r = ordne(["Baden-Württemberg|Karlsruhe", "Baden-Württemberg|Karlsruhe, Stadt"]);
    expect(r.offen).toEqual([]);
    expect(r.zuordnung.get("Baden-Württemberg|Karlsruhe")).toBe("08215");
    expect(r.zuordnung.get("Baden-Württemberg|Karlsruhe, Stadt")).toBe("08212");
  });

  it("erkennt beschreibende Zusätze, nicht nur das Wort „Stadt“", () => {
    // Der Bericht schreibt „München, Landeshauptstadt", „Kassel, documenta-Stadt"
    // und „Hagen, Stadt der FernUniversität". Eine Wortliste hätte hier
    // reihenweise danebengegriffen — der Trenner ist das Komma.
    const r = ordne(["Bayern|München", "Bayern|München, Landeshauptstadt"]);
    expect(r.offen).toEqual([]);
    expect(r.zuordnung.get("Bayern|München")).toBe("09184");
    expect(r.zuordnung.get("Bayern|München, Landeshauptstadt")).toBe("09162");
  });

  it("dreht die Regel um, wenn der Bericht den Landkreis VORNE benennt", () => {
    // Der einzige Fall, in dem der bloße Name die STADT meint. Eine Regel
    // „bloßer Name = Landkreis" hätte die Zahlen der Hansestadt Rostock dem
    // Landkreis Rostock zugeschlagen — beide gibt es, beide sind plausibel.
    const r = ordne(["Mecklenburg-Vorpommern|Landkreis Rostock", "Mecklenburg-Vorpommern|Rostock"]);
    expect(r.offen).toEqual([]);
    expect(r.zuordnung.get("Mecklenburg-Vorpommern|Landkreis Rostock")).toBe("13072");
    expect(r.zuordnung.get("Mecklenburg-Vorpommern|Rostock")).toBe("13003");
    expect(r.kollisionen).toEqual([]);
  });

  it("nimmt den bloßen Namen als Landkreis, wo es keine Stadt gleichen Namens gibt", () => {
    // Göttingen: Das Register führt zusätzlich eine Zeile ohne Bezeichnung, der
    // Bericht kennt nur einen Göttingen-Kreis. Ohne Ausnahme wäre das
    // mehrdeutig — und die Ausnahme holt den Schlüssel aus dem Register, statt
    // ihn zu tippen.
    const r = ordne(["Niedersachsen|Göttingen"]);
    expect(r.offen).toEqual([]);
    expect(r.zuordnung.get("Niedersachsen|Göttingen")).toBe("03159");
  });
});

describe("Schreibweisen des Registers", () => {
  it("nimmt das Gattungswort vorne weg — „Kreis Borken“ ist „Borken“", () => {
    const r = ordne(["Nordrhein-Westfalen|Borken"]);
    expect(r.zuordnung.get("Nordrhein-Westfalen|Borken")).toBe("05554");
  });

  it("löst eine gekürzte Schreibweise über die benannte Ausnahme auf", () => {
    const r = ordne(["Bayern|Weiden, Stadt"]);
    expect(r.offen).toEqual([]);
    expect(r.zuordnung.get("Bayern|Weiden, Stadt")).toBe("09363");
  });
});

describe("Ein Kreis unter fremdem Bundesland", () => {
  it("landet trotzdem bei seinem Kreis", () => {
    // Der Bericht führt „Bayern / Alb-Donau-Kreis" mit einer einzigen Zusage —
    // eine Buchung, deren Landeszuordnung nicht zur Kreiszuordnung passt.
    // Deshalb wird nach dem Land nur ZUERST gesucht, nicht ausschließlich.
    const r = ordne(["Baden-Württemberg|Alb-Donau-Kreis", "Bayern|Alb-Donau-Kreis"]);
    expect(r.offen).toEqual([]);
    expect(r.zuordnung.get("Bayern|Alb-Donau-Kreis")).toBe("08425");
    expect(r.kollisionen).toEqual([]);
  });
});

describe("Was als Fehler gilt und was nicht", () => {
  it("ein unbekannter Name bleibt OFFEN, statt irgendwo zu landen", () => {
    const r = ordne(["Bayern|Gibtsnicht"]);
    expect(r.zuordnung.size).toBe(0);
    expect(r.offen).toHaveLength(1);
    expect(r.offen[0].paar).toBe("Bayern|Gibtsnicht");
  });

  it("eine Registerzeile ohne Kreis im Bericht ist KEIN Fehler", () => {
    // Das Register führt Zeilen, die keine Kreise (mehr) sind. Sie hier zum
    // Fehler zu erklären hieße, über ihre Geschichte etwas zu behaupten, das
    // wir nicht geprüft haben. Geprüft wird nur die andere Richtung: Jeder
    // Kreis des Berichts muss genau einen Schlüssel bekommen.
    const r = ordne(["Niedersachsen|Göttingen"]);
    expect(r.ohneBericht.map((m) => m.region_id)).toContain("03152");
  });
});
