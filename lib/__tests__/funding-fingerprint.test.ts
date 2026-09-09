import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FINGERPRINT_MIN_TOKEN,
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

// Umfang einer echten Amtsseite. Der Abdruck verweigert sich seit 09.09.2026
// unterhalb von 50 Token, weil ein Abdruck über nichts stabil ist und für immer
// „unverändert" meldete; die Testfälle müssen deshalb tragen wie eine echte
// Seite. Gemessen an fünf Förderseiten: 365 bis 1.164 Token.
const RAHMEN = Array.from({ length: 60 }, (_, i) => `Abschnitt${i} Verwaltung Klimaschutz Foerderung`).join(" ");

const seite = (inhalt: string) =>
  `<html><head><title>Förderung</title></head><body><nav>${RAHMEN}</nav><main>${inhalt}</main></body></html>`;

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

  // Gemessen am 22.08.2026 an acht Amtsseiten: sieben lieferten bei zwei Abrufen
  // im Abstand von Sekunden einen anderen Abdruck. Ursache war NICHT der
  // Buchstabensalat oben, sondern die zweite Bauform desselben Spamschutzes:
  // TYPO3 kodiert die Kontaktadresse als Zeichenverweise und würfelt je Zeichen
  // aus, ob dezimal (`&#105;`) oder hexadezimal (`&#x0069;`). Die dezimale Form
  // fiel längst weg, die hexadezimale hinterließ das Token `x0069` — fünf
  // Zeichen lang und damit ÜBER der Schwelle, die den Salat aussortiert.
  it("dezimal und hexadezimal verschlüsselte E-Mail-Adressen ergeben denselben Abdruck", () => {
    // Beides ist `info@` — dieselbe Adresse, zwei Schreibweisen desselben Aufrufs.
    const dezimal = mitMail("&#105;&#110;&#102;&#111;&#64;");
    const hexadezimal = mitMail("&#x0069;&#x006e;&#x0066;&#x006f;&#x0040;");
    const gemischt = mitMail("&#105;&#x006e;&#102;&#x006f;&#64;");
    expect(fingerprintOf(hexadezimal)).toBe(fingerprintOf(dezimal));
    expect(fingerprintOf(gemischt)).toBe(fingerprintOf(dezimal));
  });

  it("ein hexadezimaler Zeichenverweis hinterlässt kein Token", () => {
    // Die Gegenprobe zum Fehler selbst: Vor dem 22.08.2026 blieb aus `&#x0066;`
    // das Token `x0066` stehen. Wäre es wieder da, unterschiede sich die Seite
    // mit Verweisen von der ohne.
    expect(fingerprintOf(mitMail("&#x0066;&#x006f;&#x006f;"))).toBe(fingerprintOf(mitMail("")));
  });

  it("Skripte und Stile zählen nicht mit", () => {
    const a = seite("<p>Photovoltaik: 250 Euro je kWp.</p><script>var t=Date.now();</script>");
    const b = seite("<p>Photovoltaik: 250 Euro je kWp.</p><script>var t=1234567;</script>");
    expect(fingerprintOf(a)).toBe(fingerprintOf(b));
  });

  // GEMESSEN AM 26.08.2026: herbrechtingen.de lieferte bei acht Abrufen
  // hintereinander drei verschiedene Abdrücke — bei leerem Token-Vergleich in
  // beide Richtungen. Es fehlte kein Wort und kam keines hinzu; die Seite ordnete
  // dieselben Bausteine anders an. Über den ganzen Katalog trugen dadurch 45 von
  // 109 Programmen binnen sechs Tagen eine Änderungsmeldung — auf dem Weg, unter
  // der 14-Tage-Nachprüffrist lautlos aus jeder Rechnung zu fallen.
  it("dieselben Bausteine in anderer Reihenfolge lösen keine Änderung aus", () => {
    const a = seite(
      "<div>Photovoltaik: 250 Euro je kWp, maximal 5.000 €.</div>" +
        "<div>Aktuelles aus dem Rathaus</div><div>Öffnungszeiten Bürgerbüro</div>",
    );
    const b = seite(
      "<div>Öffnungszeiten Bürgerbüro</div><div>Aktuelles aus dem Rathaus</div>" +
        "<div>Photovoltaik: 250 Euro je kWp, maximal 5.000 €.</div>",
    );
    expect(fingerprintOf(b)).toBe(fingerprintOf(a));
  });

  // Die Gegenrichtung derselben Regel, und sie ist der Grund, warum das Sortieren
  // vertretbar ist: Ein Betrag, eine Frist oder ein gestrichenes Programm ändern
  // IMMER den Bestand der Token, nie bloß deren Anordnung.
  it("eine Umsortierung mit geändertem Betrag fällt trotzdem auf", () => {
    const a = seite(
      "<div>Photovoltaik: 250 Euro je kWp, maximal 5.000 €.</div><div>Aktuelles aus dem Rathaus</div>",
    );
    const b = seite(
      "<div>Aktuelles aus dem Rathaus</div><div>Photovoltaik: 150 Euro je kWp, maximal 5.000 €.</div>",
    );
    expect(fingerprintOf(b)).not.toBe(fingerprintOf(a));
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

// ─── Eine Antwort ohne Inhalt ist kein Abdruck ──────────────────────────────
//
// GEMESSEN AM 09.09.2026: Ein leerer Abruf ergab einen völlig gültigen Abdruck
// — den Hash über nichts. Der ist stabil, also meldete der Wächter für eine
// Seite, die er gar nicht lesen konnte, jede Nacht „unverändert". Eine echte
// Änderung hätte er nie gesehen, und aufgefallen wäre es niemandem: Es gab
// keinen Fehler, keinen roten Lauf, nur eine Seite, die für immer bestätigt
// dastand.
//
// Dieselbe Fehlerklasse wie ein gescheiterter Abruf, der grün meldet — nur
// langlebiger, weil bei „unverändert" niemand hinsieht.
describe("Zu wenig Inhalt ergibt keinen Abdruck", () => {
  it("leere Antwort, nackte Hülle und Fehlerseite liefern null", () => {
    expect(fingerprintOf("")).toBeNull();
    expect(fingerprintOf("<html><head><title>x</title></head><body></body></html>")).toBeNull();
    expect(fingerprintOf("<html><body><h1>403</h1><p>Zugriff verweigert</p></body></html>")).toBeNull();
  });

  it("eine echte Seite liefert einen Abdruck", () => {
    expect(fingerprintOf(seite("<p>Balkonkraftwerk: 150 Euro pauschal je Haushalt.</p>"))).toBeTruthy();
  });

  it("die Schwelle liegt weit unter jeder echten Seite", () => {
    // Am 09.09.2026 an fünf Förderseiten gemessen: die dünnste trug 365 Token.
    // Eine Schwelle in dieser Größenordnung würde echte Seiten verwerfen — sie
    // muss deutlich darunter bleiben und trotzdem über einer Fehlerseite (drei
    // Token) liegen.
    expect(FINGERPRINT_MIN_TOKEN).toBeGreaterThan(10);
    expect(FINGERPRINT_MIN_TOKEN).toBeLessThan(200);
  });

  it("kein Aufrufer setzt den Abdruck ungeprüft ein", () => {
    // Die Gegenrichtung, und die wichtigere: Der Rückgabetyp zwingt zwar zur
    // Fallunterscheidung, aber ein `!` oder ein `?? ""` hebelt ihn aus. Beides
    // wäre genau der alte Zustand mit neuem Anstrich.
    const wege = [
      "app/api/funding/fetch/route.ts",
      "scripts/funding-watch.ts",
      "scripts/funding-seiten-watch.ts",
      "scripts/funding-coverage-watch.ts",
    ];
    for (const w of wege) {
      const quelle = readFileSync(resolve(process.cwd(), w), "utf8");
      expect(quelle, `${w}: fingerprintOf(...)! umgeht die Prüfung`).not.toMatch(/fingerprintOf\([^)]*\)\s*!/);
      expect(quelle, `${w}: fingerprintOf(...) ?? "" umgeht die Prüfung`).not.toMatch(/fingerprintOf\([^)]*\)\s*\?\?/);
    }
  });
});
