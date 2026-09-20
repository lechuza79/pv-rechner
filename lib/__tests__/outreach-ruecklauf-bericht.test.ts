import { describe, it, expect } from "vitest";
import { ruecklaufBericht, type BerichtBefund } from "../outreach-ruecklauf-bericht";

const b = (art: string, name: string | null, betreff = "Betreff"): BerichtBefund => ({
  art,
  name,
  betreff,
  von: `post@${(name ?? "x").toLowerCase()}.de`,
  datum: "2026-09-09",
});

describe("Rücklauf-Bericht: was den Betreiber erreicht", () => {
  // DER ANLASSFALL. Trier antwortete am 09.09.2026, und niemand erfuhr davon —
  // der Lauf trug den Status nach und schwieg. Eine Antwort ist der einzige
  // Rücklauf, der ohne Zutun verfällt.
  it("eine echte Antwort ist eine Entscheidung und nennt die Gemeinde", () => {
    const r = ruecklaufBericht({ neu: [b("antwort", "Trier", "AW: PLATZ 1")], unklar: 0, tage: 7 });
    expect(r.audience).toBe("betreiber");
    expect(r.decisions).toHaveLength(1);
    expect(r.decisions[0]).toContain("Trier");
    expect(r.decisions[0]).toContain("AW: PLATZ 1");
  });

  // Der Widerspruch ist bereits vollzogen und deshalb gerade meldepflichtig:
  // „gesperrt" ist eine Einbahnstraße, und das hier ist die einzige
  // Gelegenheit, einen Irrtum zu bemerken.
  it("ein Widerspruch ist eine Entscheidung, obwohl er schon vollzogen ist", () => {
    const r = ruecklaufBericht({ neu: [b("widerspruch", "Musterstadt")], unklar: 0, tage: 7 });
    expect(r.decisions).toHaveLength(1);
    expect(r.decisions[0]).toMatch(/gesperrt/i);
    expect(r.audience).toBe("betreiber");
  });

  // DIE WICHTIGERE RICHTUNG: Was keine Entscheidung ist, darf keine Mail
  // auslösen. Vierzehn Urlaubsnotizen an einem Tag sind der Normalfall — als
  // Mail wären sie der Lärm, nach dem niemand mehr hinsieht.
  it("maschinelle Meldungen und Unzustellbarkeiten lösen keine Mail aus", () => {
    const r = ruecklaufBericht({
      neu: [
        b("abwesenheit", "Eichenzell"),
        b("unklar-maschinell", "Tholey"),
        b("unzustellbar", "Hennigsdorf"),
      ],
      unklar: 0,
      tage: 7,
    });
    expect(r.decisions).toEqual([]);
    expect(r.audience).toBe("claude");
    expect(r.done.join(" ")).toContain("Hennigsdorf");
    expect(r.done.join(" ")).toMatch(/2 maschinelle Meldungen/);
  });

  it("ein Lauf ohne Fund meldet den Abruf, nicht Schweigen", () => {
    const r = ruecklaufBericht({ neu: [], unklar: 0, tage: 7 });
    expect(r.decisions).toEqual([]);
    expect(r.done.join(" ")).toMatch(/abgerufen, nichts Neues/);
  });

  // Grammatik ist Teil der Richtigkeit — „1 maschinelle Meldungen" ist derselbe
  // Fehler wie „1 neue Anlagen" im Atlas.
  it("Singular und Plural werden gebaut, nicht geraten", () => {
    const eins = ruecklaufBericht({ neu: [b("abwesenheit", "Zeuthen")], unklar: 1, tage: 7 });
    expect(eins.done.join(" ")).toContain("1 maschinelle Meldung ");
    expect(eins.details).toContain("1 Mail ");
    const zwei = ruecklaufBericht({
      neu: [b("unzustellbar", "A"), b("unzustellbar", "B")],
      unklar: 2,
      tage: 7,
    });
    expect(zwei.done.join(" ")).toContain("2 Adressen");
    expect(zwei.details).toContain("2 Mails");
  });

  // Ein Ortsschlüssel sagt einem Menschen nichts; steht kein Name fest, muss
  // wenigstens der Absender in der Zeile stehen.
  it("ohne Gemeindenamen steht der Absender in der Entscheidung", () => {
    const r = ruecklaufBericht({ neu: [b("antwort", null)], unklar: 0, tage: 7 });
    expect(r.decisions[0]).toContain("@");
  });

  it("nicht zuzuordnende Mails stehen in den Details, nicht in den Entscheidungen", () => {
    const r = ruecklaufBericht({ neu: [], unklar: 3, tage: 14 });
    expect(r.decisions).toEqual([]);
    expect(r.details).toContain("3 Mails");
    expect(r.details).toContain("14 Tage");
  });
});
