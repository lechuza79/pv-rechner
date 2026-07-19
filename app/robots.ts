import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/og is the OpenGraph image generator — an image endpoint, never a page.
    // Social scrapers ignore robots.txt, so previews keep working; this just keeps
    // it out of Google's crawl/index. Data APIs and /_next stay open — Googlebot
    // needs them to render the pages.
    rules: { userAgent: "*", allow: "/", disallow: "/api/og" },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
