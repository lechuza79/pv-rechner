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
        destination: "/rechner",
        permanent: false,
      },
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
