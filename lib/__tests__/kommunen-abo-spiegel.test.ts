import { describe, it, expect } from "vitest";
import { zaehleAbos, istVerwaltungsAdresse, aboSatz, domainAus } from "../kommunen-abo-spiegel";

const GEMEINDEN = [
  { region_id: "06535008", website: "https://www.nidda.de", verwaltung_domain: null },
  // Mitverwaltet: eigene Website, Postfach bei der Verbandsgemeinde.
  { region_id: "07339009", website: "https://kirchenpingarten.de", verwaltung_domain: "weidenberg.de" },
  { region_id: "01051024", website: null, verwaltung_domain: null },
];

describe("Domain-Vergleich", () => {
  it("normalisiert beide Seiten gleich", () => {
    expect(domainAus("https://www.nidda.de/rathaus")).toBe("nidda.de");
    expect(domainAus("info@Nidda.DE")).toBe("nidda.de");
    expect(domainAus(null)).toBe("");
  });
});

describe("Verwaltung oder Bürger", () => {
  it("erkennt die eigene Domain der Gemeinde", () => {
    expect(istVerwaltungsAdresse("pressestelle@nidda.de", GEMEINDEN[0])).toBe(true);
  });

  it("erkennt eine Unterdomain — große Verwaltungen trennen ihre Bereiche so", () => {
    expect(istVerwaltungsAdresse("info@rathaus.nidda.de", GEMEINDEN[0])).toBe(true);
  });

  it("erkennt die Domain der mitverwaltenden Gemeinde", () => {
    expect(istVerwaltungsAdresse("vg.poststelle@weidenberg.de", GEMEINDEN[1])).toBe(true);
  });

  it("zählt eine private Adresse als Bürger", () => {
    expect(istVerwaltungsAdresse("max@gmail.com", GEMEINDEN[0])).toBe(false);
  });

  // Die Grenze des Verfahrens, ausdrücklich festgehalten: Wer aus dem Rathaus
  // privat abonniert, ist für uns ein Bürger. Die Zahl ist eine Untergrenze,
  // und wer sie als vollständig liest, liest sie falsch.
  it("kann den Rathaus-Mitarbeiter mit Privatadresse NICHT erkennen", () => {
    expect(istVerwaltungsAdresse("buergermeister.privat@web.de", GEMEINDEN[0])).toBe(false);
  });

  it("sagt bei unbekannter Gemeinde nein statt zu raten", () => {
    expect(istVerwaltungsAdresse("info@nidda.de", undefined)).toBe(false);
  });

  // Eine ähnlich klingende Domain ist keine. „nidda.de.example.com" wäre der
  // Weg, sich als Verwaltung auszugeben.
  it("fällt nicht auf eine Domain herein, die die echte nur enthält", () => {
    expect(istVerwaltungsAdresse("wer@nidda.de.example.com", GEMEINDEN[0])).toBe(false);
    expect(istVerwaltungsAdresse("wer@xnidda.de", GEMEINDEN[0])).toBe(false);
  });
});

describe("Zählung je Gemeinde", () => {
  it("trennt bestätigt, ausstehend und abgemeldet", () => {
    const m = zaehleAbos(
      [
        { region_id: "06535008", email: "a@gmail.com", status: "bestaetigt" },
        { region_id: "06535008", email: "presse@nidda.de", status: "bestaetigt" },
        { region_id: "06535008", email: "b@gmx.de", status: "ausstehend" },
        { region_id: "06535008", email: "c@gmx.de", status: "abgemeldet" },
      ],
      GEMEINDEN,
    );
    const s = m.get("06535008")!;
    expect(s.bestaetigt).toBe(2);
    expect(s.ausVerwaltung).toBe(1);
    expect(s.ausstehend).toBe(1);
  });

  // Eine unbestätigte Eintragung bekommt nie eine Mail. Sie als Abo zu zählen
  // behauptete eine Leserschaft, die es nicht gibt.
  it("zählt eine unbestätigte Eintragung nicht als Verwaltungs-Abo", () => {
    const m = zaehleAbos([{ region_id: "06535008", email: "presse@nidda.de", status: "ausstehend" }], GEMEINDEN);
    expect(m.get("06535008")!.ausVerwaltung).toBe(0);
    expect(m.get("06535008")!.bestaetigt).toBe(0);
  });

  it("zählt die über den Brief gekommenen getrennt", () => {
    const m = zaehleAbos(
      [
        { region_id: "06535008", email: "a@gmail.com", status: "bestaetigt", ueber_brief: true },
        { region_id: "06535008", email: "b@gmail.com", status: "bestaetigt", ueber_brief: null },
      ],
      GEMEINDEN,
    );
    expect(m.get("06535008")!.ueberBrief).toBe(1);
  });
});

describe("Satz für die Cockpit-Zeile", () => {
  // Der Normalfall unter 11.000 Gemeinden ist „nichts" — eine Null in jeder
  // Zeile verdeckt die wenigen echten Funde.
  it("schweigt, wo es nichts gibt", () => {
    expect(aboSatz(undefined)).toBeNull();
    expect(aboSatz({ bestaetigt: 0, ausVerwaltung: 0, ausstehend: 0, ueberBrief: 0 })).toBeNull();
  });

  it("nennt die Verwaltung, weil sie das eigentliche Signal ist", () => {
    expect(aboSatz({ bestaetigt: 3, ausVerwaltung: 1, ausstehend: 0, ueberBrief: 0 })).toBe(
      "3 Abos, davon 1 aus der Verwaltung",
    );
  });

  it("schreibt Einzahl und Mehrzahl richtig", () => {
    expect(aboSatz({ bestaetigt: 1, ausVerwaltung: 0, ausstehend: 0, ueberBrief: 0 })).toBe("1 Abo");
    expect(aboSatz({ bestaetigt: 0, ausVerwaltung: 0, ausstehend: 1, ueberBrief: 0 })).toBe(
      "1 Eintragung, noch nicht bestätigt",
    );
  });

  it("unterscheidet „noch keiner hat bestätigt\" von „niemand hat abonniert\"", () => {
    expect(aboSatz({ bestaetigt: 0, ausVerwaltung: 0, ausstehend: 2, ueberBrief: 0 })).toBe(
      "2 Eintragungen, noch nicht bestätigt",
    );
  });
});
