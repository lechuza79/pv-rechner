import { describe, expect, it } from "vitest";
import { feedInRatesForCommissioning } from "../feedin-config";
import { FEED_IN_ARCHIV, FEED_IN_ARCHIV_START, feedInArchivRates } from "../feedin-archiv";
import { FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES } from "../feedin-history";

/**
 * Realitäts-Anker für die historische Einspeisevergütung 04/2012–07/2022.
 *
 * Jede Zelle unten wurde am 04.08.2026 VON HAND in der jeweiligen
 * BNetzA-Originaldatei nachgesehen (docs/quellen/bnetza-archiv/, Block
 * "Feste Einspeisevergütung" bzw. für 2012–2014 die Vergütungstabelle selbst).
 * Werte bis 2016 stehen dort ungerundet — gespeichert ist die kaufmännisch auf
 * zwei Stellen gerundete Form. Wer die Tabelle neu erzeugt, muss diese Zellen
 * wieder treffen; "plausibel machen" gilt nicht (Wächter-Gate Regel 7).
 */
const HANDGEPRUEFT: Array<{ ym: string; u10: number; u40: number; datei: string }> = [
  { ym: "2012-04", u10: 19.5, u40: 18.5, datei: "Degressions-_und_Vergütungssätze_April_2012_bis_Juli_2014.xls (r7)" },
  { ym: "2014-07", u10: 12.88, u40: 12.22, datei: "…April_2012_bis_Juli_2014.xls (r94: 12,8821… / 12,2215…)" },
  { ym: "2014-08", u10: 12.75, u40: 12.4, datei: "DegressionsVergSaetze_08_2014-09_2014.xls (EV-Block r18)" },
  { ym: "2016-01", u10: 12.31, u40: 11.97, datei: "DegressionsVergSaetze_Jan-Mrz2016.xls (r128: 12,3108… / 11,9729…)" },
  { ym: "2017-01", u10: 12.3, u40: 11.96, datei: "AnzulegendeWertePV_Jan17.xls (r14)" },
  { ym: "2019-05", u10: 10.95, u40: 10.65, datei: "DegressionsVergSaetze_05-07_19.xlsx (EV-Block r42)" },
  { ym: "2021-02", u10: 8.04, u40: 7.81, datei: "DegressionsVergSaetze_02-04_21.xlsx (EV-Block r26)" },
  { ym: "2022-07", u10: 6.24, u40: 6.06, datei: "DegressionsVergSaetze_05bis0722.xlsx (EV-Block r88)" },
];

describe("Historische Einspeisevergütung 2012–2022 (Monats-Archiv)", () => {
  it.each(HANDGEPRUEFT)(
    "$ym trifft die amtliche Zelle ($datei)",
    ({ ym, u10, u40 }) => {
      const row = FEED_IN_ARCHIV.find((r) => r.ym === ym);
      expect(row).toBeDefined();
      expect(row!.u10).toBe(u10);
      expect(row!.u40).toBe(u40);
    },
  );

  it("ist lückenlos von 04/2012 bis 07/2022 (124 Monate)", () => {
    expect(FEED_IN_ARCHIV[0].ym).toBe(FEED_IN_ARCHIV_START);
    expect(FEED_IN_ARCHIV[FEED_IN_ARCHIV.length - 1].ym).toBe("2022-07");
    expect(FEED_IN_ARCHIV).toHaveLength(124);
    for (let i = 1; i < FEED_IN_ARCHIV.length; i++) {
      const [py, pm] = FEED_IN_ARCHIV[i - 1].ym.split("-").map(Number);
      const [y, m] = FEED_IN_ARCHIV[i].ym.split("-").map(Number);
      expect(y * 12 + m).toBe(py * 12 + pm + 1); // exakt ein Monat Abstand
    }
  });

  it("Klassen-Ordnung: bis 10 kWp liegt nie unter bis 40 kWp", () => {
    for (const r of FEED_IN_ARCHIV) {
      expect(r.u10).toBeGreaterThanOrEqual(r.u40);
    }
  });

  it("fällt monoton — einzige Ausnahme ist der EEG-2014-Systemwechsel (08/2014, nur ≤40 kWp)", () => {
    for (let i = 1; i < FEED_IN_ARCHIV.length; i++) {
      const prev = FEED_IN_ARCHIV[i - 1];
      const cur = FEED_IN_ARCHIV[i];
      expect(cur.u10).toBeLessThanOrEqual(prev.u10);
      if (cur.ym === "2014-08") {
        // EEG 2014 hob die ≤40-kWp-Klasse leicht an (12,22 → 12,40) — echter
        // Systemwechsel, in beiden Amtsdateien so veröffentlicht.
        expect(cur.u40).toBe(12.4);
      } else {
        expect(cur.u40).toBeLessThanOrEqual(prev.u40);
      }
    }
  });

  it("Fenstergrenzen: vor 04/2012 nichts, ab 30.07.2022 übernimmt die EEG-2023-Kette", () => {
    expect(feedInArchivRates("2012-03-31")).toBeNull();
    expect(feedInArchivRates("2012-04-01")!.teilUnder10).toBe(19.5);
    expect(feedInArchivRates("2022-07-29")!.teilUnder10).toBe(6.24);
    expect(feedInArchivRates("2022-07-30")).toBeNull();
  });

  it("vor dem EEG 2023 gibt es keinen getrennten Volleinspeisungs-Satz — beide Felder identisch", () => {
    const r = feedInArchivRates("2019-05-15")!;
    expect(r.vollUnder10).toBe(r.teilUnder10);
    expect(r.vollOver10).toBe(r.teilOver10);
  });

  it("feedInRatesForCommissioning reicht das Archiv durch und bleibt davor null", () => {
    expect(feedInRatesForCommissioning("2015-06-15")!.teilUnder10).toBe(
      FEED_IN_ARCHIV.find((r) => r.ym === "2015-06")!.u10,
    );
    expect(feedInRatesForCommissioning("2010-01-01")).toBeNull();
    // Die EEG-2023-Kette bleibt unangetastet.
    expect(feedInRatesForCommissioning("2023-06-15")!.teilUnder10).toBe(8.2);
  });

  it("Kohärenz: die Jahres-Reihe der Zubau-Story trägt exakt die Januar-Werte dieses Archivs", () => {
    // Eine Größe, zwei Oberflächen (Chart-Jahresreihe vs. Rechner-Monatstabelle)
    // — dieser Test verhindert, dass sie je auseinanderlaufen. Die Jahres-Reihe
    // ist als Jahresanfangs-Repräsentant der ≤10-kWp-Klasse dokumentiert.
    for (let jahr = 2013; jahr <= 2022; jahr++) {
      const jahresWert = FEEDIN_HISTORY_VALUES[FEEDIN_HISTORY_YEARS.indexOf(jahr)];
      const januar = FEED_IN_ARCHIV.find((r) => r.ym === `${jahr}-01`)!;
      expect(jahresWert).toBe(januar.u10);
    }
  });

  it("Kohärenz: auch die Jahrgänge ab 2023 tragen den Januar-Wert, nicht den Februar-Wert", () => {
    // Die Lücke, durch die ein Fehler drei Jahre lang gefallen ist: Der Test
    // darüber endet 2022, weil das Monatsarchiv dort endet — und genau ab 2023
    // begann die Reihe, die Februar-Werte zu führen, obwohl ihre eigene Metrik
    // „Wert zu Jahresbeginn" sagt. Sichtbar war das auf der Datenstand-Seite und
    // im Zubau-Chart; auffallen konnte es niemandem, weil beide Werte plausibel
    // aussehen und nur eine Degressionsstufe auseinanderliegen.
    //
    // Ab 2023 gibt es kein Monatsarchiv mehr, wohl aber die gesetzliche Kette —
    // gegen die wird hier gerechnet. Dass 2023 und 2024 denselben Wert tragen,
    // ist richtig: Die Degression setzte erst zum 01.02.2024 wieder ein.
    for (const jahr of FEEDIN_HISTORY_YEARS.filter((j) => j >= 2023)) {
      const jahresWert = FEEDIN_HISTORY_VALUES[FEEDIN_HISTORY_YEARS.indexOf(jahr)];
      const ausKette = feedInRatesForCommissioning(`${jahr}-01-15`);
      expect(ausKette, `kein Satz für Januar ${jahr}`).not.toBeNull();
      expect(jahresWert, `Jahresreihe ${jahr} weicht vom Januar-Satz ab`).toBe(
        ausKette!.teilUnder10,
      );
    }
  });
});
