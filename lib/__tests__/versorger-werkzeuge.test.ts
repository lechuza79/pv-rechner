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
  it("erkennt den Tarifrechner als eigenen Zustand, nicht als eigenen Rechner", () => {
    // KORREKTUR 05.09.2026: Dieser Test verlangte frueher den Zustand
    // "rechner" — er hat die Verwechslung, gegen die er geschrieben war,
    // an anderer Stelle festgeschrieben. Das Thema stand richtig auf "tarif",
    // der Zustand log. Und weil die Auswertung nach Zustand zaehlt, wanderten
    // Tarifrechner in die Zahl "eigener Photovoltaik-Rechner": Bei der
    // Handpruefung war KEINER der sechs so gezaehlten Funde einer.
    const html = '<h1>Stromtarifrechner</h1><p>Grundpreis und Arbeitspreis</p><input type="range" min="500" max="5000">';
    const b = werkzeugAusSeite(html, "https://sw.de/preisrechner/");
    expect(b.zustand).toBe("tarifrechner");
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

// ─── Negativproben ────────────────────────────────────────────────────────────
//
// JEDER FALL HIER IST EIN ECHTER FEHLGRIFF DES LAUFS vom 25.08.2026, von Hand
// nachgeprueft am 05.09.2026. Sie stehen hier, weil die Erhebung ausschliesslich
// daran geeicht war, ob sie ein vorhandenes Werkzeug FINDET — nie daran, ob sie
// liegen laesst, was keines ist. Von den vier Zahlen, die die
// Wettbewerbsaussage trugen, hielt deshalb keine der Handpruefung stand.

describe("Negativproben: was KEIN eigener Rechner ist", () => {
  it("der Tarifrechner im Seitenkopf einer Photovoltaik-Seite", () => {
    // Stadtwerke Einbeck: drei Schieberegler `menge-verbrauch-strom/gas/wasser`
    // — der Tarif-Konfigurator, der auf JEDER Unterseite steht. Er galt als
    // eigener Photovoltaik-Rechner, weil die Adresse Photovoltaik heisst.
    const html = `<h1>Photovoltaik</h1><p>Unsere Tarife: Grundpreis und Arbeitspreis je kWh.</p>
      <input type="range" name="menge-verbrauch-strom" min="500" max="9000">`;
    const b = werkzeugAusSeite(html, "https://sw-einbeck.de/strom/photovoltaik");
    expect(b.zustand).toBe("tarifrechner");
    expect(b.zustand).not.toBe("rechner");
  });

  it("das Personenfeld eines Tarifrechners macht daraus keinen Leadfunnel", () => {
    // Stadtwerke Schwarzenberg: `trstrom-personen` ist die Zahl der Personen im
    // Haushalt fuer die Verbrauchsschaetzung — kein Kontaktdatenfeld.
    const html = `<h1>Strom fuer Ihre Waermepumpe</h1><p>Arbeitspreis ab 24 ct/kWh</p>
      <input type="number" name="trstrom-personen" min="1" max="6">`;
    expect(werkzeugAusSeite(html, "https://sw.de/waermepumpe").zustand).toBe("tarifrechner");
  });

  it("die Anlagenanmeldung des Netzbetriebs", () => {
    // Stadtwerke Spremberg: Eigenerklaerung zur Umlagenprivilegierung, mit
    // Kunden- und Zaehlernummer. Galt als "Rechner mit Leadfunnel" — dabei MUSS
    // der Netzbetreiber dieses Formular anbieten.
    const html = `<h1>Privilegierung Waermepumpenstrom</h1>
      <input name="vorname"><input name="nachname"><input type="number" name="zaehlernummer">`;
    const b = werkzeugAusSeite(html, "https://sw.de/strom/privilegierung-waermepumpenstrom");
    expect(b.zustand).toBe("netz-pflichtprozess");
    expect(b.merkmale.pflichtprozess).toBe(true);
  });

  it("das Anmeldeformular fuer eine Photovoltaikanlage", () => {
    const html = '<h1>Anlage anmelden</h1><input name="vorname"><input type="number" name="kwp">';
    expect(werkzeugAusSeite(html, "https://sw.de/netz/anmeldung-pv-anlage").zustand).toBe("netz-pflichtprozess");
  });

  it("ein Verweis auf ein kostenloses Hochschul- oder Verbraucherangebot ist kein Kauf", () => {
    // 13 der 26 "eingekauft" waren solche Verweise: HTW-Simulator, Stiftung
    // Warentest, eine Forschungsstudie, sogar ein Facebook-Teilen-Link, dessen
    // Adresse zufaellig das Wort "potential" enthielt.
    for (const ziel of [
      "https://solar.htw-berlin.de/rechner/stecker-solar-simulator/",
      "https://www.test.de/Photovoltaik-Rechner-123",
      "https://www.ffe.de/projekte/waermepumpen-potenzial/",
    ]) {
      const html = `<h1>Photovoltaik</h1><a href="${ziel}">Zum Rechner</a>`;
      const b = werkzeugAusSeite(html, "https://sw.de/photovoltaik");
      expect(b.zustand, ziel).not.toBe("eingekauft");
    }
  });

  it("eine echte Wirtschaftlichkeitsrechnung bleibt ein Rechner", () => {
    // Die Gegenrichtung, damit die Reparatur nicht alles wegfiltert: Wer nach
    // Dachflaeche fragt und Amortisation ausgibt, rechnet eine Investition.
    const html = `<h1>Lohnt sich Photovoltaik?</h1><p>Ihre Amortisation und Rendite ueber 20 Jahre.</p>
      <input type="number" name="dachflaeche"><input type="number" name="kwp">`;
    const b = werkzeugAusSeite(html, "https://sw.de/photovoltaik-rechner");
    expect(b.zustand).toBe("rechner");
    expect(b.merkmale.wirtschaftlichkeitswort).toBe(true);
    expect(b.merkmale.anlagenfeld).toBe(true);
  });

  it("das Balkonkraftwerk ist ein eigenes Thema, kein Unterfall von Photovoltaik", () => {
    // Einwand des Betreibers, 05.09.2026: Balkonkraftwerk lief im Solar-Muster
    // mit und war in den Zahlen nicht davon zu trennen — bei einem eigenen
    // Balkonkraftwerk-Rechner im Haus die Luecke, die man am wenigsten
    // gebrauchen kann. Die Seite spricht fast immer AUCH von Photovoltaik,
    // deshalb muss das Balkon-Muster vorn stehen.
    const html = '<h1>Balkonkraftwerk</h1><p>Steckersolar ist die kleine Schwester der Photovoltaik.</p>';
    expect(werkzeugAusSeite(html, "https://sw.de/balkonkraftwerk").thema).toBe("balkon");
    expect(werkzeugAusSeite(html, "https://sw.de/produkte").thema).toBe("balkon");
    // Und die Gegenprobe: eine gewoehnliche Dachanlage bleibt solar.
    expect(werkzeugAusSeite("<h1>Photovoltaik fuers Dach</h1>", "https://sw.de/photovoltaik").thema).toBe("solar");
  });

  it("Wallbox und Speicher werden eingeordnet, wenn sie auf einer Werkzeugseite auftauchen", () => {
    // Sie sind KEIN Grund, eine Seite zu holen — wir haben zu beiden nichts
    // anzubieten. Wenn ein Rechner sie aber nebenbei behandelt, soll der Befund
    // nicht als "unbekannt" verlorengehen.
    expect(werkzeugAusSeite("<h1>Wallbox-Rechner</h1>", "https://sw.de/wallbox-rechner").thema).toBe("wallbox");
    expect(werkzeugAusSeite("<h1>Speicher-Rechner</h1>", "https://sw.de/stromspeicher-rechner").thema).toBe("speicher");
  });

  it("jeder maschinelle Befund ist ausdruecklich nur ein Verdacht", () => {
    // Die wichtigste Zusage des Moduls: Aus dem Quelltext allein ist nicht zu
    // sehen, ob eine Seite eine Investition durchrechnet. Wer das behauptet,
    // baut kein Messgeraet.
    const html = '<h1>Photovoltaik-Rechner</h1><input type="number" name="kwp">';
    expect(werkzeugAusSeite(html, "https://sw.de/pv-rechner").sicherheit).toBe("vermutet");
  });
});
