import { describe, it, expect } from "vitest";
import {
  bewerteLink, istEndergebnis, linkKandidaten, sitemapKandidaten, sitemapIndex, SCHWELLE, SUCH_VERSION,
  suchFormular, suchAdresse, suchseitenLink, SUCH_BEGRIFFE, SUCHSEITEN_PFADE,
} from "../funding-url-suche";

/** Kurzform für die Gesamtpunktzahl — die Gruppen prüfen eigene Tests. */
const pkt = (url: string, text = "") => bewerteLink(url, text).punkte;

// Die Suche steht VOR dem Screening und entscheidet, was überhaupt je angesehen
// wird. Ein hier verworfener Link kommt nie wieder — deshalb nagelt diese Datei
// vor allem fest, was NICHT verworfen werden darf.

describe("Was einen Link verfolgenswert macht", () => {
  it("bewertet eine ausgeschriebene Förderprogramm-Adresse am höchsten", () => {
    const a = pkt("https://x.de/bauen/klima/foerderprogramme/");
    const b = pkt("https://x.de/leben/energie/");
    expect(a).toBeGreaterThan(b);
    expect(a).toBeGreaterThanOrEqual(SCHWELLE);
  });

  it("erkennt eine nichtssagende Adresse am Linktext", () => {
    // Real (Antrifttal): /seite/844796.html — die halbe Kommunallandschaft
    // vergibt solche Adressen. Nur den Pfad zu lesen verlöre ausgerechnet die
    // Gemeinden, deren Website am wenigsten hergibt.
    expect(pkt("https://x.de/seite/844796.html", "Förderprogramme")).toBeGreaterThanOrEqual(SCHWELLE);
  });

  it("verwirft den Förderverein der Feuerwehr", () => {
    // Der teuerste Fehlgriff: Fast jede Gemeinde hat einen, und der Wortstamm
    // „foerder" trifft ihn zuverlässig. Eine Leseliste voller Feuerwehrvereine
    // liest irgendwann niemand mehr.
    expect(pkt("https://x.de/vereine/foerderverein-feuerwehr/")).toBe(0);
    expect(pkt("https://x.de/seite/1234.html", "Förderverein der Grundschule")).toBe(0);
  });

  it("verwirft Sport-, Jugend- und Städtebauförderung", () => {
    for (const u of [
      "https://x.de/sportfoerderung/",
      "https://x.de/jugendfoerderung/",
      "https://x.de/staedtebaufoerderung/",
      "https://x.de/wohnraumfoerderung/",
    ]) {
      expect(pkt(u), u).toBe(0);
    }
  });

  it("verwirft Nachrichtenmeldungen — sie taugen nicht als Dauer-Adresse", () => {
    // Beide real aus dem Testlauf: inhaltlich einschlägig, als gespeicherte
    // Adresse trotzdem wertlos. Der Fund wird von da an bei JEDEM Screening
    // abgerufen; eine Meldung beschreibt einen Stand von damals.
    expect(pkt("https://dortmund.de/newsroom/nachrichten/foerderprogramm-balkonkraftwerke.html")).toBe(0);
    expect(pkt("https://stuttgart.de/service/aktuelle-meldungen/2026/august/foerderstopp-energiesparprogramm")).toBe(0);
  });

  it("verwirft Wohnungsbauförderung", () => {
    // Real (Dresden, Bielefeld). „Wohnraum" stand in der Ressortliste,
    // „Wohnungsbau" fehlte — dieselbe Sache, anderes Wort.
    expect(istEndergebnis(bewerteLink("https://dresden.de/de/leben/wohnen/wohnungsbaufoerderung.php"))).toBe(false);
    expect(istEndergebnis(bewerteLink("https://bielefeld.de/wohnungsbaufoerderung"))).toBe(false);
  });

  it("verwirft Dateien und Allerweltsseiten", () => {
    expect(pkt("https://x.de/foerderrichtlinie.pdf")).toBe(0);
    expect(pkt("https://x.de/impressum")).toBe(0);
  });
});

describe("Ergebnis verlangt Geld UND Thema", () => {
  it("nimmt Kultur- und Gesundheitsförderung nicht als Ergebnis", () => {
    // Beide real aus dem ersten Lauf (18.08.2026): sauberes Förderwort, kein
    // Energiebezug. Eine Ausschlussliste allein ist hier ein Wettrennen, das man
    // nicht gewinnt — es gibt beliebig viele Ressorts, die Geld verteilen.
    expect(istEndergebnis(bewerteLink("https://essen.de/leben/kultur_/foerderung/uebersicht.html"))).toBe(false);
    expect(istEndergebnis(bewerteLink("https://dresden.de/de/leben/gesundheit/gesundheitsfoerderung.php"))).toBe(false);
  });

  it("nimmt eine Klimaschutz-Förderseite als Ergebnis", () => {
    expect(istEndergebnis(bewerteLink("https://x.de/umwelt/klimaschutz/beratung-und-foerderung"))).toBe(true);
  });

  it("nimmt eine schlichte Förderprogramm-Seite ohne Themenwort als Ergebnis", () => {
    // Der Normalfall bei kleinen Gemeinden (Antrifttal, Gaimersheim,
    // Linsengericht): Die Seite heißt „Förderprogramme" und führt Photovoltaik
    // neben Zisternen und Streuobstwiesen. Ein erzwungenes Themenwort verlöre
    // genau die Gemeinden, für die es diese Suche gibt.
    expect(istEndergebnis(bewerteLink("https://x.de/bauen-verkehr/foerderprogramme/"))).toBe(true);
    expect(istEndergebnis(bewerteLink("https://x.de/seite/844796.html", "Förderprogramme"))).toBe(true);
  });

  it("straft eine längere Adresse nicht zum Sieger", () => {
    // Gemessen am ersten Lauf: Düsseldorfs Unterseite „…/energie/
    // energiesparen-in-sportvereinen" schlug ihre eigene Elternseite, weil jedes
    // weitere Pfadsegment Punkte drauflegte. Je Gruppe zählt das stärkste
    // Signal, nicht die Summe.
    const eltern = bewerteLink("https://d.de/klimaschutz/beratung-und-foerderung");
    const kind = bewerteLink("https://d.de/klimaschutz/beratung-und-foerderung/energie/energiesparen");
    expect(kind.punkte).toBeLessThanOrEqual(eltern.punkte);
  });

  it("verfolgt eine Themenseite ohne Förderwort, nimmt sie aber nicht als Ergebnis", () => {
    // Real (Nürnberg): /klimaschutz_energie.html ist der richtige WEG zur
    // Förderseite, aber selbst noch keine. Wer nur eine Schwelle hat, muss sich
    // zwischen „diesen Weg nie gehen" und „diese Seite als Fund melden"
    // entscheiden — beides falsch.
    const w = bewerteLink("https://nuernberg.de/internet/stadtportal/klimaschutz_energie.html");
    expect(w.punkte).toBeGreaterThanOrEqual(SCHWELLE);
    expect(istEndergebnis(w)).toBe(false);
  });
});

describe("Links einer Seite einsammeln", () => {
  const basis = "https://gemeinde.de/start";

  it("löst relative Adressen auf und sortiert die besten nach vorn", () => {
    const html = `
      <a href="/leben/energie/">Energie</a>
      <a href="/bauen/foerderprogramme/">Förderprogramme der Gemeinde</a>
      <a href="/tourismus/">Tourismus</a>
    `;
    const k = linkKandidaten(html, basis);
    expect(k[0].url).toBe("https://gemeinde.de/bauen/foerderprogramme/");
  });

  it("lässt fremde Hosts weg — auch KfW und BAFA", () => {
    // Kommunalseiten verlinken großflächig auf Bund und Land. Die führen wir
    // längst; sie hier einzusammeln hieße, dieselben drei Bundesprogramme
    // elftausendmal zu finden.
    const html = `
      <a href="https://www.kfw.de/foerderung/">KfW-Förderung</a>
      <a href="https://www.bafa.de/zuschuss/">BAFA-Zuschuss</a>
      <a href="/eigene-foerderprogramme/">Unsere Förderprogramme</a>
    `;
    const k = linkKandidaten(html, basis);
    expect(k.map((x) => x.url)).toEqual(["https://gemeinde.de/eigene-foerderprogramme/"]);
  });

  it("führt dieselbe Adresse nur einmal, mit dem besseren Linktext", () => {
    const html = `
      <a href="/foerderung/">hier</a>
      <a href="/foerderung/">Förderprogramme Photovoltaik</a>
    `;
    const k = linkKandidaten(html, basis);
    expect(k).toHaveLength(1);
    expect(k[0].text).toBe("Förderprogramme Photovoltaik");
  });

  it("kommt mit kaputten Adressen klar, statt den ganzen Lauf abzubrechen", () => {
    const html = `<a href="javascript:void(0)">x</a><a href=":::">y</a><a href="/foerderprogramme/">Förderung</a>`;
    expect(() => linkKandidaten(html, basis)).not.toThrow();
    expect(linkKandidaten(html, basis)).toHaveLength(1);
  });
});

describe("Sitemap", () => {
  it("nimmt passende Adressen aus einer sitemap.xml", () => {
    const xml = `<urlset>
      <url><loc>https://gemeinde.de/tourismus</loc></url>
      <url><loc>https://gemeinde.de/klima/foerderprogramme</loc></url>
    </urlset>`;
    const k = sitemapKandidaten(xml, "https://gemeinde.de/");
    expect(k.map((x) => x.url)).toEqual(["https://gemeinde.de/klima/foerderprogramme"]);
  });

  it("erkennt einen Sitemap-Index und liefert die Unter-Sitemaps", () => {
    const xml = `<sitemapindex><sitemap><loc>https://gemeinde.de/sitemap-1.xml</loc></sitemap></sitemapindex>`;
    expect(sitemapIndex(xml)).toEqual(["https://gemeinde.de/sitemap-1.xml"]);
    expect(sitemapIndex(`<urlset><url><loc>https://gemeinde.de/x</loc></url></urlset>`)).toEqual([]);
  });
});

describe("Versionsstempel", () => {
  it("steht bei 4 — wer die Wortlisten oder die Reichweite ändert, zählt hoch", () => {
    // Auf 2 gezogen, als die Volltextsuche der Website dazukam: Die 7.863
    // Gemeinden mit Verdikt „keine-seite" wurden mit der alten, flacheren
    // Reichweite geprüft und müssen deshalb von selbst wieder anstehen.
    //
    // Auf 3 am 25.08.2026, nach zwei Fehlern, die Funde verwarfen, ohne je
    // einen Fehler zu melden (geteilte Sitemap nur zur Hälfte gelesen,
    // Host-Filter gegen die erfasste statt die ausgelieferte Adresse). Ohne
    // neuen Stempel bliebe ihr Verdikt „keine-seite" für immer stehen — das
    // Hochzählen ist hier nicht Buchhaltung, sondern der Fix selbst.
    expect(SUCH_VERSION).toBe(4);
  });
});

// ─── Die Suchfunktion der Website ───────────────────────────────────────────
//
// Der Crawl findet nur 13 % der Förderseiten, weil er zwei Klicks tief geht und
// nur sieht, was verlinkt ist. Die Volltextsuche der Website kennt dagegen ihren
// ganzen Bestand. Diese Tests halten fest, dass wir sie in den Fassungen finden,
// die auf deutschen Kommunalseiten wirklich vorkommen — und dass wir NICHT das
// Newsletter-Formular daneben erwischen.
describe("Suchformular der Website finden", () => {
  const B = "https://gemeinde.de/";

  it("findet die TYPO3-Solr-Suche samt eckiger Klammern im Feldnamen", () => {
    // Der Feldname MUSS wörtlich übernommen werden. Ihn zu normalisieren wäre
    // der eine Fehler, der die halbe TYPO3-Welt kostet.
    const html = `<form action="/suche" method="get">
      <input type="hidden" name="id" value="42">
      <input type="text" name="tx_solr[q]" placeholder="Suchbegriff">
      <button>Suchen</button></form>`;
    const f = suchFormular(html, B)!;
    expect(f.feld).toBe("tx_solr[q]");
    expect(f.action).toBe("https://gemeinde.de/suche");
    expect(f.versteckt).toEqual([{ name: "id", wert: "42" }]);
  });

  it("findet die TYPO3-ke_search-Fassung", () => {
    const html = `<form action="/suchergebnis" method="get">
      <input type="text" name="tx_kesearch_pi1[sword]"></form>`;
    expect(suchFormular(html, B)?.feld).toBe("tx_kesearch_pi1[sword]");
  });

  it("findet die WordPress-Suche ohne action — sie schickt an die Seite selbst", () => {
    const html = `<form role="search" method="get" class="search-form">
      <input type="search" name="s" value=""></form>`;
    const f = suchFormular(html, B)!;
    expect(f.feld).toBe("s");
    expect(f.action).toBe("https://gemeinde.de/");
  });

  it("nimmt type=search auch ohne sprechenden Feldnamen", () => {
    const html = `<form action="/finden"><input type="search" name="abc123"></form>`;
    expect(suchFormular(html, B)?.feld).toBe("abc123");
  });

  it("kapert NICHT das Newsletter- oder Kontaktformular", () => {
    // Beide stehen auf jeder zweiten Startseite. Ein Textfeld allein reicht
    // deshalb nicht — das Formular muss sich als Suche zu erkennen geben.
    const html = `<form action="/newsletter" method="get">
      <input type="text" name="email" placeholder="Ihre E-Mail"></form>`;
    expect(suchFormular(html, B)).toBeNull();
  });

  it("nimmt auch POST-Formulare — wir schicken trotzdem ein GET", () => {
    // Erst andersherum gebaut, mit dem Argument, ein POST sei gegenüber einem
    // fremden Verwaltungsserver eine Schreibgeste. Das stimmt, trifft aber
    // nicht: Aus dem Formular werden nur Adresse und Feldname übernommen, die
    // Anfrage selbst ist ein gewöhnliches GET. Gemessen am 19.08.2026 trugen
    // nur 14 von 39 erreichbaren Startseiten ein GET-Formular — der Ausschluss
    // kostete mehr, als der vermiedene Irrtum wert war.
    const html = `<form action="/suche" method="post"><input type="search" name="q"></form>`;
    expect(suchFormular(html, B)?.feld).toBe("q");
  });

  it("findet den Link zur Suchseite, wenn die Startseite kein Formular hat", () => {
    // Viele Kommunalseiten zeigen oben nur ein Lupen-Symbol und laden die Suche
    // per JavaScript nach — im HTML steht dann kein Formular.
    const html = `<a href="/suche" title="Suche">Suche</a>`;
    expect(suchseitenLink(html, B)).toBe("https://gemeinde.de/suche");
  });

  it("führt NICHT in die Rats- oder Personensuche", () => {
    // Beide heißen „Suche" und finden garantiert keine Förderseite.
    expect(suchseitenLink(`<a href="/ratsinfo/suche">Suche</a>`, B)).toBeNull();
    expect(suchseitenLink(`<a href="/personensuche">Suche</a>`, B)).toBeNull();
    expect(suchseitenLink(`<a href="/mitarbeiter/suche">Ansprechpartner suchen</a>`, B)).toBeNull();
  });

  it("hält nur wenige geratene Pfade bereit — jeder ist ein fremder Abruf", () => {
    expect(SUCHSEITEN_PFADE.length).toBeLessThanOrEqual(3);
  });

  it("überspringt Suchen auf fremden Hosts", () => {
    // Manche Gemeinden binden eine fremde Suche ein. Deren Trefferliste führt
    // überall hin, nur nicht kontrolliert auf die eigene Domain.
    const html = `<form action="https://www.google.com/search"><input type="search" name="q"></form>`;
    expect(suchFormular(html, B)).toBeNull();
  });

  it("nimmt das erste auswertbare Formular, nicht irgendeines", () => {
    const html = `<form action="/newsletter"><input type="text" name="email"></form>
      <form action="/suche"><input type="search" name="q"></form>`;
    expect(suchFormular(html, B)?.action).toBe("https://gemeinde.de/suche");
  });

  it("baut die Adresse mit versteckten Feldern und kodiertem Begriff", () => {
    const f = { action: "https://gemeinde.de/suche", feld: "tx_solr[q]", versteckt: [{ name: "id", wert: "42" }] };
    const u = new URL(suchAdresse(f, "förderprogramm"));
    expect(u.searchParams.get("tx_solr[q]")).toBe("förderprogramm");
    expect(u.searchParams.get("id")).toBe("42");
  });

  it("sucht je Anfrage EIN Wort — UND-Verknüpfung verlöre die kleinen Gemeinden", () => {
    // Kleine Gemeinden nennen ihre Seite schlicht „Förderprogramme" und führen
    // Photovoltaik neben Zisternen. Eine Anfrage „förderprogramm photovoltaik"
    // fände genau die nicht.
    for (const b of SUCH_BEGRIFFE) expect(b).not.toMatch(/\s/);
    expect(SUCH_BEGRIFFE.length).toBeGreaterThan(0);
  });
});

describe("Umlaute in der Adresse", () => {
  // BLOCKER: `new URL()` liefert Pfade prozentkodiert zurück. Ohne Dekodierung
  // passt kein einziges Wortmuster auf `/f%c3%b6rderprogramme`, und die Seite
  // fällt lautlos durch — sichtbar nur dort, wo kein Linktext aushilft, also
  // ausgerechnet in Sitemaps.
  it("liest prozentkodierte Umlaute wie geschriebene", () => {
    const kodiert = pkt("https://x.de/klima/f%C3%B6rderprogramme");
    const klar = pkt("https://x.de/klima/förderprogramme");
    expect(kodiert).toBe(klar);
    expect(kodiert).toBeGreaterThan(0);
  });

  it("findet auch die Themenwörter mit Umlaut", () => {
    expect(pkt("https://x.de/zuschuss/w%C3%A4rmepumpe")).toBeGreaterThanOrEqual(SCHWELLE);
  });

  it("wirft einen Link mit kaputter Kodierung nicht weg", () => {
    // `%zz` lässt decodeURIComponent werfen — dann zählt die Rohfassung.
    expect(() => pkt("https://x.de/foerderprogramm%zz/solar")).not.toThrow();
    expect(pkt("https://x.de/foerderprogramm%zz/solar")).toBeGreaterThan(0);
  });

  it("erkennt fremde Ressorts auch kodiert", () => {
    // Die Gegenrichtung: Der Ausschluss muss genauso mitlesen, sonst schleust
    // die Dekodierung ausgerechnet die Fehlgriffe wieder ein.
    expect(pkt("https://x.de/f%C3%B6rderverein-feuerwehr")).toBe(0);
  });
});

describe("Ein Download ist keine Seite", () => {
  // Real gespeicherte Adressen (Holzminden, Glienicke/Nordbahn, Rheinstetten):
  // eine Richtlinien-PDF hinter einer undurchsichtigen Kennung, über den
  // Linktext auf volle Punktzahl gekommen. Als gespeicherte Förderseite ist das
  // doppelt schädlich — der Screener verwirft alles, was nicht HTML ist, und die
  // Gemeinde gilt trotzdem als versorgt und kommt nie wieder in die Suche.
  it("verwirft Download-Adressen ohne Endung", () => {
    expect(pkt("https://holzminden.de/downloads/datei/YmQxOTYxMzlhMTU4NGIx", "Förderprogramm Photovoltaik")).toBe(0);
    expect(pkt("https://x.de/download/file/abc123", "Förderrichtlinie Solar")).toBe(0);
  });

  it("verwirft PDFs, deren Endung im Abfrageteil steckt", () => {
    expect(pkt("https://rheinstetten.de/de/klimaschutz?file=foerderprogramm-photovoltaik.pdf&cid=19001")).toBe(0);
  });

  it("lässt gewöhnliche Themenseiten unangetastet", () => {
    // Die Gegenrichtung: Der neue Ausschluss darf keine echte Seite kosten.
    expect(pkt("https://x.de/klimaschutz/foerderprogramm-photovoltaik")).toBeGreaterThan(0);
    expect(pkt("https://x.de/rathaus/downloadbereich/foerderung-solar")).toBeGreaterThan(0);
  });
});

describe("Adressen ohne Umlaut (19.08.2026 gemessen)", () => {
  it("findet Förderprogramme, deren Adresse den Umlaut ersatzlos streicht", () => {
    // Gaimersheim und Kempten führen echte Programme unter /forderprogramme.
    expect(istEndergebnis(bewerteLink("https://www.gaimersheim.de/forderprogramme", ""))).toBe(true);
    expect(istEndergebnis(bewerteLink("https://www.kempten.de/forderprogramm-35834.html", ""))).toBe(true);
  });

  it("haelt das nackte forderung draussen — das ist ein anderes Wort", () => {
    // Forderungsmanagement ist das Eintreiben offener Beträge, nicht Förderung.
    expect(istEndergebnis(bewerteLink("https://www.stadt.de/kaemmerei/forderungsmanagement", ""))).toBe(false);
  });
});
