import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import { RATGEBER } from "../ratgeber";

/**
 * Welcher Menüpunkt auf welcher Seite leuchtet.
 *
 * WARUM ES DIESEN TEST GIBT (18.08.2026): Die Zuordnung ist eine handgepflegte
 * Kette von Pfad-Präfixen in components/Header.tsx. Sie hatte zwei Lücken, und
 * beide waren von außen unsichtbar — die Seite funktioniert, nur die Markierung
 * fehlt:
 *
 *   1. Nach dem Umzug des Balkon-Rechners nach /balkonkraftwerk/rechner prüfte
 *      die Kette genau diesen Pfad. Hub (/balkonkraftwerk) und Anmelde-Ratgeber
 *      fielen durch.
 *   2. Ratgeber mit Top-Level-Slug (/photovoltaik-neigungswinkel,
 *      /einspeiseverguetung-tabelle) wurden NIE erkannt, weil nur auf das
 *      Präfix /ratgeber geprüft wurde. Das war seit ihrer Einführung so.
 *
 * Der Test liest die Header-Datei als Text statt die Komponente zu rendern:
 * Er soll die Zuordnungs-REGEL prüfen, nicht React. Ein Rendering-Test bräuchte
 * eine Testing-Library, die bewusst nicht im Stack ist.
 */
const header = readFileSync(resolve(__dirname, "..", "..", "components", "Header.tsx"), "utf8");

describe("Menü-Markierung: Zuordnung Pfad → Menüpunkt", () => {
  it("der ganze Balkon-Cluster zeigt auf einen Menüpunkt, nicht nur der Rechner", () => {
    // Ein Präfix auf /balkonkraftwerk deckt Hub, Rechner und Anmelde-Ratgeber ab.
    // Stünde hier wieder ein tieferer Pfad, wären zwei von drei Seiten unmarkiert.
    expect(header).toMatch(/startsWith\("\/balkonkraftwerk"\)\s*\?\s*"balkon"/);
    // Je Seite ein eigener Schlüssel — mit einem gemeinsamen leuchteten im
    // Ausklappmenü alle drei Einträge gleichzeitig (gemeldet 19.08.2026).
    expect(header).toMatch(/startsWith\("\/balkonkraftwerk\/rechner"\)\s*\?\s*"balkon-rechner"/);
    expect(header).toMatch(/startsWith\("\/balkonkraftwerk\/ratgeber\/anmelden"\)\s*\?\s*"balkon-anmelden"/);
    expect(header).toMatch(/startsWith\("\/balkonkraftwerk\/ratgeber\/mit-speicher"\)\s*\?\s*"balkon-speicher"/);
    // Die spezifischen Pfade müssen vor dem Hub stehen, sonst fängt dessen
    // Präfix sie ab und alles ist wieder "balkon".
    expect(header.indexOf('"/balkonkraftwerk/rechner"')).toBeLessThan(header.indexOf('startsWith("/balkonkraftwerk")'));
    expect(header.indexOf('"/balkonkraftwerk/ratgeber/mit-speicher"')).toBeLessThan(header.indexOf('startsWith("/balkonkraftwerk")'));

    // Gegenrichtung: JEDE Seite des Clusters steht im Menü und hat dort einen
    // eigenen Schlüssel. Ohne diese Prüfung fällt eine neue Cluster-Seite
    // stillschweigend aus dem Menü — genau so ist der Speicher-Ratgeber am
    // 19.08.2026 zunächst als einzige der vier Seiten dort gefehlt.
    for (const slug of ["/balkonkraftwerk", "/balkonkraftwerk/rechner", "/balkonkraftwerk/ratgeber/anmelden", "/balkonkraftwerk/ratgeber/mit-speicher"]) {
      expect(header, `${slug} fehlt im Balkon-Menü`).toContain(`href: "${slug}"`);
    }
  });

  // Als REGEL statt als Aufzählung — die Fassung darüber kannte genau drei
  // Pfade, und als am 19.08.2026 /balkonkraftwerk/foerderung dazukam, blieb sie
  // grün, während im Menü „Überblick" leuchtete. Ein Test, der eine Liste
  // wiederholt, prüft den Stand von gestern; dieser liest die Menüpunkte selbst.
  it("JEDE Seite des Balkon-Clusters hat ihren eigenen Schlüssel — vor dem Hub", () => {
    const block = header.slice(header.indexOf("const BALKON_ITEMS"), header.indexOf("];", header.indexOf("const BALKON_ITEMS")));
    const hrefs = [...block.matchAll(/href: "(\/balkonkraftwerk[^"]*)"/g)].map((m) => m[1]);
    const tiefer = hrefs.filter((h) => h !== "/balkonkraftwerk");
    expect(tiefer.length, "der Cluster hat Unterseiten").toBeGreaterThanOrEqual(3);

    const hub = header.indexOf('startsWith("/balkonkraftwerk")');
    for (const h of tiefer) {
      const zweig = header.indexOf(`startsWith("${h}")`);
      expect(zweig, `${h} hat keinen eigenen Zweig in der Zuordnung`).toBeGreaterThan(-1);
      expect(zweig, `${h} steht hinter dem Hub-Präfix und wird davon verschluckt`).toBeLessThan(hub);
    }
  });

  it("Ratgeber werden über die Registry erkannt, nicht über das Pfad-Präfix", () => {
    // Sonst leuchtet der Menüpunkt auf jedem Ratgeber mit eigenem Slug nicht.
    expect(header).toMatch(/ratgeberBySlug\(pathname\)\s*\?\s*"ratgeber"/);
  });

  it("die Balkon-Regel steht VOR der Ratgeber-Regel", () => {
    // /balkonkraftwerk/ratgeber/anmelden ist beides — Registry-Eintrag und Teil des
    // Clusters. Es soll „Balkonkraftwerk" hervorheben, nicht „Ratgeber".
    const balkon = header.indexOf('"/balkonkraftwerk"');
    const ratgeber = header.indexOf("ratgeberBySlug(pathname)");
    expect(balkon).toBeGreaterThan(-1);
    expect(ratgeber).toBeGreaterThan(-1);
    expect(balkon).toBeLessThan(ratgeber);
  });

  it("jeder Ratgeber mit eigenem Slug wird von der Registry-Regel erfasst", () => {
    // Realitäts-Anker: Es gibt sie wirklich, und es sind mehrere. Fiele die
    // Registry-Regel weg, träfe es genau diese Seiten — ohne dass ein anderer
    // Test anschlägt.
    const eigenerSlug = RATGEBER.filter(r => !r.slug.startsWith("/ratgeber/"));
    expect(eigenerSlug.length).toBeGreaterThanOrEqual(2);
    for (const r of eigenerSlug) {
      expect(r.slug.startsWith("/")).toBe(true);
    }
  });
});


// ─── Drei Listen, eine Wahrheit ────────────────────────────────────────────
//
// WARUM ES DIESEN TEST GIBT (19.08.2026): Eine neue Seite in einem Themen-Cluster
// muss heute an DREI Stellen von Hand eingetragen werden — Menügruppe und
// Markierungs-Kette in components/Header.tsx, Fußzeile in components/Footer.tsx,
// dazu die Ratgeber-Registry. Beim Speicher-Ratgeber sind zwei davon vergessen
// worden, und keine davon fällt im Browser auf: Die Seite funktioniert, sie ist
// nur nirgends verlinkt.
//
// Die Fußzeile ist dabei die WICHTIGE der beiden: Sie ist neben dem
// Themen-Einstieg der einzige Ort, an dem der Cluster crawlbar verlinkt ist —
// die Menü-Ausklappgruppe rendert ihre Einträge erst beim Öffnen und zählt als
// interner Verweis nicht.
//
// Der Test leitet die Wahrheit deshalb aus dem DATEISYSTEM ab, nicht aus einer
// vierten Liste: Was als Seite existiert, muss verlinkt sein. Eine Liste gegen
// eine Liste zu prüfen würde nur festschreiben, was schon da ist.
//
// Die saubere Lösung wäre eine gemeinsame Quelle für die Navigation, aus der
// Menü, Fußzeile und später die Bereichsnavigation lesen — siehe
// docs/themen-cluster-struktur.md. Bis dahin ist dieser Test das Netz.
// Ein interner Link auf eine weitergeleitete Adresse ist ein vermeidbarer
// Fehler: Er kostet einen zusaetzlichen Sprung und streut das Signal auf zwei
// Adressen. Gefunden am 19.08.2026 von einem adversarialen SEO-Pruefer — die
// Foerderseite kam aus einer parallelen Sitzung und verlinkte den Anmelde-
// Ratgeber unter seiner alten Adresse, waehrend die Fusszeile daneben schon die
// neue trug. Zwei Adressen, ein Ziel, derselbe Ankertext.
describe("Interne Links zeigen nie auf eine Weiterleitung", () => {
  const config = readFileSync(resolve(__dirname, "../../next.config.js"), "utf8");
  /** Alle Quellpfade aus dem redirects()-Block von next.config.js — das sind
   *  die Adressen, die es nicht mehr gibt.
   *
   *  NUR dieser Block: `headers()` und `rewrites()` benutzen dasselbe Feld
   *  `source`, meinen aber Seiten, die es sehr wohl gibt (/dashboard, /plz.json).
   *  Ein Test, der die mitzaehlt, meldet dreizehn Fehlalarme und wird dann
   *  abgeschaltet statt gelesen. */
  const redirectBlock = config.slice(config.indexOf("async redirects()"));
  const weitergeleitet = [...redirectBlock.matchAll(/source:\s*"(\/[^"*:]+)"/g)]
    .map(m => m[1])
    // Der Wurzelpfad steht dort mit einer `has`-Bedingung (nur mit Query-Param)
    // und ist keine verschwundene Adresse.
    .filter(pfad => pfad !== "/");

  it("findet die Weiterleitungen ueberhaupt", () => {
    expect(weitergeleitet.length).toBeGreaterThan(10);
  });

  // 20 Sekunden statt fünf — siehe analytics-ereignisse.test.ts: Diese Prüfung
  // liest den ganzen Quellbaum und wird unter paralleler Last langsam, ohne
  // dass am Code etwas falsch wäre.
  it("keine Seite und kein Baustein verlinkt eine weitergeleitete Adresse", () => {
    const wurzeln = [resolve(__dirname, "../../app"), resolve(__dirname, "../../components"), resolve(__dirname, "../../lib")];
    const treffer: string[] = [];
    const suchen = (ordner: string) => {
      for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
        const voll = resolve(ordner, eintrag.name);
        if (eintrag.isDirectory()) {
          if (eintrag.name === "node_modules" || eintrag.name === "__tests__") continue;
          suchen(voll);
        } else if (/\.tsx?$/.test(eintrag.name)) {
          const inhalt = readFileSync(voll, "utf8");
          for (const alt of weitergeleitet) {
            // Nur exakte Adressen als String-Literal — ein laengerer Pfad, der
            // zufaellig damit beginnt, ist eine andere Seite.
            if (inhalt.includes(`"${alt}"`)) treffer.push(`${eintrag.name}: ${alt}`);
          }
        }
      }
    };
    wurzeln.forEach(suchen);
    expect(treffer, `interne Links auf weitergeleitete Adressen: ${treffer.join(", ")}`).toEqual([]);
  }, 20_000);
});

describe("Themen-Cluster: jede Seite ist auch verlinkt", () => {
  const footer = readFileSync(resolve(__dirname, "../../components/Footer.tsx"), "utf8");

  /** Alle Seiten eines Clusters, direkt aus dem Dateibaum — auch die in
   *  Kategorie-Unterordnern (seit 19.08.2026 liegen die Ratgeber eine Ebene
   *  tiefer). Ohne Rekursion prüfte der Test genau die Seiten nicht mehr, für
   *  die es ihn gibt. */
  function clusterSeiten(cluster: string): string[] {
    const wurzel = resolve(__dirname, "../../app/(site)", cluster);
    if (!existsSync(wurzel)) return [];
    const pfade: string[] = [];
    const sammeln = (ordner: string, pfad: string) => {
      if (existsSync(resolve(ordner, "page.tsx"))) pfade.push(pfad);
      for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
        // Dynamische Segmente ([slug]) sind keine einzelne Seite und gehören
        // nicht in eine Navigation.
        if (!eintrag.isDirectory() || eintrag.name.startsWith("[")) continue;
        sammeln(resolve(ordner, eintrag.name), `${pfad}/${eintrag.name}`);
      }
    };
    sammeln(wurzel, `/${cluster}`);
    return pfade;
  }

  const seiten = clusterSeiten("balkonkraftwerk");

  it("findet den Cluster überhaupt (sonst prüft der Test nichts)", () => {
    expect(seiten.length).toBeGreaterThanOrEqual(4);
    expect(seiten).toContain("/balkonkraftwerk");
  });

  // ── Zwei Klassen, zwei Pflichten (Betreiber-Vorgabe 20.08.2026) ──────────
  //
  // „Nicht jeder Ratgeber kann einen Eintrag in der Hauptnavigation haben."
  // Stimmt — und die erste Fassung dieses Tests verlangte genau das. Sie wäre
  // beim fünften Artikel entweder rot geworden oder hätte die Navigation mit
  // Einträgen geflutet, die dort niemand sucht. Deshalb unterscheidet der Test
  // jetzt nach der Stelle im Baum:
  //
  //   • DIREKT unter dem Bereich (Startseite, Rechner, Förder-Überblick) —
  //     eine kleine, feste Menge, die sich kaum ändert. Sie gehört in Menü UND
  //     Fußzeile: Das sind die einzigen Stellen, an denen der Bereich von
  //     außerhalb überhaupt crawlbar verlinkt ist.
  //   • In einer KATEGORIE (Artikel unter /ratgeber/, später /produkte/) —
  //     eine wachsende Reihe. Sie gehört NICHT ins Menü, sondern in die
  //     Übersicht ihrer Kategorie. Die ist genau dafür da.
  //
  // Was in beiden Fällen gilt: Jede Seite muss von irgendwo crawlbar erreichbar
  // sein. Nur das „von wo" unterscheidet sich.
  const bereichsWurzel = "/balkonkraftwerk";
  const kategorieUebersichten = seiten.filter(p => p.split("/").length === 3 && seiten.some(k => k.startsWith(`${p}/`)));
  const direktUnterBereich = seiten.filter(p =>
    p !== bereichsWurzel && p.split("/").length === 3 && !kategorieUebersichten.includes(p));
  const inKategorie = seiten.filter(p => p.split("/").length > 3);

  it("teilt die Seiten überhaupt in beide Klassen (sonst prüft der Test die Hälfte nicht)", () => {
    expect(direktUnterBereich.length).toBeGreaterThan(0);
    expect(inKategorie.length).toBeGreaterThan(0);
    expect(kategorieUebersichten).toContain("/balkonkraftwerk/ratgeber");
  });

  it("Bereichs-Seiten stehen in der Fußzeile — der einzigen crawlbaren Stelle auf jeder Seite", () => {
    for (const pfad of [bereichsWurzel, ...direktUnterBereich]) {
      expect(footer, `${pfad} fehlt in der Fußzeile und ist damit von außerhalb des Bereichs nicht crawlbar verlinkt`)
        .toContain(`href: "${pfad}"`);
    }
  });

  it("Bereichs-Seiten stehen im Menü und haben einen eigenen Markierungs-Schlüssel", () => {
    for (const pfad of [bereichsWurzel, ...direktUnterBereich]) {
      expect(header, `${pfad} fehlt in der Menügruppe`).toContain(`href: "${pfad}"`);
      if (pfad !== bereichsWurzel) {
        expect(header, `${pfad} hat keinen eigenen Markierungs-Schlüssel — im Menü leuchtet dann der Bereich statt der Seite`)
          .toContain(`startsWith("${pfad}")`);
      }
    }
  });

  it("Artikel einer Kategorie stehen in der Übersicht ihrer Kategorie", () => {
    // Nicht im Menü — dort werden es sonst zu viele. Die Kategorie-Übersicht
    // listet sie aus der Registry, also genügt der Registry-Eintrag; ohne den
    // taucht der Artikel nirgends auf.
    for (const pfad of inKategorie) {
      const kategorie = pfad.slice(0, pfad.lastIndexOf("/"));
      expect(kategorieUebersichten, `${pfad} liegt in einer Kategorie ohne Übersichtsseite — die Adresse führt dann ins Leere`)
        .toContain(kategorie);
      expect(RATGEBER.map(r => r.slug), `${pfad} steht in keiner Registry und erscheint damit in keiner Übersicht`)
        .toContain(pfad);
    }
  });
});
