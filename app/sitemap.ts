import { MetadataRoute } from "next";
import { ATLAS_CITIES, slugify, bundeslaenderWithCities } from "../lib/atlas-cities";
import { landProgramBundeslaender } from "../lib/funding-programs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const cityPages: MetadataRoute.Sitemap = ATLAS_CITIES.map((c) => ({
    url: `${BASE_URL}/photovoltaik-foerderung/${slugify(c.bundesland)}/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const blSlugs = new Set([...bundeslaenderWithCities(), ...landProgramBundeslaender()].map((b) => b.slug));
  const bundeslandPages: MetadataRoute.Sitemap = Array.from(blSlugs).map((slug) => ({
    url: `${BASE_URL}/photovoltaik-foerderung/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/photovoltaik-rechner`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pv-bedarf-berechnen`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/waermepumpe-rechner`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/photovoltaik-foerderung`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/pv-simulation`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/strommix-deutschland`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...bundeslandPages,
    ...cityPages,
    { url: `${BASE_URL}/methodik`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/glossar`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kontakt`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
