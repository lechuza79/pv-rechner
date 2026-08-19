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

  // Die Kategorie-Übersicht selbst steht bewusst NICHT in Menü und Fußzeile:
  // Sie ist ein Verteiler auf Seiten, die dort schon einzeln stehen, und wird
  // von der Bereichs-Startseite und den Krümelspuren erreicht. Ein vierter
  // Menüeintrag, der nur auf zwei vorhandene zeigt, ist Lärm.
  const verlinkungspflichtig = seiten.filter(p => p !== "/balkonkraftwerk/ratgeber");

  it("steht in der Fußzeile — der einzigen crawlbaren Stelle auf jeder Seite", () => {
    for (const pfad of verlinkungspflichtig) {
      expect(footer, `${pfad} fehlt in der Fußzeile und ist damit von außerhalb des Clusters nicht crawlbar verlinkt`)
        .toContain(`href: "${pfad}"`);
    }
  });

  it("steht in der Menügruppe und hat dort einen eigenen Markierungs-Schlüssel", () => {
    for (const pfad of verlinkungspflichtig) {
      expect(header, `${pfad} fehlt in der Menügruppe`).toContain(`href: "${pfad}"`);
      if (pfad !== "/balkonkraftwerk") {
        expect(header, `${pfad} hat keinen eigenen Markierungs-Schlüssel — im Menü leuchtet dann der Hub statt der Seite`)
          .toContain(`startsWith("${pfad}")`);
      }
    }
  });
});
