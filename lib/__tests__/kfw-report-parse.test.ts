import { describe, it, expect } from "vitest";
import { leseReport, kontrolliere, zahl, ANZAHL_SCHWELLE } from "../kfw-report-parse";

/**
 * Der Parser des KfW-Förderreports — geprüft an genau den Bauformen, die ihn
 * beim Bau hereingelegt haben.
 *
 * Der echte Bericht ist ein PDF von 1.230 Seiten und liegt nicht im Repo (er
 * wird für den Einlese-Lauf heruntergeladen). Die Ausschnitte hier sind aus
 * seinem ausgelesenen Text übernommen, Spalte für Spalte — mit den drei
 * Eigenheiten, an denen ein naiver Parser scheitert:
 *
 *   1. Ein zu langer Programmname bricht um, und die ZAHLEN stehen auf der
 *      Zeile dazwischen.
 *   2. Ein Kreis läuft über den Seitenumbruch, und die Folgeseite nennt nur
 *      das Bundesland, nicht den Kreis.
 *   3. Eine unterdrückte Anzahl steht als „*" da — das Volumen aber immer.
 *
 * Und, das ist der Punkt des Ganzen: Ein Parser, der eine Zeile verliert,
 * liefert plausible Zahlen. Nur die Kontrollsumme zeigt es.
 */

/** Kopf einer Bund-Seite („Neuzusagen Inlandsfinanzierung auf Programmebene"). */
function bundSeite(zeilen: string[]): string {
  return [
    "                                                     Neuzusagen Inlandsfinanzierung auf Programmebene",
    "                                                                    1.1.2025 - 31.12.2025",
    "",
    "Geschäftssegment                        Förderschwerpunkt                           Programm                                                            Anzahl 1,2,3)                               Mio. €",
    "",
    ...zeilen,
  ].join("\n");
}

/** Kopf einer Kreis-Seite. `kreis` weglassen = Folgeseite desselben Kreises. */
function kreisSeite(bundesland: string, kreis: string | null, zeilen: string[]): string {
  return [
    "                                                                               Landkreise nach Bundesländern 1)",
    "                                                                                     1.1.2025 - 31.12.2025",
    bundesland,
    ...(kreis ? [` ${kreis}`] : []),
    "    Geschäftssegment                                     Förderschwerpunkt                                                Programm                                         Anzahl 2,3)   Mio. €",
    "",
    ...zeilen,
  ].join("\n");
}

const TITEL = "°Förderreport\nKfW Bankengruppe\n\nStichtag: 31. Dezember 2025\n";

/** Eine Datenzeile in der Programm-Spalte der Kreistabelle. */
function kz(name: string, anzahl: string, mio: string): string {
  return "                                                                                                                          " +
    name.padEnd(53) + anzahl.padStart(6) + mio.padStart(9);
}

/** Dieselbe Zeile, aber mit umgebrochenem Namen — die Zahlen in der Mitte. */
function kzUmbruch(teil1: string, teil2: string, anzahl: string, mio: string): string {
  const pre = "                                                                                                                          ";
  return [
    pre + teil1,
    pre + "".padEnd(53) + anzahl.padStart(6) + mio.padStart(9),
    pre + teil2,
  ].join("\n");
}

function bz(name: string, anzahl: string, mio: string): string {
  return "                                                                                    " +
    name.padEnd(60) + anzahl.padStart(12) + mio.padStart(38);
}

describe("Zahlen aus dem Bericht", () => {
  it("liest deutsche Zahlen, „*" + " als unterdrückt und „-“ als nichts", () => {
    expect(zahl("1.383")).toBe(1383);
    expect(zahl("5.225,8")).toBe(5225.8);
    expect(zahl("0,0")).toBe(0);
    expect(zahl("*")).toBeNull();
    expect(zahl("-")).toBe(0);
  });

  it("wirft bei allem, was keine Zahl ist — ein stilles 0 wäre die teuerste Antwort", () => {
    // Genau das ist beim Bau passiert: Ein Wortfetzen einer umgebrochenen
    // Beschriftung landete in der Zahlenspalte. Als 0 gelesen hätte er
    // ausgesehen wie „in diesem Kreis wurde nichts gefördert".
    expect(() => zahl("sade")).toThrow();
    expect(() => zahl("")).toThrow();
  });
});

describe("Umgebrochene Programmnamen", () => {
  const text = [
    TITEL,
    bundSeite([
      bz("BEG WG - Heizungsförderung Priv. - Zuschuss", "375.475", "5.225,8"),
      "",
      bz("KNN Wohngebäude", "1.529", "827,0"),
    ]),
    kreisSeite("Baden-Württemberg", "Alb-Donau-Kreis", [
      kzUmbruch("BEG WG - Heizungsförderung Priv. -", "Zuschuss", "1.383", "18,5"),
      kz("KNN Wohngebäude", "10", "1,6"),
    ]),
  ].join("\f");

  const daten = leseReport(text);

  it("setzt den Namen um die Zahlenzeile herum wieder zusammen", () => {
    const z = daten.kreise.find((k) => k.programm === "BEG WG - Heizungsförderung Priv. - Zuschuss");
    expect(z).toBeDefined();
    expect(z!.anzahl).toBe(1383);
    expect(z!.volumenMio).toBe(18.5);
  });

  it("verschmilzt das Ende eines Namens NICHT mit dem Anfang des nächsten", () => {
    // Der teuerste Fehler des Bauens: Die Fortsetzungszeile („Zuschuss") wurde
    // ein zweites Mal gelesen — als Anfang der nächsten Zeile. Ergebnis war ein
    // Programm namens „Zuschuss KNN Wohngebäude", dessen Volumen in der Summe
    // seines echten Programms fehlte. 459 von 9.179 Zeilen betroffen, und von
    // außen war nichts zu sehen.
    const namen = daten.kreise.map((k) => k.programm);
    expect(namen).toContain("KNN Wohngebäude");
    expect(namen.some((n) => n.startsWith("Zuschuss "))).toBe(false);
  });
});

describe("Kreis über den Seitenumbruch", () => {
  const text = [
    TITEL,
    bundSeite([bz("BEG WG - Heizungsförderung Priv. - Zuschuss", "100", "10,0")]),
    kreisSeite("Bayern", "Landkreis Rosenheim", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "60", "6,0")]),
    // Folgeseite: nur das Bundesland, kein Kreisname.
    kreisSeite("Bayern", null, [kz("KNN Wohngebäude", "40", "4,0")]),
  ].join("\f");

  it("führt den Kreisnamen weiter, statt die zweite Hälfte niemandem zuzuordnen", () => {
    const daten = leseReport(text);
    expect(daten.kreise).toHaveLength(2);
    expect(new Set(daten.kreise.map((k) => k.kreis))).toEqual(new Set(["Landkreis Rosenheim"]));
  });
});

describe("Unterdrückte Anzahlen", () => {
  const text = [
    TITEL,
    bundSeite([bz("BEG WG - Heizungsförderung Priv. - Zuschuss", "100", "10,0")]),
    kreisSeite("Hessen", "Wetteraukreis", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "*", "0,4")]),
  ].join("\f");

  it("werden als „unbekannt“ übernommen — das Volumen bleibt", () => {
    const z = leseReport(text).kreise[0];
    expect(z.anzahl).toBeNull();
    expect(z.volumenMio).toBe(0.4);
  });

  it("die Schwelle steht bei zehn — sie ist die Angabe der KfW, nicht unsere Wahl", () => {
    expect(ANZAHL_SCHWELLE).toBe(10);
  });
});

describe("Die Kontrollsumme", () => {
  const vollstaendig = [
    TITEL,
    bundSeite([bz("BEG WG - Heizungsförderung Priv. - Zuschuss", "1.000", "100,0")]),
    kreisSeite("Bayern", "Landkreis Rosenheim", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "600", "60,0")]),
    kreisSeite("Hessen", "Wetteraukreis", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "400", "40,0")]),
  ].join("\f");

  it("geht auf, wenn nichts fehlt", () => {
    const k = kontrolliere(leseReport(vollstaendig), ["BEG WG - Heizungsförderung Priv. - Zuschuss"])[0];
    expect(k.bestanden).toBe(true);
    expect(k.abweichungMio).toBe(0);
    expect(k.kreise).toBe(2);
  });

  it("schlägt an, wenn eine Kreiszeile fehlt — DAS ist ihr ganzer Zweck", () => {
    const luecke = [
      TITEL,
      bundSeite([bz("BEG WG - Heizungsförderung Priv. - Zuschuss", "1.000", "100,0")]),
      kreisSeite("Bayern", "Landkreis Rosenheim", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "600", "60,0")]),
    ].join("\f");
    const k = kontrolliere(leseReport(luecke), ["BEG WG - Heizungsförderung Priv. - Zuschuss"])[0];
    expect(k.bestanden).toBe(false);
    expect(k.grund).toMatch(/Volumensumme weicht/);
  });

  it("schlägt an, wenn die sichtbaren Anzahlen den Bundeswert übersteigen", () => {
    const zuviel = [
      TITEL,
      bundSeite([bz("BEG WG - Heizungsförderung Priv. - Zuschuss", "500", "100,0")]),
      kreisSeite("Bayern", "Landkreis Rosenheim", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "600", "60,0")]),
      kreisSeite("Hessen", "Wetteraukreis", [kz("BEG WG - Heizungsförderung Priv. - Zuschuss", "400", "40,0")]),
    ].join("\f");
    const k = kontrolliere(leseReport(zuviel), ["BEG WG - Heizungsförderung Priv. - Zuschuss"])[0];
    expect(k.bestanden).toBe(false);
    expect(k.grund).toMatch(/übersteigt den Bundeswert/);
  });

  it("meldet ein Programm, das es in der Bundestabelle gar nicht gibt", () => {
    const k = kontrolliere(leseReport(vollstaendig), ["Erfundenes Programm"])[0];
    expect(k.bestanden).toBe(false);
    expect(k.grund).toMatch(/nicht in der Bundestabelle/);
  });
});

describe("Stichtag", () => {
  it("kommt aus der Titelseite, nicht aus der Uhr", () => {
    const daten = leseReport(
      [TITEL, bundSeite([bz("X", "1", "1,0")]), kreisSeite("Bayern", "Landkreis Rosenheim", [kz("X", "1", "1,0")])].join("\f"),
    );
    expect(daten.stichtagIso).toBe("2025-12-31");
    expect(daten.jahr).toBe(2025);
  });
});
