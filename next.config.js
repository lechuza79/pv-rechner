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
