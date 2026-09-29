import type { ArticleTeaserItem } from "../components/ArticleTeasers";

/**
 * Curated reading recommendations by Atlas region ID: "de", state (e.g. "15"),
 * district (e.g. "15091"). Add relevant articles here; regions without entries
 * render no empty section. Rendering stays in the shared ArticleTeasers component.
 */
export const atlasEditorialLinks: Record<string, ArticleTeaserItem[]> = {
  de: [
    {
      href: "/laendervergleich",
      title: "Photovoltaik-Ausbau im internationalen Vergleich",
      teaser: "Wie steht Deutschland beim Solarausbau im Vergleich zu anderen Ländern da?",
    },
  ],
};
