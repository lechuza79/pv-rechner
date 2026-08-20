import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
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
    expect(header).toMatch(/startsWith\("\/balkonkraftwerk\/anmelden"\)\s*\?\s*"balkon-anmelden"/);
    // Die spezifischen Pfade müssen vor dem Hub stehen, sonst fängt dessen
    // Präfix sie ab und alles ist wieder "balkon".
    expect(header.indexOf('"/balkonkraftwerk/rechner"')).toBeLessThan(header.indexOf('startsWith("/balkonkraftwerk")'));
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
    // /balkonkraftwerk/anmelden ist beides — Registry-Eintrag und Teil des
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
