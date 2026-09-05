import { describe, it, expect } from "vitest";
import { zaehleAbos, aboSatz } from "../kommunen-abo-spiegel";

const ORT = "06535008";

describe("Zählung je Gemeinde", () => {
  it("trennt bestätigt, ausstehend und abgemeldet", () => {
    const m = zaehleAbos([
      { region_id: ORT, status: "bestaetigt" },
      { region_id: ORT, status: "bestaetigt", aus_verwaltung: true },
      { region_id: ORT, status: "ausstehend" },
      { region_id: ORT, status: "abgemeldet" },
    ]);
    const s = m.get(ORT)!;
    expect(s.bestaetigt).toBe(2);
    expect(s.mitAngabeVerwaltung).toBe(1);
    expect(s.ausstehend).toBe(1);
  });

  // Wer sich austrägt, ist kein Signal für Reichweite. Ihn weiterzuzählen
  // behauptete eine Leserschaft, die es nicht gibt.
  it("zählt eine Abmeldung nirgends mit", () => {
    const m = zaehleAbos([{ region_id: ORT, status: "abgemeldet", aus_verwaltung: true }]);
    const s = m.get(ORT)!;
    expect(s.bestaetigt).toBe(0);
    expect(s.mitAngabeVerwaltung).toBe(0);
  });

  // Eine unbestätigte Eintragung bekommt nie eine Mail. Sie als Abo zu zählen
  // behauptete eine Leserschaft, die es nicht gibt.
  it("zählt eine unbestätigte Eintragung nicht als Abo", () => {
    const m = zaehleAbos([{ region_id: ORT, status: "ausstehend", aus_verwaltung: true }]);
    expect(m.get(ORT)!.bestaetigt).toBe(0);
    expect(m.get(ORT)!.mitAngabeVerwaltung).toBe(0);
  });

  // DIE GRENZE DES VERFAHRENS, festgenagelt: gezählt wird die ANGABE, nicht der
  // Arbeitgeber. Eine fehlende Angabe ist kein Ja — deshalb ist die Zahl eine
  // Untergrenze, und deshalb heißt sie im Cockpit „mit Angabe Verwaltung".
  it("wertet eine fehlende Angabe nicht als Ja", () => {
    const m = zaehleAbos([
      { region_id: ORT, status: "bestaetigt" },
      { region_id: ORT, status: "bestaetigt", aus_verwaltung: null },
      { region_id: ORT, status: "bestaetigt", aus_verwaltung: false },
    ]);
    expect(m.get(ORT)!.bestaetigt).toBe(3);
    expect(m.get(ORT)!.mitAngabeVerwaltung).toBe(0);
  });

  it("zählt die über den Brief gekommenen getrennt", () => {
    const m = zaehleAbos([
      { region_id: ORT, status: "bestaetigt", ueber_brief: true },
      { region_id: ORT, status: "bestaetigt", ueber_brief: null },
    ]);
    expect(m.get(ORT)!.ueberBrief).toBe(1);
  });

  it("hält Gemeinden auseinander", () => {
    const m = zaehleAbos([
      { region_id: ORT, status: "bestaetigt" },
      { region_id: "07339009", status: "bestaetigt", aus_verwaltung: true },
    ]);
    expect(m.get(ORT)!.mitAngabeVerwaltung).toBe(0);
    expect(m.get("07339009")!.mitAngabeVerwaltung).toBe(1);
  });
});

describe("Satz für die Cockpit-Zeile", () => {
  // Der Normalfall unter 11.000 Gemeinden ist „nichts" — eine Null in jeder
  // Zeile verdeckt die wenigen echten Funde.
  it("schweigt, wo es nichts gibt", () => {
    expect(aboSatz(undefined)).toBeNull();
    expect(aboSatz(null)).toBeNull();
    expect(aboSatz({ bestaetigt: 0, mitAngabeVerwaltung: 0, ausstehend: 0, ueberBrief: 0 })).toBeNull();
  });

  it("nennt die Verwaltung, weil sie das eigentliche Signal ist", () => {
    expect(aboSatz({ bestaetigt: 3, mitAngabeVerwaltung: 1, ausstehend: 0, ueberBrief: 0 })).toBe(
      "3 Abos, davon 1 mit Angabe Verwaltung",
    );
  });

  // „mit Angabe Verwaltung", nie „aus der Verwaltung": Die Beschriftung darf
  // nur behaupten, was gemessen wurde — jemand hat ein Kästchen angekreuzt.
  it("behauptet nie, jemand ARBEITE dort", () => {
    const satz = aboSatz({ bestaetigt: 2, mitAngabeVerwaltung: 2, ausstehend: 0, ueberBrief: 0 })!;
    expect(satz).toContain("mit Angabe Verwaltung");
    expect(satz).not.toContain("aus der Verwaltung");
  });

  it("schreibt Einzahl und Mehrzahl richtig", () => {
    expect(aboSatz({ bestaetigt: 1, mitAngabeVerwaltung: 0, ausstehend: 0, ueberBrief: 0 })).toBe("1 Abo");
    expect(aboSatz({ bestaetigt: 2, mitAngabeVerwaltung: 0, ausstehend: 0, ueberBrief: 0 })).toBe("2 Abos");
    expect(aboSatz({ bestaetigt: 0, mitAngabeVerwaltung: 0, ausstehend: 1, ueberBrief: 0 })).toBe(
      "1 Eintragung, noch nicht bestätigt",
    );
  });

  it("unterscheidet „noch keiner hat bestätigt\" von „niemand hat abonniert\"", () => {
    expect(aboSatz({ bestaetigt: 0, mitAngabeVerwaltung: 0, ausstehend: 2, ueberBrief: 0 })).toBe(
      "2 Eintragungen, noch nicht bestätigt",
    );
  });
});
