import { describe, it, expect } from "vitest";
import {
  erzeugtEigeneDaten,
  inhaltstext,
  juengsterBeitragTage,
  kernfrageBehandelt,
  meldungsbetrieb,
  ueberschrift,
  istBeitrag,
  urteile,
  verkauftDasProdukt,
  verweistAufFremdenRechner,
  zitiertFremdeQuelle,
  type Befund,
} from "../presse-eignung";

/**
 * DIE GEGENPROBE, DIE JEDE REGELÄNDERUNG PASSIEREN MUSS.
 *
 * Der Betreiber am 05.09.2026: „woher kommen ständig diese fehlzuordnungen, wie
 * können wir die vermeiden?" Die Antwort steht hier, nicht in einem besseren
 * Muster: Jeder Fehlgriff dieser Erhebung hatte dieselbe Form — geprüft wurde
 * ein Wort, das mit der Sache KORRELIERT, statt der Sache selbst. Und jeder
 * fiel erst auf, als ein Mensch das Ergebnis las, weil die einzelne Zeile immer
 * plausibel aussieht.
 *
 * Was das abstellt, ist eine feste Liste bekannter Fälle mit erwartetem
 * Ergebnis. Sie wächst um jeden neuen Fehlgriff und macht den Lauf rot, bevor
 * er über vierhundert Medien geht — statt danach.
 *
 * JEDER FALL HIER IST EINMAL WIRKLICH FALSCH GELAUFEN.
 */

const HEUTE = new Date("2026-09-05T12:00:00Z");

function beurteile(seiten: { url: string; html: string; start?: boolean }[]): string {
  const beste = new Map<string, Befund>();
  const merke = (b: Befund) => {
    if (b.antwort === "unklar") return;
    const k = b.frage.split(" ")[0];
    if (beste.get(k)?.antwort === "ja") return;
    beste.set(k, b);
  };
  for (const s of seiten) {
    const text = inhaltstext(s.html);
    merke(kernfrageBehandelt(text));
    merke(verweistAufFremdenRechner(s));
    merke(zitiertFremdeQuelle(text));
    merke(meldungsbetrieb(text, HEUTE, s.html, !!s.start));
    merke(erzeugtEigeneDaten(text));
    merke(verkauftDasProdukt(s));
  }
  return urteile([...beste.values()], true).eignung;
}

describe("Fehlgriffe, die einmal wirklich passiert sind", () => {
  it("hält eine Abo-Werbung nicht für einen Warenverkauf", () => {
    // CORRECTIV, electrive und Haufe landeten im Vertriebs-Topf, weil das
    // Muster „Angebot anfordern" enthielt — das steht in jeder Abo-Werbung.
    const seite = {
      url: "https://correctiv.org/thema/",
      start: true,
      html: `<h1>Recherche zur kommunalen Förderung</h1>
        <p>Laut einer Auswertung des Umweltbundesamts steigt der Zuschuss.</p>
        <p>Von Anna Beispiel, 2. September 2026</p>
        <a href="/abo">Angebot anfordern</a>`,
    };
    expect(verkauftDasProdukt(seite).antwort).not.toBe("ja");
    expect(beurteile([seite])).toBe("vorgemerkt");
  });

  it("hält einen Buchshop nicht für einen Solarhändler", () => {
    // Zweiter Anlauf desselben Falls: „Warenkorb" allein traf CORRECTIVs
    // Buchshop. Gefragt ist, wer UNSER Produkt verkauft.
    const buch = {
      url: "https://correctiv.org/shop/",
      html: `<p>Unser Buch zur Recherche. In den Warenkorb. Artikelnummer 4711.</p>`,
    };
    expect(verkauftDasProdukt(buch).antwort).not.toBe("ja");
    const solar = {
      url: "https://beispiel-shop.de/",
      html: `<p>Balkonkraftwerk 800 W, sofort lieferbar. In den Warenkorb.</p>`,
    };
    expect(verkauftDasProdukt(solar).antwort).toBe("ja");
  });

  it("erklärt ein Medium nicht anhand einer alten Artikelseite für eingestellt", () => {
    // faz.net, iwr.de, haustec.de und haus.de wurden so für tot erklärt — mit
    // Werten bis 3.978 Tage. Ihre Startseite lag hinter einer
    // Zustimmungsabfrage, das Urteil fiel auf einem alten Artikel.
    const alterArtikel = {
      url: "https://beispiel.de/2019/alt",
      html: `<p>Photovoltaik lohnt sich. 3. Januar 2019</p>`,
    };
    expect(meldungsbetrieb(inhaltstext(alterArtikel.html), HEUTE, alterArtikel.html, false).antwort).toBe(
      "unklar",
    );
    expect(meldungsbetrieb(inhaltstext(alterArtikel.html), HEUTE, alterArtikel.html, true).antwort).toBe(
      "nein",
    );
  });

  it("liest ein abgekürztes Monatsdatum", () => {
    // pv magazine schreibt „28. Aug. 2026" auf seine Startseite und galt ohne
    // die Kurzform als eingestellt — das aktivste Fachmagazin des Bestands.
    expect(juengsterBeitragTage("Meldung vom 28. Aug. 2026", HEUTE)).toBe(8);
    expect(juengsterBeitragTage("Meldung vom 1. September 2026", HEUTE)).toBe(4);
    expect(juengsterBeitragTage('<time datetime="2026-09-03">', HEUTE, '<time datetime="2026-09-03">')).toBe(2);
  });

  it("nimmt keinen Menüpunkt als Beleg", () => {
    // Als Beleg dafür, dass Finanztip die Wärmepumpen-Frage behandelt, stand
    // die Menüleiste da. Ein Menü listet auf JEDER Seite alle Themen.
    const html = `<nav>Heizkosten sparen Wärmepumpe lohnt sich Solarthermie</nav>
      <main><p>Über Geldanlage.</p></main>`;
    expect(kernfrageBehandelt(inhaltstext(html)).antwort).not.toBe("ja");
  });

  it("gibt kein Vorgemerkt ohne einen inhaltlichen Treffer", () => {
    // agora-energiewende kam mit „läuft" plus „nennt Autoren" durch — zwei
    // Treffer, von denen keiner etwas über das Thema sagt.
    const html = `<h1>Jahresbericht</h1><p>Von Max Beispiel, 3. September 2026</p>`;
    expect(beurteile([{ url: "https://beispiel.de/", start: true, html }])).toBe("angesehen");
  });

  it("lässt einen Rechenansatz den Verbands-Ausschluss schlagen", () => {
    // Betreiber-Regel: „wenn wir irgendwo einen ansatz zur wirtschaftlichkeit
    // finden, dann die auch. der ansatz ist das ausschlaggebende."
    const nurZahlen = `<h1>Marktdaten</h1><p>Mitglied werden im Verband.</p>
      <p>Der Zubau steigt. 3. September 2026</p>`;
    expect(beurteile([{ url: "https://verband.de/", start: true, html: nurZahlen }])).toBe("ungeeignet");

    const mitAnsatz = `<h1>Wärmepumpe</h1><p>Mitglied werden im Verband.</p>
      <p>Ob sich eine Wärmepumpe rechnet, hängt vom Gebäude ab. 3. September 2026</p>
      <p>Von Anna Beispiel</p>`;
    expect(beurteile([{ url: "https://institut.de/", start: true, html: mitAnsatz }])).toBe("vorgemerkt");
  });

  it("erkennt den Verweis auf einen fremden Rechner", () => {
    // Der stärkste Treffer und der Anlass für den ganzen Umbau: Finanztip
    // empfiehlt den Solarrechner der HTW Berlin.
    const seite = {
      url: "https://www.finanztip.de/photovoltaik/",
      html: `<p>Praxistipp: Nutze den <a href="https://solar.htw-berlin.de/rechner/">Solarrechner der HTW Berlin</a>.</p>`,
    };
    expect(verweistAufFremdenRechner(seite).antwort).toBe("ja");
    // Der EIGENE Rechner darf das nicht auslösen.
    const eigen = {
      url: "https://beispiel.de/ratgeber",
      html: `<p><a href="https://beispiel.de/solarrechner">Unser Solarrechner</a></p>`,
    };
    expect(verweistAufFremdenRechner(eigen).antwort).not.toBe("ja");
  });

  it("nimmt die Überschrift als Anknüpfung, nicht den Seitentitel des Verlags", () => {
    expect(ueberschrift("<h1>Speicherzubau verdoppelt sich</h1><title>Beispiel</title>")).toBe(
      "Speicherzubau verdoppelt sich",
    );
    expect(ueberschrift("<title>Startseite</title>")).toBe("Startseite");
    expect(ueberschrift("<h1>ok</h1>")).toBeNull();
  });

  it("nimmt eine Rubrikseite nicht als Anknüpfung", () => {
    // Als Anknüpfung standen „Alle Artikel zum Thema Montage" und
    // „Inhaltlichen Fehler melden" da — ein Anschreiben, das sich darauf
    // beruft, beruft sich auf eine Rubrik.
    const rubrik = `<h1>Alle Artikel zum Thema Montage</h1><p>3. September 2026</p>`;
    expect(istBeitrag(rubrik, HEUTE)).toBe(false);
    const ortsname = `<h1>Mecklenburg Vorpommern</h1><p>3. September 2026</p>`;
    expect(istBeitrag(ortsname, HEUTE)).toBe(false);
    const beitrag = `<h1>Wärmepumpe plus Photovoltaik: Wieso sich die Kombination lohnt</h1>
      <p>Von Anna Beispiel, 3. September 2026</p>`;
    expect(istBeitrag(beitrag, HEUTE)).toBe(true);
  });

  it("zählt eine fremde Auswertung nur mit genannter Quelle", () => {
    expect(zitiertFremdeQuelle("Laut einer Studie des Fraunhofer ISE steigt der Anteil.").antwort).toBe("ja");
    expect(zitiertFremdeQuelle("Studien zeigen, dass Solar wächst.").antwort).not.toBe("ja");
  });
});
