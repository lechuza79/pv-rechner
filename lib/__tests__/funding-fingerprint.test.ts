import { describe, it, expect } from "vitest";
import {
  FINGERPRINT_VERSION,
  fingerprintOf,
  markiert,
  unterschiedsGrund,
  vergleichbar,
  wegVon,
} from "../funding-fingerprint";

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

// Am 18.08.2026 bekam `fingerprintOf` den Token-Filter — und der Wächter meldete
// daraufhin für 15 Programme an EINEM Tag „Amtsseite hat sich geändert", weil für
// dieselbe unveränderte Seite ein anderer Abdruck anfiel. Diese Tests halten fest,
// dass eine Änderung UNSERES Verfahrens nie wieder als Änderung der Stadt zählt.
describe("Vergleichbarkeit: unsere Änderung ist nicht ihre", () => {
  it("trägt die Fassung des Verfahrens im Schlüssel", () => {
    expect(markiert("live", "abc")).toBe(`live-v${FINGERPRINT_VERSION}:abc`);
    expect(wegVon(markiert("live", "abc"))).toBe("live");
  });

  it("gleicher Weg und gleiche Fassung sind vergleichbar", () => {
    expect(vergleichbar(markiert("live", "abc"), markiert("live", "xyz"))).toBe(true);
  });

  it("ein Abdruck aus einer anderen Verfahrensfassung ist NICHT vergleichbar", () => {
    const alt = `live-v${FINGERPRINT_VERSION - 1}:abc`;
    expect(vergleichbar(alt, markiert("live", "xyz"))).toBe(false);
    expect(unterschiedsGrund(alt, markiert("live", "xyz"))).toContain("Abdruck-Verfahren");
  });

  it("ein Abdruck ohne Fassungskennung (vor dem 19.08.2026) ist NICHT vergleichbar", () => {
    expect(vergleichbar("live:abc", markiert("live", "xyz"))).toBe(false);
  });

  it("ein gewechselter Abrufweg bleibt unvergleichbar — und wird als solcher benannt", () => {
    expect(vergleichbar(markiert("archiv", "abc"), markiert("live", "abc"))).toBe(false);
    expect(unterschiedsGrund(markiert("archiv", "abc"), markiert("live", "abc"))).toContain("Abrufweg");
  });

  it("ohne vorherigen Abdruck gibt es nichts zu vergleichen", () => {
    expect(vergleichbar(null, markiert("live", "abc"))).toBe(false);
  });
});
