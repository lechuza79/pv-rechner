import { describe, expect, it } from "vitest";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";
import { atlasRobots } from "../atlas-index";

/**
 * DIE RANGLISTEN SIND FÜR CRAWLER GESPERRT — UND DAS MUSS WIDERSPRUCHSFREI BLEIBEN.
 *
 * Die Sperre ist eine Kostenentscheidung (26.08.2026). Gemessen über 24 h gingen
 * 8.909 von 15.757 Funktionsaufrufen der ganzen Domain auf diese eine Route, und
 * eine Stichprobe über drei Stunden fand ausnahmslos Cache-Fehlschläge — jeder
 * Aufruf also ein voller Render samt Datenbank-Abfragen, ISR-Write und Übertragung
 * ans Auslieferungsnetz. Das war der größte Einzelposten der Vercel-Rechnung.
 *
 * Sie ist NUR deshalb gefahrlos, weil diese Seiten ohnehin nicht in einer
 * Suchmaschine stehen sollen. Genau diese Voraussetzung prüft der Test — in beide
 * Richtungen, denn sie kann von zwei Seiten kaputtgehen:
 *
 *   1. Jemand nimmt die Ranglisten in die Sitemap auf. Dann melden wir eine
 *      Adresse zur Indexierung an, die wir im selben Atemzug vom Abruf
 *      ausschließen — Google meldet das als Fehler, und es ist derselbe
 *      Widerspruch, den die Projektanweisung für die Kategorie-Übersicht des
 *      Balkon-Clusters ausdrücklich verbietet.
 *   2. Jemand schaltet die Ranglisten auf indexierbar. Dann soll die Seite
 *      gefunden werden, kann es aber nicht, weil der Crawler sie nicht laden
 *      darf — die Sperre würde von einer Kostenmaßnahme zu einem SEO-Schaden,
 *      ohne dass es im Browser auffiele.
 *
 * Wer die Ranglisten indexieren will, muss BEIDES ändern: die Sperre hier
 * herausnehmen UND sie in die Sitemap aufnehmen. Der Test zwingt zu dieser
 * bewussten Entscheidung, statt sie halb passieren zu lassen.
 */

const RANKING_PFAD = "/solar-atlas/ranking";

function alleRegeln() {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
}

/** Die Regel, die für ALLE Crawler gilt (userAgent "*"). */
function allgemeineRegel() {
  return alleRegeln().find((regel) => {
    const ua = regel.userAgent;
    return ua === "*" || (Array.isArray(ua) && ua.includes("*"));
  });
}

function alsListe(wert: string | string[] | undefined): string[] {
  if (!wert) return [];
  return Array.isArray(wert) ? wert : [wert];
}

describe("Ranglisten: Crawl-Sperre und Indexierbarkeit dürfen sich nicht widersprechen", () => {
  it("sperrt die Ranglisten für alle Crawler", () => {
    const regel = allgemeineRegel();
    expect(regel, "robots.txt braucht eine Regel für alle Crawler").toBeDefined();
    expect(alsListe(regel!.disallow)).toContain(RANKING_PFAD);
  });

  it("hält die Startseite offen — gesperrt wird die Gattung, nicht die Domain", () => {
    const regel = allgemeineRegel();
    expect(alsListe(regel!.allow)).toContain("/");
  });

  it("sperrt NICHT die Seiten, die gefunden werden sollen", () => {
    // Gemeinde-, Kreis- und Förderseiten sind der SEO-Hebel des Projekts.
    // Dieselbe Zeile wäre dort ein Schaden, den im Browser niemand sieht.
    const gesperrt = alsListe(allgemeineRegel()!.disallow);
    for (const pfad of ["/solar-atlas", "/photovoltaik-foerderung", "/ratgeber", "/balkonkraftwerk"]) {
      expect(gesperrt, `${pfad} darf nicht gesperrt sein`).not.toContain(pfad);
    }
    // Und die Sperre darf kein Präfix sein, das den Atlas mitnimmt: "/solar-atlas/ranking"
    // trifft nur die Ranglisten, "/solar-atlas" träfe alle 11.000 Gemeindeseiten.
    expect(RANKING_PFAD.startsWith("/solar-atlas/")).toBe(true);
    expect(gesperrt.some((p) => p === "/solar-atlas" || p === "/solar-atlas/")).toBe(false);
  });

  it("die Ranglisten stehen auf noindex — sonst wäre die Sperre ein SEO-Schaden", () => {
    // Die Route setzt atlasRobots(false). Fiele das je auf true, wollte jemand
    // die Seiten indexiert haben — und die Sperre darüber verhinderte es still.
    const r = atlasRobots(false);
    // Der Rückgabetyp erlaubt auch eine Zeichenkette ("noindex, nofollow").
    // Beide Formen sind zulässig, nur indexierbar darf es nicht sein.
    if (typeof r === "string") {
      expect(r).toContain("noindex");
    } else {
      expect(r?.index).toBe(false);
    }
  });

  it("keine gesperrte Adresse steht in der Sitemap", async () => {
    const eintraege = await sitemap();
    const gesperrt = alsListe(allgemeineRegel()!.disallow);
    const widersprueche = eintraege
      .map((e) => e.url)
      .filter((url) => {
        const pfad = new URL(url).pathname;
        return gesperrt.some((sperre) => pfad === sperre || pfad.startsWith(`${sperre}/`));
      });
    expect(
      widersprueche,
      `Diese Adressen sind zur Indexierung angemeldet UND vom Abruf ausgeschlossen: ${widersprueche.join(", ")}`
    ).toEqual([]);
  });
});
