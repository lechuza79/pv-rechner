import { MetadataRoute } from "next";
import { liveCities, archivedCities, slugify, publishedBundeslaender } from "../lib/atlas-cities";
import { landProgramBundeslaender } from "../lib/funding-programs";
import { getFundingPrograms } from "../lib/funding-data";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// <lastmod> from real change dates, not build time: Google ignores a sitemap
// whose lastmod is always "now". Funding pages carry the verification date of
// their program(s); the live energy dashboard genuinely changes daily; the
// remaining static pages omit lastmod (let the crawler decide) rather than lie.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
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
    const f = c.fundingId ? byId.get(c.fundingId) : undefined;
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
    const f = c.fundingId ? byId.get(c.fundingId) : undefined;
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

  return [
    { url: BASE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/photovoltaik-rechner`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pv-bedarf-berechnen`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/waermepumpe-rechner`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/klimaanlage-stromkosten`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/balkonkraftwerk-rechner`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/photovoltaik-foerderung`, lastModified: maxFundingDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/lohnt-sich-pv-mit-speicher`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/lohnt-sich-pv-ohne-einspeiseverguetung`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/pv-simulation`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/strommix-deutschland`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/atomstrom-import`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/atomstrom-import/methodik`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/energie-widgets`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/widget-nutzungsbedingungen`, changeFrequency: "yearly", priority: 0.3 },
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
