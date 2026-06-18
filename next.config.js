/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev server uses .next-dev/, build uses .next/ (Vercel-compatible)
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  env: {
    NEXT_PUBLIC_BASE_URL: "https://solar-check.io",
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "a" }],
        destination: "/photovoltaik-rechner",
        permanent: false,
      },
      // Keyword-optimierte Slugs (Juni 2026) — alte Pfade dauerhaft umleiten,
      // damit geteilte Links (Query-Parameter werden automatisch durchgereicht)
      // und Google-Index nicht brechen.
      { source: "/rechner", destination: "/photovoltaik-rechner", permanent: true },
      { source: "/waermepumpe", destination: "/waermepumpe-rechner", permanent: true },
      { source: "/energie", destination: "/strommix-deutschland", permanent: true },
      { source: "/empfehlung", destination: "/pv-bedarf-berechnen", permanent: true },
      { source: "/simulation", destination: "/pv-simulation", permanent: true },
      // Förder-Stadtseiten: flache Slugs → Hierarchie Bundesland/Kommune.
      // Feste historische Zuordnung (alte URLs wachsen nicht mehr) — bei neuer
      // Stadt hier ergänzen (Quelle: lib/atlas-cities.ts).
      { source: "/photovoltaik-foerderung/stuttgart", destination: "/photovoltaik-foerderung/baden-wuerttemberg/stuttgart", permanent: true },
      { source: "/photovoltaik-foerderung/karlsruhe", destination: "/photovoltaik-foerderung/baden-wuerttemberg/karlsruhe", permanent: true },
      { source: "/photovoltaik-foerderung/regensburg", destination: "/photovoltaik-foerderung/bayern/regensburg", permanent: true },
      { source: "/photovoltaik-foerderung/wuerzburg", destination: "/photovoltaik-foerderung/bayern/wuerzburg", permanent: true },
      { source: "/photovoltaik-foerderung/frankfurt", destination: "/photovoltaik-foerderung/hessen/frankfurt", permanent: true },
      { source: "/photovoltaik-foerderung/darmstadt", destination: "/photovoltaik-foerderung/hessen/darmstadt", permanent: true },
      { source: "/photovoltaik-foerderung/koeln", destination: "/photovoltaik-foerderung/nordrhein-westfalen/koeln", permanent: true },
      { source: "/photovoltaik-foerderung/duesseldorf", destination: "/photovoltaik-foerderung/nordrhein-westfalen/duesseldorf", permanent: true },
      { source: "/photovoltaik-foerderung/muenchen", destination: "/photovoltaik-foerderung/bayern/muenchen", permanent: true },
      { source: "/photovoltaik-foerderung/nuernberg", destination: "/photovoltaik-foerderung/bayern/nuernberg", permanent: true },
      { source: "/photovoltaik-foerderung/freiburg", destination: "/photovoltaik-foerderung/baden-wuerttemberg/freiburg", permanent: true },
      { source: "/photovoltaik-foerderung/heidelberg", destination: "/photovoltaik-foerderung/baden-wuerttemberg/heidelberg", permanent: true },
      { source: "/photovoltaik-foerderung/mannheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/mannheim", permanent: true },
      { source: "/photovoltaik-foerderung/muenster", destination: "/photovoltaik-foerderung/nordrhein-westfalen/muenster", permanent: true },
      { source: "/photovoltaik-foerderung/aachen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/aachen", permanent: true },
      { source: "/photovoltaik-foerderung/wiesbaden", destination: "/photovoltaik-foerderung/hessen/wiesbaden", permanent: true },
      { source: "/photovoltaik-foerderung/mainz", destination: "/photovoltaik-foerderung/rheinland-pfalz/mainz", permanent: true },
      { source: "/photovoltaik-foerderung/leipzig", destination: "/photovoltaik-foerderung/sachsen/leipzig", permanent: true },
      { source: "/photovoltaik-foerderung/hannover", destination: "/photovoltaik-foerderung/niedersachsen/hannover", permanent: true },
      { source: "/photovoltaik-foerderung/dresden", destination: "/photovoltaik-foerderung/sachsen/dresden", permanent: true },
      { source: "/photovoltaik-foerderung/dortmund", destination: "/photovoltaik-foerderung/nordrhein-westfalen/dortmund", permanent: true },
      { source: "/photovoltaik-foerderung/essen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/essen", permanent: true },
      { source: "/photovoltaik-foerderung/bonn", destination: "/photovoltaik-foerderung/nordrhein-westfalen/bonn", permanent: true },
      { source: "/photovoltaik-foerderung/kiel", destination: "/photovoltaik-foerderung/schleswig-holstein/kiel", permanent: true },
      { source: "/photovoltaik-foerderung/erfurt", destination: "/photovoltaik-foerderung/thueringen/erfurt", permanent: true },
      { source: "/photovoltaik-foerderung/magdeburg", destination: "/photovoltaik-foerderung/sachsen-anhalt/magdeburg", permanent: true },
      { source: "/photovoltaik-foerderung/potsdam", destination: "/photovoltaik-foerderung/brandenburg/potsdam", permanent: true },
      { source: "/photovoltaik-foerderung/rostock", destination: "/photovoltaik-foerderung/mecklenburg-vorpommern/rostock", permanent: true },
      { source: "/photovoltaik-foerderung/saarbruecken", destination: "/photovoltaik-foerderung/saarland/saarbruecken", permanent: true },
      { source: "/photovoltaik-foerderung/augsburg", destination: "/photovoltaik-foerderung/bayern/augsburg", permanent: true },
      { source: "/photovoltaik-foerderung/kassel", destination: "/photovoltaik-foerderung/hessen/kassel", permanent: true },
      { source: "/photovoltaik-foerderung/luebeck", destination: "/photovoltaik-foerderung/schleswig-holstein/luebeck", permanent: true },
      { source: "/photovoltaik-foerderung/halle", destination: "/photovoltaik-foerderung/sachsen-anhalt/halle", permanent: true },
      // Hamburg/Bremen: Stadtstaaten — flacher Slug = Bundesland-Slug, daher KEIN
      // Redirect (würde die Bundesland-Seite abfangen). Stadt-Seite liegt unter
      // /hamburg/hamburg bzw. /bremen/bremen, erreichbar über die Bundesland-Seite.
      // Legacy Vercel preview host → production (handled by Next before middleware
      // so it doesn't consume middleware invocations)
      {
        source: "/:path*",
        has: [{ type: "host", value: "pv-rechner-alpha.vercel.app" }],
        destination: "https://solar-check.io/:path*",
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
