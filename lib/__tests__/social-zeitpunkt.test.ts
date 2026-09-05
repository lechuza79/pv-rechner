import { describe, expect, it } from "vitest";
import {
  STREUUNG_MINUTEN,
  ZIELZEIT_MINUTEN,
  istUhrzeit,
  zeitpunktFuer,
} from "../social-zeitpunkt";

/**
 * Der Sendezeitpunkt.
 *
 * Er ist eine SETZUNG, keine gemessene beste Zeit — die gibt es für den
 * deutschsprachigen Markt nicht, und LinkedIns eigener Beitrag dazu sagt das
 * selbst. Was diese Tests festhalten, ist deshalb nicht „die Zeit stimmt",
 * sondern dass die Ableitung tut, wofür sie gebaut ist: stabil, unrund, im
 * gesetzten Fenster.
 */

const minuten = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const TAGE = Array.from({ length: 400 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 1));
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

describe("Sendezeitpunkt", () => {
  it("liefert für denselben Tag immer dieselbe Zeit", () => {
    // Der eigentliche Grund, warum hier nicht gewürfelt wird: Ein echter
    // Zufallswert wäre bei jedem Seitenaufbau ein anderer, und der Kalender
    // zeigte für denselben Tag mal 10:47 und mal 11:09.
    for (const tag of TAGE.slice(0, 40)) {
      expect(zeitpunktFuer(tag)).toBe(zeitpunktFuer(tag));
    }
  });

  it("bleibt im gesetzten Fenster um die Zielzeit", () => {
    for (const tag of TAGE) {
      const abstand = Math.abs(minuten(zeitpunktFuer(tag)) - ZIELZEIT_MINUTEN);
      // Ein Zeichen Luft: Der Ausweichschritt für glatte Minuten darf den Rand
      // um eine Minute überschreiten.
      expect(abstand, `${tag} → ${zeitpunktFuer(tag)}`).toBeLessThanOrEqual(STREUUNG_MINUTEN + 1);
    }
  });

  it("landet nie auf einer glatten Viertelstunde", () => {
    // Drei Beiträge je Woche, jeder auf die Minute um 11:00 — das ist als
    // Muster erkennbar, und ein Kanal, dem man den Automaten ansieht, wird
    // auch als Automat gelesen.
    for (const tag of TAGE) {
      const m = minuten(zeitpunktFuer(tag)) % 60;
      expect(m % 5, `${tag} → ${zeitpunktFuer(tag)}`).not.toBe(0);
    }
  });

  it("streut wirklich, statt nur unrund auszusehen", () => {
    // Eine Ableitung, die zwar unrunde, aber immer dieselbe Minute liefert,
    // bestünde die Prüfungen darüber und hätte nichts gestreut. Gemessen wird
    // deshalb die Breite: über ein Jahr müssen viele verschiedene Zeiten
    // vorkommen.
    const verschiedene = new Set(TAGE.map(zeitpunktFuer));
    expect(verschiedene.size).toBeGreaterThan(25);
  });

  it("legt aufeinanderfolgende Tage nicht nebeneinander", () => {
    // DER EIGENTLICHE TEST, und er fehlte zuerst. Die erste Ableitung war fast
    // linear im Datum: Für den 1., 3., 4. und 8. September kamen 10:56, 10:58,
    // 10:59 und 11:03 heraus. Jede Prüfung oben war grün — unrund, im Fenster,
    // viele verschiedene Werte — und trotzdem stand da eine Reihe, die man nach
    // drei Beiträgen erkennt. Gemessen wird deshalb der ABSTAND benachbarter
    // Tage: Bei echter Streuung liegt er im Mittel bei rund einem Drittel der
    // Spannweite, bei einer Reihe bei ein bis drei Minuten.
    const werte = TAGE.map((t) => minuten(zeitpunktFuer(t)));
    let summe = 0;
    for (let i = 1; i < werte.length; i++) summe += Math.abs(werte[i] - werte[i - 1]);
    const mittel = summe / (werte.length - 1);
    expect(mittel).toBeGreaterThan(STREUUNG_MINUTEN / 2);
  });

  it("erkennt gültige Uhrzeiten und weist alles andere ab", () => {
    expect(istUhrzeit("11:07")).toBe(true);
    expect(istUhrzeit("00:00")).toBe(true);
    expect(istUhrzeit("23:59")).toBe(true);
    expect(istUhrzeit("24:00")).toBe(false);
    expect(istUhrzeit("11:60")).toBe(false);
    expect(istUhrzeit("9:07")).toBe(false);
    expect(istUhrzeit("elf")).toBe(false);
  });
});
