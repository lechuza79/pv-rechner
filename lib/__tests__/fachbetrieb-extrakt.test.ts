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
  KEIN_BETRIEB,
  besteMail,
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
  // Alle Fälle real, gefunden erst, als die Namen in einer Liste untereinander
  // standen — in der Datenbank fielen sie nicht auf. In einem Anschreiben wäre
  // jeder davon peinlich.
  it("entfernt Seitenbezeichnungen am Anfang", () => {
    expect(firmennameSaeubern("Impressum - 3E-Elektrotechnik GmbH")).toBe(
      "3E-Elektrotechnik GmbH",
    );
    expect(firmennameSaeubern("Kontakt Wagner GmbH")).toBe("Wagner GmbH");
    expect(firmennameSaeubern("Impressum und Kontaktdaten A9 Solar GmbH")).toBe("A9 Solar GmbH");
  });

  it("nimmt aus einem Seitentitel den Teil mit der Rechtsform", () => {
    expect(firmennameSaeubern("Home | ABEL ReTec GmbH")).toBe("ABEL ReTec GmbH");
    expect(
      firmennameSaeubern("Solaranlage kaufen vom regionalen PV-Anbieter | GETEC GmbH"),
    ).toBe("GETEC GmbH");
  });

  it("schneidet nachlaufende Feldbeschriftungen ab", () => {
    expect(firmennameSaeubern("Name 3NERGY GmbH Adresse Am Pönitzer Dreieck 1")).toBe(
      "3NERGY GmbH",
    );
  });

  it("verwirft eine Rechtsform ohne Namen — lieber kein Name als ein falscher", () => {
    expect(firmennameSaeubern("GmbH & Co. KG")).toBeNull();
    expect(firmennameSaeubern("GmbH")).toBeNull();
    expect(firmennameSaeubern("")).toBeNull();
  });

  it("lässt einen sauberen Namen unangetastet", () => {
    expect(firmennameSaeubern("Muster Solar GmbH")).toBe("Muster Solar GmbH");
    expect(firmennameSaeubern("Elektro Klaas GmbH")).toBe("Elektro Klaas GmbH");
  });

  it("frisst kein echtes Namenswort, das zufällig so anfängt", () => {
    // „Homann" beginnt mit „Home", darf aber nicht gekürzt werden — deshalb
    // steht in der Regel eine Wortgrenze.
    expect(firmennameSaeubern("Homann Solarbau GmbH")).toBe("Homann Solarbau GmbH");
    expect(firmennameSaeubern("Namensbau GmbH")).toBe("Namensbau GmbH");
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
