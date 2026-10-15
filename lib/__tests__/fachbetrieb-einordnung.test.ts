import { describe, expect, it } from "vitest";
import { alteRueckstufungBleibt, anbieterBlock, artNachStreuung, behaeltEinordnung, einordnen, ZIEL_BESTAND } from "../fachbetrieb-einordnung";

// Every fixture is a real case from the two hand-read samples of 06.10.2026,
// shortened to the passages that decide it.
const seite = (titel: string, beschreibung: string, text: string) =>
  `<html><head><title>${titel}</title><meta name="description" content="${beschreibung}"></head><body><main>${text}</main></body></html>`;

const urteil = (domain: string, startHtml: string, impText = "", firmenname: string | null = null) =>
  einordnen({ domain, startHtml, impText, firmenname });

describe("who is the provider — classes read at the imprint", () => {
  it("a Stadtwerk named in the imprint is a utility, whatever the page offers", () => {
    const u = urteil(
      "stadtwerke-wesel.de",
      seite("Stadtwerke Wesel", "", "Strom Erdgas Tarifrechner Photovoltaik Installation Ihrer PV-Anlage"),
      "Impressum Anschrift Stadtwerke Wesel GmbH Emmericher Str. 11 46485 Wesel",
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("a utility whose title does not say so is still read at its imprint", () => {
    const u = urteil(
      "beispielwerke.de",
      seite("Für die Region, immer vor Ort", "", "Photovoltaik Installation Ihrer PV-Anlage"),
      "Impressum Herausgeber Stadtwerke Steinburg GmbH Gasstraße 18 25524 Itzehoe",
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("a regional supplier without 'Stadtwerke' in its name: tariff plus fault service", () => {
    const u = urteil(
      "thueringerenergie.de",
      seite("Startseite | TEAG Thüringer Energie", "", "Stromtarife Grundversorgung Strom Photovoltaik Zählerstand melden Abschlag anpassen"),
      "Impressum TEAG Thüringer Energie AG Schwerborner Str. 30 99087 Erfurt",
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("'Energieversorgung' in a description is a service, not a supplier (ed-energy.de)", () => {
    const u = urteil(
      "ed-energy.de",
      seite("Regenerative Energiesysteme | ED-ENERGY Germany GmbH", "Beratung für besonders effiziente Energieversorgung", "Photovoltaikanlage Planung und Installation Ihrer PV-Anlage"),
    );
    expect(u.art).toBe("betrieb");
  });

  it("an association is read at its legal form — 'e.V.' followed by a space too", () => {
    // The old pattern ended in \b, which after "e.V." needs a WORD character,
    // so "GFWW e.V. Im Technologiepark" never matched.
    const u = urteil(
      "gfww.de",
      seite("GFWW. e.V.", "", "Photovoltaik Hybridspeicher Innovationsnetzwerk"),
      "Angaben gemäß § 5 TMG: GFWW e. V. Im Technologiepark 1 15236 Frankfurt (Oder)",
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "verband" });
  });

  it("an installer that is MEMBER of an association stays an installer", () => {
    const u = urteil(
      "elektro-ringland.de",
      seite("Gary Ringland Elektro Meisterbetrieb", "", "Photovoltaik Montage. Mitglied im Bundesverband Solarwirtschaft e.V. und Partner der Stadtwerke"),
      "Impressum Gary Ringland Elektro Meisterbetrieb Ritterstraße 31 66482 Zweibrücken zuständige Kammer Handwerkskammer der Pfalz, Körperschaft des öffentlichen Rechts",
    );
    expect(u.art).toBe("betrieb");
  });

  it("a district's energy portal names the district as publisher", () => {
    const u = urteil(
      "energiewegweiser.de",
      seite("Energiewegweiser Landkreis Harburg", "", "Erneuerbare Energien PhotovoltaikCheck Handwerk"),
      "Impressum Herausgeber: Landkreis Harburg Landrat Rainer Rempe Schloßplatz 6 21423 Winsen (Luhe)",
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "behoerde" });
  });

  it("a municipal climate agency is not an installer", () => {
    const u = urteil("klimaagentur-hamm.de", seite("Startseite - KlimaAgentur Hamm", "", "Photovoltaik Beratungsbüro Anlagentechnik"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "behoerde" });
  });

  it("a directory names itself one", () => {
    const u = urteil("energieberater-in-der-naehe-finden.de", seite("Home - Energieberater Portal", "", "Photovoltaik Solarthermie Berater"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "portal" });
  });

  it("a directory that only its name gives away", () => {
    const u = urteil("solarberater24.de", seite("Solarberater Portal", "", "Photovoltaik Installation Ihrer PV-Anlage"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "portal" });
  });

  it("a directory that only its domain gives away", () => {
    const u = urteil("solarteur-finden.de", seite("Solarteure", "", "Photovoltaik Installation Ihrer PV-Anlage"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "portal" });
  });

  it("a lead seller that says it compares offers", () => {
    const u = urteil("solar-x.de", seite("Solar X", "", "Photovoltaik: bis zu 3 kostenlose Angebote von Fachbetrieben. Installation inklusive."));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "portal" });
  });

  it("a manufacturer says it is one", () => {
    const u = urteil("modulwerk.de", seite("Modulwerk", "Wir sind Hersteller von Solarmodulen", "Photovoltaik Montage"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "handel" });
  });

  it("a wholesaler says so in its title", () => {
    const u = urteil("desoha.de", seite("Ihr Solar Großhandel | DESOHA GmbH", "Profitieren Sie als Installateur", "Photovoltaik Großhandel Montage"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "handel" });
  });

  it("a shop that lets craftsmen install is not an installer (energiering.de)", () => {
    const u = urteil(
      "energiering.de",
      seite("Energiering – Erneuerbare Energien", "", "Photovoltaik Wir planen in Zusammenarbeit mit Handwerkern, bei Ihnen vor Ort, die Installation"),
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "handel" });
  });

  it("an installer naming its suppliers is not a manufacturer (solarteur-pro.de)", () => {
    const u = urteil(
      "solarteur-pro.de",
      seite("Solarteur Pro | Photovoltaik Experten", "Ihr regionaler Partner für Photovoltaik-Installation", "Wechselrichter namhafter Hersteller für maximale Erträge"),
    );
    expect(u.art).toBe("betrieb");
  });

  it("a medium is read at its editorial staff", () => {
    const u = urteil("beispiel-zeitung.de", seite("Nachrichten", "", "Photovoltaik im Landkreis"), "Impressum Verlag GmbH 12345 Ort Chefredakteur: Max Muster");
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "medium" });
  });
});

describe("cases the old whole-page patterns got wrong (third sample, 06.10.2026)", () => {
  it("a grid operator: meter readings plus fault line (rhein-sieg-netz.de)", () => {
    const u = urteil("rhein-sieg-netz.de", seite("Startseite", "", "Photovoltaik Einspeisung anmelden Störung melden Zählerstand eingeben Hilfe und Kontakt"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("a grid operator in its self-description (energienetze-offenbach.de)", () => {
    const u = urteil("netz-x.de", seite("ENO", "Die Energienetze Offenbach GmbH plant, baut und betreibt in der Region die Vernetzung in Sachen Strom, Erdgas, Wasser.", "Photovoltaik Einspeisung Installation Ihrer PV-Anlage"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("'Energienetze' in a name is no grid operator (energienetzedeutschland.de)", () => {
    const u = urteil("energienetzedeutschland.de", seite("Solaranlage mit Speicher | Bayern | Energienetze Deutschland", "", "Photovoltaik Montage und Inbetriebnahme"), "Angaben gemäß § 5 TMG Energienetze Deutschland GmbH Fürholzener Str. 12-14 85386 Eching");
    expect(u.art).toBe("betrieb");
  });

  it("a district's 'Kreiswerke … Eigenbetrieb Klima & Energie' is an agency, not a utility", () => {
    const u = urteil("unser-klima-cochem-zell.de", seite("Eigenbetrieb Klima & Energie", "", "Photovoltaik"), "Angaben gemäß § 5 TMG: Kreiswerke Cochem-Zell Eigenbetrieb Klima & Energie Enderplatz 2 56812 Cochem Vertreten durch Landrätin");
    expect(u).toMatchObject({ klasse: "behoerde" });
  });

  it("a 'Zentrum für … Energieversorgung, Klimaschutz' is an agency (zekk-ow.de)", () => {
    const u = urteil("zekk-ow.de", seite("ZEKK", "", "Photovoltaik"), "Angaben gemäß den gesetzlichen Vorschriften Zentrum für nachhaltige Energieversorgung, Klimaschutz und Klimafolgenanpassung (ZEKK) gGmbH Alte Ulmer Str. 2 89522 Heidenheim");
    expect(u).toMatchObject({ klasse: "behoerde" });
  });

  it("a solar map named in its title", () => {
    const u = urteil("solaratlas-bsk.smartgeomatics.de", seite("Solaratlas", "", "Photovoltaik Potenzial Ihres Daches"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "behoerde" });
  });

  it("a volunteer initiative that describes itself as one", () => {
    const u = urteil(
      "solarini-lauenburg.de",
      seite("solarINI lauenburg", "", "Die solarINI lauenburg ist eine Initiative aus der Nähe von Lauenburg. Wir informieren zu PV-Anlagen."),
      "Angaben gemäß § 5 TMG Sabine Kaufmann Am Kanal 7 21483 Basedow",
    );
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "verband" });
  });

  it("a group that says it advises on a volunteer basis", () => {
    const u = urteil("solarverein-x.de", seite("Solar X", "", "Wir informieren und beraten ehrenamtlich zu PV-Anlagen."));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "verband" });
  });

  it("the domain is not the provider's name: 'solar' in a domain is no trade", () => {
    const u = urteil("solar-irgendwas.de", seite("Willkommen", "", "Photovoltaik Informationen"), "Angaben gemäß § 5 TMG Max Muster Weg 1 12345 Ort");
    expect(u.art).toBe("unklar");
  });

  it("a cooperative named as a CUSTOMER at the end of the imprint is no reason to demote (gast-partner.de)", () => {
    const u = urteil(
      "gast-partner.de",
      seite("Photovoltaik Braunschweig: Anbieter & Fachbetrieb seit 1989", "", "Photovoltaik Stromspeicher Wärmepumpe"),
      "Angaben gemäß § 5 DDG: Gast & Partner GmbH Pillmannstraße 21 38112 Braunschweig. … Betreiber ist die Energiegenossenschaft Braunschweiger Land eG.",
    );
    expect(u.art).toBe("betrieb");
  });
});

describe("cases the full run got wrong (gegengelesen 06.10.2026)", () => {
  it("a PV service firm's fault line is not a utility (adlersolar.de)", () => {
    const u = urteil("adlersolar.de", seite("ADLER Solar", "", "Photovoltaik Wartung und Installation Ihrer PV-Anlage. Störung melden. Stromtarife im Vergleich"), "Impressum ADLER Solar GmbH Ingolstädter Straße 1-3 28219 Bremen");
    expect(u.art).toBe("betrieb");
  });

  it("an installer's blog on tariffs and grid fees is no utility (e-m-gz.de)", () => {
    const u = urteil("e-m-gz.de", seite("Energie Manufaktur Günzburg", "Photovoltaik Anlagen", "Dynamische Stromtarife, variable Netzentgelte und Ihre PV-Anlage. Störungsmeldung. Planung und Montage."));
    expect(u.art).toBe("betrieb");
  });

  it("a supplier: meter readings and instalments", () => {
    const u = urteil("swu.de", seite("SWU", "", "Photovoltaik Kundenservice Zählerstand melden An-/Abmelden Abschlag anpassen"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("'Energieversorgung' in a title is a service; 'Energieversorger' is a supplier", () => {
    expect(urteil("schnellenberger.de", seite("Konzepte zur dezentralen Energieversorgung", "", "Photovoltaik Montage und Installation")).art).toBe("betrieb");
    expect(urteil("harzenergie.de", seite("Harz Energie - Ihr regionaler Energieversorger", "", "Photovoltaik"))).toMatchObject({ art: "kein-betrieb", klasse: "versorger" });
  });

  it("'Großhandel' as a menu item of an installer is no wholesaler (solardes.de)", () => {
    const u = urteil("solardes.de", seite("Solardes PV", "", "Eigenheim Gewerblich Großhandel Installation Wartung. Wir installieren Ihre Photovoltaik-Anlage."));
    expect(u.art).toBe("betrieb");
  });

  it("a wholesaler with its own installation team installs (ateo-solar.de)", () => {
    const u = urteil("ateo-solar.de", seite("ATEO Solar", "ATEO Solar ist ein Photovoltaik-Großhandel in Altusried mit eigenem Montageservice.", "Photovoltaik Montage"));
    expect(u.art).toBe("betrieb");
  });

  it("the liability insurer's ombudsman is not the provider (meissner-handwerk.de)", () => {
    const u = urteil(
      "meissner-handwerk.de",
      seite("Meissner Solar", "", "Photovoltaik Montage vom Meisterbetrieb"),
      "Berufshaftpflichtversicherung Anbieter: Ergo Versicherung Anschrift: Der Versicherungsombudsmann e.V., Postfach 080632, 10006 Berlin",
    );
    expect(u.art).toBe("betrieb");
  });

  it("a register typo is not an association (jona-solar.de)", () => {
    const u = urteil("jona-solar.de", seite("Jona Solar", "", "Photovoltaik Montage"), "Jona Solar GmbH Weg 86, 59494 Soest Genossenschaftsregister: HRB 14650");
    expect(u.art).toBe("betrieb");
  });

  it("a real association register still counts", () => {
    const u = urteil("altbauplus.info", seite("altbau plus", "", "Photovoltaik Beratung"), "Impressum Alt-BAU plus Aachen-Münchener Platz 5 52062 Aachen Vereinsregister: VR 4096");
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "verband" });
  });

  it("an installers' cooperative is no citizens' energy cooperative (Solarbau Freiburg eG)", () => {
    expect(urteil("solarbaufreiburg.de", seite("Solarbau", "", "Photovoltaik Montage"), "Impressum Solarbau Freiburg eG Glottertalstr. 6 79108 Freiburg").art).toBe("betrieb");
    expect(urteil("ostalbbuergerenergie.de", seite("OBE", "", "Photovoltaik"), "Impressum OstalbBürgerEnergie eG Im Hasennest 9 73433 Aalen")).toMatchObject({ klasse: "verband" });
  });

  it("a link to a lead tool is not a lead seller (engelmann-solartechnik.de)", () => {
    const u = urteil("engelmann-solartechnik.de", seite("Engelmann", "", "Photovoltaik Montage https://leadgenerierung-engelmann.fly.dev/ Jetzt beraten lassen"), "Engelmann Haustechnik GmbH Weg 1 12345 Ort");
    expect(u.art).toBe("betrieb");
  });
});

describe("evidence the full run missed or invented (gegengelesen 06.10.2026)", () => {
  it("advice about installing is no offer (alma-solarshop.de)", () => {
    const u = urteil("alma-solar.de", seite("Alma", "", "Photovoltaik. Es ist möglich, eine Solaranlage zu installieren und zu Hause Strom zu produzieren."), "Alma GmbH Weg 1 12345 Ort");
    expect(u.art).toBe("unklar");
  });

  it("a shop names itself in its domain", () => {
    const u = urteil("mg-solar-shop.de", seite("mg-solar", "", "Photovoltaik Komplettsets"), "Anbieterkennung: mg-solar GmbH Eisenstraße 19 34225 Baunatal");
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "handel" });
  });

  it("'Montage und Inbetriebnahme' without a PV word next to it (mt-pv.de)", () => {
    const u = urteil("mt-pv.de", seite("", "", "Ihre Sonne. Ihr Strom. Von der Angebotserstellung über Montage und Inbetriebnahme bis zur Wartung. Photovoltaik"));
    expect(u).toMatchObject({ art: "betrieb", grund: "bietet Montage/Installation an" });
  });

  it("installation as a menu item (main-energiekreis.de)", () => {
    const u = urteil(
      "main-energiekreis.de",
      `<html><body><nav><a href="/leistungen">Leistungen</a><a href="/umsetzung">Inbetriebnahme</a></nav><main>${"Willkommen bei uns im schönen Main-Kinzig-Kreis ".repeat(4)}Photovoltaik</main></body></html>`,
    );
    expect(u).toMatchObject({ art: "betrieb", grund: "bietet Montage/Installation an" });
  });

  it("refrigeration and solar engineering are trades (trane-roggenkamp.de, sotech.de)", () => {
    expect(urteil("trane-roggenkamp.de", seite("TRANE ROGGENKAMP | Kälte-, Wärme- & Regelungstechnik", "Kältetechnik und Photovoltaik", "Photovoltaik")).art).toBe("betrieb");
    expect(urteil("sotech.de", seite("SOTECH GmbH", "Solartechnik seit 1988", "Strom von der Sonne Photovoltaik")).art).toBe("betrieb");
  });
});

describe("the third full run, gegengelesen (06.10.2026)", () => {
  it("an imprint disclaimer naming 'eRecht24, dem Portal zum Internetrecht' is no provider (sonnentaler.de)", () => {
    const u = urteil(
      "sonnentaler.de",
      seite("Sonnentaler - Photovoltaik", "Planung, Installation und Wartung", "Photovoltaik"),
      "Betreiber der Seiten behalten sich ausdrücklich rechtliche Schritte vor. Quelle: Disclaimer von eRecht24, dem Portal zum Internetrecht. Kontakt 31134 Hildesheim",
    );
    expect(u.art).toBe("betrieb");
  });

  it("'Angebote vergleichen' as an article link is no portal (adlersolar.de)", () => {
    const u = urteil("adlersolar.de", seite("ADLER Solar", "Photovoltaik, Wärmepumpen", "Photovoltaik Montage durch unsere Monteure. Ratgeber: Angebote vergleichen"));
    expect(u.art).toBe("betrieb");
  });

  it("…but in the self-description it is one", () => {
    const u = urteil("solar-x.de", seite("Solar-Angebote vergleichen", "", "Photovoltaik"));
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "portal" });
  });

  it("'Grundversorgung' as a word is no supplier (solarharz.de)", () => {
    const u = urteil("solarharz.de", seite("Solar Harz", "", "Photovoltaik sorgt für Grundversorgung. Funkmasten ohne Ersatzversorgung. Montage im Vollservice."));
    expect(u.art).not.toBe("kein-betrieb");
  });

  it("a shop domain whose page offers installation is an installer", () => {
    const u = urteil("pv-shop-nord.de", seite("PV Nord", "", "Photovoltaik und Speicher. Wir installieren Ihre Anlage im ganzen Landkreis."));
    expect(u.art).toBe("betrieb");
  });

  it("a shop domain that installs is an installer (solarshop-amberg.de)", () => {
    const u = urteil("solarshop-amberg.de", seite("SKS Energietechnik", "Verkauf, Planung und Optimierung von Solaranlagen bis hin zur fachgerechten Montage", "Photovoltaik"));
    expect(u.art).toBe("betrieb");
  });
});

describe("promotions of old demotions, gegengelesen (06.10.2026)", () => {
  it("'Fachbetrieb finden' on a district map is no trade (solar-wtm-fri.ipsyscon.de)", () => {
    const u = urteil("solar-wtm-fri.ipsyscon.de", seite("Landkreise Wittmund und Friesland", "", "Photovoltaik Potenzial. 4. Kompetenten Fachbetrieb finden: In der Region finden Interessierte viele Fachfirmen."));
    expect(u.art).not.toBe("betrieb");
  });

  it("a review praising 'diesen Fachbetrieb' is no claim of the site", () => {
    const u = urteil("x-solar.de", seite("X", "", "Photovoltaik. Wir können diesen Fachbetrieb nur weiter empfehlen."), "X GmbH Weg 1 12345 Ort");
    expect(u.art).toBe("unklar");
  });

  it("a self-claim counts: 'Ihr Elektro-Fachbetrieb'", () => {
    const u = urteil("x-elektro.de", seite("X", "", "Photovoltaik. Ihr Elektro-Fachbetrieb aus Schönderling."), "X GmbH Weg 1 12345 Ort");
    expect(u).toMatchObject({ art: "betrieb", grund: "Meister/Handwerksrolle" });
  });

  it("'Handwerksrolle' in a city's A–Z list is no entry (ebersberg.de)", () => {
    const u = urteil("ebersberg.de", seite("Ebersberg", "", "Photovoltaik Handwerksbetrieb Handwerkskammern Handwerkskarte Handwerksrecht Handwerksrolle Hauptschule"));
    expect(u.art).not.toBe("betrieb");
  });

  it("a ministry and a city name themselves in the title (stmwi.bayern.de, heilbronn.de)", () => {
    expect(urteil("stmwi.bayern.de", seite("Bayerisches Wirtschaftsministerium", "Förderprogramme, Meisterbonus und Energiewende", "Photovoltaik"))).toMatchObject({ klasse: "behoerde" });
    expect(urteil("heilbronn.de", seite("Stadt Heilbronn", "", "Photovoltaik"), "Handwerkskammer Heilbronn-Franken")).toMatchObject({ klasse: "behoerde" });
  });

  it("'Meisterbonus' in a description is no master craftsman", () => {
    expect(urteil("foerder-info.de", seite("Förderinfo", "Förderprogramme, Meisterbonus und Energiewende", "Photovoltaik"), "Förderinfo GmbH Weg 1 12345 Ort").art).toBe("unklar");
  });

  it("a citizens' solar project is no installer (buergerprojekt-solar-dachau.de)", () => {
    expect(urteil("buergerprojekt-solar-dachau.de", seite("Das Bürgerprojekt Solar", "", "Photovoltaik auf dem Rathausdach"))).toMatchObject({ klasse: "verband" });
  });

  it("an installed investment product is no installation offer (sunshineenergy.de)", () => {
    const u = urteil("sunshineenergy.de", seite("SunShine", "", "Photovoltaik Investment kaufen. Die PV-Anlage Wittingen II ist vollständig installiert und am Netz."), "SunShine Sales GmbH Weg 1 12345 Ort");
    expect(u.art).toBe("unklar");
  });

  it("the topic form 'Die Installation einer PV-Anlage steigert …' is advice (sysmartec.de)", () => {
    const u = urteil("sysmartec.de", seite("SYSMARTEC", "", "Kapitalanlage. Die Installation einer PV-Anlage steigert den Wert Ihrer Immobilie."), "SYSMARTEC GmbH Weg 1 12345 Ort");
    expect(u.art).toBe("unklar");
  });

  it("a lead seller named in the imprint (photovoltaik-firma.de)", () => {
    const u = urteil("photovoltaik-firma.de", seite("Photovoltaik Firma", "", "Photovoltaik für Ihr Dach"), "Angaben gemäß § 5 TMG Leads Navigator GmbH Weg 1 10115 Berlin");
    expect(u).toMatchObject({ art: "kein-betrieb", klasse: "portal" });
  });
});

describe("promotions of the fourth run, gegengelesen (06.10.2026)", () => {
  const imp = "Muster GmbH Weg 1 12345 Ort";
  it("a portal addressing 'Ihrem Fachbetrieb' makes no claim (solartechnik.org)", () => {
    expect(urteil("solartechnik.org", seite("Firmenpräsentation", "", "Photovoltaik. solartechnik.org bietet Ihrem Fachbetrieb die Möglichkeit, sich zu präsentieren."), imp).art).not.toBe("betrieb");
  });
  it("'Ihrem Fachbetrieb' is the reader's, not the site's", () => {
    expect(urteil("e.de", seite("E", "", "Photovoltaik. Wir bieten Ihrem Fachbetrieb einen Eintrag."), "E GmbH Weg 1 12345 Ort").art).toBe("unklar");
  });
  it("a price comparison in the description", () => {
    expect(urteil("f.de", seite("F", "Preisvergleich für Solaranlagen", "Photovoltaik"), "F GmbH Weg 1 12345 Ort")).toMatchObject({ klasse: "portal" });
  });
  it("'Als Fachbetrieb anmelden' is a directory (installateur24.de)", () => {
    expect(urteil("installateur24.de", seite("installateur24", "", "Photovoltaik Für Fachbetriebe Als Fachbetrieb anmelden Fachbetrieb finden"), imp)).toMatchObject({ klasse: "portal" });
  });
  it("'Wir vermitteln Anfragen' is a lead seller (euskirchen-solar.de)", () => {
    expect(urteil("euskirchen-solar.de", seite("EuskirchenSolar", "Wir vermitteln Anfragen ausschließlich an geprüfte Fachbetriebe", "Photovoltaik Meisterbetrieb"), imp)).toMatchObject({ klasse: "portal" });
  });
  it("a price comparison names itself (elektriker24.org)", () => {
    expect(urteil("elektriker24.org", seite("Elektriker in der Nähe | Elektriker finden", "Vergleichen Sie Preise", "Photovoltaik"), imp)).toMatchObject({ klasse: "portal" });
  });
  it("a magazine is a medium (pv-magazine.de)", () => {
    expect(urteil("pv-magazine.de", seite("Nachrichten zu Photovoltaik", "", "Photovoltaik"), "Angaben gemäß § 5 TMG pv magazine group GmbH & Co. KG Kurfürstendamm 64 10707 Berlin")).toMatchObject({ klasse: "medium" });
  });
  it("a citizens' solar cooperative and an Innung are associations", () => {
    expect(urteil("solar-lausitz.de", seite("Solar Lausitz", "", "Photovoltaik"), "Solargenossenschaft Lausitz eG Winkelstraße 8 03172 Guben")).toMatchObject({ klasse: "verband" });
    expect(urteil("elektroinnung-x.de", seite("Innung Main-Tauber-Kreis", "", "Photovoltaik Installation von Photovoltaikanlagen"))).toMatchObject({ klasse: "verband" });
  });
  it("a city's official portal with ':' in its title (heilbronn.de)", () => {
    expect(urteil("heilbronn.de", seite("Stadt Heilbronn: Startseite", "", "Photovoltaik"), "Handwerkskammer Heilbronn-Franken")).toMatchObject({ klasse: "behoerde" });
  });
  it("someone else installs: partners, Fachbetriebe, an example (sunshineenergy.de, stawag.de)", () => {
    expect(urteil("a.de", seite("A", "", "Unsere zertifizierten Partner installieren PV-Anlagen nach höchsten Standards."), imp).art).toBe("unklar");
    expect(urteil("b.de", seite("B", "", "Von der Planung bis zur Photovoltaik mit Fachbetrieben aus der Region."), imp).art).toBe("unklar");
  });
  it("…but 'Ihr Partner für Photovoltaik-Installation' is the installer itself", () => {
    expect(urteil("c.de", seite("C", "", "Ihr regionaler Partner für Photovoltaik-Installation in NRW."), imp).art).toBe("betrieb");
  });
  it("'Montagesystem' is a product, not mounting (ratgeber-solar.com)", () => {
    expect(urteil("ratgeber-solar.com", seite("Ratgeber", "", "Die Vorteile des Solar Schiene Montagesystems für effiziente PV-Anlagen"), imp).art).toBe("unklar");
  });
  it("advice continues after the match: 'Vor der Installation einer Solaranlage sollte …'", () => {
    expect(urteil("d.de", seite("D", "", "Vor der Installation einer Solarstromanlage sollte die Lebensdauer des Daches geprüft werden."), imp).art).toBe("unklar");
  });
});

describe("the fifth run, gegengelesen (06.10.2026)", () => {
  const meister = (txt: string, imp: string) => urteil("x.de", seite("X", "", `Photovoltaik vom Meisterbetrieb. ${txt}`), imp);
  it("'Marktplatz 8' is a street", () => {
    expect(meister("", "Folz Elektrotechnik e.K. Viktor Folz Marktplatz 8, 61169 Friedberg").art).toBe("betrieb");
  });
  it("'wir vermitteln Sie nicht weiter' is the opposite of a lead seller", () => {
    expect(meister("Wir kommen selbst vorbei, wir vermitteln Sie nicht weiter.", "X GmbH Weg 1 12345 Ort").art).toBe("betrieb");
  });
  it("'E-Mail-Adressen' in a disclaimer is no address directory", () => {
    expect(meister("", "Angaben gemäß § 5 TMG Ahrens GmbH. Der Nutzung von E-Mail-Adressen wird widersprochen. Weg 1 12345 Ort").art).toBe("betrieb");
  });
  it("a 'PV-Magazin' menu item is no medium", () => {
    expect(meister("", "Impressum hellgrün PV-Magazin Über uns Presse hellgrün GmbH Weg 1 12345 Ort").art).toBe("betrieb");
  });
});

describe("evidence of a trade — 'betrieb' needs one", () => {
  it("the Handwerkskammer in the imprint", () => {
    const u = urteil("haustechnik-markert.de", seite("Heizung", "", "Erneuerbare Energien Photovoltaik"), "Impressum Haustechnik Markert Balbachtalstraße 21a 97922 Lauda Zugehörige Kammer Handwerkskammer Heilbronn-Franken");
    expect(u).toMatchObject({ art: "betrieb", grund: "Handwerkskammer im Impressum" });
  });

  it("a registered trade business in the navigation (febe-energie.de)", () => {
    const u = urteil("febe-energie.de", seite("febe | Sonnenenergie", "", "PHOTOVOLTAIK DACHANLAGE Eingetragener Handwerksbetrieb TEAM"));
    expect(u).toMatchObject({ art: "betrieb", grund: "Meister/Handwerksrolle" });
  });

  it("a trade in the provider's name", () => {
    const u = urteil("pv-wicht.de", seite("PV-WICHT", "", "Photovoltaik Neubau und Wartung"), "Angaben gemäß § 5 TMG: PV-WICHT GmbH Von-Riedheim-Straße 9c 89364 Rettenbach");
    expect(u).toMatchObject({ art: "betrieb", grund: "Gewerk im Namen des Anbieters" });
  });

  it("a trade in the self-description (peter-seven.de)", () => {
    const u = urteil("peter-seven.de", seite("Startseite – Peter Seven GmbH", "erfahrener Fachmann in Sachen Heizung, Sanitär oder Klima", "Photovoltaik Angebotsrechner"), "Peter Seven GmbH Halligstrasse 5 51377 Leverkusen");
    expect(u).toMatchObject({ art: "betrieb", grund: "Gewerk in der Selbstbeschreibung" });
  });

  it("the site offering to install PV itself", () => {
    const u = urteil("xelios.tech", seite("Xelios", "", "Wir unterstützen Sie bei der Planung Ihrer Photovoltaikanlage bis zur Installation."), "Xelios GmbH Heinrich-Lanz-Straße 8 69514 Laudenbach");
    expect(u).toMatchObject({ art: "betrieb", grund: "bietet Montage/Installation an" });
  });

  it("advice about building a PV system is not an offer", () => {
    const u = urteil("beispiel.de", seite("Beispiel", "", "Welches Dach ist für die Errichtung einer Solaranlage geeignet?"), "Beispiel GmbH Weg 1 12345 Ort");
    expect(u.art).toBe("unklar");
  });

  it("PV mentioned but no evidence of a trade → unklar, never betrieb", () => {
    const u = urteil(
      "eenergie-solutions.de",
      seite("eEnergie Solutions", "Mit unseren Photovoltaik-, Stromspeicher- und Servicelösungen helfen wir Ihnen", "Photovoltaik Speicher Service"),
      "Impressum gemäß §5 TMG eEnergie Solutions GmbH Am Buchhölzle 6 88273 Fronreute",
    );
    expect(u.art).toBe("unklar");
  });

  it("no PV offer at all → unklar", () => {
    const u = urteil("elektro-x.de", seite("Elektro X", "", "Elektroinstallation Smart Home"), "Elektro X GmbH Weg 1 12345 Ort Handwerkskammer Köln");
    expect(u.art).toBe("unklar");
  });
});

describe("provider block", () => {
  it("starts at the provider statement, not at the navigation's 'Impressum'", () => {
    const b = anbieterBlock("Start Leistungen Impressum Kontakt Ein Satz Angaben gemäß § 5 TMG Muster GmbH Weg 1 12345 Musterstadt Haftung");
    expect(b).toMatch(/^Angaben gemäß/);
    expect(b).toContain("Muster GmbH");
  });
});

describe("where a non-installer belongs instead", () => {
  it("utilities go to the utility list, media to the press catalogue, the rest nowhere", () => {
    expect(ZIEL_BESTAND).toEqual({ versorger: "versorger", medium: "presse", verband: null, behoerde: null, portal: null, handel: null });
  });
});

describe("the district-search spread never makes a 'betrieb'", () => {
  it("a new regional domain starts as unklar", () => {
    expect(artNachStreuung(undefined, false, 2, 400, 20).art).toBe("unklar");
  });
  it("an existing verdict survives the next search — the demotion of a Stadtwerk stays", () => {
    const bisher = { art: "kein-betrieb", art_grund: "Energieversorger (Anbieter im Impressum)" };
    expect(artNachStreuung(bisher, false, 1, 400, 20)).toEqual(bisher);
  });
  it("wide spread still means überregional", () => {
    expect(artNachStreuung({ art: "betrieb", art_grund: "x" }, true, 40, 400, 20).art).toBe("ueberregional");
  });
  it("back below the threshold is not evidence either", () => {
    expect(artNachStreuung({ art: "ueberregional", art_grund: "x" }, false, 5, 400, 20).art).toBe("unklar");
  });
});

describe("verdicts this rule must not overwrite", () => {
  it("a person's decision and another stock's claim stay; old word-rule demotions do not", () => {
    expect(behaeltEinordnung({ art: "kein-betrieb", art_grund: "von Hand entschieden: Medium" })).toBe(true);
    expect(behaeltEinordnung({ art: "kein-betrieb", art_grund: "steht im Bestand Versorger (X) — amtliche Quelle geht vor" })).toBe(true);
    expect(behaeltEinordnung({ art: "kein-betrieb", art_grund: "Kommune/Behörde (Rathaus)" })).toBe(false);
  });
});

describe("an old demotion is lifted only on the chamber in the imprint", () => {
  it("keeps it on weak evidence or none, lifts it on the chamber, reclassifies on a new class", () => {
    expect(alteRueckstufungBleibt({ art: "unklar", grund: "x" })).toBe(true);
    expect(alteRueckstufungBleibt({ art: "betrieb", grund: "Meister/Handwerksrolle", beleg: "" })).toBe(true);
    expect(alteRueckstufungBleibt({ art: "betrieb", grund: "Handwerkskammer im Impressum", beleg: "" })).toBe(false);
    expect(alteRueckstufungBleibt({ art: "kein-betrieb", klasse: "versorger", grund: "x", beleg: "" })).toBe(false);
  });
});
