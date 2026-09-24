import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import { load } from "cheerio";
import { RATGEBER, ratgeberBySlug } from "../ratgeber";
import { navigationContent, navigationOwner } from "../../public/shared-nav/nav-content.js";

/**
 * Welcher Menüpunkt auf welcher Seite leuchtet.
 *
 * WARUM ES DIESEN TEST GIBT (18.08.2026): Die Zuordnung war eine handgepflegte
 * Kette von Pfad-Präfixen in der damaligen Kopfzeile. Sie hatte zwei Lücken,
 * und beide waren von außen unsichtbar — die Seite funktioniert, nur die
 * Markierung fehlt:
 *
 *   1. Nach dem Umzug des Balkon-Rechners nach /balkonkraftwerk/rechner prüfte
 *      die Kette genau diesen Pfad. Hub und Anmelde-Ratgeber fielen durch.
 *   2. Ratgeber mit Top-Level-Slug (/photovoltaik-neigungswinkel,
 *      /einspeiseverguetung-tabelle) wurden NIE erkannt, weil nur auf das
 *      Präfix /ratgeber geprüft wurde. Das war seit ihrer Einführung so.
 *
 * WARUM ER UMGEBAUT WURDE (20.09.2026): Er las bis dahin die alte Kopfzeile als
 * Text — eine Datei, die seit dem Release der neuen Oberfläche am 19.09.2026
 * keine Seite mehr ausliefert. Er war also grün, ohne etwas zu sehen; dieselbe
 * Klasse wie ein Wächter, der das Vorhandensein statt der Verwendung prüft.
 *
 * WAS DIE NEUE MARKIERUNG KANN — und was daraus für den Test folgt: Die
 * Navigation ordnet einen Pfad über `navigationOwner` genau einer von sechs
 * Gruppen zu. Innerhalb dieser Gruppe sucht sie den Eintrag, dessen Adresse
 * exakt dem Pfad entspricht, und markiert ihn. Die früheren Schlüssel je Seite
 * gibt es nicht mehr: **der Eintrag IST der Schlüssel**. Daraus folgt die eine
 * Bedingung, an der alles hängt und die niemand sonst prüft — ein Eintrag, der
 * nur in einer fremden Gruppe steht, kann nie leuchten, weil nur die
 * besitzende Gruppe durchsucht wird.
 *
 * WAS ER NICHT KANN: ob die Markierung am Ende wirklich gesetzt wird. Das
 * entscheidet das Skript des Design-Pakets, und das misst
 * e2e/header-ohne-js.spec.ts im Browser an einer echten Seite. Ohne diesen
 * zweiten Teil wäre der Umbau nur ein Ortswechsel derselben Blindheit.
 *
 * WER WAS PRÜFT — damit hier keine dritte Fassung entsteht:
 * lib/__tests__/shared-navigation.test.ts hält die Zuordnung Pfad → Gruppe
 * fest (benannte Fälle plus die Regel über alle Registry-Ratgeber, also auch
 * „Förderung schlägt Ratgeber"). Hier steht ausschließlich die Gegenrichtung:
 * Steht jede Seite dort, wo ihre Markierung sie sucht?
 */

/** Jeder Menü-Eintrag mit der Gruppe, in der er steht. */
function menueLinks(html: string): { gruppe: string; pfad: string }[] {
  const $ = load(html);
  const links: { gruppe: string; pfad: string }[] = [];
  $("[data-section]").each((_, sektion) => {
    const gruppe = $(sektion).attr("data-section")!;
    $(sektion)
      .find("a[href^='/']")
      .each((_, a) => {
        links.push({ gruppe, pfad: $(a).attr("href")!.split("#")[0] });
      });
  });
  return links;
}

/** Was eine Seite an das Menü meldet — genau wie components/SharedSiteHeader.tsx. */
const besitzer = (pfad: string) => navigationOwner(pfad, ratgeberBySlug(pfad) ? "ratgeber" : "");

/**
 * Ein Menü-Eintrag kann nur leuchten, wenn die Gruppe, die seine Seite besitzt,
 * ihn auch führt. Mehrere Einstiege auf dieselbe Seite sind ausdrücklich
 * erlaubt (der Atlas steht unter „Energiemonitor" und unter „Vor Ort") — aber
 * einer davon muss in der besitzenden Gruppe liegen.
 */
function eintraegeOhneMarkierung(html: string): string[] {
  const links = menueLinks(html);
  const gruppen = new Set(links.map(l => l.gruppe));
  const fehler: string[] = [];
  for (const pfad of new Set(links.map(l => l.pfad))) {
    const gruppe = besitzer(pfad);
    if (!gruppe) {
      fehler.push(`${pfad}: keine Gruppe besitzt diese Adresse — auf der Seite leuchtet nichts`);
    } else if (!gruppen.has(gruppe)) {
      fehler.push(`${pfad}: gehört zu „${gruppe}", diese Gruppe wird hier gar nicht angezeigt`);
    } else if (!links.some(l => l.gruppe === gruppe && l.pfad === pfad)) {
      fehler.push(`${pfad}: steht nur in „${links.filter(l => l.pfad === pfad).map(l => l.gruppe).join(", ")}", gesucht wird aber in „${gruppe}"`);
    }
  }
  return fehler;
}

describe("Menü-Markierung: Zuordnung Pfad → Menüpunkt", () => {
  const produktion = navigationContent();
  const mitOrganisationen = navigationContent({ showOrganisations: true });

  it("findet die Menüpunkte überhaupt (sonst prüft der Test nichts)", () => {
    const links = menueLinks(produktion);
    expect(new Set(links.map(l => l.gruppe)).size).toBeGreaterThanOrEqual(5);
    expect(links.length).toBeGreaterThanOrEqual(20);
  });

  it("jeder Eintrag des ausgelieferten Menüs steht in der Gruppe, die seine Seite besitzt", () => {
    // Das ausgelieferte Menü ist das ohne „Für Organisationen" — die Gruppe ist
    // vorbereitet und bis zu passenden Zielgruppenseiten ausgeblendet. Ein
    // Eintrag, dessen Gruppe gar nicht angezeigt wird, leuchtet deshalb nie:
    // Wer den Kontakt-Link aus einer sichtbaren Gruppe heraus anbietet, während
    // seine eigene versteckt ist, baut genau diesen Fall.
    expect(eintraegeOhneMarkierung(produktion)).toEqual([]);
  });

  it("dasselbe gilt für die vorbereitete Gruppe, bevor sie sichtbar wird", () => {
    // Sonst fällt der Fehler erst auf, wenn jemand sie einschaltet — und dann
    // ist er eine sichtbare Änderung statt eines roten Tests.
    expect(eintraegeOhneMarkierung(mitOrganisationen)).toEqual([]);
  });

  it("mehrere Einstiege auf dieselbe Seite gibt es wirklich (sonst prüft die Regel darüber nichts)", () => {
    // Realitäts-Anker: Ohne diesen Fall wäre die Regel „einer davon muss in der
    // besitzenden Gruppe liegen" trivial erfüllt, und niemand merkte, wenn sie
    // durch eine Umstellung wirkungslos würde.
    const links = menueLinks(mitOrganisationen);
    const mehrfach = [...new Set(links.map(l => l.pfad))].filter(
      pfad => new Set(links.filter(l => l.pfad === pfad).map(l => l.gruppe)).size > 1,
    );
    expect(mehrfach.length).toBeGreaterThan(0);
  });

  it("jeder Ratgeber mit eigenem Slug wird von der Registry-Regel erfasst", () => {
    // Realitäts-Anker: Es gibt sie wirklich, und es sind mehrere. Fiele die
    // Registry-Regel weg, träfe es genau diese Seiten — ohne dass ein anderer
    // Test anschlägt.
    const eigenerSlug = RATGEBER.filter(r => !r.slug.startsWith("/ratgeber/"));
    expect(eigenerSlug.length).toBeGreaterThanOrEqual(2);
    for (const r of eigenerSlug) {
      expect(r.slug.startsWith("/")).toBe(true);
      expect(besitzer(r.slug), `${r.slug} bekommt keinen Menüpunkt zugewiesen`).not.toBeNull();
    }
  });
});


// ─── Drei Listen, eine Wahrheit ────────────────────────────────────────────
//
// WARUM ES DIESEN TEST GIBT (19.08.2026): Eine neue Seite in einem Themen-Cluster
// muss an mehreren Stellen von Hand eingetragen werden — Menügruppe,
// Fußzeile in lib/site-fuss.ts und Ratgeber-Registry. Beim Speicher-Ratgeber
// sind zwei davon vergessen worden, und keine davon fällt im Browser auf: Die
// Seite funktioniert, sie ist nur nirgends verlinkt. Seit dem 20.09.2026 liegt
// die Menügruppe im Design-Paket (public/shared-nav/nav-content.js) statt in
// der alten Kopfzeile; an der Zahl der Stellen ändert das nichts.
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
  const footer = readFileSync(resolve(__dirname, "../site-fuss.ts"), "utf8");

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

  it("jede Seite des Clusters bekommt überhaupt einen Menüpunkt zugewiesen", () => {
    // Auch die Artikel: Sie stehen nicht im Menü, aber ihre GRUPPE muss
    // leuchten. Ohne Zuordnung ist auf der Seite kein Menüpunkt hervorgehoben,
    // und man sieht ihr nicht an, wo sie hingehört.
    for (const pfad of seiten) {
      expect(besitzer(pfad), `${pfad} gehört zu keiner Menügruppe`).not.toBeNull();
    }
  });

  it("Bereichs-Seiten stehen im Menü, und zwar in der Gruppe, die sie besitzt", () => {
    // Der frühere Markierungs-Schlüssel je Seite ist seit der neuen Navigation
    // der Eintrag selbst: Markiert wird der Link, dessen Adresse exakt dem
    // Pfad entspricht — gesucht aber nur innerhalb der besitzenden Gruppe.
    // Ein Eintrag in einer fremden Gruppe leuchtet deshalb nie.
    const links = menueLinks(navigationContent({ showOrganisations: true }));
    for (const pfad of [bereichsWurzel, ...direktUnterBereich]) {
      const gruppe = besitzer(pfad);
      expect(links.some(l => l.pfad === pfad), `${pfad} fehlt im Menü`).toBe(true);
      expect(links.some(l => l.gruppe === gruppe && l.pfad === pfad),
        `${pfad} steht im Menü, aber nicht unter „${gruppe}" — dort sucht die Markierung`).toBe(true);
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
