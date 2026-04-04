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
    ];
  },
}

module.exports = nextConfig
