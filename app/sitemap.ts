import { MetadataRoute } from "next";
import { liveCities, archivedCities, slugify, publishedBundeslaender, fundingForFrom } from "../lib/atlas-cities";
import { landProgramBundeslaender } from "../lib/funding-programs";
import { getFundingPrograms } from "../lib/funding-data";
import { atlasLevelReleased } from "../lib/atlas-index";
import { BUNDESLAENDER } from "../lib/mastr-regions";
import { RATGEBER } from "../lib/ratgeber";
import { standLastModIso } from "../lib/stand";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// <lastmod> from real change dates, not build time: Google ignores a sitemap
// whose lastmod is always "now". Funding pages carry the verification date of
// their program(s); the live energy dashboard genuinely changes daily; the
// remaining static pages omit lastmod (let the crawler decide) rather than lie.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const programs = await getFundingPrograms();
  const toDate = (iso?: string): Date | undefined => {
    if (!iso) return undefined;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : d;
  };
  const fundingDates = programs.map((p) => toDate(p.lastVerified)).filter((d): d is Date => !!d);
  const maxFundingDate = fundingDates.length
    ? new Date(Math.max(...fundingDates.map((d) => d.getTime())))
    : now;

  const cityPages: MetadataRoute.Sitemap = liveCities().map((c) => {
    const f = fundingForFrom(programs, c);
    return {
      url: `${BASE_URL}/photovoltaik-foerderung/${slugify(c.bundesland)}/${c.slug}`,
      lastModified: toDate(f?.lastVerified) ?? maxFundingDate,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });
  // Archive pages (program exhausted/paused/discontinued): still indexable for
  // SEO, but lower priority and less churn than the live ones.
  const archivedCityPages: MetadataRoute.Sitemap = archivedCities().map((c) => {
    const f = fundingForFrom(programs, c);
    return {
      url: `${BASE_URL}/photovoltaik-foerderung/${slugify(c.bundesland)}/${c.slug}`,
      lastModified: toDate(f?.lastVerified) ?? maxFundingDate,
      changeFrequency: "monthly",
      priority: 0.5,
    };
  });
  const blSlugs = new Set([...publishedBundeslaender(), ...landProgramBundeslaender()].map((b) => b.slug));
  const bundeslandPages: MetadataRoute.Sitemap = Array.from(blSlugs).map((slug) => ({
    url: `${BASE_URL}/photovoltaik-foerderung/${slug}`,
    lastModified: maxFundingDate,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Ratgeber aus der Registry statt ein zweites Mal getippt — ein neuer Ratgeber
  // steht damit automatisch in der Sitemap, und das Änderungsdatum kommt aus
  // derselben Zeile wie Titel und Teaser (lib/ratgeber.ts). Bis 27.07.2026
  // standen die vier Pfade hier von Hand und trugen KEIN lastmod; Google kannte
  // die (am 25.07. umgezogenen) URLs deshalb nicht.
  const ratgeberPages: MetadataRoute.Sitemap = RATGEBER.map((r) => ({
    url: `${BASE_URL}${r.slug}`,
    lastModified: toDate(r.updated),
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const ratgeberDaten = RATGEBER.map((r) => toDate(r.updated)).filter((d): d is Date => !!d);
  const neuesterRatgeber = ratgeberDaten.length
    ? new Date(Math.max(...ratgeberDaten.map((d) => d.getTime())))
    : undefined;

  // Solar-Atlas: nur die freigeschalteten Wellen (lib/atlas-index). Aktuell 0a =
  // Deutschland + Bundesländer; Landkreise (0b) waren am 27.07.2026 zwei Stunden
  // frei und sind zurückgenommen, Gemeinden folgen gestaffelt. Der Kreis-Zweig
  // unten bleibt trotzdem stehen: Er hing beim ersten Anlauf an der Freischaltung
  // hinterher, deshalb steht er jetzt VOR ihr bereit und schaltet sich mit.
  const atlasPages: MetadataRoute.Sitemap = [];
  if (atlasLevelReleased("de")) {
    atlasPages.push({ url: `${BASE_URL}/solar-atlas`, lastModified: now, changeFrequency: "monthly", priority: 0.6 });
  }
  if (atlasLevelReleased("bundesland")) {
    for (const bl of BUNDESLAENDER) {
      atlasPages.push({
        url: `${BASE_URL}/solar-atlas/${slugify(bl.name)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }
  // Kreis-Slugs kommen aus der Datenbank, nicht aus einer Liste im Code — sie
  // sind dieselbe Quelle, aus der die Seiten selbst aufgelöst werden. Fällt die
  // Abfrage aus, bleibt die Sitemap ohne Kreise (statt der Build zu scheitern):
  // die Seiten sind trotzdem indexierbar und intern verlinkt.
  if (atlasLevelReleased("landkreis")) {
    try {
      const { getKreisPfade } = await import("../lib/atlas");
      for (const p of await getKreisPfade()) {
        atlasPages.push({
          url: `${BASE_URL}/solar-atlas/${p.bundesland}/${p.kreis}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    } catch {
      // bewusst still: siehe Kommentar oben
    }
  }

  // Rechner-Seiten: `lastModified` ist der jüngste Stand der WERTE einer Seite
  // (lib/stand.ts — dieselbe Quelle, aus der die sichtbare „Stand:"-Zeile unter
  // dem Rechner kommt). Bewusst NICHT der jüngste Prüftag: Zwei Prüfdaten werden
  // täglich nachgezogen (Rechtsstand der Grüngas-Pflicht, Sachstand der
  // EEG-Reform). Hinge `lastmod` daran, meldete die Sitemap jeden Tag
  // „geändert", während sich auf der Seite nur eine Datumszeile in der Fußnote
  // bewegt. Eine Seite ohne Wertstand — die Live-Simulation hat keinen Stichtag
  // — steht weiterhin OHNE `lastmod` da: ein Build-Datum wäre bei jedem Deploy
  // „jetzt" und wird von Google ohnehin ignoriert.
  //
  // Google nutzt `lastmod` nur, solange es „consistently and verifiably
  // accurate" ist, und verlangt dafür eine Änderung am eigentlichen Inhalt —
  // ein mitlaufendes Copyright-Datum nennt es ausdrücklich als Gegenbeispiel.
  // Deshalb hängt das Datum hier an den Zahlen, mit denen der Rechner rechnet:
  // Ändert sich eine, ändert sich die Seite; wird eine nur bestätigt, bewegt
  // sich das Prüfdatum in der Fußnote — und sonst nichts.
  const rechnerStand = (pfad: string) => toDate(standLastModIso(pfad));

  return [
    { url: BASE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/photovoltaik-rechner`, lastModified: rechnerStand("/photovoltaik-rechner"), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pv-bedarf-berechnen`, lastModified: rechnerStand("/pv-bedarf-berechnen"), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/waermepumpe-rechner`, lastModified: rechnerStand("/waermepumpe-rechner"), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/klimaanlage-stromkosten`, lastModified: rechnerStand("/klimaanlage-stromkosten"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/balkonkraftwerk-rechner`, lastModified: rechnerStand("/balkonkraftwerk-rechner"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/einspeiseverguetung-rechner`, lastModified: rechnerStand("/einspeiseverguetung-rechner"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/photovoltaik-foerderung`, lastModified: maxFundingDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/photovoltaik-zubau-deutschland`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/ratgeber`, lastModified: neuesterRatgeber, changeFrequency: "monthly", priority: 0.7 },
    ...ratgeberPages,
    { url: `${BASE_URL}/pv-simulation`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/strommix-deutschland`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/atomstrom-import`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/atomstrom-import/methodik`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/energie-widgets`, changeFrequency: "monthly", priority: 0.6 },
    // Zitierfähigkeit: Die Lizenzseite ist die Stelle, die Redaktionen vor einer
    // Übernahme suchen — deshalb indexierbar und höher gewichtet als die reinen
    // Rechtstexte. /presse und /ueber sind geparkt (noindex, nicht verlinkt) und
    // gehören deshalb bis zur Freigabe nicht in die Sitemap.
    { url: `${BASE_URL}/lizenz`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/widget-nutzungsbedingungen`, changeFrequency: "yearly", priority: 0.3 },
    ...atlasPages,
    ...bundeslandPages,
    ...cityPages,
    ...archivedCityPages,
    { url: `${BASE_URL}/methodik`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/datenstand`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/glossar`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kontakt`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/impressum`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
