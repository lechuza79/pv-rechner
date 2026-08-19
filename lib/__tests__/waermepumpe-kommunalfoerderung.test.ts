import { describe, it, expect } from "vitest";
import { calcHeatPump, calcBegSubsidy, begKumulierungsSpielraum, type HeatPumpInputs } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG as CFG } from "../heatpump-config";
import {
  FUNDING_PROGRAMS,
  stackFunding,
  schliesstBundesfoerderungAus,
  programmeNebenBundesfoerderung,
  zeilenBisDeckel,
  technikenVon,
} from "../funding-programs";

/**
 * Der kommunale Zuschuss im Wärmepumpen-Rechner.
 *
 * Die Fehlerklasse, gegen die diese Datei steht, ist nicht „falsch gerechnet",
 * sondern „zweimal gerechnet": Die BEG des Bundes wird im Rechner längst
 * abgezogen, bevor der Förderkatalog überhaupt gefragt wird — sie ist kein
 * Katalog-Eintrag. Ein kommunales Programm, das neben ihr steht, muss deshalb
 * an zwei Stellen geprüft werden, die beide leicht zu übersehen sind: Darf es
 * überhaupt daneben stehen, und wieviel hat daneben noch Platz?
 */

const bestand: HeatPumpInputs = {
  situation: "bestand",
  wohnflaeche: 130,
  insulationIdx: 1,
  personen: 3.5,
  heizsystem: "hk_alt",
  wpType: "lwwp",
};

describe("Kumulierungsgrenze der BEG", () => {
  it("bezieht die Grenze auf die geförderten Kosten, nicht auf die volle Rechnung", () => {
    // 45.000-€-Anlage: gefördert werden trotzdem nur begMaxCap. Wer die Grenze
    // auf den Rechnungsbetrag bezöge, räumte hier einen Spielraum ein, den es
    // nicht gibt.
    const teuer = 45000;
    const beg = calcBegSubsidy("bestand", "lwwp", teuer, {}, CFG);
    const spielraum = begKumulierungsSpielraum(beg.amount, teuer, CFG);
    expect(spielraum).toBe(Math.round(CFG.begMaxCap * CFG.begKumulierungsGrenze - beg.amount));
    // Gegenprobe: mit der vollen Rechnung als Basis wäre es deutlich mehr.
    expect(spielraum).toBeLessThan(teuer * CFG.begKumulierungsGrenze - beg.amount);
  });

  it("lässt im Regelfall Platz für einen kommunalen Zuschuss", () => {
    // Grundförderung + Klima-Bonus = 46 % — unter der 60-%-Grenze, also bleibt
    // Luft. Das ist der Fall, den die allermeisten Nutzer sehen.
    const invest = 30000;
    const beg = calcBegSubsidy("bestand", "lwwp", invest, { klimaBonus: true }, CFG);
    expect(beg.rate).toBeLessThan(CFG.begKumulierungsGrenze);
    expect(begKumulierungsSpielraum(beg.amount, invest, CFG)).toBeGreaterThan(600);
  });

  it("lässt beim Höchstfördersatz keinen Platz mehr", () => {
    // Mit Einkommens-Bonus geht der BEG-Satz über 60 % — dann ist der Stapel
    // bereits voll. Der Spielraum darf hier NICHT negativ werden und auch nicht
    // stillschweigend auf einen Restbetrag gerundet.
    const invest = 30000;
    const beg = calcBegSubsidy("bestand", "lwwp", invest, { klimaBonus: true, haushaltseinkommen: 35000 }, CFG);
    expect(beg.rate).toBeGreaterThan(CFG.begKumulierungsGrenze);
    expect(begKumulierungsSpielraum(beg.amount, invest, CFG)).toBe(0);
  });
});

describe("Kommunaler Zuschuss in der Rechnung", () => {
  it("senkt die Investition zusätzlich zur BEG", () => {
    const ohne = calcHeatPump(bestand, CFG);
    const mit = calcHeatPump({ ...bestand, kommunalFoerderung: 600 }, CFG);
    expect(mit.kommunal.angerechnet).toBe(600);
    expect(mit.investNetto).toBe(ohne.investNetto - 600);
    // Die Amortisation ist die Zahl, mit der die Seite wirbt — sie muss sich
    // mitbewegen, sonst wäre der Zuschuss reine Dekoration.
    expect(mit.tcoEinsparung).toBe(ohne.tcoEinsparung + 600);
  });

  it("kappt an der Kumulierungsgrenze, statt über sie hinaus abzuziehen", () => {
    const hoch: HeatPumpInputs = {
      ...bestand,
      kommunalFoerderung: 5000,
      override: { haushaltseinkommen: 35000 },
    };
    const r = calcHeatPump(hoch, CFG);
    expect(r.kommunal.roh).toBe(5000);
    expect(r.kommunal.angerechnet).toBe(r.kommunal.spielraum);
    expect(r.kommunal.angerechnet).toBeLessThan(5000);
    // Was nicht angerechnet wird, darf auch nicht in der Investition landen.
    expect(r.investNetto).toBe(r.investBrutto - r.beg.amount - r.kommunal.angerechnet);
  });

  it("zieht nichts ab, wenn die Investition von Hand gesetzt ist", () => {
    // Ein eingetragener Preis ist der tatsächlich gezahlte — Förderung steckt
    // darin schon. Sie ein zweites Mal abzuziehen wäre der doppelte Abzug.
    const r = calcHeatPump({ ...bestand, kommunalFoerderung: 600, override: { investNetto: 21000 } }, CFG);
    expect(r.investNetto).toBe(21000);
  });

  it("kennt im Neubau keine BEG und damit den vollen Spielraum", () => {
    const r = calcHeatPump({ ...bestand, situation: "neubau", insulationIdx: 0, kommunalFoerderung: 600 }, CFG);
    expect(r.beg.amount).toBe(0);
    expect(r.kommunal.angerechnet).toBe(600);
  });
});

describe("Programme, die eine Bundesförderung ausschließen", () => {
  it("erkennt eine leere Kombinierbarkeitsliste als Ausschluss", () => {
    // Gaiberg schließt KfW, BAFA und Land ausdrücklich aus — im Katalog steht
    // das als leere Liste.
    expect(schliesstBundesfoerderungAus(FUNDING_PROGRAMS["gaiberg-steckersolar"])).toBe(true);
    expect(schliesstBundesfoerderungAus(FUNDING_PROGRAMS["poing-energie"])).toBe(false);
  });

  it("hält sie aus dem Stapel neben der BEG heraus", () => {
    const alle = [FUNDING_PROGRAMS["gaiberg-steckersolar"], FUNDING_PROGRAMS["poing-energie"]];
    const uebrig = programmeNebenBundesfoerderung(alle);
    expect(uebrig.map(p => p.id)).toEqual(["poing-energie"]);
  });
});

describe("Poing — der erste rechenbare kommunale Wärmepumpen-Zuschuss", () => {
  const poing = FUNDING_PROGRAMS["poing-energie"];

  it("rechnet den niedrigsten Satz, weil die Wärmequelle nicht bekannt ist", () => {
    // Richtlinie Abschnitt 5.2.2 (Volltext in docs/quellen/): Grundwasser und
    // Erdwärme 800 €, Luft-Wasser 600 €. Das Modell kennt die Quelle nicht,
    // also gilt der kleinste Satz — eine angenehme Überraschung ist billiger
    // als eine eingeplante Zahl, die nicht kommt.
    // Der Code-Seed trägt bewusst kein Prüfdatum — ohne Datenbank zieht gar
    // nichts ab (siehe fundingBelegAktuell). Geprüft wird hier die Rechenregel,
    // also mit dem Beleg, den die Datenbank im Betrieb liefert.
    const belegt = { ...poing, lastVerified: "2026-08-18", pageSeenAt: "2026-08-19" };
    const { total, applied } = stackFunding([belegt], { technik: "waermepumpe", kosten: 30000 }, "2026-08-19");
    expect(total).toBe(600);
    expect(applied).toHaveLength(1);
  });

  it("nennt beide Sätze sichtbar, rechnet aber nur den kleineren", () => {
    // Wer 800 € bekommt, soll das erfahren — sonst liest sich die 600 als der
    // einzige Satz, den es gibt.
    const zeilen = poing.rates.map(r => `${r.label}: ${r.value}`).join(" · ");
    expect(zeilen).toContain("800 €");
    expect(zeilen).toContain("600 €");
    expect(poing.wpPauschale).toBe(600);
  });

  it("passt im Regelfall neben die BEG", () => {
    const r = calcHeatPump({ ...bestand, kommunalFoerderung: 600 }, CFG);
    expect(r.kommunal.angerechnet).toBe(600);
  });
});

describe("Angezeigte Zeilen und abgezogener Betrag", () => {
  const prog = (id: string) => ({ ...FUNDING_PROGRAMS["poing-energie"], id, name: id });

  it("summieren sich exakt auf den Deckel", () => {
    // DIE Invariante der Karte: Was dasteht, ist auch abgezogen.
    const applied = [
      { program: prog("a") as any, amount: 400 },
      { program: prog("b") as any, amount: 500 },
    ];
    for (const deckel of [0, 150, 400, 401, 899, 900, 5000]) {
      const zeilen = zeilenBisDeckel(applied, deckel);
      const summe = zeilen.reduce((n, z) => n + z.amount, 0);
      expect(summe, `Deckel ${deckel}`).toBe(Math.min(deckel, 900));
      // Keine Nullzeile — sie läse sich wie eine Förderung, die es nicht gibt.
      expect(zeilen.every(z => z.amount > 0), `Deckel ${deckel}`).toBe(true);
    }
  });

  it("zeigt bei aufgebrauchtem Spielraum gar keine Zeile", () => {
    expect(zeilenBisDeckel([{ program: prog("a") as any, amount: 600 }], 0)).toEqual([]);
  });
});

describe("Der Katalog bleibt mit der Wärmepumpen-Rechnung verträglich", () => {
  const alle = Object.values(FUNDING_PROGRAMS);

  it("lässt keinen PV-Prozentsatz in die Wärmepumpen-Rechnung lecken", () => {
    // Roth fördert PV mit 10 % UND nennt die Wärmepumpe — gefördert wird dort
    // aber die Erdwärmequelle, nicht der Tausch. Ein `percentOfCost` darf im
    // Wärmepumpen-Zweig deshalb NICHTS ergeben, sonst verspräche der Rechner
    // 10 % auch dem, der eine Luftwärmepumpe plant.
    const roth = FUNDING_PROGRAMS["roth-klimaschutz"];
    expect(roth.percentOfCost).toBeGreaterThan(0);
    expect(technikenVon(roth)).toContain("waermepumpe");
    const belegt = { ...roth, lastVerified: "2026-08-18", pageSeenAt: "2026-08-19" };
    expect(stackFunding([belegt], { technik: "waermepumpe", kosten: 30000 }, "2026-08-19").total).toBe(0);
  });

  it("hält jedes WP-rechenbare Programm neben der Bundesförderung", () => {
    // Ein WP-Zuschuss mit leerer Kombinierbarkeitsliste würde vom Rechner
    // stillschweigend fallen gelassen — der Nutzer erführe nie davon. Wer so
    // ein Programm aufnimmt, soll hier stolpern und es bewusst entscheiden.
    const rechenbar = alle.filter(p => p.wpPauschale || p.wpPercentOfCost);
    expect(rechenbar.length).toBeGreaterThan(0);
    for (const p of rechenbar) {
      expect(programmeNebenBundesfoerderung([p]).map(x => x.id), p.id).toEqual([p.id]);
    }
  });
});

describe("Stolperfalle für den nächsten Programmtyp", () => {
  it("meldet den ersten PROZENTUALEN Wärmepumpen-Zuschuss", () => {
    // Kein Verbot, sondern ein Wecker. Der Rechner bemisst den kommunalen
    // Zuschuss an der Investition des BASIS-Wegs; bei einer Pauschale ist das
    // gleichgültig, bei einem Prozentsatz nicht mehr — dann muss der Patch des
    // gewählten Sanierungs-Wegs in die Bemessung (Kommentar bei `foerderBasis`
    // in app/(site)/waermepumpe-rechner/waermepumpe.tsx).
    const prozentual = Object.values(FUNDING_PROGRAMS).filter(p => p.wpPercentOfCost);
    expect(
      prozentual.map(p => p.id),
      "Erster prozentualer WP-Zuschuss im Katalog — Bemessungsgrundlage im WP-Rechner nachziehen",
    ).toEqual([]);
  });
});

describe("Geprüfte Bedingungen — Poing", () => {
  const poing = FUNDING_PROGRAMS["poing-energie"];
  const alle = poing.conditions.join(" | ");

  it("behauptet keine Energieberatung für die Wärmepumpe", () => {
    // Am 19.08.2026 im Volltext geprüft: Die Energieberatung verlangt Poing für
    // Dämmung (5.1.6) und Fenster, NICHT für Wärmepumpen (5.2.4). Der Satz stand
    // bis dahin als Bedingung im Katalog und hätte Antragsteller zu einer
    // Leistung geschickt, die die Richtlinie für ihre Maßnahme nicht fordert.
    expect(alle).not.toMatch(/Energieberatung/);
  });

  it("nennt die Bundesförderung als Voraussetzung", () => {
    // Abschnitt 5.2 + 5.2.4: gefördert werden nur Anlagen, die nach BAFA/BEG
    // gefördert werden; nachzuweisen sind Antrag und Auszahlungsbescheid. Das
    // trägt zugleich die Entscheidung, den Zuschuss NEBEN der BEG zu rechnen.
    expect(alle).toMatch(/BAFA/);
    expect(alle).toMatch(/Bundesförderung/);
  });

  it("nennt den Antragszeitpunkt — die Bedingung, deren Verletzung alles kostet", () => {
    expect(alle).toMatch(/vor dem Kauf|vor Beginn|vor Auftrag/);
  });
});

describe("Leere Liste, fehlendes Feld — zwei verschiedene Fragen", () => {
  // Eine Nachbar-Sitzung meldete am 19.08.2026, allen sieben Programmen mit
  // Wärmepumpen-Bezug fehle `combinableWith`, sie bekämen also fälschlich den
  // Ausschluss. Nachgemessen stimmt das nicht: 95 Einträge schreiben
  // `combinableWith: BUND` — eine Referenz auf eine Konstante, die ein Textscan
  // nach `combinableWith: [` nicht sieht. Der Befund war ein Messartefakt.
  // Festgehalten wird er trotzdem, weil die Frage dahinter berechtigt ist.

  it("liest eine ausdrücklich leere Liste als Ausschluss", () => {
    expect(schliesstBundesfoerderungAus({ combinableWith: [] })).toBe(true);
  });

  it("behandelt ein fehlendes Feld ABSICHTLICH wie einen Ausschluss", () => {
    // Bewusst die vorsichtige Richtung, und zwar wegen der Folgen: Ein zu Unrecht
    // weggelassener Zuschuss zeigt kein Geld an — das Programm bleibt sichtbar,
    // nur der Abzug fehlt. Ein zu Unrecht gewährter zieht Geld ab, das niemand
    // bekommt, und landet in Amortisation und Ersparnis. Kein Nachweis heißt
    // deshalb kein Abzug, nicht „wird schon passen".
    expect(schliesstBundesfoerderungAus({ combinableWith: undefined as never })).toBe(true);
  });

  it("stellt sicher, dass der Zweig im Katalog gar nicht erst greift", () => {
    // Solange jedes Programm das Feld trägt, ist die Frage oben theoretisch.
    // Dieser Test hält sie theoretisch.
    const ohneFeld = Object.values(FUNDING_PROGRAMS).filter(p => !Array.isArray(p.combinableWith));
    expect(ohneFeld.map(p => p.id)).toEqual([]);
  });

  it("kennt genau ein Programm, das Bundesmittel ausschließt", () => {
    const ausschluss = Object.values(FUNDING_PROGRAMS).filter(schliesstBundesfoerderungAus);
    expect(ausschluss.map(p => p.id)).toEqual(["gaiberg-steckersolar"]);
  });
});
