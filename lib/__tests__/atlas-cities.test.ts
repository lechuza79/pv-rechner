import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, slugify, cityPath, bundeslaenderWithCities, citiesInBundesland, liveCities, isCityLive, isCityArchived, archivedCities, isCityPublished, publishedCities, publishedCitiesInBundesland, publishedBundeslaender, fundingFor, cityIndexFreigegeben, foerderStadtUmleitung, foerderBundeslaender } from "../atlas-cities";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { landProgramBundeslaender, getFundingProgram, foerdertDach } from "../funding-programs";
import nextConfig from "../../next.config.js";

// Live-Policy (Juni 2026): nur Regionen mit aktivem Programm bekommen eine Seite.
describe("live cities (only active programs)", () => {
  it("a city is live iff its program status is aktiv", () => {
    // Geprüft wird die AUFGELÖSTE Zuordnung, nicht das handgepflegte Feld:
    // seit 18.08.2026 leitet fundingFor() sie über den Gemeindeschlüssel ab,
    // damit Katalog und Verzeichnis nicht mehr auseinanderlaufen können.
    for (const c of liveCities()) {
      expect(fundingFor(c), c.slug).toBeTruthy();
      expect(fundingFor(c)?.status).toBe("aktiv");
    }
  });
  it("includes an active program city and excludes inactive/no-program ones", () => {
    const slugs = liveCities().map((c) => c.slug);
    expect(slugs).toContain("wuerzburg"); // aktiv
    expect(slugs).toContain("regensburg"); // aktiv
    expect(slugs).not.toContain("schweinfurt"); // eingestellt (Council Juli 2026)
    // München fördert seit 01.10.2026 wieder, aber nur Balkonkraftwerke —
    // seit 06.10.2026 eine laufende Seite als „Balkonkraftwerk-Förderung".
    expect(slugs).toContain("muenchen"); // aktiv, nur Balkon
    expect(slugs).not.toContain("karlsruhe"); // ausgeschoepft
    // Dresden hatte lange gar kein Programm. Seit dem 02.09.2026 gilt für die
    // Stadt das sächsische LANDESprogramm — und ein Landesprogramm eines
    // Flächenlands trägt keine Stadtseite: Dresden, Leipzig und Chemnitz
    // bekämen sonst dieselbe Auskunft unter drei Ortsnamen.
    expect(slugs).not.toContain("dresden"); // Landesprogramm, keine Stadtseite
  });
  it("isCityLive is false for cities without any program", () => {
    const noProg = ATLAS_CITIES.find((c) => !fundingFor(c))!;
    expect(isCityLive(noProg)).toBe(false);
  });
});

// Archive-Policy (Juni 2026): Regionen mit inaktivem Programm (ausgeschöpft/
// pausiert/eingestellt) bekommen eine Archiv-Seite; "unsicher" und "kein
// Programm" bleiben auf 404.
describe("archived cities (inactive but published programs)", () => {
  it("a city is archived iff its program is exhausted/paused/discontinued — or active without rooftop PV AND without balcony systems", () => {
    // 01.10.2026: Ein laufendes Programm OHNE Dach-PV wurde wie ein Archiv
    // gezeigt. Seit 06.10.2026 ist ein reines Balkon-Programm eine laufende
    // Seite („Balkonkraftwerk-Förderung"); Archiv bleibt nur, was weder Dach-PV
    // noch Balkon fördert (z. B. nur Wärmepumpen).
    const inactive = ["ausgeschoepft", "pausiert", "eingestellt"];
    for (const c of archivedCities()) {
      const f = fundingFor(c);
      expect(f, c.slug).toBeTruthy();
      if (f!.status === "aktiv") {
        expect(foerdertDach(f!), c.slug).toBe(false);
        expect(f!.foerdert ?? [], c.slug).not.toContain("balkon");
      } else expect(inactive).toContain(f!.status);
    }
  });
  it("includes inactive-program cities and excludes active/unsicher/no-program", () => {
    const slugs = archivedCities().map((c) => c.slug);
    expect(slugs).not.toContain("muenchen"); // aktiv, nur Balkon → live
    expect(slugs).toContain("karlsruhe"); // ausgeschoepft
    expect(slugs).toContain("duesseldorf"); // pausiert
    expect(slugs).not.toContain("wuerzburg"); // aktiv
    expect(slugs).not.toContain("dresden"); // kein Programm
    // Heidelberg stand hier als Beispiel für "unsicher → bewusst nicht
    // veröffentlicht". Seit dem 14.08.2026 ist der Status an der Förderrichtlinie
    // 2026 geklärt (Council 3/3), das Programm läuft — die Stadt ist damit live,
    // nicht archiviert. Die Regel selbst prüft der Test darunter, ohne Namen.
    expect(slugs).not.toContain("heidelberg"); // aktiv → live, nicht Archiv
  });
  it("live and archived are disjoint; published is their released subset", () => {
    const live = new Set(liveCities().map((c) => c.slug));
    const archived = archivedCities().map((c) => c.slug);
    for (const s of archived) expect(live.has(s)).toBe(false);

    // Bis zum 19.08.2026 galt hier Gleichheit: veröffentlicht = live ∪ archiviert.
    // Seit dem Releaseplan ist es eine TEILMENGE — der Programmstatus sagt, ob
    // eine Seite etwas zu sagen hätte, der Plan sagt, ob sie jetzt erscheinen
    // soll. Genau diese Trennung war der Zweck: Vorher war die Veröffentlichung
    // eine Nebenwirkung des Status, und 48 neue Programme hätten 48 Seiten
    // gemacht, ohne dass jemand es entschieden hat.
    const published = new Set(publishedCities().map((c) => c.slug));
    const nachStatus = new Set([...live, ...archived]);
    for (const s of published) expect(nachStatus.has(s)).toBe(true);
    expect(published.size).toBeLessThanOrEqual(nachStatus.size);

    for (const c of publishedCities()) expect(isCityPublished(c)).toBe(true);
    // Und die Differenz ist nicht Zufall, sondern die Freigabe: Was der Status
    // hergäbe, aber die Freigabe nicht hergibt, bleibt draußen.
    //
    // GEPRÜFT WIRD DIE FREIGABE, NICHT DER PLAN (05.09.2026). Bis hierher stand
    // an dieser Stelle releaseFreigegeben() — also der Plan allein. Seit dem
    // 01.09.2026 gibt es einen zweiten Weg (foerderseiteTraegt), und der Test
    // hat den Widerspruch nicht gesehen: Er blieb grün, weil er dieselbe
    // überholte Annahme trug wie der Code, den er absichern sollte. Er hat den
    // Fehler mit sich selbst verglichen.
    const gesperrt = [...nachStatus].filter((s) => !published.has(s));
    for (const s of gesperrt) {
      const c = ATLAS_CITIES.find((x) => x.slug === s)!;
      expect(cityIndexFreigegeben(c), `${s} gesperrt, obwohl die Freigabe steht`).toBe(false);
    }
  });

  // WARUM DIESER TEST (05.09.2026): Die Seite wird mit `dynamicParams = false`
  // erzeugt — eine Adresse, die nicht aus publishedCities() kommt, ist eine
  // HARTE 404. Die Sitemap filtert dagegen auf cityIndexFreigegeben(). Liefen
  // die beiden auseinander, lädt die Sitemap Google zu Seiten ein, die es nicht
  // gibt: gemessen 21 von 59 Förder-Stadtseiten, vier Tage lang live, auf der
  // Seitenfamilie mit der besten Sichtbarkeit des Projekts. Kein Typfehler,
  // kein roter Test, kein kaputtes Aussehen — nur tote Adressen.
  it("Sitemap und Seitenerzeugung geben genau dieselben Städte frei", () => {
    // Richtung 1: in der Sitemap, aber ohne Seite → 404 für Google.
    const inSitemapOhneSeite = ATLAS_CITIES.filter((c) => cityIndexFreigegeben(c) && !isCityPublished(c));
    expect(
      inSitemapOhneSeite.map((c) => `${slugify(c.bundesland)}/${c.slug}`),
      "stehen in der Sitemap und antworten mit 404",
    ).toEqual([]);

    // Richtung 2: Seite ohne Sitemap-Eintrag. Kein 404, aber die Seite ist dann
    // indexierbar und wird nicht angemeldet — die stille Hälfte desselben
    // Auseinanderlaufens, und ohne diese Prüfung fiele sie niemandem auf.
    const seiteOhneSitemap = ATLAS_CITIES.filter((c) => isCityPublished(c) && !cityIndexFreigegeben(c));
    expect(
      seiteOhneSitemap.map((c) => `${slugify(c.bundesland)}/${c.slug}`),
      "haben eine Seite, stehen aber nicht in der Sitemap",
    ).toEqual([]);
  });
  // Die Regel ohne Namen: Solange wir einem Programm nicht trauen, bekommt seine
  // Stadt keine Seite — weder live noch als Archiv. Vorher hing dieser Test an
  // Heidelberg; als dessen Status geklärt war, prüfte er nichts mehr.
  it("no city with an 'unsicher' program is published (stays 404)", () => {
    const unsicher = ATLAS_CITIES.filter(
      (c) => c.fundingId && getFundingProgram(c.fundingId)?.status === "unsicher",
    );
    for (const c of unsicher) {
      expect(isCityLive(c), `${c.slug} live trotz unsicherem Programm`).toBe(false);
      expect(isCityArchived(c), `${c.slug} archiviert trotz unsicherem Programm`).toBe(false);
      expect(isCityPublished(c), `${c.slug} veröffentlicht trotz unsicherem Programm`).toBe(false);
    }
  });

  it("Heidelberg ist live, seit die Richtlinie 2026 den Status geklärt hat", () => {
    const heidelberg = ATLAS_CITIES.find((c) => c.slug === "heidelberg")!;
    expect(getFundingProgram(heidelberg.fundingId!)?.status).toBe("aktiv");
    expect(isCityLive(heidelberg)).toBe(true);
    expect(isCityArchived(heidelberg)).toBe(false);
  });
  it("publishedBundeslaender covers Rheinland-Pfalz (only archived cities there)", () => {
    // Mainz + Mayen-Koblenz sind ausgeschöpft → RLP hat ohne Archiv keine Seite.
    expect(publishedBundeslaender().map((b) => b.slug)).toContain("rheinland-pfalz");
    const rlp = publishedCitiesInBundesland("rheinland-pfalz").map((c) => c.slug);
    expect(rlp).toEqual(expect.arrayContaining(["mainz", "mayen-koblenz"]));
  });
  it("publishedCitiesInBundesland lists active programs before archived ones", () => {
    for (const bl of publishedBundeslaender().map((b) => b.slug)) {
      const cities = publishedCitiesInBundesland(bl);
      const firstArchived = cities.findIndex((c) => !isCityLive(c));
      if (firstArchived === -1) continue;
      // no live city may appear after the first archived one
      for (let i = firstArchived; i < cities.length; i++) expect(isCityLive(cities[i])).toBe(false);
    }
  });
});

describe("slugify", () => {
  it("transliterates umlauts and ß and collapses separators", () => {
    expect(slugify("Baden-Württemberg")).toBe("baden-wuerttemberg");
    expect(slugify("Bayern")).toBe("bayern");
    expect(slugify("Nordrhein-Westfalen")).toBe("nordrhein-westfalen");
    expect(slugify("Groß Düsseldorf")).toBe("gross-duesseldorf");
  });
});

describe("geo helpers", () => {
  it("cityPath builds the nested Bundesland/Stadt path", () => {
    const wue = ATLAS_CITIES.find((c) => c.slug === "wuerzburg")!;
    expect(cityPath(wue)).toBe("/photovoltaik-foerderung/bayern/wuerzburg");
  });

  it("citiesInBundesland returns only that Land's cities", () => {
    // jede zurückgegebene Stadt liegt wirklich in dem Bundesland
    for (const slug of ["bayern", "hessen", "baden-wuerttemberg"]) {
      for (const c of citiesInBundesland(slug)) expect(slugify(c.bundesland)).toBe(slug);
    }
    expect(citiesInBundesland("bayern").map((c) => c.slug)).toContain("muenchen");
    expect(citiesInBundesland("hessen").map((c) => c.slug)).toContain("wiesbaden");
    // Sachsen has Leipzig and Dresden (more may follow) — assert membership, not an exact list.
    expect(citiesInBundesland("sachsen").map((c) => c.slug)).toEqual(expect.arrayContaining(["leipzig", "dresden"]));
  });

  it("bundeslaenderWithCities is unique and covers every city's Bundesland", () => {
    const slugs = bundeslaenderWithCities().map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of ATLAS_CITIES) expect(slugs).toContain(slugify(c.bundesland));
  });
});

describe("landProgramBundeslaender", () => {
  it("includes Berlin (Land program without cities)", () => {
    expect(landProgramBundeslaender().map((b) => b.slug)).toContain("berlin");
  });
});

// Drift guard: the old flat slugs are redirected to the nested paths via a
// hand-written list in next.config.js. If a city is added/renamed in
// atlas-cities but the redirect isn't updated, a live URL breaks. Lock it.
describe("slug redirects stay in sync with atlas-cities", () => {
  it("every city's flat URL redirects (308) to its current nested path", async () => {
    const redirects = await nextConfig.redirects!();
    for (const c of ATLAS_CITIES) {
      // Stadtstaaten (Slug == Bundesland-Slug, z. B. Hamburg) bekommen KEINEN
      // flachen Redirect — der würde die Bundesland-Seite abfangen.
      if (c.slug === slugify(c.bundesland)) {
        const flat = `/photovoltaik-foerderung/${c.slug}`;
        expect(redirects.find((x: { source: string }) => x.source === flat), `Stadtstaat ${c.slug} darf keinen flachen Redirect haben`).toBeFalsy();
        continue;
      }
      const flat = `/photovoltaik-foerderung/${c.slug}`;
      const r = redirects.find((x: { source: string }) => x.source === flat);
      expect(r, `redirect for ${flat} missing in next.config.js`).toBeTruthy();
      expect(r!.destination).toBe(cityPath(c));
      expect(r!.permanent).toBe(true);
    }
  });
});

// Audit 28.09.2026: ~185 der 298 flachen Förder-Weiterleitungen endeten auf
// einer 404, weil ihr Ziel eine Stadtadresse ohne veröffentlichte Seite ist.
// Die Liste bleibt fest (Test oben); die Stadtroute leitet einen bekannten Ort
// ohne Seite auf die Seite seines Bundeslands. Geprüft wird die ENDADRESSE jeder
// Weiterleitung, nicht nur das erste Ziel.
describe("no Förder redirect ends on a 404", () => {
  const landSlugs = new Set(foerderBundeslaender().map((b) => b.slug));
  const landSeiten = new Set([...landSlugs].map((s) => `/photovoltaik-foerderung/${s}`));
  const stadtSeiten = new Map(ATLAS_CITIES.map((c) => [cityPath(c), c]));
  const veroeffentlicht = new Set(publishedCities().map((c) => c.slug));

  /** Final address a request to `pfad` lands on, or null for a 404. */
  function endziel(pfad: string): string | null {
    if (pfad === "/photovoltaik-foerderung" || landSeiten.has(pfad)) return pfad;
    const c = stadtSeiten.get(pfad);
    if (!c) return null;
    const um = foerderStadtUmleitung(c, landSlugs);
    if (um === null) return veroeffentlicht.has(c.slug) ? pfad : null;
    return endziel(um);
  }

  it("every /photovoltaik-foerderung redirect reaches an existing page", async () => {
    const redirects = await nextConfig.redirects!();
    const foerder = redirects.filter((r: { source: string }) => r.source.startsWith("/photovoltaik-foerderung/"));
    expect(foerder.length).toBeGreaterThan(100);
    const tot = foerder.filter((r: { destination: string }) => endziel(r.destination) === null).map((r: { source: string }) => r.source);
    expect(tot, "Weiterleitungen, die auf einer 404 enden").toEqual([]);
  });

  it("a known city without a page points at its Bundesland page (or the overview), never at itself", () => {
    const ohneSeite = ATLAS_CITIES.filter((c) => !veroeffentlicht.has(c.slug));
    // Der Fall ist real, sonst prüft der Test nichts.
    expect(ohneSeite.length).toBeGreaterThan(0);
    for (const c of ohneSeite) {
      const um = foerderStadtUmleitung(c, landSlugs);
      expect(um, c.slug).not.toBeNull();
      expect(um === "/photovoltaik-foerderung" || landSeiten.has(um!), `${c.slug} → ${um}`).toBe(true);
    }
    for (const c of ATLAS_CITIES.filter((x) => veroeffentlicht.has(x.slug))) expect(foerderStadtUmleitung(c, landSlugs), c.slug).toBeNull();
  });

  it("the city route builds EVERY known city and redirects the unpublished ones", () => {
    const src = readFileSync(join(__dirname, "../../app/(site)/photovoltaik-foerderung/[bundesland]/[stadt]/page.tsx"), "utf8");
    // Mit publishedCities() in generateStaticParams wären unveröffentlichte
    // Städte wieder harte 404 (dynamicParams = false).
    expect(src).toMatch(/generateStaticParams\(\)\s*\{\s*return ATLAS_CITIES\.map/);
    expect(src).toMatch(/const umleitung = foerderStadtUmleitung\(city\);\s*if \(umleitung\) redirect\(umleitung\)/);
  });
});
