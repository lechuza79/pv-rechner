import { describe, it, expect } from "vitest";
import {
  decodeEntities,
  toText,
  domainOf,
  findImpressumUrl,
  extractVerantwortlich,
  extractAdressen,
  extractThemen,
  VERSORGER_VOKABULAR,
} from "../kommunen-profil";

// Die Testfälle sind KEINE erfundenen Beispiele: es sind die echten Fehler und
// Treffer aus dem Messlauf über ~90 Gemeinden in BW/BY am 27.07.2026. Jeder
// „falsch"-Test steht für einen Fehler, den die naive Fassung wirklich gemacht
// hat — ein falscher Ansprechpartner im Anschreiben ist teurer als gar keiner.

const GEMEINDE_DOMAINS = new Set(["vg-tittling.de", "unterneukirchen.de", "engen.de", "hoechberg.de"]);
const istGemeindeDomain = (d: string) => GEMEINDE_DOMAINS.has(d);

describe("Text-Aufbereitung", () => {
  it("löst Entities auf, bevor Tags entfernt werden (Spamschutz-Falle)", () => {
    // Sasbachwalden lieferte „athaus@…", weil das r als &#114; kodiert war und
    // erst nach dem Tag-Entfernen aufgelöst wurde.
    const html = "<p>E-Mail: &#114;athaus@sasbachwalden.de</p>";
    expect(toText(html)).toContain("rathaus@sasbachwalden.de");
  });

  it("erhält Zeilenumbrüche an Blockgrenzen", () => {
    expect(toText("<div>Erste</div><div>Zweite</div>")).toMatch(/Erste\s*\n\s*Zweite/);
  });

  it("decodeEntities beherrscht benannte und numerische Formen", () => {
    expect(decodeEntities("Stra&szlig;e &#38; Weg &#x26; Platz")).toBe("Straße & Weg & Platz");
  });

  it("stürzt an einer unsinnigen Entity nicht ab", () => {
    // Echter Abbruch am 27.07.2026: eine bayerische Seite enthielt &#3627867934;
    // — String.fromCodePoint wirft dabei, und der Lauf starb nach 75 von 2.056
    // Gemeinden. Ein kaputtes Zeichen darf nie einen ganzen Lauf mitreißen.
    expect(() => decodeEntities("Text &#3627867934; weiter")).not.toThrow();
    expect(decodeEntities("Text &#3627867934; weiter")).toBe("Text &#3627867934; weiter");
    expect(decodeEntities("&#xFFFFFFFF;")).toBe("&#xFFFFFFFF;");
  });

  it("domainOf normalisiert www und Protokoll", () => {
    expect(domainOf("https://www.Engen.de/")).toBe("engen.de");
    expect(domainOf("engen.de")).toBe("engen.de");
    expect(domainOf("kein url")).toBeNull();
  });
});

describe("Impressum finden", () => {
  it("nimmt den Link aus dem Seitenfuß, auch relativ", () => {
    const html = `<footer><a href="/impressum/">Impressum</a></footer>`;
    expect(findImpressumUrl(html, "https://www.engen.de")).toBe("https://www.engen.de/impressum/");
  });

  it("erkennt ihn auch, wenn nur die Adresse passt", () => {
    const html = `<a href="/service/impressum.php">Rechtliches</a>`;
    expect(findImpressumUrl(html, "https://www.engen.de")).toContain("impressum.php");
  });
});

describe("Verantwortliche", () => {
  it("redaktionelle Angabe schlägt die gesetzliche Vertretung", () => {
    const t = "Vertreten durch Bürgermeister Max Muster\nRedaktionell verantwortlich Andreas Fenzl, Marktplatz 10";
    const v = extractVerantwortlich(t);
    expect(v?.art).toBe("redaktionell");
  });

  it("erkennt eine operative Stelle als solche", () => {
    const v = extractVerantwortlich("Verantwortlich für den Inhalt: Referentin für Öffentlichkeitsarbeit, Frau Eber");
    expect(v?.operativ).toBe(true);
    expect(v?.funktion).toMatch(/Referentin|Öffentlichkeitsarbeit/i);
  });

  it("markiert den Bürgermeister NICHT als operativ", () => {
    // Kern der Erkenntnis: die gesetzliche Vertretung sagt nichts darüber, wer
    // die Website pflegt. Wer das verwechselt, schreibt die falsche Person an.
    const v = extractVerantwortlich("Inhaltlich verantwortlich nach § 18 Abs. 2 MStV: Bürgermeister Robert Bosch");
    expect(v?.operativ).toBe(false);
    expect(v?.funktion).toMatch(/Bürgermeister/i);
  });

  it("liefert null, wenn niemand benannt ist", () => {
    expect(extractVerantwortlich("Die Gemeinde ist eine Körperschaft des öffentlichen Rechts.")).toBeNull();
  });
});

describe("Adressen", () => {
  it("nimmt nur Adressen auf eigener Domain", () => {
    // Aschaffenburg lieferte info@advantic.de (Website-Agentur), Östringen
    // deutschland@readspeaker.com (Vorlese-Dienst) — beide sind nicht die Gemeinde.
    const t = "Kontakt: rathaus@engen.de. Realisierung: info@advantic.de, deutschland@readspeaker.com";
    const a = extractAdressen(t, "engen.de", istGemeindeDomain);
    expect(a.rollenEmail).toBe("rathaus@engen.de");
    expect(a.verwaltungDomain).toBeNull();
  });

  it("erkennt die fremde Gemeinde-Domain als gemeinsame Verwaltung", () => {
    // Witzmannsberg: die redaktionell verantwortliche Person sitzt bei der VG.
    const t = "Redaktionell verantwortlich Andreas Fenzl, E-Mail: fenzl@vg-tittling.de";
    const a = extractAdressen(t, "witzmannsberg.de", istGemeindeDomain);
    expect(a.verwaltungDomain).toBe("vg-tittling.de");
    expect(a.rollenEmail).toBeNull();
  });

  it("bevorzugt das Rollen-Postfach vor der Personen-Adresse", () => {
    const t = "poststelle@mainleus.de und robert.bosch@mainleus.de";
    const a = extractAdressen(t, "mainleus.de", istGemeindeDomain);
    expect(a.rollenEmail).toBe("poststelle@mainleus.de");
    expect(a.personenEmail).toBe("robert.bosch@mainleus.de");
  });

  it("überspringt Datenschutz- und noreply-Postfächer", () => {
    const a = extractAdressen("datenschutz@engen.de noreply@engen.de", "engen.de", istGemeindeDomain);
    expect(a.rollenEmail).toBeNull();
    expect(a.personenEmail).toBeNull();
  });
});

// Verschleierte Adressen waren eine von drei Ursachen der Kontaktlücke — 7.448
// Gemeinden mit Website, aber ohne erfasstes Postfach (gemessen 01.09.2026).
describe("Verschleierte Adressen", () => {
  it("liest die Sonderzeichen-Schreibweise, die real vorkam", () => {
    // Hürth schrieb „rathaus⚹huerth◦de" statt rathaus@huerth.de.
    const a = extractAdressen("Schreiben Sie an rathaus⚹huerth◦de", "huerth.de", istGemeindeDomain);
    expect(a.rollenEmail).toBe("rathaus@huerth.de");
  });

  it("liest die ausgeschriebene Form mit und ohne Klammern", () => {
    expect(extractAdressen("info (at) engen (dot) de", "engen.de", istGemeindeDomain).rollenEmail).toBe(
      "info@engen.de",
    );
    expect(extractAdressen("info [at] engen [punkt] de", "engen.de", istGemeindeDomain).rollenEmail).toBe(
      "info@engen.de",
    );
    expect(extractAdressen("rathaus at engen dot de", "engen.de", istGemeindeDomain).rollenEmail).toBe(
      "rathaus@engen.de",
    );
  });

  it("liest das als Entity kodierte @", () => {
    const a = extractAdressen("info&#64;engen.de", "engen.de", istGemeindeDomain);
    expect(a.rollenEmail).toBe("info@engen.de");
  });

  // DIE WICHTIGERE RICHTUNG: nichts erfinden. Eine geratene Adresse geht in den
  // Versand und kommt als Unzustellbarkeit zurück — schlimmer als keine.
  it("erfindet keine Adresse aus gewöhnlichem Text", () => {
    const t = "Das Rathaus ist Montag bis Freitag geöffnet. Die Sprechzeiten stehen unten.";
    const a = extractAdressen(t, "engen.de", istGemeindeDomain);
    expect(a.rollenEmail).toBeNull();
    expect(a.personenEmail).toBeNull();
  });

  it("zerlegt keinen Bindestrich-Namen", () => {
    // Der Bindestrich steht bewusst NICHT in der Ersetzungsliste: er kommt in
    // echten Adressen und Ortsnamen vor.
    const a = extractAdressen("info@bad-krozingen.de", "bad-krozingen.de", istGemeindeDomain);
    expect(a.rollenEmail).toBe("info@bad-krozingen.de");
  });

  it("macht aus einem gewöhnlichen „at\" im Fließtext keine Adresse", () => {
    const a = extractAdressen("Der Automat at der Ecke", "engen.de", istGemeindeDomain);
    expect(a.rollenEmail).toBeNull();
    expect(a.personenEmail).toBeNull();
  });
});

describe("Vokabular austauschbar (Versorger-Modul)", () => {
  it("erkennt Unternehmenskommunikation als operative Stelle", () => {
    const v = extractVerantwortlich(
      "Verantwortlich für den Inhalt: Leiterin Unternehmenskommunikation, Frau Muster",
      VERSORGER_VOKABULAR,
    );
    expect(v?.operativ).toBe(true);
    expect(v?.funktion).toMatch(/Unternehmenskommunikation/i);
  });

  it("markiert die Geschäftsführung NICHT als operativ", () => {
    // Dieselbe Falle wie der Bürgermeister bei den Kommunen: die gesetzliche
    // Vertretung steht im Impressum, pflegt aber die Website nicht.
    const v = extractVerantwortlich("Vertreten durch die Geschäftsführerin Dr. Anna Beispiel", VERSORGER_VOKABULAR);
    expect(v?.operativ).toBe(false);
    expect(v?.funktion).toMatch(/Geschäftsführerin/i);
  });

  it("nimmt Bewerbungs-Postfächer nicht als Kontakt", () => {
    const a = extractAdressen("bewerbung@stadtwerke-x.de presse@stadtwerke-x.de", "stadtwerke-x.de", () => false, VERSORGER_VOKABULAR);
    expect(a.rollenEmail).toBe("presse@stadtwerke-x.de");
  });

  it("findet Versorger-Themen mit eigener Priorität", () => {
    const html = `<nav>
      <a href="/waermepumpe">Wärmepumpe</a>
      <a href="/balkonkraftwerk">Balkonkraftwerk</a>
      <a href="/mieterstrom">Mieterstrom</a>
    </nav>`;
    const t = extractThemen(html, "https://stadtwerke-x.de", VERSORGER_VOKABULAR);
    expect(t.map((x) => x.thema)).toEqual(["solar", "waermepumpe", "buergerbeteiligung"]);
  });

  it("dieselben Regeln gelten weiter — fremde Domain bleibt draußen", () => {
    // Die drei Fehlerregeln hängen am Modul, nicht am Vokabular.
    const a = extractAdressen("info@agentur-xy.de", "stadtwerke-x.de", () => false, VERSORGER_VOKABULAR);
    expect(a.rollenEmail).toBeNull();
    expect(a.verwaltungDomain).toBeNull();
  });
});

describe("Themen-Aufhänger", () => {
  const html = `
    <nav>
      <a href="/rathaus/klimaschutz/">Klimaschutz</a>
      <a href="/buerger/solarkataster">Solarkataster</a>
      <a href="/mitteilungsblatt">Mitteilungsblatt</a>
      <a href="/kontakt">Kontakt</a>
    </nav>`;

  it("findet Themen samt Ziel-Adresse", () => {
    const t = extractThemen(html, "https://www.engen.de");
    expect(t.map((x) => x.thema)).toEqual(["solar", "klima", "blatt"]);
    expect(t.find((x) => x.thema === "solar")?.url).toBe("https://www.engen.de/buerger/solarkataster");
  });

  it("sortiert nach Aufhänger-Stärke: Solar vor Klima vor Blatt", () => {
    expect(extractThemen(html, "https://www.engen.de")[0].thema).toBe("solar");
  });

  it("liefert nichts, wenn die Navigation keine Themen führt", () => {
    expect(extractThemen(`<a href="/kontakt">Kontakt</a>`, "https://x.de")).toEqual([]);
  });
});
