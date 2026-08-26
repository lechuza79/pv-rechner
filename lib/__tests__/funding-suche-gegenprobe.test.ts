import { describe, it, expect } from "vitest";
import { bewerteLink, istEndergebnis } from "../funding-url-suche";
import { FUNDING_PROGRAMS } from "../funding-programs";

/**
 * Die Gegenprobe, die dem Sucherkenner immer gefehlt hat.
 *
 * `funding-url-suche.test.ts` prüft, was NICHT durchkommen darf — Fördervereine,
 * Kulturförderung, Beförderung, Downloads. Jede seiner Regeln ist aus einem
 * Fehlgriff entstanden, und jede macht den Filter schärfer. Was nirgends geprüft
 * wurde: ob die RICHTIGEN Seiten noch durchkommen.
 *
 * Ein Filter, der nur gegen Fehlalarme geschärft wird, wandert in eine Richtung.
 * Hier ist die andere Richtung, und sie hat eine Ground Truth, die kein Wortspiel
 * ist: die Adressen der Programme, die jemand gelesen und in den Katalog
 * aufgenommen hat. Wenn unsere eigene Suche die eigenen bestätigten Programme
 * nicht findet, findet sie auch keine neuen.
 *
 * ANLASS (25.08.2026): Ein Prüflauf maß, dass rund ein Viertel der bestätigten
 * kommunalen Programme vom Erkenner verworfen wird — selbst wenn eine
 * Suchmaschine sie auf Platz 1 liefert. Gemessener Einzelfall: Balve fördert
 * Balkonkraftwerke mit 100 €, die Seite heißt
 * `/wirtschaft-und-bauen/bauen-und-wohnen/balkonkraftwerke`. Sie fällt durch,
 * weil in der Oberrubrik „wirtschaft" steht und in der Adresse kein Geldwort —
 * eine kleine Gemeinde benennt die Seite nach der SACHE, das Geld steht im Text.
 *
 * Der Test misst eine QUOTE, keine Einzelfälle. Eine Adresse einzeln
 * festzunageln hieße, den Filter auf sie hin zu biegen; die Quote sagt, ob die
 * Richtung stimmt, und sie fällt, sobald jemand die Kanten weiter schärft, ohne
 * die Gegenrichtung mitzumessen.
 */

/** Programme, die eine Gemeinde oder ein Kreis auflegt — der Fall, den die Suche findet. */
const REGIONAL = Object.values(FUNDING_PROGRAMS).filter(
  (p) => p.level !== "bund" && p.level !== "land" && typeof p.url === "string" && p.url.startsWith("http"),
);

/** Wie der Erkenner die Adresse ohne jeden Linktext sieht — der harte Fall. */
function trefferOhneText(url: string): boolean {
  try {
    const u = new URL(url);
    return istEndergebnis(bewerteLink(u.origin + u.pathname));
  } catch {
    return false;
  }
}

describe("Findet unsere Suche die Programme, die wir selbst führen?", () => {
  it("hat überhaupt genug bestätigte Adressen, um etwas zu messen", () => {
    // Ohne diese Zusicherung wäre der Test still grün, wenn die Extraktion
    // eines Tages nichts mehr liefert — der Fehler, gegen den es ihn gibt.
    expect(REGIONAL.length).toBeGreaterThan(60);
  });

  it("erkennt die Mehrheit der bestätigten Adressen allein an der Adresse", () => {
    const erkannt = REGIONAL.filter((p) => trefferOhneText(p.url!));
    const quote = erkannt.length / REGIONAL.length;

    // Die Schranke ist bewusst eine UNTERGRENZE und kein Zielwert: Ohne
    // Linktext ist eine Adresse wie `/pb/232441.html` (Freiburg, echt) nicht zu
    // erkennen, und das ist kein Fehler des Filters, sondern eine Eigenschaft
    // der Website. Von den 20 verbleibenden Fehlschlägen sind rund zwei Drittel
    // von dieser Art — nackte Domains, Zahlen-Adressen, ein Tippfehler auf der
    // Amtsseite selbst (Essen: „solarfoederung").
    //
    // Gemessen am 25.08.2026: 75,2 % vor den drei Korrekturen an Ressort-,
    // Meldungs- und Förderwort-Regel, 81,0 % danach.
    //
    // Was der Test verhindert, ist das Abrutschen: Jede neue Ausschlussregel
    // gegen Fehlalarme kostet hier Prozente, und ohne diese Zahl merkt es
    // niemand. Wer sie senken will, misst vorher, welche Programme dabei
    // herausfallen.
    const verfehlt = REGIONAL.filter((p) => !trefferOhneText(p.url!)).map((p) => `${p.region}: ${p.url}`);
    expect(
      quote,
      `${erkannt.length} von ${REGIONAL.length} erkannt (${(quote * 100).toFixed(1)} %) — verfehlt:\n${verfehlt.join("\n")}`,
    ).toBeGreaterThan(0.78);
  });

  it("der neue schwache Förder-Zweig öffnet die Ressort-Regel nicht", () => {
    // Die Gegenrichtung zur Lockerung. Der blanke Stamm „foerder" (5 Punkte)
    // trifft jede Förderung, auch die der Sportvereine — abgefangen wird das
    // von der Ressort-Regel, und die darf durch die Technikwort-Ausnahme nicht
    // löchrig geworden sein.
    //
    // Geprüft werden nur Adressen OHNE Themenwort, und das ist keine Bequemlichkeit,
    // sondern die Grenze dessen, was dieser Test behaupten darf: `istEndergebnis`
    // stellt ein Themenwort seit jeher ÜBER die Ressort-Regel („ein Themenwort
    // belegt den Energiebezug direkt"). `/jugend/klimafoerderung` und Düsseldorfs
    // `/beratung-und-foerderung/energie/energiesparen-in-sportvereinen` kommen
    // deshalb durch — vorher wie nachher, unabhängig von dieser Änderung. Zwei
    // frühere Fassungen dieses Tests haben genau das als Erwartung aufgeschrieben
    // und damit einen bekannten Mangel als behoben ausgewiesen.
    //
    // Wer den Mangel angeht, ändert die Rangfolge in `istEndergebnis` und misst
    // mit dem Quoten-Test oben, was das an bestätigten Programmen kostet.
    const drausssen = [
      "https://x.de/kultur/foerderbaustein",
      "https://x.de/sport/foerderbereich",
      "https://x.de/vereinsleben/foerdermoeglichkeiten",
    ];
    for (const u of drausssen) {
      expect(istEndergebnis(bewerteLink(u)), u).toBe(false);
    }
  });

  it("Nachrichten bleiben draußen, auch mit Förderwort in der Adresse", () => {
    // Die Meldungs-Ausnahme gilt nur für „Aktuelles" kleiner Verwaltungen.
    // Wer einen Newsroom hat, hat auch einen Ort für Dauerseiten.
    expect(bewerteLink("https://dortmund.de/newsroom/nachrichten/foerderprogramm-solar").punkte).toBe(0);
    expect(bewerteLink("https://x.de/presse/foerderrichtlinie-photovoltaik").punkte).toBe(0);
    expect(bewerteLink("https://x.de/aktuelles/2026/foerderprogramm-pv").punkte).toBe(0);
    // Und die Gegenprobe: die drei bestätigten Programme, für die es sie gibt.
    expect(bewerteLink("https://www.dietmannsried.de/rathaus/aktuelles-bekanntmachungen/foerderprogramm-pv-anlagen.html").punkte).toBeGreaterThan(0);
  });

  it("ein eindeutiges Technikwort überlebt eine fremde Oberrubrik", () => {
    // Der gemessene Fall: Balve. „wirtschaft-und-bauen" ist die Oberrubrik der
    // Verwaltung, nicht das Thema der Seite — und keine Wirtschaftsförderung
    // der Welt hat eine Seite namens „balkonkraftwerke".
    //
    // Die Ressort-Regel bleibt richtig und bleibt bestehen; sie darf nur nicht
    // gegen ein Wort gewinnen, das die Sache eindeutig benennt.
    const balve = "https://www.balve.de/wirtschaft-und-bauen/bauen-und-wohnen/balkonkraftwerke";
    expect(bewerteLink(balve).fremdesRessort).toBe(false);
  });

  it("hält die Ressort-Regel dort, wo sie hingehört", () => {
    // Gegenprobe: Ohne Technikwort trennt sie weiter. Sonst hätten wir die
    // Regel abgeschafft statt sie zu schärfen.
    expect(bewerteLink("https://x.de/kultur/foerderung").fremdesRessort).toBe(true);
    expect(istEndergebnis(bewerteLink("https://x.de/kultur/foerderung"))).toBe(false);
    expect(istEndergebnis(bewerteLink("https://x.de/sport/foerderung"))).toBe(false);
    // Wirtschaftsförderung fällt schon eine Stufe früher: Die Ausschlussliste
    // setzt sie auf null Punkte, ihr Ressort-Merkmal wird gar nicht mehr
    // gebildet. Deshalb hier über das Ergebnis prüfen, nicht über das Merkmal —
    // die erste Fassung dieses Tests verlangte `fremdesRessort` und war rot,
    // obwohl der Filter strenger war als erwartet.
    expect(bewerteLink("https://x.de/wirtschaftsfoerderung/zuschuesse").punkte).toBe(0);
  });
});
