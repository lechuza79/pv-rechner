import { describe, expect, it } from "vitest";
import { form, kandidatenMitZusatz, einOrt } from "../../scripts/funding-ortsabgleich";

/**
 * Der Ortsabgleich hält Namen aus einer fremden Liste gegen den eigenen Katalog.
 * Er schreibt nichts und zieht kein Geld ab — sein einziger Schaden wäre ein
 * FALSCH AUFGELÖSTER Ort, und genau den hat er beim ersten Lauf produziert.
 *
 * Ein Gemeindeschlüssel hat kein Aussehen: „Freiburg" auf Freiburg an der Elbe
 * aufzulösen sieht aus wie ein Treffer, meldet aber eine Lücke bei einem Ort,
 * den wir längst führen — und hätte umgekehrt jemanden dazu gebracht, die
 * falsche Amtsseite zu lesen. Dieselbe Fehlerklasse wie ein vertippter
 * Schlüssel, nur eine Stufe früher.
 */
describe("Ortsabgleich löst Namen auf", () => {
  const alsMap = (orte: { region_id: string; name: string }[]) => {
    const m = new Map<string, { region_id: string; name: string }[]>();
    for (const o of orte) {
      const f = form(o.name);
      if (!m.has(f)) m.set(f, []);
      m.get(f)!.push(o);
    }
    return m;
  };

  it("wirft Zusätze weg, die keinen anderen Ort meinen", () => {
    expect(form("Oldenburg (Oldb)")).toBe("oldenburg");
    expect(form("Mühlhausen an der Sulz")).toBe("muehlhausen an der sulz");
    // „Landkreis" bleibt stehen: Landkreis Oldenburg und die Stadt Oldenburg
    // sind zwei Träger, und genau die hat die Liste verwechselt.
    expect(form("Landkreis Oldenburg")).toBe("landkreis oldenburg");
    expect(form("Landkreis Oldenburg")).not.toBe(form("Oldenburg"));
  });

  it("findet den Ort auch, wenn er amtlich einen Namenszusatz trägt", () => {
    const m = alsMap([
      { region_id: "03359018", name: "Freiburg (Elbe)" },
      { region_id: "08311000", name: "Freiburg im Breisgau" },
    ]);
    // „Freiburg (Elbe)" normalisiert auf „freiburg" — es wäre also der einzige
    // exakte Treffer gewesen. Der Breisgau kommt nur über den Zusatz dazu.
    const zusatz = kandidatenMitZusatz("freiburg", m);
    expect(zusatz.map((k) => k.region_id)).toEqual(["08311000"]);
  });

  it("greift nicht mitten im Wort", () => {
    const m = alsMap([{ region_id: "09999999", name: "Essenbach" }]);
    expect(kandidatenMitZusatz("essen", m)).toEqual([]);
  });

  it("fasst Kreis- und Gemeindezeile desselben Orts zusammen", () => {
    // Eine kreisfreie Stadt steht zweimal im Register — das ist keine
    // Mehrdeutigkeit, und als solche gemeldet hat sie beim ersten Lauf drei
    // Städte grundlos in den Arbeitsvorrat gelegt.
    const zusammen = einOrt([
      { region_id: "05711", name: "Bielefeld" },
      { region_id: "05711000", name: "Bielefeld" },
    ]);
    expect(zusammen).toEqual([{ region_id: "05711000", name: "Bielefeld" }]);
  });

  it("lässt echte Doppelnamen mehrdeutig", () => {
    const beide = einOrt([
      { region_id: "06431007", name: "Fürth" },
      { region_id: "09563000", name: "Fürth" },
    ]);
    expect(beide).toHaveLength(2);
  });
});
