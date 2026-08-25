import { describe, expect, it } from "vitest";
import {
  adressenAus,
  bezugsjahr,
  hatFormular,
  KENNZEICHNUNG_MUSTER,
  KONTAKT_MUSTER,
  kennzeichnungForm,
  kennzeichnungFund,
  nahbereichKandidaten,
  NETZ_ROLLE,
  pflichtjahr,
  postfachArt,
  WEBSITE_ROLLE,
  KUNDENANFRAGE_ROLLE,
  werteAus,
} from "../versorger-erhebung";
import { VERSORGER_VOKABULAR, findLinkUrl } from "../kommunen-profil";

const ALLGEMEIN = VERSORGER_VOKABULAR.rolle;

describe("Postfach-Einordnung", () => {
  it("zaehlt vertrieb@ NICHT zum Website-Schreibtisch", () => {
    // Korrektur vom 23.08.2026 (Einwand des Betreibers): vertrieb@ bei einem
    // Stadtwerk ist der Eingang fuer Leute, die dort Strom KAUFEN wollen — eine
    // Warteschlange des Kundendienstes. Nicht der Schreibtisch, der entscheidet,
    // was auf die Website kommt. Die erste Fassung warf beides zusammen.
    for (const m of ["vertrieb@sw.de", "kundencenter@sw.de", "privatkunden@sw.de", "energieberatung@sw.de"]) {
      expect(postfachArt(m, ALLGEMEIN)).toBe("kundenanfrage");
    }
  });

  it("erkennt den Website-Schreibtisch", () => {
    for (const m of ["marketing@sw.de", "presse@sw.de", "unternehmenskommunikation@sw.de", "redaktion@sw.de"]) {
      expect(postfachArt(m, ALLGEMEIN)).toBe("website");
    }
  });

  it("trennt den Netzbetrieb von beiden", () => {
    for (const m of ["einspeisung@sw.de", "netzanschluss@sw.de", "zaehlerwesen@sw.de", "marktkommunikation@sw.de"]) {
      expect(postfachArt(m, ALLGEMEIN)).toBe("netz");
    }
  });

  it("entscheidet bei zusammengesetzten Adressen das ERSTE Wort", () => {
    // Alle drei Muster sind am Anfang verankert. Das ist die einfachste Regel,
    // die sich verteidigen laesst: presse-netz@ gehoert der Pressestelle,
    // vertrieb-netznutzung@ der Vertriebs-Warteschlange. Wer stattdessen
    // irgendwo im Namen sucht, bekommt widerspruechliche Treffer.
    expect(postfachArt("presse-netz@sw.de", ALLGEMEIN)).toBe("website");
    expect(postfachArt("vertrieb-netznutzung@sw.de", ALLGEMEIN)).toBe("kundenanfrage");
    expect(postfachArt("netz-vertrieb@sw.de", ALLGEMEIN)).toBe("netz");
  });

  it("laesst das allgemeine Postfach allgemein und die Person Person", () => {
    expect(postfachArt("info@sw.de", ALLGEMEIN)).toBe("allgemein");
    expect(postfachArt("erika.mustermann@sw.de", ALLGEMEIN)).toBe("person");
  });

  it("die drei Muster ueberschneiden sich nicht in der falschen Richtung", () => {
    for (const m of ["marketing@x.de", "presse@x.de", "redaktion@x.de"]) {
      expect(NETZ_ROLLE.test(m)).toBe(false);
      expect(KUNDENANFRAGE_ROLLE.test(m)).toBe(false);
    }
    for (const m of ["netz@x.de", "einspeisung@x.de"]) expect(WEBSITE_ROLLE.test(m)).toBe(false);
    for (const m of ["vertrieb@x.de", "kundencenter@x.de"]) expect(WEBSITE_ROLLE.test(m)).toBe(false);
  });
});

describe("Alle Funde werden aufgehoben, nicht nur das Urteil", () => {
  it("haelt jede Adresse der eigenen Domain mit ihrer Einordnung fest", () => {
    // Der Grund fuer diese Zusage: Als sich die Einordnung am 23.08.2026 als
    // falsch herausstellte, waere eine Neubewertung ohne die Rohfunde nur ueber
    // einen kompletten neuen Abruf aller Versorger moeglich gewesen.
    const erg = werteAus(
      {
        start: {
          url: "https://sw.de/",
          html: `<a href="mailto:info@sw.de">A</a><a href="mailto:vertrieb@sw.de">B</a>
                 <a href="mailto:marketing@sw.de">C</a><a href="mailto:einspeisung@sw.de">D</a>`,
        },
        weitere: [],
      },
      "sw.de",
      ALLGEMEIN,
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(erg.postfaecher).toEqual([
      { mail: "info@sw.de", art: "allgemein" },
      { mail: "vertrieb@sw.de", art: "kundenanfrage" },
      { mail: "marketing@sw.de", art: "website" },
      { mail: "einspeisung@sw.de", art: "netz" },
    ]);
    expect(erg.websiteEmail).toBe("marketing@sw.de");
    expect(erg.kundenanfrageEmail).toBe("vertrieb@sw.de");
    expect(erg.netzEmail).toBe("einspeisung@sw.de");
  });

  it("nimmt die im Impressum verantwortliche Stelle als eigenen Weg mit", () => {
    const erg = werteAus(
      {
        start: { url: "https://sw.de/", html: "<p>Redaktionell verantwortlich: Unternehmenskommunikation</p>" },
        weitere: [],
      },
      "sw.de",
      ALLGEMEIN,
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(erg.verantwortlich?.operativ).toBe(true);
    expect(erg.verantwortlich?.zeile).toMatch(/unternehmenskommunikation/i);
  });

  it("erkennt die Geschaeftsfuehrung als Vertretung, nicht als operative Stelle", () => {
    const erg = werteAus(
      { start: { url: "https://sw.de/", html: "<p>Vertreten durch: Geschäftsführer Max Mustermann</p>" }, weitere: [] },
      "sw.de",
      ALLGEMEIN,
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(erg.verantwortlich?.operativ).toBe(false);
  });
});

describe("Kontaktformular", () => {
  it("zaehlt den Suchschlitz nicht als Kontaktformular", () => {
    expect(hatFormular('<form role="search"><input type="search" name="q"><button>Suchen</button></form>')).toBe(false);
  });

  it("zaehlt den Newsletter-Schlitz nicht — er nimmt keine Nachricht entgegen", () => {
    expect(hatFormular('<form><input type="email" name="newsletter"><button>Abonnieren</button></form>')).toBe(false);
  });

  it("erkennt ein echtes Kontaktformular", () => {
    expect(hatFormular('<form><input name="name"><textarea name="nachricht"></textarea></form>')).toBe(true);
  });

  it("findet das Mehrzeilenfeld auch in einem sehr langen Formular", () => {
    // Die erste Fassung schaute nur 4.000 Zeichen weit und uebersah dadurch
    // jedes echte Kontaktformular — gemessen an Stadtwerke Lingen.
    const lang = '<form>' + '<div class="feld"><label>Feld</label><input></div>'.repeat(200) +
      '<textarea name="nachricht"></textarea></form>';
    expect(lang.length).toBeGreaterThan(4000);
    expect(hatFormular(lang)).toBe(true);
  });

  it("findet das Formular auch auf einer Seite, auf die kein Verweis zeigt", () => {
    // Wo die Navigation per JavaScript entsteht, kommt die Kontaktseite aus dem
    // Seitenverzeichnis — im HTML gibt es dann keinen Verweis auf sie.
    const erg = werteAus(
      {
        start: { url: "https://sw.de/", html: "<p>Willkommen</p>" },
        weitere: [{ url: "https://sw.de/kontakt", html: '<form><textarea name="nachricht"></textarea></form>' }],
      },
      "sw.de",
      ALLGEMEIN,
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(erg.kontaktformular).toBe(true);
    expect(erg.kontaktseiteUrl).toBe("https://sw.de/kontakt");
  });
});

describe("Stromkennzeichnung finden", () => {
  it("trifft die vier gebraeuchlichen Bezeichnungen", () => {
    for (const s of ["Stromkennzeichnung", "Unser Strommix", "Energieträgermix", "Herkunft unseres Stroms"]) {
      expect(KENNZEICHNUNG_MUSTER.test(s)).toBe(true);
    }
  });

  it("findet die Seite auch ueber eine prozentkodierte Adresse", () => {
    // `new URL()` liefert Umlaute kodiert zurück; ein Muster auf dem rohen
    // Pfad läuft daran vorbei. Genau daran ist die Förder-Suche gescheitert.
    const html = '<a href="/unternehmen/energietr%C3%A4germix/">Mehr</a>';
    expect(findLinkUrl(html, "https://sw.de/", KENNZEICHNUNG_MUSTER)).toBe("https://sw.de/unternehmen/energietr%C3%A4germix/");
  });

  it("findet die Seite ueber die Beschriftung, wenn die Adresse nichts hergibt", () => {
    const html = '<a href="/cms/index.php?id=4711">Stromkennzeichnung</a>';
    expect(findLinkUrl(html, "https://sw.de/", KENNZEICHNUNG_MUSTER)).toBe("https://sw.de/cms/index.php?id=4711");
  });

  it("findet einen Menue-Link, dessen Beschriftung viel Auszeichnung enthaelt", () => {
    // Gemessen an stadtwerke-lingen.de: href="/kontakt" stand im HTML und wurde
    // uebersehen, weil der Linktext laenger war als das Muster zuliess.
    const html = `<a class="nav" href="/kontakt">${'<span class="icon-wrap"><svg viewBox="0 0 24 24"><path d="M1 2 3 4"/></svg></span>'.repeat(3)}Kontakt</a>`;
    expect(findLinkUrl(html, "https://sw.de/", KONTAKT_MUSTER)).toBe("https://sw.de/kontakt");
  });
});

describe("Der Fall Lingen — von Hand geprueft am 23.08.2026", () => {
  // Die Kennzeichnung ist dort ein PDF, drei Klicks tief unter Grund- und
  // Ersatzversorgung, beschriftet „Kennzeichnung der Stromlieferung 2024".
  // Die erste Fassung dieses Moduls meldete dafuer „keine Stromkennzeichnung" —
  // dreifach blind: unbekanntes Wort, PDF statt Seite, zu flacher Abruf.
  const HTML =
    '<li><a href="/fileadmin/user_upload/stadtwerke_lingen_energiemix_2024_s1.pdf" target="_blank">' +
    "Kennzeichnung der Stromlieferung 2024</a> (507 KB)</li>";

  it("erkennt die Beschriftung, die das alte Muster nicht kannte", () => {
    const f = kennzeichnungFund(HTML, "https://www.stadtwerke-lingen.de/");
    expect(f?.url).toBe("https://www.stadtwerke-lingen.de/fileadmin/user_upload/stadtwerke_lingen_energiemix_2024_s1.pdf");
    expect(f?.pdf).toBe(true);
  });

  it("liest das Bezugsjahr aus der Beschriftung — das PDF wird nicht geoeffnet", () => {
    const erg = werteAus(
      { start: { url: "https://www.stadtwerke-lingen.de/", html: HTML }, weitere: [] },
      "stadtwerke-lingen.de",
      ALLGEMEIN,
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(erg.kennzeichnungPdf).toBe(true);
    expect(erg.kennzeichnungJahr).toBe(2024);
    // Seit dem 1. Juli 2026 waeren die Werte fuer 2025 zu zeigen.
    expect(erg.kennzeichnungAktuell).toBe(false);
  });
});

describe("Rangfolge der Kandidaten aus dem Seitenverzeichnis", () => {
  it("laesst die Pflichtangaben-Seite nicht von Tarifseiten verdraengen", () => {
    // Genau der gemessene Fall Lingen: dreizehn Tarifseiten und EINE Seite mit
    // der Kennzeichnung. Ohne Rangfolge fuellen die Tarifseiten das Kontingent.
    const sitemap = [
      ...Array.from({ length: 13 }, (_, i) => `https://sw.de/strom/stromanbieter-ort-${i}`),
      "https://sw.de/online-service-und-formulare/grund-und-ersatzversorgung",
    ];
    expect(nahbereichKandidaten(sitemap, 4)[0]).toBe(
      "https://sw.de/online-service-und-formulare/grund-und-ersatzversorgung",
    );
  });

  it("nimmt bei Gleichstand die kuerzere, also hoeher liegende Adresse", () => {
    const erg = nahbereichKandidaten(["https://sw.de/service/downloads/2024/archiv", "https://sw.de/downloads"], 2);
    expect(erg[0]).toBe("https://sw.de/downloads");
  });

  it("nimmt nichts, wo nichts passt", () => {
    expect(nahbereichKandidaten(["https://sw.de/karriere", "https://sw.de/sponsoring"], 4)).toEqual([]);
  });
});

describe("Pflichtjahr nach § 42 Abs. 1 EnWG", () => {
  it("schaltet zum 1. Juli auf das Vorjahr um", () => {
    expect(pflichtjahr(new Date("2026-06-30T12:00:00Z"))).toBe(2024);
    expect(pflichtjahr(new Date("2026-07-01T12:00:00Z"))).toBe(2025);
    expect(pflichtjahr(new Date("2026-08-23T12:00:00Z"))).toBe(2025);
    expect(pflichtjahr(new Date("2027-01-15T12:00:00Z"))).toBe(2025);
  });
});

describe("Bezugsjahr", () => {
  it("nimmt das juengste genannte Jahr", () => {
    expect(bezugsjahr("Stromkennzeichnung 2024 und 2025 im Vergleich", new Date("2026-08-23T12:00:00Z"))).toBe(2025);
  });

  it("ignoriert Zieljahre in der Zukunft", () => {
    expect(bezugsjahr("Klimaneutral bis 2035. Stromkennzeichnung 2024.", new Date("2026-08-23T12:00:00Z"))).toBe(2024);
  });

  it("liefert null statt einer geratenen Zahl", () => {
    expect(bezugsjahr("Unser Strommix besteht aus erneuerbaren Energien.", new Date("2026-08-23T12:00:00Z"))).toBeNull();
  });
});

describe("Darstellungsform", () => {
  it("sammelt Indizien, ohne zu urteilen", () => {
    const f = kennzeichnungForm('<img src="/mix.png"><table><tr><td>Kernkraft</td></tr></table><a href="/mix.pdf">PDF</a>');
    expect(f).toEqual({ grafik: true, tabelle: true, pdf: "/mix.pdf" });
  });
});

describe("Adressen aus dem Verweis", () => {
  it("findet die Adresse, die nur im mailto-Verweis steht", () => {
    // Beim Entfernen der Tags bleibt von diesem Link nur „Einspeisung" übrig.
    expect(adressenAus('<a href="mailto:einspeisung@sw.de">Einspeisung</a>', "Einspeisung")).toContain(
      "einspeisung@sw.de",
    );
  });

  it("wirft den Betreff-Anhang weg", () => {
    expect(adressenAus('<a href="mailto:info@sw.de?subject=Anfrage">Mail</a>', "")).toEqual(["info@sw.de"]);
  });

  it("findet mehrere Verweise hintereinander — das globale Muster behaelt keinen Stand", () => {
    const html = '<a href="mailto:a@sw.de">A</a><a href="mailto:b@sw.de">B</a><a href="mailto:c@sw.de">C</a>';
    expect(adressenAus(html, "").sort()).toEqual(["a@sw.de", "b@sw.de", "c@sw.de"]);
  });
});

describe("Gesamtauswertung", () => {
  const STICHTAG = new Date("2026-08-23T12:00:00Z");

  it("verbindet Startseite und Unterseiten zu einem Befund", () => {
    const erg = werteAus(
      {
        start: {
          url: "https://sw-musterstadt.de/",
          html: `<a href="/kontakt">Kontakt</a><a href="/stromkennzeichnung">Stromkennzeichnung</a>
                 <a href="mailto:einspeisung@sw-musterstadt.de">Einspeisung</a>`,
        },
        weitere: [
          {
            url: "https://sw-musterstadt.de/kontakt",
            html: '<form><textarea name="n"></textarea></form> vertrieb@sw-musterstadt.de',
          },
          {
            url: "https://sw-musterstadt.de/stromkennzeichnung",
            html: '<h1>Stromkennzeichnung 2025</h1><img src="/mix.svg">',
          },
        ],
      },
      "sw-musterstadt.de",
      ALLGEMEIN,
      STICHTAG,
    );
    expect(erg.abruf).toBe("ok");
    expect(erg.kundenanfrageEmail).toBe("vertrieb@sw-musterstadt.de");
    expect(erg.netzEmail).toBe("einspeisung@sw-musterstadt.de");
    expect(erg.kontaktformular).toBe(true);
    expect(erg.kennzeichnungUrl).toBe("https://sw-musterstadt.de/stromkennzeichnung");
    expect(erg.kennzeichnungJahr).toBe(2025);
    expect(erg.kennzeichnungAktuell).toBe(true);
  });

  it("meldet ein veraltetes Bezugsjahr", () => {
    const erg = werteAus(
      {
        start: { url: "https://sw.de/", html: '<a href="/strommix">Strommix</a>' },
        weitere: [{ url: "https://sw.de/strommix", html: "<h1>Strommix 2023</h1><table></table>" }],
      },
      "sw.de",
      ALLGEMEIN,
      STICHTAG,
    );
    expect(erg.kennzeichnungJahr).toBe(2023);
    expect(erg.kennzeichnungAktuell).toBe(false);
  });

  it("haelt „kein Jahr erkannt“ von „veraltet“ getrennt", () => {
    const erg = werteAus(
      {
        start: { url: "https://sw.de/", html: '<a href="/strommix">Strommix</a>' },
        weitere: [{ url: "https://sw.de/strommix", html: "<h1>Unser Strommix</h1>" }],
      },
      "sw.de",
      ALLGEMEIN,
      STICHTAG,
    );
    expect(erg.kennzeichnungJahr).toBeNull();
    expect(erg.kennzeichnungAktuell).toBeNull();
  });

  it("nimmt die Adresse aus dem IMPRESSUM auch auf fremder Domain", () => {
    // Gemessen an Stadtwerke Freudenstadt: Website stadtwerke-freudenstadt.de,
    // Impressums-Adresse info@sw-freudenstadt.de. Der Domain-Filter warf die
    // gesetzlich vorgeschriebene Kontaktadresse des Betreibers weg.
    const erg = werteAus(
      {
        start: { url: "https://www.stadtwerke-freudenstadt.de/", html: "<p>Willkommen</p>" },
        weitere: [
          { url: "https://www.stadtwerke-freudenstadt.de/impressum", html: "<p>info@sw-freudenstadt.de</p>" },
        ],
      },
      "stadtwerke-freudenstadt.de",
      ALLGEMEIN,
      new Date("2026-08-24T12:00:00Z"),
    );
    expect(erg.postfaecher.map((p) => p.mail)).toContain("info@sw-freudenstadt.de");
  });

  it("nimmt keine Adresse von einer fremden Domain", () => {
    const erg = werteAus(
      { start: { url: "https://sw.de/", html: "vertrieb@agentur-webdesign.de" }, weitere: [] },
      "sw.de",
      ALLGEMEIN,
      STICHTAG,
    );
    expect(erg.websiteEmail).toBeNull();
    expect(erg.postfaecher).toEqual([]);
  });
});
