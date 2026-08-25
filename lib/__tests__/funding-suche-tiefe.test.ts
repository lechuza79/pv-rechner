import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  bewerteLink, istEndergebnis, linkKandidaten, sitemapKandidaten, sitemapIndexReihenfolge,
} from "../funding-url-suche";

/**
 * Drei Fehler, die alle dieselbe Form haben: Die Suche läuft durch, meldet
 * keinen Fehler und findet trotzdem nichts — oder das Falsche.
 *
 * Gefunden am 25.08.2026, nachdem die Stadt Nidda uns ihre eigene Förderseite
 * per Mail geschickt hat. Sie steht in der Sitemap der Stadt, unsere Bewertung
 * akzeptiert sie mit voller Punktzahl, und wir hatten sie nicht.
 */

const SKRIPT = readFileSync(resolve(__dirname, "../../scripts/funding-discover.ts"), "utf8");

/**
 * Der Skript-Text ohne Kommentare.
 *
 * Ein Struktur-Test, der Kommentare mitliest, kann nicht zwischen „macht das"
 * und „machte das früher" unterscheiden — und genau diese Erklärung soll im
 * Code stehen bleiben.
 */
const CODE = SKRIPT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("Geteilte Sitemaps werden ganz gelesen, nicht zu einem Zehntel", () => {
  // Vorher stand im Skript `unter[0]` — die erste Unter-Sitemap eines Index,
  // mit der Begründung, wir suchten „einen guten Einstieg". Welche Datei zuerst
  // steht, entscheidet aber das Redaktionssystem und nicht der Inhalt.
  // Gemessen an einer 50er-Stichprobe: 11 Domains liefern einen Index, und
  // stuttgart.de fand so NULL Förderseiten statt 216, potsdam.de 1 statt 52.

  it("liest die Datei mit dem sprechenderen Namen zuerst", () => {
    const reihe = sitemapIndexReihenfolge([
      "https://x.de/sitemap-news.xml",
      "https://x.de/sitemap-umwelt-foerderprogramme.xml",
      "https://x.de/sitemap-sport.xml",
    ]);
    expect(reihe[0]).toContain("foerderprogramme");
  });

  it("lässt nichtssagende Namen in der Reihenfolge des Index", () => {
    // Der häufigere Fall: Teilung nach Menge, nicht nach Thema. Dann gibt der
    // Name nichts her, alle bekommen null Punkte — und eine instabile
    // Sortierung würfelte die Reihenfolge durch, ohne etwas zu gewinnen.
    const eingabe = [
      "https://x.de/sitemap-1.xml",
      "https://x.de/sitemap-2.xml",
      "https://x.de/sitemap-3.xml",
    ];
    expect(sitemapIndexReihenfolge(eingabe)).toEqual(eingabe);
  });

  it("verliert keine Datei", () => {
    // Eine Reihenfolge, die aussortiert, wäre ein zweiter stiller Verlust.
    const eingabe = ["https://x.de/a.xml", "https://x.de/foerderung.xml", "https://x.de/b.xml"];
    expect(sitemapIndexReihenfolge(eingabe).sort()).toEqual([...eingabe].sort());
  });

  it("das Skript greift nirgends mehr auf genau eine Unter-Sitemap zu", () => {
    // Struktur-Beleg für den Teil, der ohne Netzwerk nicht prüfbar ist.
    //
    // Die erste Fassung dieses Tests suchte `abrufen(unter[0]` und blieb bei
    // der Gegenprobe GRÜN, weil der ausgebaute Fix `[unter[0]]` schrieb statt
    // `abrufen(unter[0])` — derselbe Fehler, andere Schreibweise. Ein
    // Struktur-Test muss den Zugriff verbieten, nicht eine Formulierung davon.
    expect(CODE).not.toMatch(/unter\[0\]/);
    expect(CODE).toMatch(/sitemapIndexReihenfolge\(unter\)/);
  });

  it("das Lesen der Unter-Sitemaps hat einen eigenen Deckel", () => {
    // Ohne Deckel holt eine Gemeinde wie Stuttgart 90 Dateien. Der Deckel ist
    // bewusst NICHT der allgemeine Abruf-Deckel: Das sind statische Dateien,
    // die Rücksichtsregel meint den teuren Seitenaufbau.
    const m = SKRIPT.match(/SITEMAP_MAX_UNTER\s*=\s*(\d+)/);
    expect(m, "SITEMAP_MAX_UNTER fehlt").toBeTruthy();
    const deckel = Number(m![1]);
    expect(deckel).toBeGreaterThan(1);
    expect(deckel).toBeLessThanOrEqual(25);
  });
});

describe("Die Basis ist die Adresse NACH der Umleitung", () => {
  // Der Host-Filter ist richtig und muss bleiben — er hält KfW, BAFA und
  // L-Bank heraus. Er wirkt nur gegen die Basis, die man ihm gibt.

  it("ein Host-Unterschied wirft ALLES weg — deshalb muss die Basis stimmen", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://www.nidda.de/leben/infrastruktur/klima-umwelt-wasser/klima/foerderprogramme/foerderung-stadt-nidda/</loc></url>
    </urlset>`;
    // So lief es bisher, wenn die Gemeinde ohne "www" erfasst war:
    expect(sitemapKandidaten(xml, "https://nidda.de/")).toHaveLength(0);
    // Und so, wenn die Basis die tatsächlich ausgelieferte Adresse ist:
    const treffer = sitemapKandidaten(xml, "https://www.nidda.de/");
    expect(treffer).toHaveLength(1);
    expect(istEndergebnis(treffer[0])).toBe(true);
  });

  it("gilt genauso für Links aus dem Seiten-HTML", () => {
    const html = `<a href="https://www.nidda.de/klima/foerderprogramme/">Förderprogramme</a>`;
    expect(linkKandidaten(html, "https://nidda.de/")).toHaveLength(0);
    expect(linkKandidaten(html, "https://www.nidda.de/")).toHaveLength(1);
  });

  it("das Skript holt sich die Endadresse und rechnet mit ihr weiter", () => {
    expect(SKRIPT).toMatch(/abrufenMitZiel/);
    // Der Beweis, dass die Endadresse wirklich aus der Antwort kommt und nicht
    // aus dem übergebenen String: res.url ist die einzige Quelle dafür.
    expect(SKRIPT).toMatch(/startseite:\s*res\.url/);
  });
});

describe("Unaufgelöste Template-Platzhalter sind keine Förderseiten", () => {
  // Gemessen auf Niddas Förderübersicht: Der bestbewertete Kandidat war
  // `…/%7B%7B%20item.self.webUrl%20%7D%7D` — das Redaktionssystem hatte seine
  // Schleifenvariable nicht ersetzt. Weil die Bewertung prozentkodierte Zeichen
  // zurückverwandelt, kam die Adresse mit 13 Punkten durch und galt als
  // Endergebnis: eine 404 als gespeicherte Förderseite, und der Platz der
  // Gemeinde ist belegt.

  it("verwirft die prozentkodierte Fassung", () => {
    const url = "https://www.nidda.de/klima/foerderprogramme/%7B%7B%20item.self.webUrl%20%7D%7D";
    expect(bewerteLink(url, "Förderprogramm Photovoltaik").punkte).toBe(0);
  });

  it("verwirft die unkodierte Fassung und die andere Schreibweise", () => {
    expect(bewerteLink("https://x.de/foerderung/{{ item.url }}", "Förderung Solar").punkte).toBe(0);
    expect(bewerteLink("https://x.de/foerderung/${item.url}", "Förderung Solar").punkte).toBe(0);
  });

  it("lässt geschweifte Klammern in echten Adressen unangetastet", () => {
    // Gegenprobe: Der Ausschluss darf keine gewöhnliche Seite kosten.
    expect(bewerteLink("https://x.de/klima/foerderprogramm-photovoltaik").punkte).toBeGreaterThan(0);
  });
});
