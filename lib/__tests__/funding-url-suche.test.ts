import { describe, it, expect } from "vitest";
import {
  bewerteLink, istEndergebnis, linkKandidaten, sitemapKandidaten, sitemapIndex, SCHWELLE, SUCH_VERSION,
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
  it("steht bei 1 — wer die Wortlisten ändert, zählt hoch", () => {
    expect(SUCH_VERSION).toBe(1);
  });
});
