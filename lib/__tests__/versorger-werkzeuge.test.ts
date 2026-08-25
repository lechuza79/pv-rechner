import { describe, expect, it } from "vitest";
import {
  BEKANNTE_ANBIETER,
  besterBefund,
  istBeurteilbar,
  KEIN_WERKZEUG,
  solarseitenLinks,
  werkzeugAusSeite,
  werkzeugKandidaten,
} from "../versorger-werkzeuge";

const URL_SW = "https://www.stadtwerke-musterstadt.de/photovoltaik-rechner";

describe("Die drei Zustaende", () => {
  it("erkennt einen echten Rechner an der Zahleneingabe", () => {
    const html = `<h1>Solarrechner</h1>
      <input type="number" name="dachflaeche" min="10" step="1">
      <input type="range" name="verbrauch" min="1000" max="10000">`;
    expect(werkzeugAusSeite(html, URL_SW).zustand).toBe("rechner");
  });

  it("nennt ein Formular OHNE Rechnung ein Kontaktformular", () => {
    // Es heisst "Rechner", rechnet aber nicht. Beweist NICHTS ueber ein
    // vorhandenes Werkzeug — im Gegensatz zum Rechner mit Leadfunnel.
    const html = `<h1>Solarrechner</h1>
      <input type="text" name="vorname"><input type="text" name="nachname">
      <input type="tel" name="telefon">`;
    expect(werkzeugAusSeite(html, URL_SW).zustand).toBe("kontaktformular");
  });

  it("nennt einen Rechner MIT Kontaktabfrage Rechner mit Leadfunnel", () => {
    // Die Kernunterscheidung: Hier IST ein Rechner da — er gibt sein Ergebnis
    // nur nicht ohne Kontaktdaten heraus. Das belegt Budget und Zustaendigkeit,
    // ein blosses Kontaktformular belegt beides nicht.
    const html = `<input type="number" name="kwp" min="1">
      <input type="tel" name="telefon"><input type="text" name="nachname">`;
    expect(werkzeugAusSeite(html, URL_SW).zustand).toBe("rechner-mit-leadfunnel");
  });

  it("haelt die beiden Faelle sauber auseinander", () => {
    const nurFormular = werkzeugAusSeite('<h1>Solarrechner</h1><input type="tel" name="telefon">', URL_SW);
    const mitRechnung = werkzeugAusSeite(
      '<h1>Solarrechner</h1><input type="range" min="1" max="20"><input type="tel" name="telefon">',
      URL_SW,
    );
    expect(nurFormular.zustand).toBe("kontaktformular");
    expect(mitRechnung.zustand).toBe("rechner-mit-leadfunnel");
  });

  it("zaehlt ein reines Newsletter-Feld nicht als Leadfunnel", () => {
    const html = '<h1>Solarrechner</h1><input type="number" name="kwp" min="1"><input type="email" name="news">';
    expect(werkzeugAusSeite(html, URL_SW).zustand).toBe("rechner");
  });

  it("sagt keins, wenn nichts da ist", () => {
    expect(werkzeugAusSeite("<h1>Willkommen bei den Stadtwerken</h1>", URL_SW).zustand).toBe("keins");
  });
});

describe("Fremde Einbettung", () => {
  it("weist beim Kataster KEINEN Anbieter aus — gezahlt hat nicht das Stadtwerk", () => {
    // Der Name waere technisch richtig, liest sich aber wie ein Kaufbeleg.
    // Ein Solarkataster bezahlt die Kommune oder der Kreis, nicht der Versorger.
    const html = '<iframe src="https://solarkataster.tetraeder.solar/musterstadt"></iframe>';
    const b = werkzeugAusSeite(html, URL_SW);
    expect(b.eingebettet).toBe(true);
    expect(b.zustand).toBe("gratis-kataster");
    expect(b.anbieter).toBeNull();
  });

  it("erkennt einen VERLINKTEN fremden Rechner als eingekauft", () => {
    // Gemessen an Stadtwerke Fuerstenfeldbruck: "Zum PV-Rechner" zeigt auf eine
    // eigens eingerichtete Adresse. Wer nur Rahmen sucht, sieht dort nichts.
    const html = '<h1>Photovoltaik</h1><a href="https://ffbstromdach.solarmaker.com">Zum PV-Rechner</a>';
    const b = werkzeugAusSeite(html, "https://www.stadtwerke-ffb.de/de/photovoltaik");
    expect(b.zustand).toBe("eingekauft");
    expect(b.anbieter).toBe("solarmaker");
    expect(b.beleg).toContain("verlinkt:");
  });

  it("haelt einen Verweis aufs Landeskataster nicht fuer einen gekauften Rechner", () => {
    const html = '<h1>Photovoltaik</h1><a href="https://www.energieatlas-bw.de/sonne/karten?activeLayer=solarkataster">Zum Solarkataster</a>';
    expect(werkzeugAusSeite(html, "https://sw.de/photovoltaik").zustand).not.toBe("eingekauft");
  });

  it("haelt die eigene Einbettung nicht fuer eine fremde", () => {
    const html = '<iframe src="https://www.stadtwerke-musterstadt.de/widget"></iframe>';
    expect(werkzeugAusSeite(html, URL_SW).eingebettet).toBe(false);
  });

  it("haelt eine relative Einbettung nicht fuer eine fremde", () => {
    expect(werkzeugAusSeite('<iframe src="/widget/rechner"></iframe>', URL_SW).eingebettet).toBe(false);
  });

  it("nennt ein eingebettetes Werkzeug eines bekannten Anbieters eingekauft", () => {
    // Gemessen an Stadtwerke Emden, 24.08.2026: Der Rechner liegt IM Rahmen und
    // ist von aussen nicht einsehbar — der Anbieter ist der Beleg dafuer, dass
    // hier jemand Geld ausgegeben hat.
    const html = '<iframe src="https://hub.tetraeder.solar/calculator/fOppmYmwgpGfS44/"></iframe>';
    const b = werkzeugAusSeite(html, "https://stadtwerke-emden.de/strom/photovoltaik");
    expect(b.zustand).toBe("eingekauft");
    expect(b.anbieter).toBe("tetraeder.solar");
  });

  it("haelt ein eingebundenes Landeskataster NICHT fuer ein gekauftes Werkzeug", () => {
    // Der vierte Zustand: sieht aus wie „hat etwas", aber niemand hat gezahlt,
    // niemand betreut es, es gibt keinen Budgetposten.
    for (const src of [
      "https://www.solare-stadt.de/musterstadt/solarkataster",
      "https://www.energieatlas.bayern.de/tool",
    ]) {
      const b = werkzeugAusSeite(`<iframe src="${src}"></iframe>`, "https://sw.de/solar");
      expect(b.zustand).toBe("gratis-kataster");
    }
  });

  it("das Landeskataster schlaegt eigene Zahlenfelder", () => {
    // Kataster bringen eigene Eingabefelder mit — ohne Vorrang saehe das wie
    // ein selbst gebauter Rechner aus.
    const html = '<input type="number" name="flaeche" min="1"><iframe src="https://www.solare-stadt.de/x"></iframe>';
    expect(werkzeugAusSeite(html, "https://sw.de/solar").zustand).toBe("gratis-kataster");
  });

  it("ein anonymer Rahmen ist KEIN Befund", () => {
    // Gemessen 24.08.2026: Von 43 "unklar" waren fast alle nur ein Video, ein
    // Einwilligungsbanner oder eine Karte. Jede Seite hat irgendeinen Rahmen.
    const b = werkzeugAusSeite('<h1>Photovoltaik</h1><iframe src="https://www.youtube.com/embed/x"></iframe>', URL_SW);
    expect(b.eingebettet).toBe(true);
    expect(b.zustand).toBe("keins");
  });

  it("ein Rahmen, der selbst nach einem Werkzeug aussieht, bleibt ein Befund", () => {
    const b = werkzeugAusSeite('<iframe src="https://irgendwer.example/solarrechner"></iframe>', URL_SW);
    expect(b.zustand).toBe("unklar");
  });

  it("die Anbieterliste behauptet keine Vollstaendigkeit, aber keine Dubletten", () => {
    const namen = BEKANNTE_ANBIETER.map((a) => a.name);
    expect(new Set(namen).size).toBe(namen.length);
  });
});

describe("Nur echte Werkzeugseiten werden beurteilt", () => {
  // Gemessen am Lauf ueber 50: Ohne diese Schranke galten 26 von 49 Versorgern
  // als Formular-Attrappe, keiner davon zu Recht. Die Belege waren Suchschlitze
  // und gewoehnliche Kontaktformulare.
  it("beurteilt die Kontaktseite gar nicht erst", () => {
    const html = '<form><input type="tel" name="telefon"><input name="vorname"></form>';
    expect(werkzeugAusSeite(html, "https://sw.de/kontakt").zustand).toBe("keins");
    expect(werkzeugAusSeite(html, "https://sw.de/kontaktformular").zustand).toBe("keins");
  });

  it("beurteilt Impressum, Datenschutz und Suche nicht", () => {
    const html = '<input type="tel" name="telefon">';
    for (const u of ["https://sw.de/impressum", "https://sw.de/datenschutz", "https://sw.de/suche"]) {
      expect(werkzeugAusSeite(html, u).zustand).toBe("keins");
    }
  });

  it("haelt einen Suchschlitz nicht fuer ein Personenfeld", () => {
    const html = '<h1>Solarrechner</h1><input id="CMSSuchformularSuchbegriff" name="VolltextSuchbegriff" type="text">';
    expect(werkzeugAusSeite(html, "https://sw.de/solarrechner").zustand).not.toBe("kontaktformular");
  });

  it("beurteilt eine echte Rechnerseite weiterhin", () => {
    const html = '<h1>Solarrechner</h1><input type="number" name="kwp" min="1">';
    expect(werkzeugAusSeite(html, "https://sw.de/solarrechner").zustand).toBe("rechner");
  });

  it("beurteilt eine Produktseite mit fremder Einbettung weiterhin", () => {
    const html = '<iframe src="https://hub.tetraeder.solar/calculator/x"></iframe>';
    expect(werkzeugAusSeite(html, "https://sw.de/strom/photovoltaik").zustand).toBe("eingekauft");
  });
});

describe("Die Solarseite finden statt die Startseite bewerten", () => {
  // Der Kern der Erhebung. Vorher wurde beurteilt, welche Seite zufaellig
  // geholt war — meist die Startseite. Die enthaelt alles: Tarif-Schieberegler
  // neben Photovoltaik-Teaser, jede Themen-Zuordnung darauf ist Zufall.
  it("findet die Solarseite von der Startseite aus", () => {
    const html = `<a href="/strom/tarife">Tarife</a>
      <a href="/strom/photovoltaik">Photovoltaik</a>
      <a href="/karriere">Karriere</a>`;
    expect(solarseitenLinks(html, "https://sw.de/", 3)[0]).toBe("https://sw.de/strom/photovoltaik");
  });

  it("nimmt die Adresse wichtiger als die Beschriftung", () => {
    const html = '<a href="/cms/id=1">Solar</a><a href="/photovoltaik">Mehr</a>';
    expect(solarseitenLinks(html, "https://sw.de/", 2)[0]).toBe("https://sw.de/photovoltaik");
  });

  it("beurteilt die Startseite nicht, nur weil dort Photovoltaik vorkommt", () => {
    const html = "<h1>Willkommen</h1><p>Auch Photovoltaik bieten wir an.</p>";
    expect(istBeurteilbar(html, "https://sw.de/")).toBe(false);
  });

  it("beurteilt eine Themenseite", () => {
    expect(istBeurteilbar("<h1>PV</h1>", "https://sw.de/strom/photovoltaik")).toBe(true);
  });

  it("beurteilt eine fremde Einbettung eines bekannten Anbieters ueberall", () => {
    const html = '<iframe src="https://hub.tetraeder.solar/calculator/x"></iframe>';
    expect(istBeurteilbar(html, "https://sw.de/")).toBe(true);
  });
});

describe("Thema — Tarifrechner ist kein Solarwerkzeug", () => {
  // Gemessen 24.08.2026: Alle sechs erkannten "Rechner" waren Tarifrechner fuer
  // Strom- und Gaspreise. Ohne diese Trennung misst die Erhebung die
  // Verbreitung von Tarifrechnern statt die von Solarwerkzeugen.
  it("erkennt den Tarifrechner als solchen", () => {
    const html = '<h1>Stromtarifrechner</h1><input type="range" min="500" max="5000">';
    const b = werkzeugAusSeite(html, "https://sw.de/preisrechner/");
    expect(b.zustand).toBe("rechner");
    expect(b.thema).toBe("tarif");
  });

  it("die Adresse schlaegt den Fliesstext", () => {
    // Gemessen an Stadtwerke Barmstedt: Seite unter "/erdgas/tarifrechner/",
    // im Fliesstext kommt Photovoltaik vor — die Adresse ist die Absicht des
    // Betreibers, der Text nur Umgebung.
    const html = "<h1>Erdgas</h1><p>Auch Photovoltaik bieten wir an.</p>";
    expect(werkzeugAusSeite(html, "https://sw.de/energie-wasser/erdgas/tarifrechner/").thema).toBe("tarif");
  });

  it("erkennt das Solarwerkzeug am Thema", () => {
    const html = '<h1>Photovoltaik-Rechner</h1><input type="number" name="kwp" min="1">';
    expect(werkzeugAusSeite(html, "https://sw.de/rechner").thema).toBe("solar");
  });

  it("Solar schlaegt Tarif, wenn beides auf der Seite steht", () => {
    const html = '<h1>Tarifrechner</h1><p>Auch fuer Ihre Photovoltaik-Anlage</p><input type="number" min="1">';
    expect(werkzeugAusSeite(html, "https://sw.de/rechner").thema).toBe("solar");
  });

  it("das Solarwerkzeug verdeckt den Tarifrechner nicht und umgekehrt", () => {
    const tarif = werkzeugAusSeite('<h1>Tarifrechner</h1><input type="number" min="1">', "https://sw.de/tarifrechner");
    const solar = werkzeugAusSeite('<h1>Photovoltaik</h1><input type="number" min="1">', "https://sw.de/photovoltaik");
    expect(besterBefund([tarif, solar]).thema).toBe("solar");
    expect(besterBefund([solar, tarif]).thema).toBe("solar");
  });
});

describe("Bestandsdaten", () => {
  it("erkennt eine Atlas-artige Auswertung", () => {
    const b = werkzeugAusSeite("<h1>Zahlen und Fakten zum Ausbaustand</h1>", URL_SW);
    expect(b.bestandsdaten).toBe(true);
  });
});

describe("Belegstelle", () => {
  it("liefert einen Ausschnitt zur Handpruefung", () => {
    const b = werkzeugAusSeite('<div class="tool"><input type="number" name="kwp" min="1"></div>', URL_SW);
    expect(b.beleg).toContain("number");
  });
});

describe("Bester Befund aus mehreren Seiten", () => {
  it("laesst den Rechner mit Leadfunnel den blossen Rechner schlagen", () => {
    // Rangfolge als inhaltliche Aussage: Beim Leadfunnel ist unser Argument am
    // staerksten, also darf er nicht von einem Rechner ueberdeckt werden.
    const a = werkzeugAusSeite('<input type="number" name="kwp" min="1">', URL_SW);
    const b = werkzeugAusSeite('<input type="number" min="1"><input type="tel" name="telefon">', `${URL_SW}-2`);
    expect(besterBefund([a, b]).zustand).toBe("rechner-mit-leadfunnel");
  });

  it("verliert die Bestandsdaten nicht, wenn sie auf einer anderen Seite stehen", () => {
    const a = werkzeugAusSeite("<h1>Energieatlas</h1>", "https://sw.de/atlas");
    const b = werkzeugAusSeite('<input type="number" name="kwp" min="1">', URL_SW);
    const best = besterBefund([a, b]);
    expect(best.zustand).toBe("rechner");
    expect(best.bestandsdaten).toBe(true);
  });

  it("liefert ohne Befunde den leeren Zustand", () => {
    expect(besterBefund([])).toEqual(KEIN_WERKZEUG);
  });
});

describe("Kandidaten aus dem Seitenverzeichnis", () => {
  it("nimmt Werkzeugseiten vor Datenseiten", () => {
    const erg = werkzeugKandidaten(["https://sw.de/energiedaten", "https://sw.de/solarrechner"], 2);
    expect(erg[0]).toBe("https://sw.de/solarrechner");
  });

  it("findet auch prozentkodierte Adressen", () => {
    const erg = werkzeugKandidaten(["https://sw.de/wirtschaftlichkeits-rechner%C3%BCbersicht"], 1);
    expect(erg).toHaveLength(1);
  });

  it("nimmt nichts, wo nichts passt", () => {
    expect(werkzeugKandidaten(["https://sw.de/karriere", "https://sw.de/impressum"], 3)).toEqual([]);
  });

  it("liest prozentkodierte Umlaute — in einer Sitemap gibt es keinen Linktext", () => {
    // Der Fehler, an dem die Foerder-Suche gescheitert ist: 60 von 2.583
    // Adressen waren betroffen. Auf einer Seite faengt der Linktext das ab,
    // in einer Sitemap gibt es keinen.
    const erg = werkzeugKandidaten(["https://sw.de/solar-wirtschaftlichkeits%C3%BCbersicht"], 1);
    expect(erg).toHaveLength(1);
  });
});
