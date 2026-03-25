/** @type {import('next').NextConfig} */
const nextConfig = {
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
