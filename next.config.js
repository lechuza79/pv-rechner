/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate output dir for production builds so they never corrupt
  // the dev server's .next/ cache (which caused "Cannot find module ./948.js")
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
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
