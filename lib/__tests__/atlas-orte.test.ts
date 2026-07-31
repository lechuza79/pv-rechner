import { describe, it, expect } from "vitest";
import { ortPhrase, childNoun, istKreisfrei, istStadtstaat } from "../atlas-orte";

describe("ortPhrase", () => {
  it("setzt die Präposition nach dem Namen, nicht nach der Bezeichnung", () => {
    expect(ortPhrase({ name: "Landkreis Würzburg" })).toBe("im Landkreis Würzburg");
    expect(ortPhrase({ name: "Kreis Borken" })).toBe("im Kreis Borken");
    expect(ortPhrase({ name: "Stuttgart" })).toBe("in Stuttgart");
    expect(ortPhrase({ name: "Bayern", level: "bundesland" })).toBe("in Bayern");
    expect(ortPhrase({ name: "Deutschland", level: "de" })).toBe("in Deutschland");
  });

  it("trifft die drei Kreise, an denen die Ableitung aus der Bezeichnung scheiterte", () => {
    // Alle drei tragen eine Bezeichnung, die nicht zu ihrem Namen passt.
    expect(ortPhrase({ name: "Region Hannover" })).toBe("in der Region Hannover");
    expect(ortPhrase({ name: "Städteregion Aachen" })).toBe("in der Städteregion Aachen");
    expect(ortPhrase({ name: "Regionalverband Saarbrücken" })).toBe("im Regionalverband Saarbrücken");
  });

  it("kennt das einzige Bundesland mit Artikel", () => {
    expect(ortPhrase({ name: "Saarland", level: "bundesland" })).toBe("im Saarland");
    // Gegenprobe: die übrigen fünfzehn stehen artikellos.
    for (const land of [
      "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg",
      "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen",
      "Rheinland-Pfalz", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
    ]) {
      expect(ortPhrase({ name: land, level: "bundesland" })).toBe(`in ${land}`);
    }
  });

  it("baut nie „im <Stadtname>“ — der Fehler, der als „Top Kommunen im Stuttgart“ sichtbar wurde", () => {
    for (const stadt of ["Stuttgart", "München", "Berlin", "Hamburg", "Amberg", "Baden-Baden", "Eisenach"]) {
      expect(ortPhrase({ name: stadt })).toBe(`in ${stadt}`);
    }
  });
});

describe("childNoun", () => {
  it("beugt den Numerus mit — „1 Kreise“ ist derselbe Fehler in Worten", () => {
    expect(childNoun("landkreis", 1)).toBe("Kreis");
    expect(childNoun("landkreis", 12)).toBe("Kreise");
    expect(childNoun("gemeinde", 1)).toBe("Gemeinde");
    expect(childNoun("gemeinde", 0)).toBe("Gemeinden");
    expect(childNoun("bundesland", 1)).toBe("Bundesland");
    expect(childNoun("bundesland", 16)).toBe("Bundesländer");
  });
});

describe("istKreisfrei", () => {
  it("erkennt die Stadt, die ihr eigener Landkreis ist", () => {
    expect(istKreisfrei("08111000", { region_id: "08111", name: "Stuttgart" }, "Stuttgart")).toBe(true);
  });

  it("hält eine Gemeinde im Landkreis auseinander", () => {
    expect(istKreisfrei("09679147", { region_id: "09679", name: "Landkreis Würzburg" }, "Höchberg")).toBe(false);
  });

  it("verlangt beides — gleicher Schlüssel UND gleicher Name", () => {
    // Namensgleichheit allein reicht nicht: Die Stadt Rostock (13003) und der
    // Landkreis Rostock (13072) tragen denselben Namen, sind aber verschiedene
    // Kreise — hier darf der Schlüssel die Erkennung stoppen.
    expect(istKreisfrei("13072015", { region_id: "13003", name: "Rostock" }, "Rostock")).toBe(false);
    // Und umgekehrt: gleicher Schlüssel, anderer Name.
    expect(istKreisfrei("09679147", { region_id: "09679", name: "Landkreis Würzburg" }, "Höchberg")).toBe(false);
  });

  it("erzeugt an den echten Daten keine Fehlalarme", () => {
    // Gegen mastr_regions gemessen (28.07.2026): 106 Gemeinden tragen den Namen
    // ihres eigenen Kreises — und ALLE 106 sind amtlich kreisfreie Stadt oder
    // Stadtkreis. Es gibt also keine namensgleiche Gemeinde innerhalb eines
    // Landkreises, an der die Erkennung danebengreifen könnte.
    expect(istKreisfrei("05315000", { region_id: "05315", name: "Köln" }, "Köln")).toBe(true);
  });
});

describe("istStadtstaat", () => {
  it("erkennt Berlin und Hamburg — dort ist auch das Bundesland die Region selbst", () => {
    expect(istStadtstaat("11000000")).toBe(true);
    expect(istStadtstaat("02000000")).toBe(true);
    expect(istStadtstaat("11000")).toBe(true);
    expect(istStadtstaat("02000")).toBe(true);
  });

  it("zählt Bremen NICHT dazu — Bremerhaven ist ein echter zweiter Kreis", () => {
    expect(istStadtstaat("04011000")).toBe(false);
    expect(istStadtstaat("04012000")).toBe(false);
  });

  it("lässt kreisfreie Städte in Flächenländern in Ruhe", () => {
    expect(istStadtstaat("08111000")).toBe(false); // Stuttgart
    expect(istStadtstaat("09162000")).toBe(false); // München
    expect(istStadtstaat("05315000")).toBe(false); // Köln
  });
});
