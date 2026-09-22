import type { Metadata, Viewport } from "next";
import { getCssVariables } from "../../lib/theme";
import { widgetBasisCss } from "../../lib/widget-basis-css";

/**
 * Root layout of the new municipality page (approved design, 09/2026).
 *
 * A separate route group with its own document, like the homepage: the page
 * brings the design's stylesheets in the order the approved prototype loads
 * them (public/atlas-design-preview/index.html), so the cascade is the same.
 * Nothing of the old (site) layout — header, footer, daylight theme — applies.
 *
 * The stylesheets still live in the prototype folder; before the switch they
 * move to public/gemeinde/ (docs/gemeindeseite-integration.md).
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const STYLESHEETS = [
  "/gemeinde/basis.css",
  "/hero-system/hero.css",
  "/atlas-design-preview/atlas.css",
  "/atlas-design-preview/fonts/display-fonts.css",
  "/atlas-design-preview/font-test.css",
  "/atlas-design-preview/variant3.css",
  "/shared-nav/nav.css",
  "/atlas-design-preview/shared-person/person.css",
  "/shared-footer/footer.css",
  "/atlas-design-preview/current-theme.css",
  "/design-system/feature-card.css",
  "/shared-nav/header.css",
  "/atlas-design-preview/responsive-sizing.css",
  "/atlas-design-preview/ranking.css",
  "/atlas-design-preview/delta.css",
];

export default function GemeindeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      data-atlas-boot="ready"
      // The approved headline font. The prototype set it through its font
      // comparison tool (font-test.js, "?displayfont=montserrat-bold"); the
      // tool itself is not part of the page, only its chosen result.
      className="font-test-active"
      style={{ ["--atlas-display-font" as string]: '"Montserrat Bold"', ["--atlas-display-weight" as string]: "700" }}
    >
      <head>
        <link rel="preload" href="/atlas-design-preview/fonts/montserrat-bold-0.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/atlas-design-preview/dynamic-hero/atlas-shell-0.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* The site's colour tokens, for the parts that come from the React
            side (subscription dialog, footer logo). Variables only — no
            global rules, so the design's own stylesheets stay in charge. */}
        <style dangerouslySetInnerHTML={{ __html: getCssVariables() }} />
        {/* The widget tokens for the story strip and monitor, which render
            inline under this class (same source as the embed layout). */}
        <style dangerouslySetInnerHTML={{ __html: widgetBasisCss(".gemeinde-widgets", ".gemeinde-widgets") }} />
        {STYLESHEETS.map((href) => (
          // eslint-disable-next-line @next/next/no-css-tags
          <link key={href} rel="stylesheet" href={href} precedence="default" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
