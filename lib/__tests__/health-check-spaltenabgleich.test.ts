import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spaltenAbgleich } from "../../scripts/health-check";

// Die beiden Faelle sind nicht ausgedacht, sondern am 28.08.2026 gegen die
// Produktions-Datenbank gemessen. Sie stehen hier als Fixture, damit der
// Waechter gegen den ECHTEN Vorfall geprueft wird und nicht gegen eine
// bequeme Nachbildung.
//
// Vor der Reparatur (Spaltenliste und Pflichtfelder aus der Selbstauskunft
// von PostgREST):
const SPALTEN_VORHER = [
  "id", "user_id", "name", "description", "anlage", "custom_kwp", "speicher",
  "personen", "nutzung", "wp", "ea", "ea_km", "o_kosten", "o_ev", "o_strom",
  "o_einsp", "einspeisung_an", "o_ertrag", "plz", "fuel_type", "flow_type",
  "haustyp", "dachart", "budget_limit", "kwp", "amortisation_jahre",
  "rendite_25j", "created_at", "updated_at",
];
const PFLICHT_VORHER = [
  "id", "user_id", "name", "anlage", "speicher", "personen", "nutzung", "wp",
  "ea", "o_strom", "o_einsp", "einspeisung_an", "o_ertrag", "fuel_type", "kwp",
  "created_at", "updated_at",
];

// Nach der Reparatur: die neue Spalte ist da und Pflicht, `o_einsp` und der
// alte Schalter sind es nicht mehr.
const SPALTEN_NACHHER = [...SPALTEN_VORHER, "einspeisung_modus"];
const PFLICHT_NACHHER = [
  ...PFLICHT_VORHER.filter((s) => s !== "o_einsp" && s !== "einspeisung_an"),
  "einspeisung_modus",
];

/** Was die Speichern-Route schreibt, wenn der Nutzer nichts Eigenes gesetzt hat. */
const GESCHRIEBEN = {
  user_id: "x",
  name: "Meine Berechnung",
  description: null,
  anlage: 1,
  custom_kwp: 10,
  speicher: 1,
  personen: 1,
  nutzung: 1,
  wp: "nein",
  ea: "nein",
  ea_km: 15000,
  o_kosten: null,
  o_ev: null,
  o_strom: 0.34,
  o_einsp: null,
  einspeisung_modus: "teil",
  o_ertrag: 950,
  plz: null,
  fuel_type: "gas",
  flow_type: "manual",
  haustyp: null,
  dachart: null,
  budget_limit: null,
  kwp: 10,
  amortisation_jahre: null,
  rendite_25j: null,
};

describe("Spaltenabgleich: Code gegen Tabelle", () => {
  it("findet den echten Vorfall — beide Blocker, nicht nur den ersten", () => {
    const b = spaltenAbgleich(GESCHRIEBEN, SPALTEN_VORHER, PFLICHT_VORHER);

    // Blocker 1: das Feld, das der Code seit 03/2026 schreibt.
    expect(b.fehlend).toEqual(["einspeisung_modus"]);

    // Blocker 2: der teurere. Er waere erst NACH der Reparatur des ersten
    // sichtbar geworden — ein Waechter, der nur den ersten meldet, schickt
    // dieselbe Sitzung ein zweites Mal los.
    expect(b.nullKollision).toEqual(["o_einsp"]);
  });

  it("ist nach der Reparatur still", () => {
    const b = spaltenAbgleich(GESCHRIEBEN, SPALTEN_NACHHER, PFLICHT_NACHHER);
    expect(b.fehlend).toEqual([]);
    expect(b.nullKollision).toEqual([]);
  });

  it("meldet ein fehlendes Feld nur einmal, nicht zusaetzlich als Nullverstoss", () => {
    // `plz` fehlt hier UND traegt null. Zweimal gemeldet zu werden waere
    // irrefuehrend: Es gibt einen Fehler, nicht zwei.
    const ohnePlz = SPALTEN_NACHHER.filter((s) => s !== "plz");
    const b = spaltenAbgleich(GESCHRIEBEN, ohnePlz, [...PFLICHT_NACHHER, "plz"]);
    expect(b.fehlend).toEqual(["plz"]);
    expect(b.nullKollision).toEqual([]);
  });

  it("stoert sich nicht an Spalten, die die Tabelle zusaetzlich hat", () => {
    // Der alte Schalter bleibt stehen, und irgendwann kommt eine weitere
    // Spalte dazu, die der Code nicht schreibt. Das ist kein Befund — sonst
    // wuerde der Waechter bei jeder Erweiterung rot und niemand glaubt ihm.
    const b = spaltenAbgleich(GESCHRIEBEN, [...SPALTEN_NACHHER, "irgendwas_neues"], PFLICHT_NACHHER);
    expect(b.fehlend).toEqual([]);
  });

  it("behandelt ein gar nicht gesetztes Feld wie null", () => {
    // `undefined` und `null` sind fuer die Datenbank dasselbe Problem, wenn
    // die Spalte einen Wert verlangt.
    const b = spaltenAbgleich({ o_ev: undefined }, SPALTEN_NACHHER, ["o_ev"]);
    expect(b.nullKollision).toEqual(["o_ev"]);
  });
});

describe("Gegenprobe: der Abgleich ist wirklich verdrahtet", () => {
  // Ein Waechter, der zwar existiert, aber nirgends aufgerufen wird, meldet
  // fuer immer Gruen — genau die Sorte Sicherheitsnetz, vor der das Projekt
  // an mehreren Stellen warnt. Deshalb wird die Verdrahtung mitgeprueft und
  // nicht nur die Funktion.
  const quelle = readFileSync(
    resolve(__dirname, "..", "..", "scripts", "health-check.ts"),
    "utf8",
  );

  it("wird im Lauf aufgerufen", () => {
    expect(quelle).toMatch(/await\s+messeSpaltenAbgleich\(\)/);
  });

  it("meldet beide Befunde an Claude, nicht als blosse Warnung", () => {
    // Ein fehlendes Feld macht das Speichern unmoeglich. Das gehoert in den
    // Zweig, der den Lauf rot macht und den Autofix ansetzt — nicht in die
    // Sammlung „auffaellig, nichts zu tun".
    const abschnitt = quelle.slice(quelle.indexOf("const spalten = await messeSpaltenAbgleich()"));
    const bisNaechsterAbschnitt = abschnitt.slice(0, abschnitt.indexOf("── Ablauf der Social"));
    expect(bisNaechsterAbschnitt).toContain("spalten.fehlend.length");
    expect(bisNaechsterAbschnitt).toContain("spalten.nullKollision.length");
    expect(bisNaechsterAbschnitt.match(/forClaude\.push/g)?.length).toBe(2);
    expect(bisNaechsterAbschnitt).not.toContain("warnings.push");
  });

  it("nimmt die Feldliste aus der Umwandlung des Codes, nicht aus einer zweiten Aufzaehlung", () => {
    // Eine handgetippte Liste waere eine zweite Wahrheit und beim naechsten
    // Feld veraltet — dieselbe Systematik wie bei den Einheiten.
    expect(quelle).toContain("paramsToRow(");
  });
});
