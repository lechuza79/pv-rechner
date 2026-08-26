import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";

/**
 * DIE RANGLISTEN SIND FÜR CRAWLER GESPERRT — UND DAS MUSS WIDERSPRUCHSFREI BLEIBEN.
 *
 * Die Sperre ist eine Kostenentscheidung (26.08.2026). Gemessen über 24 h gingen
 * 8.909 von 15.757 Funktionsaufrufen der ganzen Domain auf diese eine Route.
 *
 * SIE IST NUR DESHALB GEFAHRLOS, WEIL GOOGLE DIESE SEITEN GAR NICHT KENNT.
 * Am 26.08.2026 über die Search Console geprüft: drei Stichproben der Ranglisten
 * antworten „URL ist Google nicht bekannt", während die Bundesland-Seite
 * „Gesendet und indexiert" trägt. Wir nehmen also nichts aus dem Index — wir
 * hören auf, etwas zum Abholen anzubieten, das nie jemand abholen sollte.
 *
 * DIE FRÜHERE BEGRÜNDUNG WAR FALSCH HERUM und ist hier nur festgehalten, damit
 * sie niemand wieder aufschreibt: „gefahrlos, weil die Seiten auf noindex
 * stehen" ist kein Argument, sondern ein Widerspruch. Eine per robots.txt
 * gesperrte Seite darf Google nicht laden, ALSO LIEST GOOGLE DAS NOINDEX NIE.
 * Für eine Seite, die bereits im Index steht, wäre die Sperre deshalb der
 * falsche Weg (sie bliebe als nackter Eintrag drin). Für eine Seite, die Google
 * nicht kennt, ist sie der richtige — und diese Voraussetzung prüft der Test
 * unten, so gut es ohne Search-Console-Zugang geht: über das noindex in der
 * Route UND darüber, dass sie in keiner Sitemap steht.
 *
 * Wer die Ranglisten indexieren will, muss BEIDES ändern: die Sperre hier
 * herausnehmen UND sie in die Sitemap aufnehmen.
 */

const RANKING_PFAD = "/solar-atlas/ranking";
const RANKING_ROUTE = path.join(
  __dirname, "..", "..", "app", "(site)", "solar-atlas", "ranking", "[[...pfad]]", "page.tsx"
);

function alleRegeln() {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
}

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
    expect(alsListe(allgemeineRegel()!.allow)).toContain("/");
  });

  it("sperrt NICHT die Seiten, die gefunden werden sollen", () => {
    const gesperrt = alsListe(allgemeineRegel()!.disallow);
    for (const pfad of ["/solar-atlas", "/photovoltaik-foerderung", "/ratgeber", "/balkonkraftwerk"]) {
      expect(gesperrt, `${pfad} darf nicht gesperrt sein`).not.toContain(pfad);
    }
    expect(gesperrt.some((p) => p === "/solar-atlas" || p === "/solar-atlas/")).toBe(false);
  });

  /**
   * DIESER TEST LIEST DIE ROUTE — die erste Fassung tat das NICHT.
   *
   * Sie rief `atlasRobots(false)` auf und prüfte, dass dabei `index: false`
   * herauskommt. `atlasRobots` ist aber eine Einzeiler-Funktion
   * (`indexable ? {index:true} : {index:false}`) — der Test verglich also eine
   * Konstante mit sich selbst und konnte per Konstruktion nie rot werden. Wer
   * in der Route auf `atlasRobots(true)` umstellte, bekam eine indexierbare
   * Seite hinter einer Crawl-Sperre, und alle Tests blieben grün. Dieselbe
   * Fehlerklasse wie der Gemeindeschlüssel-Test, der den Fehler mit sich selbst
   * verglich. Gefunden von einem adversarialen Prüfer am 26.08.2026.
   */
  it("die Ranglisten-ROUTE selbst steht auf noindex", () => {
    const quelle = fs.readFileSync(RANKING_ROUTE, "utf8");
    expect(
      /atlasRobots\(\s*false\s*\)/.test(quelle),
      "Die Ranglisten-Route muss atlasRobots(false) verwenden. Steht dort true, " +
        "will jemand die Seiten indexiert haben — dann muss zuerst die Sperre in " +
        "app/robots.ts weg, sonst darf Google die Seite nicht einmal laden."
    ).toBe(true);
    expect(
      /atlasRobots\(\s*true\s*\)/.test(quelle),
      "Die Ranglisten-Route darf nirgends atlasRobots(true) setzen."
    ).toBe(false);
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
