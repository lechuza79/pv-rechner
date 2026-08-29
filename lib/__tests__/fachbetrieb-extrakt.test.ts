/**
 * Die Extraktion der Fachbetriebs-Merkmale.
 *
 * JEDER Fall hier stammt aus einem gemessenen Fehlgriff des Eichlaufs vom
 * 27.08.2026 (25 Betriebe, jede Zeile von Hand gegengelesen). Die Quoten des
 * ersten Laufs sahen gut aus — 88 % mit Anschrift, 40 % mit
 * Handelsregisternummer — und enthielten trotzdem sechs Fehlerklassen. Keine
 * davon war an einer Quote zu erkennen.
 *
 * Wer ein Muster aufweicht, macht diesen Test rot. Das ist die Absicht:
 * Die Regex zu entschärfen, damit mehr Treffer entstehen, ist genau der Weg,
 * auf dem die Fehlgriffe zurückkommen.
 *
 * Herleitung: docs/fachbetriebe-quellen.md
 */

import { describe, it, expect } from "vitest";
import {
  FRAGEN,
  GEWERKE,
  KEIN_BETRIEB,
  besteMail,
  bewertungAusDaten,
  faviconUrl,
  firmennameSaeubern,
  gruendungsjahrAus,
  handwerkskammerAus,
  impressumUrl,
  istPlattform,
  mailBrauchbar,
  normOrt,
  ortsname,
  portalSchwelle,
  profilAus,
  rechtsformVon,
  sichtbarerText,
} from "../fachbetrieb-extrakt";

const JETZT = 2026;

describe("Rechtsform: Wortgrenzen, sonst liest der Extraktor Unsinn", () => {
  it("erkennt die üblichen Formen", () => {
    expect(rechtsformVon("Muster Solar GmbH")).toBe("GmbH");
    expect(rechtsformVon("Baltic smart Energy GmbH & Co. KG")).toBe("GmbH & Co. KG");
    expect(rechtsformVon("Baltic Smart Home GbR")).toBe("GbR");
    expect(rechtsformVon("Solarpark AG")).toBe("AG");
    expect(rechtsformVon("Energie eG")).toBe("eG");
  });

  it("liest KEINE Rechtsform aus der Wortmitte — beide Fälle sind real vorgekommen", () => {
    // „DORFMANAGEMENT“ enthält die Buchstaben von AG, „WERKZEUG“ die von UG.
    // Beide standen nach dem ersten Lauf plausibel in der Rechtsform-Spalte.
    expect(rechtsformVon("DORF! - DORFMANAGEMENT")).toBeNull();
    expect(rechtsformVon("WERKZEUG")).toBeNull();
    expect(rechtsformVon("Ladenlokal Wohnungsbau")).toBeNull();
  });

  it("nimmt die spezifischste Form, nicht die erste passende", () => {
    // Ohne die Reihenfolge in RECHTSFORMEN gewänne „GmbH“ gegen „GmbH & Co. KG“.
    expect(rechtsformVon("Hansen GmbH & Co KG")).toBe("GmbH & Co. KG");
  });
});

describe("Firmenname: was die Seite dazugeschrieben hat, gehört nicht dazu", () => {
  // ALLE Fälle hier sind ECHT und stammen aus einer Auszählung über den fertigen
  // Bestand (28.08.2026): 633 von 3.115 Namen — 20 % — trugen Müll, in fünf
  // klaren Klassen. Der Betreiber hat es an einer Karte gesehen, bevor eine
  // Quote es gezeigt hätte: „die firmenbezeichnungen sind crap".
  //
  // Der Grundfehler war, den Seitentitel als Rückfall oberflächlich zu putzen.
  // Ein Seitentitel ist fast nie der Firmenname.

  it("entfernt den Rest einer zerlegten Impressum-Überschrift", () => {
    // „Impressum & Datenschutz – X GmbH": Das erste Wort war entfernt, das
    // zweite blieb stehen und stand danach als Firmenname in der Liste.
    expect(firmennameSaeubern("& Datenschutz - SED-Solar GmbH")).toBe("SED-Solar GmbH");
    expect(firmennameSaeubern("& Datenschutz - Georg Huber Elektroanlagen GmbH")).toBe(
      "Georg Huber Elektroanlagen GmbH",
    );
    expect(firmennameSaeubern("& Showroom - EvoSell GmbH")).toBe("EvoSell GmbH");
  });

  it("löst HTML-Entitäten auf, bevor irgendetwas anderes passiert", () => {
    expect(firmennameSaeubern("&ndash; AURORASOL GmbH")).toBe("AURORASOL GmbH");
  });

  it("wirft Emojis und nachgestellte Seitenwörter weg", () => {
    expect(firmennameSaeubern("KB Solartec GmbH ☀️ Impressum ❤️ Solaranlage nachhaltig")).toBe(
      "KB Solartec GmbH",
    );
    expect(firmennameSaeubern("Elektro-Klaas GmbH: Impressum")).toBe("Elektro-Klaas GmbH");
    expect(
      firmennameSaeubern("Sachsensolar GmbH Zum Inhalt springen ➤ Jetzt 1000 € Sofortbonus sichern"),
    ).toBe("Sachsensolar GmbH");
  });

  it("findet den Namen auch HINTEN im Seitentitel", () => {
    // Die erste Fassung nahm bei mehreren Teilen den ersten — und der ist im
    // Seitentitel meist das Schlagwort, nicht der Betrieb.
    expect(
      firmennameSaeubern("Photovoltaik und Elektrotechnik - Mac Metzler Energietechnik GmbH"),
    ).toBe("Mac Metzler Energietechnik GmbH");
    expect(firmennameSaeubern("Home | ABEL ReTec GmbH")).toBe("ABEL ReTec GmbH");
    expect(firmennameSaeubern("Impressum - 3E-Elektrotechnik GmbH")).toBe("3E-Elektrotechnik GmbH");
  });

  it("nimmt aus einem Titel ohne Rechtsform den Namensteil, nicht den Werbeteil", () => {
    expect(
      firmennameSaeubern("Jendrian Haustechnik - Bad, Heizungsbau, Klima und Wasser aus Wesel"),
    ).toBe("Jendrian Haustechnik");
    expect(
      firmennameSaeubern("Solaranlagen Bayern - Sie kontaktieren uns und wir erledigen alles!"),
    ).toBe("Solaranlagen Bayern");
  });

  it("verwirft, was gar kein Name ist — lieber keiner als ein falscher", () => {
    // Ohne Namen zeigt die Liste die Adresse, und die stimmt immer.
    expect(firmennameSaeubern("Solarprodukte zu den besten Tagespreisen kaufen")).toBeNull();
    expect(firmennameSaeubern("GmbH & Co. KG")).toBeNull();
    expect(firmennameSaeubern("GmbH")).toBeNull();
    expect(firmennameSaeubern("")).toBeNull();
  });

  it("schneidet nachlaufende Feldbeschriftungen ab", () => {
    expect(firmennameSaeubern("Name 3NERGY GmbH Adresse Am Pönitzer Dreieck 1")).toBe(
      "3NERGY GmbH",
    );
    expect(firmennameSaeubern("Impressum und Kontaktdaten A9 Solar GmbH")).toBe("A9 Solar GmbH");
  });

  it("entfernt unsichtbare Zeichen — Wix und Webflow setzen sie in Überschriften", () => {
    // Im Namen sieht man sie nicht, aber sie sortieren ihn an den Anfang der
    // Liste und stünden in einem Anschreiben vor dem Firmennamen.
    expect(firmennameSaeubern("\u200B\u200B Anysolar GmbH")).toBe("Anysolar GmbH");
    expect(firmennameSaeubern("\u200D EnCrease Energiesysteme GmbH")).toBe(
      "EnCrease Energiesysteme GmbH",
    );
    expect(firmennameSaeubern("\uFEFFSolar GMI GmbH")).toBe("Solar GMI GmbH");
  });

  it("zerschneidet KEINE Aufzählung im Namen — ab vier Teilen wird nicht getrennt", () => {
    // Der Fix für die Seitentitel erzeugte prompt einen neuen Fehler: Aus
    // „Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH -
    // Elektromeisterbetrieb Berlin" wurde „Sanitär GmbH". Das sah in der Liste
    // aus wie ein Firmenname und war mitten aus einem herausgeschnitten. Ab
    // vier Teilen sind die Striche eine Aufzählung, kein Titel-Trenner.
    expect(
      firmennameSaeubern(
        "Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH - Elektromeisterbetrieb Berlin",
      ),
    ).not.toBe("Sanitär GmbH");
  });

  it("entfernt einen führenden Trenner", () => {
    // „| EK Fuchs Solar- & Elektrotechnik" ergab nur einen Teil, wurde deshalb
    // nicht zerlegt — und behielt den Strich.
    expect(firmennameSaeubern("| EK Fuchs Solar- & Elektrotechnik")).toBe(
      "EK Fuchs Solar- & Elektrotechnik",
    );
  });

  it("nimmt KEINE fremde Firma aus dem Impressum — der teuerste Fehlgriff", () => {
    // „Diese Website wurde erstellt von mai multimedia — Bildrechte © Vaillant
    // Deutschland GmbH & Co. KG" stand als Firmenname über einem Betrieb, der
    // duo energy heißt. Adresse und E-Mail waren richtig, nur der Name gehörte
    // jemand anderem — in einem Anschreiben der schlimmste Fehler von allen.
    expect(firmennameSaeubern("© Vaillant Deutschland GmbH & Co. KG ( www.vaillant.de )")).toBeNull();
    expect(firmennameSaeubern("© 2026 Zukunftssolar UG (haftungsbeschränkt)")).toBeNull();
    expect(firmennameSaeubern("Copyright 2000-2022 janolaw AG. All Rights Reserved")).toBeNull();
  });

  it("verwirft HTML-Reste", () => {
    expect(firmennameSaeubern('<p>© 2026 Avacon AG</p>" rte-source="aem"')).toBeNull();
  });

  it("entfernt führende Anführungszeichen und Pfeile", () => {
    expect(firmennameSaeubern("» Palme Solar GmbH")).toBe("Palme Solar GmbH");
    expect(firmennameSaeubern('"RNS-Energy GmbH"')).toBe("RNS-Energy GmbH");
  });

  it("schneidet die Anschrift hinter der Rechtsform ab", () => {
    // Gefunden erst beim Durchlesen ALLER Namen nach Länge sortiert, nicht von
    // einer Musterprüfung: Die Impressumszeile trägt Name und Anschrift ohne
    // Trennzeichen dazwischen. Kein Muster schlug an, weil jeder einzelne Name
    // für sich plausibel aussah — nur die Länge verriet sie.
    expect(
      firmennameSaeubern("Banik Haustechnik Schwabach GmbH O´Brien-Straße 2 91126 Schwabach Deutschland"),
    ).toBe("Banik Haustechnik Schwabach GmbH");
    expect(firmennameSaeubern("WATT's los GmbH, Waldstraße 10, 57223 Kreuztal, Deutschland")).toBe(
      "WATT's los GmbH",
    );
    expect(firmennameSaeubern("Rieger & Kraft Solar GmbH 09141 / 923 239 kontakt@solar-rieger-kraft.de")).toBe(
      "Rieger & Kraft Solar GmbH",
    );
    expect(firmennameSaeubern("Soleno GmbH Soleno GmbH Leistungen Ratgeber Über uns Kontakt")).toBe(
      "Soleno GmbH",
    );
    expect(firmennameSaeubern("Dietmar Korn Haustechnik GmbH in Kamenz / Landkreis Bautzen / Sachsen")).toBe(
      "Dietmar Korn Haustechnik GmbH",
    );
  });

  it("behält die Zusätze, die zur Rechtsform selbst gehören", () => {
    // „Muster GmbH & Co. KG" auf „Muster GmbH" zu kürzen benennt eine ANDERE
    // Gesellschaft — die Kürzung hinter der Rechtsform darf hier nicht greifen.
    expect(
      firmennameSaeubern("Elektro- und Kommunikationstechnik Hans & Uwe Köhler GmbH & Co. KG"),
    ).toBe("Elektro- und Kommunikationstechnik Hans & Uwe Köhler GmbH & Co. KG");
    expect(firmennameSaeubern("Energie- & Elektrotechnik Hohenzollern UG (haftungsbeschränkt)")).toBe(
      "Energie- & Elektrotechnik Hohenzollern UG (haftungsbeschränkt)",
    );
    expect(firmennameSaeubern("Solarfachbetrieb Solar Heisse GmbH & Co. KG, Landsberg am Lech")).toBe(
      "Solarfachbetrieb Solar Heisse GmbH & Co. KG",
    );
  });

  it("verwirft Leistungsversprechen ohne Firmennamen", () => {
    // Die zweite Klasse aus der vollständigen Durchsicht: Die Seite nennt im
    // Titel und im Impressum-Kopf gar keinen Namen, nur was sie anbietet. 167
    // Fälle im Bestand, jeder für sich unauffällig.
    expect(firmennameSaeubern("Experte für Photovoltaik, erneuerbare Energie & Solaranlagen")).toBeNull();
    expect(firmennameSaeubern("Badrenovierung und Heizungsbau im Raum Cuxhaven & Otterndorf")).toBeNull();
    expect(firmennameSaeubern("Hochwertige Photovoltaikanlagen für Hamburg und Umgebung")).toBeNull();
    expect(firmennameSaeubern("Elektriker in Bielefeld")).toBeNull();
    expect(firmennameSaeubern("Alles aus einer Hand")).toBeNull();
  });

  it("rettet den Namen, der VOR dem Leistungsversprechen steht", () => {
    // Alles wegzuwerfen wäre derselbe Fehler in der anderen Richtung.
    expect(firmennameSaeubern("SEAC Group Experten für solare Freiflächenanlagen")).toBe("SEAC Group");
    expect(firmennameSaeubern("Kuhlmann Gebäudetechnik für Privat & Gewerbe, Wesermarsch")).toBe(
      "Kuhlmann Gebäudetechnik",
    );
    expect(firmennameSaeubern("Novontech deine Beratung für Photovoltaik und Solarenergie")).toBe("Novontech");
    expect(firmennameSaeubern("Sonnenkönig Spezialist für Solar- & Energiespar-Technik")).toBe("Sonnenkönig");
  });

  it("hält durchgehende Großschreibung für Initialen, nicht für ein Verhältniswort", () => {
    // Gemessener Fehlgriff der Werbesatz-Regel, sichtbar NUR weil dieselbe
    // Auszählung nach dem Fix ein zweites Mal lief: Der Bestand verlor plötzlich
    // MEHR Namen (168 statt 131). „IM" sind die Initialen des Inhabers.
    expect(firmennameSaeubern("IM Elektrotechnik Nord")).toBe("IM Elektrotechnik Nord");
  });

  it("liest das freistehende I als Trennstrich", () => {
    expect(firmennameSaeubern("Elektrotechnik Birkefeld I Elektromeisterbetrieb in Ellrich")).toBe(
      "Elektrotechnik Birkefeld",
    );
    // Eine Initiale mit Punkt bleibt Teil des Namens.
    expect(firmennameSaeubern("Elektro I. Müller GmbH")).toBe("Elektro I. Müller GmbH");
  });

  it("schneidet den Vorspann ab, mit dem ein Impressum den Namen einleitet", () => {
    expect(firmennameSaeubern("Diese Webseite ist ein Angebot von Solartechnik Türpe GbR")).toBe(
      "Solartechnik Türpe GbR",
    );
    expect(firmennameSaeubern("Erklärungen gemäß § 5 Grüne Strahlen Memmingen GmbH")).toBe(
      "Grüne Strahlen Memmingen GmbH",
    );
    expect(firmennameSaeubern("Anschrift (Firmensitz) Dachdeckerei Wilhelm GmbH")).toBe(
      "Dachdeckerei Wilhelm GmbH",
    );
    expect(firmennameSaeubern("Willkommen bei Stockner Solar is under construction")).toBe(
      "Stockner Solar",
    );
  });

  it("verwirft reine Leistungsaufzählungen — kein Wort darin ist ein Name", () => {
    expect(firmennameSaeubern("PV-Anlagen, Batteriespeicher und Wärmepumpen")).toBeNull();
    expect(firmennameSaeubern("Elektroarbeiten, Badsanierung & Heizungsbau")).toBeNull();
    expect(firmennameSaeubern("Photovoltaikanlage Beratung Installation")).toBeNull();
    expect(firmennameSaeubern("Sanitär Heizung")).toBeNull();
  });

  it("hält Branchenwörter ENG — ein Name, der so anfängt, ist keine Gattung", () => {
    // Gemessener Fehlgriff derselben Regel, gefunden im Trockenlauf: „Solar\\w*"
    // fraß „Solarma", und „GMBH" in Versalien galt nicht als Rechtsform — der
    // echte Betrieb „Solarma Montageservice GMBH" wäre ersatzlos entfallen.
    expect(firmennameSaeubern("Solarma Montageservice GMBH")).toBe("Solarma Montageservice GMBH");
    expect(firmennameSaeubern("Solarix Energie")).toBe("Solarix Energie");
    expect(firmennameSaeubern("Elektrofix Nord")).toBe("Elektrofix Nord");
    expect(firmennameSaeubern("PV-Anlagen Schmidt")).toBe("PV-Anlagen Schmidt");
    expect(firmennameSaeubern("Hausch Heizungsbau & Badsanierung")).toBe(
      "Hausch Heizungsbau & Badsanierung",
    );
    // Versalien sind ein Markenname, keine Aufzählung — „PV ELEKTRO" ist der
    // Betrieb hinter pv-elektro.de.
    expect(firmennameSaeubern("PV ELEKTRO")).toBe("PV ELEKTRO");
    expect(firmennameSaeubern("SUNSTAR SOLARTECHNIK")).toBe("SUNSTAR SOLARTECHNIK");
  });

  it("verwirft einzelne Menüpunkte und Gattungswörter als Namen", () => {
    // Am KURZEN Ende der Durchsicht sichtbar geworden — dort sehen die Fehler
    // anders aus als bei den langen: „Start" stand elfmal in der Liste.
    expect(firmennameSaeubern("Start")).toBeNull();
    expect(firmennameSaeubern("Das")).toBeNull();
    expect(firmennameSaeubern("Solar")).toBeNull();
    // Aber ein echter kurzer Name bleibt.
    expect(firmennameSaeubern("Solux")).toBe("Solux");
    expect(firmennameSaeubern("SMA")).toBe("SMA");
    expect(firmennameSaeubern("Startec GmbH")).toBe("Startec GmbH");
    expect(firmennameSaeubern("Smart Energy Nord")).toBe("Smart Energy Nord");
  });

  it("ist IDEMPOTENT — zweimal geputzt ergibt dasselbe wie einmal", () => {
    // Die schärfste Eigenschaft dieser Funktion, und sie fehlte: Ein schon
    // geputzter Name hat einen Trenner weniger und fiel deshalb beim zweiten
    // Durchgang unter eine Teilezahl-Schwelle — aus „Uwe Schmidt
    // Elektroinstallation Gas | Wasser | Sanitär GmbH" wurde wieder „Sanitär
    // GmbH", aus „Elektro - Blum Inh. Heiko Schmonsees - Bremerhaven" wurde
    // „Elektro". Sichtbar wurde das erst beim Nachputzen des Bestands.
    //
    // Ohne diese Eigenschaft ist die Reinigung nicht wiederholbar — und
    // wiederholt wird sie bei jedem Lauf.
    const faelle = [
      "Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH - Elektromeisterbetrieb Berlin",
      "Elektro - Blum Inh. Heiko Schmonsees - Bremerhaven",
      "Photovoltaik und Elektrotechnik - Mac Metzler Energietechnik GmbH",
      "Jendrian Haustechnik - Bad, Heizungsbau, Klima und Wasser aus Wesel",
      "Home | ABEL ReTec GmbH",
      "& Datenschutz - SED-Solar GmbH",
      "Muster Solar GmbH",
      "Klemm Wasser + Wärme GmbH | Kaufbeuren | Heizung Service Bad",
      "SolTer - Solar GmbH | Photovoltaik Dresden",
    ];
    for (const f of faelle) {
      const einmal = firmennameSaeubern(f);
      expect(firmennameSaeubern(einmal)).toBe(einmal);
    }
  });

  it("schneidet nicht fast alles weg — ein Restanteil unter einem Viertel ist verdächtig", () => {
    // „Elektro - Blum Inh. Heiko Schmonsees - Bremerhaven" wurde zu „Elektro".
    expect(firmennameSaeubern("Elektro - Blum Inh. Heiko Schmonsees - Bremerhaven")).not.toBe(
      "Elektro",
    );
    expect(
      firmennameSaeubern("Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH"),
    ).not.toBe("Sanitär GmbH");
  });

  it("lässt einen sauberen Namen unangetastet", () => {
    expect(firmennameSaeubern("Muster Solar GmbH")).toBe("Muster Solar GmbH");
    expect(firmennameSaeubern("Elektro Klaas GmbH")).toBe("Elektro Klaas GmbH");
    expect(firmennameSaeubern("Homann Solarbau GmbH")).toBe("Homann Solarbau GmbH");
    // Ein langer, echter Name bleibt — die Längengrenze darf ihn nicht fressen.
    expect(firmennameSaeubern("Energie- & Elektrotechnik Hohenzollern UG (haftungsbeschränkt)")).toBe(
      "Energie- & Elektrotechnik Hohenzollern UG (haftungsbeschränkt)",
    );
  });
});

describe("Gewerk: WER es anbietet, nicht WAS angeboten wird", () => {
  const finde = (t: string) => GEWERKE.filter((g) => g.muster.test(t)).map((g) => g.name);

  it("erkennt die üblichen Gewerke", () => {
    expect(finde("Elektro Klaas GmbH")).toContain("elektro");
    expect(finde("Ihr Solarteur in Bautzen")).toContain("solarteur");
    expect(finde("Meier Heizungsbau und Sanitär")).toContain("heizung_sanitaer");
    expect(finde("Dachdeckerei Schmidt")).toContain("dachdecker");
  });

  it("lässt einen Betrieb MEHRERE tragen — im Handwerk der Normalfall", () => {
    // Sich für eines zu entscheiden hieße, das andere zu verlieren.
    const g = finde("Elektro und Sanitär Wagner — Heizungsbau seit 1970");
    expect(g).toContain("elektro");
    expect(g).toContain("heizung_sanitaer");
  });

  it("vergibt KEINES, wenn nirgends eines steht", () => {
    // Die leere Liste ist eine ehrliche Auskunft, eine geratene Einordnung nicht.
    expect(finde("Sonnenkraft für Ihr Zuhause")).toEqual([]);
  });

  it("trennt das Elektroauto vom Elektrohandwerk", () => {
    // Steht auf jeder zweiten Solarteur-Seite und ist kein Gewerk. Umgekehrt
    // muss Elektro allein greifen — „Elektro Klaas GmbH" ist die häufigste
    // Schreibweise, und die erste Fassung des Musters verlangte ein Suffix.
    expect(finde("Wallbox für Ihr Elektroauto und Elektromobilität")).toEqual([]);
    expect(finde("Elektro Klaas GmbH")).toContain("elektro");
  });

  it("hält Gewerk und Geschäftsfeld auseinander", () => {
    // „Photovoltaik" ist ein Angebot, kein Gewerk — sonst wäre jeder Betrieb
    // in der Erhebung automatisch Solarteur, und die Spalte sagte nichts mehr.
    expect(finde("Wir bauen Photovoltaik und Speicher")).toEqual([]);
  });
});

describe("Favicon: gelesen, nicht geraten", () => {
  it("nimmt die Adresse aus dem HTML", () => {
    // Dieselbe Lehre wie beim Impressum: „/favicon.ico" ist nur eine von
    // mehreren Konventionen, und wer sie rät, bekommt bei vielen nichts.
    const html = '<link rel="icon" href="/wp-content/uploads/logo.png?v=3">';
    expect(faviconUrl(html, "https://beispiel.de/")).toBe(
      "https://beispiel.de/wp-content/uploads/logo.png?v=3",
    );
  });

  it("bevorzugt das größere Icon", () => {
    const html =
      '<link rel="icon" sizes="16x16" href="/klein.png">' +
      '<link rel="apple-touch-icon" href="/gross.png">';
    expect(faviconUrl(html, "https://beispiel.de/")).toBe("https://beispiel.de/gross.png");
  });

  it("ignoriert Links, die kein Icon sind", () => {
    expect(faviconUrl('<link rel="stylesheet" href="/a.css">', "https://b.de/")).toBeNull();
  });

  it("liefert null, wenn keins da ist — dann bleibt der Platz leer", () => {
    // Ein Ersatzbild würde eine Marke behaupten, die es nicht gibt.
    expect(faviconUrl("<p>Willkommen</p>", "https://b.de/")).toBeNull();
  });
});

describe("Bewertung aus strukturierten Daten — die eigene Seite, nie Google", () => {
  it("liest AggregateRating aus JSON-LD", () => {
    const html = `<script type="application/ld+json">
      {"@type":"LocalBusiness","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"37"}}
    </script>`;
    expect(bewertungAusDaten(html)).toEqual({ wert: 4.8, anzahl: 37 });
  });

  it("liest sie auch als Microdata", () => {
    const html =
      '<span itemprop="ratingValue" content="4.6"></span><span itemprop="reviewCount" content="12"></span>';
    expect(bewertungAusDaten(html)).toEqual({ wert: 4.6, anzahl: 12 });
  });

  it("verwirft eine Prozentskala — sie ließe sich mit den übrigen nicht vergleichen", () => {
    const html = `<script type="application/ld+json">
      {"aggregateRating":{"ratingValue":"98","reviewCount":"5"}}</script>`;
    expect(bewertungAusDaten(html)).toBeNull();
  });

  it("verlangt beide Zahlen — ein Schnitt ohne Anzahl ist wertlos", () => {
    const html = `<script type="application/ld+json">{"ratingValue":"4.9"}</script>`;
    expect(bewertungAusDaten(html)).toBeNull();
  });

  it("liefert null, wenn nichts da ist", () => {
    expect(bewertungAusDaten("<p>Willkommen</p>")).toBeNull();
  });
});

describe("E-Mail: die Adresse des Betriebs, nicht die erste im Text", () => {
  it("verwirft Beispiel- und Hoster-Adressen", () => {
    // Beide real: eine Beispieladresse aus einem Formularhinweis und die
    // Adresse des Hosters auf einer geparkten Domain.
    expect(mailBrauchbar("user@example.com")).toBe(false);
    expect(mailBrauchbar("info@ionos.de")).toBe(false);
    expect(mailBrauchbar("noreply@irgendwo.de")).toBe(false);
    expect(mailBrauchbar("info@elektro-mueller.de")).toBe(true);
  });

  it("bevorzugt die eigene Domain vor einer fremden", () => {
    expect(
      besteMail(["kontakt@fremd-portal.de", "info@elektro-mueller.de"], "elektro-mueller.de"),
    ).toBe("info@elektro-mueller.de");
  });

  it("nimmt eine fremde Adresse nur, wenn es keine eigene gibt", () => {
    expect(besteMail(["buero@verband.de"], "elektro-mueller.de")).toBe("buero@verband.de");
  });

  it("liefert null, wenn nur Unbrauchbares dasteht", () => {
    expect(besteMail(["user@example.com", "info@ionos.de"], "geparkt.de")).toBeNull();
  });
});

describe("Gründungsjahr: „seit 20XX“ allein reicht nicht", () => {
  it("nimmt ein ausdrückliches Gründungswort — in BEIDEN Wortstellungen", () => {
    // „wurde 1992 gegründet" ist im Deutschen die häufigere Form und fehlte in
    // der ersten Fassung des Musters.
    expect(gruendungsjahrAus("Das Unternehmen wurde 1992 gegründet.", JETZT)?.jahr).toBe(1992);
    expect(gruendungsjahrAus("gegründet 1992", JETZT)?.jahr).toBe(1992);
    expect(gruendungsjahrAus("Gründungsjahr: 2004", JETZT)?.jahr).toBe(2004);
  });

  it("sammelt kein Jahr ein, das weit vom Gründungswort entfernt steht", () => {
    expect(
      gruendungsjahrAus(
        "Im Jahr 2003 zogen wir in die neue Halle am Ortsrand, in der wir bis heute arbeiten, gegründet",
        JETZT,
      ),
    ).toBeNull();
  });

  it("nimmt „seit“ nur nahe einem Betriebswort", () => {
    expect(gruendungsjahrAus("Seit 1992 für Sie da", JETZT)?.jahr).toBe(1992);
    expect(gruendungsjahrAus("Familienbetrieb seit 1968", JETZT)?.jahr).toBe(1968);
  });

  it("fällt NICHT auf ein beliebiges „seit“ herein — real vorgekommen", () => {
    // Das Hamburger Abendblatt bekam so ein Gründungsjahr 2021.
    expect(gruendungsjahrAus("Er ist seit 2021 im Amt.", JETZT)).toBeNull();
    expect(gruendungsjahrAus("Die Förderung gilt seit 2023 bundesweit.", JETZT)).toBeNull();
  });

  it("nimmt ein Jahr aus den letzten zwei Jahren nur mit Gründungswort", () => {
    // „seit 2025“ ist auf einer Website fast immer etwas anderes.
    expect(gruendungsjahrAus("Neue Öffnungszeiten seit 2025 für Sie da", JETZT)).toBeNull();
    expect(gruendungsjahrAus("2025 gegründet", JETZT)?.jahr).toBe(2025);
  });

  it("nimmt das ÄLTESTE Jahr, nicht das erste im Text", () => {
    // Das jüngere ist meist ein Meilenstein, nicht die Gründung.
    const t = "Seit 2019 auch Wärmepumpen im Angebot. Unser Familienbetrieb seit 1974.";
    expect(gruendungsjahrAus(t, JETZT)?.jahr).toBe(1974);
  });

  it("verwirft unmögliche Jahre", () => {
    expect(gruendungsjahrAus("gegründet 1830", JETZT)).toBeNull();
    expect(gruendungsjahrAus("gegründet 2099", JETZT)).toBeNull();
  });
});

describe("Handwerkskammer: ein Ortsname, keine Überschrift", () => {
  it("liest den Kammerbezirk", () => {
    expect(handwerkskammerAus("Handwerkskammer Lübeck")?.name).toBe("Handwerkskammer Lübeck");
    expect(handwerkskammerAus("Handwerkskammer für München und Oberbayern")?.name).toContain(
      "München",
    );
  });

  it("hält die IHK von der Handwerkskammer fern — real vorgekommen", () => {
    // „Zuständige Handwerkskammer IHK Ulm" ergab „Handwerkskammer IHK Ulm",
    // eine Kammer, die es nicht gibt. Die Industrie- und Handelskammer ist
    // gerade NICHT die Handwerkskammer und sagt als Merkmal etwas anderes aus.
    expect(handwerkskammerAus("Zuständige Handwerkskammer IHK Ulm")).toBeNull();
    expect(handwerkskammerAus("Handwerkskammer Industrie- und Handelskammer")).toBeNull();
  });

  it("frisst NICHT die nächste Überschrift — real vorgekommen", () => {
    // So stand „Handwerkskammer Berufsrechtliche Regelungen“ in der Spalte.
    expect(handwerkskammerAus("Handwerkskammer\nBerufsrechtliche Regelungen")).toBeNull();
    expect(handwerkskammerAus("Handwerkskammer Zuständige Aufsichtsbehörde")).toBeNull();
    expect(handwerkskammerAus("Handwerkskammer Die Eintragung erfolgte")).toBeNull();
  });
});

describe("Portal oder Betrieb: die Streuung entscheidet", () => {
  it("hält die Schwelle bei wenigen abgefragten Kreisen hoch genug", () => {
    // Nach zehn Kreisen KANN keine Domain in acht auftauchen — ohne die
    // Untergrenze wäre in einem Teillauf jedes Portal ein „Betrieb“, und das
    // fällt nach der Vollabfrage niemandem mehr auf.
    expect(portalSchwelle(10)).toBe(8);
    expect(portalSchwelle(1)).toBe(8);
  });

  it("wächst mit der Zahl der abgefragten Kreise", () => {
    expect(portalSchwelle(400)).toBe(20);
    expect(portalSchwelle(200)).toBe(10);
  });

  it("erkennt große Plattformen unabhängig von der Streuung", () => {
    // Ein EINZELNER Facebook-Treffer käme sonst als „Betrieb mit einem Kreis“ durch.
    expect(istPlattform("facebook.com")).toBe(true);
    expect(istPlattform("de-de.facebook.com")).toBe(true);
    expect(istPlattform("elektro-mueller.de")).toBe(false);
    // Keine Teilstring-Treffer: eine Domain, die zufällig so endet, ist keine Plattform.
    expect(istPlattform("meinfacebook.com")).toBe(false);
  });
});

describe("Ortsname der Suchanfrage", () => {
  it("nennt eine kreisfreie Stadt beim Namen, einen Landkreis als Landkreis", () => {
    // „Landkreis Flensburg“ gibt es nicht und liefert entsprechend nichts.
    expect(ortsname({ id: "01001", name: "Flensburg", kind: "Kreisfreie Stadt", bl: "01" })).toBe(
      "Flensburg",
    );
    expect(ortsname({ id: "08235", name: "Calw", kind: "Landkreis", bl: "08" })).toBe(
      "Landkreis Calw",
    );
  });

  it("stellt zwei verschiedene Fragen je Kreis", () => {
    // Ein Begriff allein verlöre das Elektrohandwerk, das PV mitmacht, ohne es
    // im Namen zu führen.
    const k = { id: "06631", name: "Fulda", kind: "Landkreis", bl: "06" };
    const fragen = FRAGEN.map((f) => f.vorlage(k));
    expect(fragen).toHaveLength(2);
    expect(new Set(fragen).size).toBe(2);
    expect(fragen.some((f) => /Photovoltaik/i.test(f))).toBe(true);
    expect(fragen.some((f) => /Solarteur/i.test(f))).toBe(true);
  });
});

describe("Text aus HTML: Zeilengrenzen bleiben erhalten", () => {
  it("trennt Straße und Postleitzahl, weil die Anschrift davon lebt", () => {
    const t = sichtbarerText("<p>Musterweg 3</p><p>12345 Musterstadt</p>");
    expect(t.split("\n")).toEqual(["Musterweg 3", "12345 Musterstadt"]);
  });

  it("löst auch hexadezimale Entitäten auf", () => {
    // Ohne sie stand „Men&#xfc;“ im Firmennamen.
    expect(sichtbarerText("<p>Men&#xfc;</p>")).toBe("Menü");
    expect(sichtbarerText("<p>Gr&uuml;n &amp; Sonne</p>")).toBe("Grün & Sonne");
  });

  it("wirft Skripte und Stile weg", () => {
    expect(sichtbarerText("<script>var x=1</script><p>Solar</p>")).toBe("Solar");
  });
});

describe("Impressum-Adresse: nicht ratbar, sondern aus den Links gelesen", () => {
  it("findet den Link auch ohne den Pfad zu raten", () => {
    // Im Eichlauf traf /impressum in zwei von drei Fällen daneben — einmal
    // hieß die Seite impressum.html, einmal brauchte sie den Schrägstrich.
    const html = '<a href="impressum.html">Impressum</a>';
    expect(impressumUrl(html, "https://beispiel.de/")).toBe("https://beispiel.de/impressum.html");
  });

  it("nimmt den Link mit Impressum im Pfad vor einem schwächeren Treffer", () => {
    const html =
      '<a href="/rechtliche-hinweise">Rechtliches</a><a href="/de/impressum/">Anbieter</a>';
    expect(impressumUrl(html, "https://beispiel.de/")).toBe("https://beispiel.de/de/impressum/");
  });

  it("ignoriert mailto und Anker", () => {
    expect(impressumUrl('<a href="mailto:a@b.de">Impressum</a>', "https://b.de/")).toBeNull();
    expect(impressumUrl('<a href="#impressum">Impressum</a>', "https://b.de/")).toBeNull();
  });
});

describe("Einordnung: „nichts gefunden“ ist nicht „ist keiner“", () => {
  const seite = (html: string) => ({ html, url: "https://beispiel.de/" });

  it("stuft ein erkanntes Kommunal-Muster auf kein-betrieb zurück", () => {
    const p = profilAus(
      "gemeinde-beispiel.de",
      seite("<p>Stadtverwaltung Musterstadt</p><p>Photovoltaik auf dem Rathausdach</p>"),
      null,
      JETZT,
    );
    expect(p.art).toBe("kein-betrieb");
    expect(p.art_grund).toContain("Kommune");
  });

  it("erkennt eine ehrenamtliche Initiative — der Fall, der die Regel ausgelöst hat", () => {
    // heidel-solar.de trägt „solar“ im Namen und stand in der Wettbewerbsmessung
    // unter „Solarteure“. Es ist eine ehrenamtliche Balkonstrom-Initiative.
    const p = profilAus(
      "irgendwas-solar.de",
      seite("<p>Wir arbeiten ehrenamtlich und semi-professionell.</p><p>Photovoltaik</p>"),
      null,
      JETZT,
    );
    expect(p.art).toBe("kein-betrieb");
  });

  it("erkennt ein Vermittlungsportal", () => {
    const p = profilAus(
      "portal.de",
      seite("<p>Jetzt bis zu 3 kostenlose Angebote für Photovoltaik erhalten</p>"),
      null,
      JETZT,
    );
    expect(p.art).toBe("kein-betrieb");
    expect(p.art_grund?.toLowerCase()).toContain("portal");
  });

  it("sagt bei fehlendem PV-Wort NUR „unklar“, nicht „kein Betrieb“", () => {
    // Eine Seite, die ihren Inhalt per Skript nachlädt, liefert uns nichts.
    // Sie deshalb abzustempeln wäre ein Urteil ohne Messung.
    const p = profilAus("hersteller.de", seite("<p>Willkommen</p>"), null, JETZT);
    expect(p.art).toBe("unklar");
    expect(p.art_grund).toContain("von Hand");
  });

  it("lässt einen echten Betrieb unangetastet", () => {
    const p = profilAus(
      "elektro-mueller.de",
      seite("<p>Photovoltaik und Wärmepumpe vom Meisterbetrieb</p>"),
      null,
      JETZT,
    );
    expect(p.art).toBeNull();
    expect(p.geschaeftsfelder).toContain("photovoltaik");
    expect(p.meisterbetrieb).toBe(true);
  });

  it("erkennt einen Lead-Vermittler, den die Streuung durchlässt", () => {
    // Nachgetragen: Ein Lead-Vermittler wirbt regional wie ein Betrieb und
    // erscheint deshalb in wenigen Kreisen — die Streuungsmessung sieht ihn
    // nicht. Gefunden wurde er in der Stichprobe der fertigen Erhebung
    // („Leads Navigator GmbH" hinter photovoltaik-firma.de).
    const p = profilAus(
      "photovoltaik-firma.de",
      seite("<p>Photovoltaik für Ihr Dach</p><p>Betreiber: Leads Navigator GmbH</p>"),
      null,
      JETZT,
    );
    expect(p.art).toBe("kein-betrieb");
    expect(p.art_grund).toContain("Lead");
  });

  it("kennt zu jedem Rückstufungs-Muster einen Grund", () => {
    for (const k of KEIN_BETRIEB) {
      expect(k.grund.length).toBeGreaterThan(3);
    }
  });
});

describe("Profil aus Startseite UND Impressum", () => {
  it("liest die Anschrift aus dem Impressum und den Meisterbetrieb von der Startseite", () => {
    // Der Kern der Eichung: In keinem der drei geprüften Impressen stand die
    // Handwerkskammer, obwohl das Gesetz sie verlangt. Meisterbetrieb und
    // Gründungsjahr standen im Marketing-Text der Startseite.
    const start = {
      html: "<p>Seit 1992 für Sie da — Ihr Elektromeisterbetrieb für Photovoltaik</p>",
      url: "https://beispiel.de/",
    };
    const imp = {
      html:
        "<p>Muster Solar GmbH</p><p>Musterweg 3</p><p>12345 Musterstadt</p>" +
        "<p>Amtsgericht Musterstadt HRB 12345</p><p>USt-IdNr: DE123456789</p>" +
        "<p>info@beispiel.de</p>",
      url: "https://beispiel.de/impressum",
    };
    const p = profilAus("beispiel.de", start, imp, JETZT);
    expect(p.firmenname).toBe("Muster Solar GmbH");
    expect(p.rechtsform).toBe("GmbH");
    expect(p.hr_nummer).toBe("HRB 12345");
    expect(p.hr_gericht).toBe("Musterstadt");
    expect(p.ust_id).toBe("DE123456789");
    expect(p.strasse).toBe("Musterweg 3");
    expect(p.plz).toBe("12345");
    expect(p.ort).toBe("Musterstadt");
    expect(p.email).toBe("info@beispiel.de");
    expect(p.meisterbetrieb).toBe(true);
    expect(p.gruendungsjahr).toBe(1992);
  });

  it("belegt JEDES gesetzte Merkmal mit einer Fundstelle", () => {
    // Kein Merkmal ohne Beleg — das ist die Bedingung dafür, dass eine spätere
    // Neubewertung keinen zweiten Crawl kostet.
    const p = profilAus(
      "beispiel.de",
      { html: "<p>Meisterbetrieb für Photovoltaik, gegründet 1990</p>", url: "https://beispiel.de/" },
      null,
      JETZT,
    );
    const merkmale = p.belege.map((b) => b.merkmal);
    expect(merkmale).toContain("meisterbetrieb");
    expect(merkmale).toContain("gruendungsjahr");
    for (const b of p.belege) {
      expect(b.fundstelle).toMatch(/^https?:\/\//);
      expect(b.textstelle && b.textstelle.length).toBeGreaterThan(0);
    }
  });

  it("nimmt eine Bewertung NUR als Selbstauskunft der Website", () => {
    // Google Maps Platform Terms 3.2.3(a)(iii) untersagt das Speichern von
    // Reviews; was der Betrieb selbst auf seine Seite schreibt, ist etwas
    // anderes — und wird auch so beschriftet.
    const p = profilAus(
      "beispiel.de",
      { html: "<p>Photovoltaik — 4,5 von 5 Sternen aus 24 Bewertungen</p>", url: "https://beispiel.de/" },
      null,
      JETZT,
    );
    expect(p.bewertung_wert).toBe(4.5);
    expect(p.bewertung_anzahl).toBe(24);
    expect(p.bewertung_quelle).toBe("eigene-website");
  });

  it("setzt keine Bewertung ohne beide Zahlen", () => {
    // Ein Schnitt ohne Anzahl ist wertlos und eine Anzahl ohne Schnitt auch.
    const p = profilAus(
      "beispiel.de",
      { html: "<p>Photovoltaik — 4,5 von 5 Sternen</p>", url: "https://beispiel.de/" },
      null,
      JETZT,
    );
    expect(p.bewertung_wert).toBeNull();
  });
});

describe("Ortsname normalisieren für die Gemeindezuordnung", () => {
  it("macht Umlaute und Schreibweisen vergleichbar", () => {
    expect(normOrt("Schwerin, Landeshauptstadt")).toBe("schwerinlandeshauptstadt");
    expect(normOrt("Müllheim")).toBe("muellheim");
    expect(normOrt("Sankt Augustin")).toBe(normOrt("sankt-augustin"));
  });
});
