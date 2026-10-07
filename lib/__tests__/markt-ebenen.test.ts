/**
 * Was ein Besucher LIEST, kommt aus dem Markt.
 *
 * Die Fehlerklasse ist von außen unsichtbar und erst am Tag des Livegangs
 * sichtbar: Eine Schweizer Landesseite sagt „26 Bundesländer", ein Kanton steht
 * im Suchtreffer als „Bundesland". Kein Typfehler, kein roter Test, kein
 * kaputtes Aussehen — nur eine falsche Auskunft über ein ganzes Land. Deshalb
 * prüft dieser Wächter beide Hälften: die Regel selbst UND dass die Stellen,
 * die beschriften, den Regionsschlüssel wirklich mitgeben.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ebenenName, ebenenWort, marktVonSchluessel } from "../markt-ebenen";
import { childNoun } from "../atlas-orte";
import { CH_EBENEN_NAMEN } from "../ch-register";

const lies = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("Der Markt steht im Schlüssel", () => {
  it("erkennt beide Märkte an ihren Schlüsseln", () => {
    expect(marktVonSchluessel("")).toBe("de"); // der Bund trägt den leeren String
    expect(marktVonSchluessel("09")).toBe("de");
    expect(marktVonSchluessel("09663000")).toBe("de");
    expect(marktVonSchluessel("ch")).toBe("ch");
    expect(marktVonSchluessel("chk01")).toBe("ch");
    expect(marktVonSchluessel("chg0261")).toBe("ch");
  });

  it("ohne Schlüssel gilt Deutschland — der Bestand bleibt unverändert", () => {
    expect(marktVonSchluessel(undefined)).toBe("de");
    expect(marktVonSchluessel(null)).toBe("de");
  });
});

describe("Die Beschriftung folgt dem Markt", () => {
  it("Deutschland bleibt bei seinen Wörtern", () => {
    expect(ebenenName("bundesland", "09")).toBe("Bundesland");
    expect(ebenenName("landkreis", "09162")).toBe("Landkreis");
    expect(ebenenWort("bundesland", "", 16)).toBe("Bundesländer");
    expect(ebenenWort("landkreis", "09", 12)).toBe("Kreise");
    expect(ebenenWort("landkreis", "09", 1)).toBe("Kreis");
  });

  it("die Schweiz liest Kanton und Bezirk", () => {
    expect(ebenenName("bundesland", "chk01")).toBe("Kanton");
    expect(ebenenName("landkreis", "chb0112")).toBe("Bezirk");
    expect(ebenenWort("bundesland", "ch", 26)).toBe("Kantone");
    expect(ebenenWort("landkreis", "chk01", 12)).toBe("Bezirke");
    expect(ebenenWort("bundesland", "ch", 1)).toBe("Kanton");
  });

  it("nennt kein deutsches Wort auf einem Schweizer Schlüssel", () => {
    for (const ebene of ["de", "bundesland", "landkreis", "gemeinde"]) {
      for (const anzahl of [1, 7]) {
        const wort = `${ebenenName(ebene, "chk01")} ${ebenenWort(ebene, "chk01", anzahl)}`;
        expect(wort).not.toMatch(/Bundesland|Bundesländer|Landkreis|Kreise?\b|Deutschland/);
      }
    }
  });

  it("die Schweizer Wörter kommen aus den Registerregeln, nicht aus einer zweiten Liste", () => {
    // Zwei Fassungen desselben Wortes driften beim ersten Umformulieren
    // auseinander, und beide sehen für sich richtig aus.
    expect(ebenenName("bundesland", "ch")).toBe(CH_EBENEN_NAMEN.bundesland);
    expect(ebenenName("landkreis", "ch")).toBe(CH_EBENEN_NAMEN.landkreis);
    expect(ebenenName("de", "ch")).toBe(CH_EBENEN_NAMEN.de);
  });

  it("eine unbekannte Ebene behauptet keine Gliederung", () => {
    expect(ebenenName("quartier", "09")).toBe("Region");
  });
});

describe("Das Gattungswort der Atlas-Seite trägt den Markt", () => {
  it("childNoun ohne Schlüssel bleibt deutsch (der Bestand ruft so)", () => {
    expect(childNoun("bundesland", 16)).toBe("Bundesländer");
    expect(childNoun("landkreis", 1)).toBe("Kreis");
    expect(childNoun("gemeinde", 0)).toBe("Gemeinden");
  });

  it("mit Schweizer Schlüssel heißt es Kanton", () => {
    expect(childNoun("bundesland", 26, "ch")).toBe("Kantone");
    expect(childNoun("landkreis", 12, "chk01")).toBe("Bezirke");
  });

  it("JEDE Aufrufstelle der Atlas-Seite gibt den Regionsschlüssel mit", () => {
    // Der Schlüssel ist optional, damit der Bestand unverändert bleibt. Genau
    // deshalb muss ein Test festhalten, dass die Seite ihn mitgibt: Ein
    // vergessener Parameter ist dort kein Typfehler, sondern ein deutsches Wort
    // auf einer Schweizer Seite.
    const seite = lies("app/(site)/solar-atlas/[[...pfad]]/page.tsx");
    const aufrufe = [...seite.matchAll(/childNoun\(([^)]*)\)/g)].map((m) => m[1]);
    expect(aufrufe.length).toBeGreaterThan(0);
    for (const argumente of aufrufe) expect(argumente).toContain("region.region_id");
  });
});

describe("Keine zweite Liste deutscher Ebenen-Wörter", () => {
  it("die Suchtreffer beschriften über den Markt, nicht über eine eigene Liste", () => {
    const atlas = lies("lib/atlas.ts");
    expect(atlas).toContain("ebenenName(r.level");
    // Die frühere Liste hieß LEVEL_FALLBACK und kannte nur deutsche Wörter.
    expect(atlas).not.toContain("LEVEL_FALLBACK");
  });

  it("die Ranglisten-Seite tippt ihr Gattungswort nicht selbst", () => {
    const seite = lies("app/(site)/solar-atlas/ranking/[[...pfad]]/page.tsx");
    expect(seite).toContain("ebenenName(");
    expect(seite).not.toMatch(/kindWort\s*=\s*[^;]*"Bundesland"/);
  });
});
