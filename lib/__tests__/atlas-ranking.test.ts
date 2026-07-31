import { describe, it, expect } from "vitest";
import {
  rankingKategorien,
  rankingKategorienGruppiert,
  kategorieBySlug,
  ebeneOf,
  rankingRows,
  rankingTitel,
  RANKING_MIN_POPULATION,
} from "../atlas-ranking";
import { AWARD_CATEGORY_BY_KEY, formatAwardValue, type GemeindeStats } from "../awards";
import { FELD_BY_SLUG } from "../ranking-felder";

const g = (regionId: string, name: string, population: number, balkonCount: number): GemeindeStats => ({
  regionId,
  name,
  bezeichnung: "Gemeinde",
  population,
  privatDachKwp: 0,
  gewerbeDachKwp: 0,
  freiflaecheKwp: 0,
  balkonCount,
  balkonKwp: 0,
  batteriePrivatKwh: 0,
  batterieGewerbeKwh: 0,
  windKwp: 0,
  biomasseKwp: 0,
  wasserKwp: 0,
  solarZubauKwp: 0,
});

const balkon = AWARD_CATEGORY_BY_KEY["balkon-pk"];

describe("rankingKategorien", () => {
  it("lässt die absoluten Bürger-Kategorien draussen", () => {
    // Sie sind gemessen Einwohner-Ranglisten: der Sieger ist jeweils exakt die
    // groesste Kommune (BW, BY, NRW).
    const keys = rankingKategorien().map((k) => k.key);
    for (const k of ["balkon-abs", "dach-privat-abs", "batterie-privat-abs"]) {
      expect(keys).not.toContain(k);
    }
  });

  it("veröffentlicht Pro-Kopf- und Standort-Kategorien", () => {
    const { buerger, standort } = rankingKategorienGruppiert();
    // Drei Bestands-Kategorien je Einwohner, drei Zubau-Zeitraeume und die
    // Speicher-Quote (Batterien je 100 Dachanlagen).
    expect(buerger.length).toBe(7);
    // Keine Buerger-Kategorie ist absolut: Die waere gemessen eine
    // Einwohner-Rangliste. Erlaubt sind Pro-Kopf-Werte und Verhaeltniszahlen.
    for (const k of buerger) expect(["proKopf", "quote"]).toContain(k.messart);
    // Standort-Kategorien sind absolut, aber KEINE Einwohner-Ranglisten:
    // gemessen 0 von 10 Ueberschneidung mit den einwohnerstaerksten Gemeinden.
    expect(standort.length).toBeGreaterThan(0);
    for (const k of standort) expect(k.traeger).not.toBe("buerger");
  });

  it("hat eindeutige, lesbare Adressen", () => {
    const slugs = rankingKategorien().map((k) => k.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("findet die Kategorie über ihre Adresse — und nur diese", () => {
    expect(kategorieBySlug("balkonkraftwerke-je-einwohner")?.key).toBe("balkon-pk");
    expect(kategorieBySlug("gibt-es-nicht")).toBeNull();
    // Absolute Kategorien haben keine Seite.
    expect(rankingKategorien().some((k) => k.key === "balkon-abs")).toBe(false);
  });
});

describe("ebeneOf", () => {
  it("leitet die Vergleichsebene aus dem Gebietsschlüssel ab", () => {
    expect(ebeneOf(null)).toBe("de");
    expect(ebeneOf("09")).toBe("bundesland");
    expect(ebeneOf("09679")).toBe("landkreis");
  });
});

describe("rankingRows", () => {
  const stats = [
    g("09679147", "Höchberg", 10000, 100), // 10,0
    g("09679143", "Hausen", 4000, 152), // 38,0
    g("09679179", "Riedenheim", 3000, 30), // 10,0 — Gleichstand mit Höchberg
    g("09679001", "Winzig", 500, 50), // klein, aber gewertet — 100,0
    g("09679002", "Ohne", 5000, 0), // kein Wert
    g("08111000", "Stuttgart", 600000, 6000), // anderes Bundesland
  ];

  it("sortiert absteigend und vergibt Plätze", () => {
    const rows = rankingRows(stats, balkon, "09679");
    // Winzig ist mit 500 Einwohnern dabei — es gibt keine Einwohner-Untergrenze
    // mehr, die Zahl je Einwohner ist dort genauso wahr wie anderswo.
    expect(rows.map((r) => r.name)).toEqual(["Winzig", "Hausen", "Höchberg", "Riedenheim"]);
    expect(rows[0].platz).toBe(1);
  });

  it("nennt die Einwohnerzahl in jeder Zeile", () => {
    // Ohne Untergrenze ist sie der Kontext, der „48 Einwohner" einordnet.
    const rows = rankingRows(stats, balkon, "09679");
    expect(rows.find((r) => r.name === "Winzig")?.population).toBe(500);
    expect(rows.find((r) => r.name === "Höchberg")?.population).toBe(10000);
  });

  it("gibt Gleichständen denselben Platz und überspringt danach", () => {
    const rows = rankingRows(stats, balkon, "09679");
    const hoechberg = rows.findIndex((r) => r.name === "Höchberg");
    expect(rows[hoechberg].wert).toBeCloseTo(rows[hoechberg + 1].wert, 6);
    expect(rows[hoechberg].platz).toBe(rows[hoechberg + 1].platz);
    expect(rows[hoechberg].platz).toBe(3);
  });

  it("lässt Nullwerte weg — aber keine Kommune wegen ihrer Größe", () => {
    const namen = rankingRows(stats, balkon, "09679").map((r) => r.name);
    expect(namen).not.toContain("Ohne");
    expect(namen).toContain("Winzig");
    // Die Untergrenze lag bei 2.000 und schloss 5.627 von 10.742 Gemeinden aus,
    // um ein paar falsch etikettierte Anlagen zu neutralisieren. Dafuer gibt es
    // jetzt die Groessenpruefung an der Kategorie.
    expect(RANKING_MIN_POPULATION).toBe(0);
  });

  it("wirft Kommunen raus, deren „private“ Anlagen Wohnhausgröße sprengen", () => {
    // Der echte Fall: Dolgesheim, 917 Einwohner, 88 „private" Daecher mit im
    // Schnitt 107 kWp — Gewerbehallen. Die uebliche private Dachanlage liegt bei
    // 9,8 kWp (Median ueber alle 10.725 Gemeinden).
    const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];
    const echt: GemeindeStats = { ...g("09679010", "Echt", 1_000, 0), privatDachKwp: 1_000, privatDachCount: 100 };
    const halle: GemeindeStats = { ...g("09679011", "Halle", 1_000, 0), privatDachKwp: 9_400, privatDachCount: 88 };
    const rows = rankingRows([echt, halle], dach, null);
    expect(rows.map((r) => r.name)).toEqual(["Echt"]);
  });

  it("prüft die Größe nur, wo die Kategorie es verlangt", () => {
    // Freiflaechen DUERFEN gross sein — dort waere die Pruefung Unsinn.
    const ff = AWARD_CATEGORY_BY_KEY["freiflaeche-standort"];
    const park: GemeindeStats = { ...g("09679012", "Park", 700, 0), freiflaecheKwp: 90_000 };
    expect(rankingRows([park], ff, null)).toHaveLength(1);
  });

  it("beschränkt auf das Gebiet — und ohne Gebiet auf alle", () => {
    expect(rankingRows(stats, balkon, "09679").some((r) => r.name === "Stuttgart")).toBe(false);
    expect(rankingRows(stats, balkon, "08").map((r) => r.name)).toEqual(["Stuttgart"]);
    expect(rankingRows(stats, balkon, null).length).toBe(5);
  });

  it("ist bei gleichen Werten reproduzierbar sortiert", () => {
    const a = rankingRows(stats, balkon, "09679").map((r) => r.regionId);
    const b = rankingRows([...stats].reverse(), balkon, "09679").map((r) => r.regionId);
    expect(a).toEqual(b);
  });
});

describe("rankingTitel", () => {
  it("beginnt gross und nennt das Gebiet", () => {
    expect(rankingTitel(balkon, "im Landkreis Würzburg")).toBe(
      "Balkonkraftwerke je 1.000 Einwohner im Landkreis Würzburg",
    );
    expect(rankingTitel(AWARD_CATEGORY_BY_KEY["batterie-privat-pk"], "in Deutschland")).toBe(
      "Private Speicherkapazität je Einwohner in Deutschland",
    );
  });
});

describe("Groessenpruefung statt Einwohner-Untergrenze", () => {
  const wind = AWARD_CATEGORY_BY_KEY["wind-standort"];
  const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];

  it("laesst kleine Orte zu — sie werden nicht mehr wegen ihrer Groesse aussortiert", () => {
    const klein: GemeindeStats = { ...g("09679902", "Winzig", 700, 100), privatDachKwp: 700, privatDachCount: 70 };
    expect(rankingRows([klein], dach, null)).toHaveLength(1);
  });

  it("laesst ein Dorf mit Windpark in der Windrangliste", () => {
    const dorf: GemeindeStats = { ...g("09679900", "Winddorf", 700, 0), windKwp: 90_000 };
    const stadt: GemeindeStats = { ...g("09679901", "Grossstadt", 200_000, 0), windKwp: 1_000 };
    expect(rankingRows([dorf, stadt], wind, null).map((r) => r.name)).toEqual(["Winddorf", "Grossstadt"]);
  });

  it("faengt eine Gewerbe-Batterie, die als privat gemeldet ist", () => {
    // Der Fall Finsing, bisher als Einzelfall im Code gefuehrt: Ein Hausspeicher
    // liegt bei rund 10 kWh, hier waeren es 200.
    const speicher = AWARD_CATEGORY_BY_KEY["batterie-privat-pk"];
    const echt: GemeindeStats = {
      ...g("09679920", "Echt", 2_000, 0),
      batteriePrivatKwh: 1_000,
      batteriePrivatCount: 100,
    };
    const gewerbe: GemeindeStats = {
      ...g("09679921", "Gewerbe", 2_000, 0),
      batteriePrivatKwh: 2_000,
      batteriePrivatCount: 10,
    };
    expect(rankingRows([echt, gewerbe], speicher, null).map((r) => r.name)).toEqual(["Echt"]);
  });

  it("prueft nichts, wo keine Anzahl vorliegt — statt alles auszusortieren", () => {
    // Aeltere Aufrufer setzen die Anzahl nicht. Dann gilt die Zeile als
    // unauffaellig; ein stiller Totalausfall der Rangliste waere schlimmer.
    const ohneAnzahl: GemeindeStats = { ...g("09679930", "Ohne Anzahl", 2_000, 0), privatDachKwp: 500 };
    expect(rankingRows([ohneAnzahl], dach, null)).toHaveLength(1);
  });
});

describe("Rangveraenderung", () => {
  const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];
  // Drei Orte gleicher Groesse: A faellt zurueck, B zieht vorbei, C ist neu.
  const mk = (id: string, heute: number, vorjahr: number): GemeindeStats => ({
    ...g(id, id, 10_000, 0),
    privatDachKwp: heute,
    privatDachKwpLy: vorjahr,
  });

  it("zaehlt die Plaetze, die eine Kommune gutgemacht hat", () => {
    const rows = rankingRows([mk("A", 100, 900), mk("B", 900, 100)], dach, null);
    const a = rows.find((r) => r.name === "A")!;
    const b = rows.find((r) => r.name === "B")!;
    expect(b.platz).toBe(1);
    expect(b.platzVorjahr).toBe(2);
    expect(b.veraenderung).toBe(1); // einen Platz nach vorn
    expect(a.veraenderung).toBe(-1); // einen Platz zurueck
  });

  it("schweigt, wo es Ende letzten Jahres noch nichts gab", () => {
    // Eine Null waere die Aussage "unveraendert" — die haben wir nicht.
    const rows = rankingRows([mk("A", 900, 900), mk("Neu", 500, 0)], dach, null);
    const neu = rows.find((r) => r.name === "Neu")!;
    expect(neu.platzVorjahr).toBeNull();
    expect(neu.veraenderung).toBeNull();
  });

  it("liefert keine Veraenderung, wo die Kategorie keinen Stichtagswert hat", () => {
    const zubau = AWARD_CATEGORY_BY_KEY["zubau"];
    const rows = rankingRows([g("09679147", "X", 10_000, 0)], zubau, null);
    for (const r of rows) expect(r.veraenderung).toBeNull();
  });
});

describe("Zubau-Tempo", () => {
  it("misst je Einwohner zugebaute Leistung, nicht Prozente", () => {
    // Ueber der Mindestgroesse — sonst faellt das Dorf aus der Pro-Kopf-Wertung
    // und der Test misst nur noch, dass die Stadt uebrig bleibt.
    const dorf: GemeindeStats = { ...g("09679900", "Dorf", 3_000, 0), privatDachKwp: 700, privatDachKwpL3: 100 };
    const stadt: GemeindeStats = { ...g("09679901", "Stadt", 100_000, 0), privatDachKwp: 30_000, privatDachKwpL3: 20_000 };
    const rows = rankingRows([dorf, stadt], AWARD_CATEGORY_BY_KEY["tempo-3j"], null);
    // Dorf: 600 kWp auf 3.000 Ew = 200 Wp/Kopf. Stadt: 10.000 auf 100.000 = 100.
    // Relativ haette das Dorf +200 % gegen +50 % — auch dann vorn, aber ein Ort,
    // der bei 1 kWp startet, wuerde jede Prozent-Rangliste gewinnen.
    expect(rows[0].name).toBe("Dorf");
    expect(rows[0].wert).toBeCloseTo(200, 5);
    expect(rows[1].wert).toBeCloseTo(100, 5);
  });

  it("zaehlt NUR private Daecher — ein Solarpark darf kein Dorf kroenen", () => {
    // Der Fehler, der das ausgeloest hat: Das Tempo rechnete mit der GESAMTEN
    // Solarleistung. Theilheim stand damit bei 7.975 Wp je Kopf Zubau, waehrend
    // der Bestands-Erste desselben Kreises bei 1.623 liegt — ein
    // Investorenpark in einer Buerger-Kategorie.
    const parkdorf: GemeindeStats = {
      ...g("09679800", "Parkdorf", 3_000, 0),
      privatDachKwp: 100,
      privatDachKwpL3: 90,
      freiflaecheKwp: 90_000,
      solarKwp: 90_100,
      solarKwpL3: 90,
    };
    const fleissig: GemeindeStats = {
      ...g("09679801", "Fleissig", 3_000, 0),
      privatDachKwp: 700,
      privatDachKwpL3: 100,
      solarKwp: 700,
      solarKwpL3: 100,
    };
    const rows = rankingRows([parkdorf, fleissig], AWARD_CATEGORY_BY_KEY["tempo-3j"], null);
    expect(rows[0].name).toBe("Fleissig");
    expect(rows[0].wert).toBeCloseTo(200, 5);
  });

  it("wird nie negativ, wenn Nachmeldungen den alten Stand anheben", () => {
    const seltsam: GemeindeStats = {
      ...g("09679902", "Nachmeldung", 5_000, 0),
      privatDachKwp: 100,
      privatDachCount: 10,
      privatDachKwpL3: 150,
    };
    const rows = rankingRows([seltsam], AWARD_CATEGORY_BY_KEY["tempo-3j"], null);
    // metric klemmt auf 0 → faellt aus der Wertung, statt einen Minuswert zu zeigen.
    expect(rows).toHaveLength(0);
  });
});

describe("Grundmenge hinter einer Pro-Kopf-Zahl", () => {
  // Wiedenborstel: 10 Einwohner, EIN Balkonkraftwerk — bundesweit Platz 4 mit
  // "100,0 je 1.000 Einwohner". Die Zahl stimmt, die Wirkung nicht. Deshalb
  // steht die Stueckzahl in der Zeile, statt kleine Orte auszuschliessen.
  it("nennt die Stueckzahl, und zwar im richtigen Numerus", () => {
    const rows = rankingRows([g("01051001", "Wiedenborstel", 10, 1), g("01051002", "Ölsen", 80, 6)], balkon, null);
    expect(rows[0].name).toBe("Wiedenborstel");
    expect(rows[0].basis).toBe("1 Balkonkraftwerk");
    expect(rows[1].basis).toBe("6 Balkonkraftwerke");
  });

  it("nennt bei privaten Daechern die Zahl der Anlagen, nicht die Leistung", () => {
    const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];
    const ort = { ...g("07339013", "Testdorf", 100, 0), privatDachKwp: 360, privatDachCount: 36 };
    const rows = rankingRows([ort], dach, null);
    expect(rows[0].basis).toBe("36 private Dachanlagen");
  });

  it("laesst die Grundmenge weg, wo die Kategorie keine kennt", () => {
    const wind = AWARD_CATEGORY_BY_KEY["wind-standort"];
    const rows = rankingRows([{ ...g("01051003", "Windort", 500, 0), windKwp: 9000 }], wind, null);
    expect(rows[0].basis).toBeNull();
  });
});

describe("Rangliste innerhalb einer Größenklasse", () => {
  // Der Grund für die Klassen: Pro Kopf gewinnt sonst immer der kleinste Ort.
  // Gemessen lagen in JEDER Bürger-Kategorie ~alle 100 Spitzenplätze unter
  // 5.000 Einwohnern, beim Zubau die komplette Top 100 unter 1.000.
  const dorf = { ...g("09999001", "Dorf", 100, 20), privatDachKwp: 400, privatDachCount: 40 };
  const stadt = { ...g("09999002", "Stadt", 200_000, 4_000), privatDachKwp: 100_000, privatDachCount: 10_000 };
  const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];

  it("wertet nur Orte der gewählten Klasse", () => {
    const klein = rankingRows([dorf, stadt], dach, null, FELD_BY_SLUG["doerfer"]);
    expect(klein.map((r) => r.name)).toEqual(["Dorf"]);
    const gross = rankingRows([dorf, stadt], dach, null, FELD_BY_SLUG["grossstaedte"]);
    expect(gross.map((r) => r.name)).toEqual(["Stadt"]);
  });

  it("gibt jeder Klasse einen eigenen Platz 1", () => {
    for (const slug of ["doerfer", "grossstaedte"]) {
      const rows = rankingRows([dorf, stadt], dach, null, FELD_BY_SLUG[slug]);
      expect(rows[0].platz).toBe(1);
    }
  });

  it("rankt ohne Klasse weiter über alle — sonst wäre die Gesamtliste weg", () => {
    const alle = rankingRows([dorf, stadt], dach, null);
    expect(alle.map((r) => r.name)).toEqual(["Dorf", "Stadt"]);
  });

  it("rechnet die Rangveränderung gegen dasselbe Teilnehmerfeld", () => {
    // Sonst sähe jeder Ort wie gesprungen aus: Vorjahr bundesweit, heute in der
    // Klasse — das wäre ein Sprung ohne jede Veränderung am Ort.
    const a = { ...g("09999003", "Aufsteiger", 300, 0), privatDachKwp: 600, privatDachCount: 60, privatDachKwpLy: 300 };
    const b = { ...g("09999004", "Halter", 300, 0), privatDachKwp: 300, privatDachCount: 30, privatDachKwpLy: 290 };
    const rows = rankingRows([a, b, stadt], dach, null, FELD_BY_SLUG["doerfer"]);
    expect(rows.map((r) => r.name)).toEqual(["Aufsteiger", "Halter"]);
    // Beide waren auch letztes Jahr schon 1 und 2 in ihrer Klasse.
    expect(rows.every((r) => r.veraenderung === 0)).toBe(true);
  });
});

describe("Speicher-Quote", () => {
  const quote = AWARD_CATEGORY_BY_KEY["speicherquote"];
  const mitDaechern = (daecher: number, batterien: number) => ({
    ...g("09999010", "Testort", 1_200, 0),
    privatDachKwp: daecher * 10,
    privatDachCount: daecher,
    batteriePrivatKwh: batterien * 9,
    batteriePrivatCount: batterien,
  });

  it("rechnet Batterien je 100 Dachanlagen", () => {
    expect(quote.metric(mitDaechern(100, 64))).toBe(64);
    expect(quote.metric(mitDaechern(50, 25))).toBe(50);
  });

  it("erlaubt Werte über 100 und nennt sie nie in Prozent", () => {
    // Osterwald: 113 Batterien auf 71 Dachanlagen. Nachgerüstete Speicher und
    // Batterien an Anlagen, die nicht als privates Dach zählen. „113 %" wäre
    // schlicht falsch — die Beschriftung muss die Bezugsmenge nennen.
    const w = quote.metric(mitDaechern(71, 80)) as number;
    expect(w).toBeGreaterThan(100);
    const text = formatAwardValue(w, quote.format);
    expect(text).toContain("je 100 Dächer");
    expect(text).not.toContain("%");
  });

  it("wertet erst ab 25 Dachanlagen — darunter ist die Quote Zufall", () => {
    // Hergeleitet, nicht gesetzt: Unter 25 Anlagen liegt die Streuung der Quote
    // bei 74 Punkten und 7 % der Orte über 100; ab 25 sind es 55 Punkte und 2 %.
    expect(quote.plausibel!(mitDaechern(24, 12))).toBe(false);
    expect(quote.plausibel!(mitDaechern(25, 12))).toBe(true);
  });

  it("erklärt den Ausschluss mit der Stückzahl, nicht mit der Anlagengröße", () => {
    // Der Standardsatz („Anlagen zu groß für ein Wohnhaus") wäre hier falsch.
    expect(quote.plausibelGrund).toBeTruthy();
    expect(quote.plausibelGrund).toContain("Dachanlagen");
    expect(quote.plausibelGrund).not.toContain("zu groß");
  });

  it("trägt keine Rangveränderung — die Zähler gibt es nur zum heutigen Stand", () => {
    // Eine Veränderung aus zwei verschieden alten Zählern wäre erfunden.
    expect(quote.metricVorjahr).toBeUndefined();
  });
});

describe("Rangveränderung ist abschaltbar", () => {
  // Sie kostet einen ZWEITEN vollständigen Durchlauf über alle Gemeinden. Die
  // Spitzenreiter-Übersicht zeigt sie nicht an und rechnete sie trotzdem —
  // fünfmal je Aufruf, einmal je Größenklasse.
  const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];
  const orte = [
    { ...g("09999020", "Alt", 500, 0), privatDachKwp: 600, privatDachCount: 60, privatDachKwpLy: 300 },
    { ...g("09999021", "Neu", 500, 0), privatDachKwp: 300, privatDachCount: 30, privatDachKwpLy: 290 },
  ];

  it("rechnet sie standardmäßig mit", () => {
    const rows = rankingRows(orte, dach, null);
    expect(rows.some((r) => r.veraenderung !== null)).toBe(true);
  });

  it("lässt sie weg, wenn sie nicht gebraucht wird — bei gleicher Reihenfolge", () => {
    const mit = rankingRows(orte, dach, null);
    const ohne = rankingRows(orte, dach, null, null, false);
    expect(ohne.map((r) => r.name)).toEqual(mit.map((r) => r.name));
    expect(ohne.map((r) => r.platz)).toEqual(mit.map((r) => r.platz));
    expect(ohne.every((r) => r.veraenderung === null && r.platzVorjahr === null)).toBe(true);
  });
});

describe("Zubau-Zeitraum heisst, was er misst", () => {
  // DER FEHLER: "Zubau im letzten vollen Jahr" verglich den heutigen Bestand mit
  // dem Stand Ende des Vorjahres — heute also Januar bis heute, sieben Monate.
  // Am 1. Januar wären es null Tage und die Liste kürte einen zufälligen Ort.
  // Die Zahl war richtig, ihr Name nicht.
  const jetzt = new Date().getFullYear();

  it("nennt das Stichjahr statt einer Zeitspanne", () => {
    for (const [key, zurueck] of [["tempo-1j", 1], ["tempo-3j", 3], ["tempo-5j", 5]] as const) {
      const cat = AWARD_CATEGORY_BY_KEY[key];
      const texte = `${cat.thema} ${cat.themaDativ} ${cat.bestleistung} ${cat.merit} ${cat.betreffPhrase}`;
      expect(texte, `${key} nennt das Stichjahr nicht`).toContain(String(jetzt - zurueck));
      // Keine Spanne mehr behaupten, die nicht gemessen wird.
      expect(texte, `${key} behauptet weiter eine Zeitspanne`).not.toMatch(
        /letzten? (vollen? )?Jahr|drei Jahren?|fünf Jahren?|in \d+ Jahren/,
      );
    }
  });

  it("wächst mit dem Kalender mit — keine Jahreszahl im Code", () => {
    // Sonst steht am 1. Januar überall die falsche Zahl.
    const cat = AWARD_CATEGORY_BY_KEY["tempo-3j"];
    expect(cat.thema).toContain(String(jetzt - 3));
    expect(cat.thema).not.toContain(String(jetzt - 4));
  });
});
