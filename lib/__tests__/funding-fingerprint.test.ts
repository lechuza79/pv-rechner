import { describe, it, expect } from "vitest";
import { fingerprintOf, markiert, wegVon } from "../funding-fingerprint";

// Der Fingerabdruck ist das einzige Signal des Seiten-Wächters. Er muss zwei
// Dinge gleichzeitig können, und beide sind gegeneinander gerichtet:
//
//   empfindlich genug — jede Änderung an Beträgen, Fristen und Wortlaut fällt auf
//   stumpf genug     — Spamschutz-Buchstabensalat und Uhrzeiten lösen nichts aus
//
// Gemessen am 17.08.2026: wuerzburg.de verwürfelt seine Kontaktadresse bei jedem
// Aufruf. Ein zeichengenauer Abdruck meldete dort täglich eine Änderung — und
// unter der 14-Tage-Regel wäre das Programm dauerhaft aus der Rechnung gefallen.

const seite = (inhalt: string) =>
  `<html><head><title>Förderung</title></head><body><main>${inhalt}</main></body></html>`;

describe("Der Fingerabdruck erkennt, was zählt", () => {
  const basis = seite("<p>Photovoltaik: 250 Euro je kWp, maximal 5.000 €. Antrag bis 30. September.</p>");

  it("derselbe Inhalt ergibt denselben Abdruck", () => {
    expect(fingerprintOf(basis)).toBe(fingerprintOf(basis));
  });

  it("ein geänderter Fördersatz fällt auf", () => {
    const neu = seite("<p>Photovoltaik: 150 Euro je kWp, maximal 5.000 €. Antrag bis 30. September.</p>");
    expect(fingerprintOf(neu)).not.toBe(fingerprintOf(basis));
  });

  it("ein geänderter Höchstbetrag fällt auf", () => {
    const neu = seite("<p>Photovoltaik: 250 Euro je kWp, maximal 4.000 €. Antrag bis 30. September.</p>");
    expect(fingerprintOf(neu)).not.toBe(fingerprintOf(basis));
  });

  it("eine geänderte Frist fällt auf", () => {
    const neu = seite("<p>Photovoltaik: 250 Euro je kWp, maximal 5.000 €. Antrag bis 30. November.</p>");
    expect(fingerprintOf(neu)).not.toBe(fingerprintOf(basis));
  });

  it("ein neuer Satz — etwa 'Mittel ausgeschöpft' — fällt auf", () => {
    const neu = seite("<p>Photovoltaik: 250 Euro je kWp, maximal 5.000 €. Antrag bis 30. September.</p><p>Die Mittel sind ausgeschöpft.</p>");
    expect(fingerprintOf(neu)).not.toBe(fingerprintOf(basis));
  });

  it("ein ausgetauschtes Fachwort fällt auf", () => {
    const neu = seite("<p>Solarstromspeicher: 250 Euro je kWp, maximal 5.000 €. Antrag bis 30. September.</p>");
    expect(fingerprintOf(neu)).not.toBe(fingerprintOf(basis));
  });
});

describe("Der Fingerabdruck ignoriert, was nur rauscht", () => {
  const mitMail = (salat: string) =>
    seite(`<p>Photovoltaik: 250 Euro je kWp.</p><p>Kontakt: ${salat}</p>`);

  it("verwürfelte E-Mail-Adressen lösen keine Änderung aus", () => {
    // Genau das Muster von wuerzburg.de, bei zwei Aufrufen unterschiedlich.
    expect(fingerprintOf(mitMail("i rder a t w e z g e"))).toBe(fingerprintOf(mitMail("l m e a t e u .")));
  });

  it("Skripte und Stile zählen nicht mit", () => {
    const a = seite("<p>Photovoltaik: 250 Euro je kWp.</p><script>var t=Date.now();</script>");
    const b = seite("<p>Photovoltaik: 250 Euro je kWp.</p><script>var t=1234567;</script>");
    expect(fingerprintOf(a)).toBe(fingerprintOf(b));
  });

  it("Uhrzeiten werden BEWUSST nicht ausgefiltert — Fristen wiegen schwerer", () => {
    // Abwägung, festgehalten statt stillschweigend getroffen: Eine Uhrzeit
    // (09:14) und ein kurzes Datum (14.06.) sind mit einem Muster nicht zu
    // unterscheiden. Filterte man beides weg, bliebe eine verschobene
    // Antragsfrist unbemerkt — und das ist der teurere Fehler. Eine wechselnde
    // Uhrzeit auf einer Förderseite ist selten; sie kostet dann höchstens einen
    // überflüssigen Eintrag im Arbeitsvorrat.
    const a = seite("<p>Antrag bis 14.06. möglich.</p>");
    const b = seite("<p>Antrag bis 30.06. möglich.</p>");
    expect(fingerprintOf(a)).not.toBe(fingerprintOf(b));
  });
});

describe("Herkunft am Abdruck", () => {
  it("wird angehängt und wieder ausgelesen", () => {
    expect(wegVon(markiert("archiv", "abc"))).toBe("archiv");
    expect(wegVon(markiert("live", "abc"))).toBe("live");
  });

  it("unbekannte oder fehlende Herkunft ergibt null, statt 'live' zu raten", () => {
    expect(wegVon(null)).toBeNull();
    expect(wegVon("abc")).toBeNull();
  });
});
