import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// ─── Trainingssammler aussperren, Zitierende offen lassen ────────────────────
//
// Die Trennung ist der ganze Punkt und darf beim Pflegen nicht verwischen:
//
//   Trainings-Crawler holen Inhalte, um damit Modelle zu trainieren. Was sie
//   mitnehmen, kommt nie zurück — es taucht später ohne Quelle in Antworten auf.
//   Die stehen unten in TRAINING_CRAWLER.
//
//   Zitier-Crawler holen eine Seite, WEIL gerade jemand danach gefragt hat, und
//   nennen uns in der Antwort. Das ist der Kanal, über den dieses Projekt
//   gefunden wird (siehe CLAUDE.md, SEO: Ratgeber-Seiten als Hebel für
//   KI-Zitate). Die dürfen NIE in die Sperrliste.
//
// Faustregel für neue Namen: Steht "Search" oder "User" im Namen, ist es fast
// immer ein Zitierender — im Zweifel offen lassen. Eine zu weite Sperre merkt
// niemand, sie kostet nur still Reichweite; eine zu enge Sperre ist reparierbar.
//
// Zwei Einschränkungen, die man kennen muss:
//   1. robots.txt ist eine Bitte, kein Zaun. Die großen Anbieter geben an, sich
//      daran zu halten; bei CCBot und Bytespider ist die Bilanz gemischt.
//   2. Die Sperre allein ist kein wirksamer Nutzungsvorbehalt für alles — sie
//      arbeitet mit /.well-known/tdmrep.json zusammen, das den Vorbehalt
//      maschinenlesbar erklärt und für die Bedingungen auf /lizenz verweist.
//      Wer hier etwas ändert, prüft die beiden anderen Stellen mit.

const TRAINING_CRAWLER = [
  "GPTBot", // OpenAI, Modelltraining (NICHT OAI-SearchBot / ChatGPT-User)
  "ClaudeBot", // Anthropic, Modelltraining (NICHT Claude-SearchBot / Claude-User)
  "anthropic-ai",
  "Google-Extended", // Gemini-Training; berührt die Google-Suche nicht
  "Applebot-Extended", // Apple-Training; der normale Applebot bleibt offen
  "Meta-ExternalAgent",
  "CCBot", // Common Crawl — Sammelbecken, aus dem viele Modelle schöpfen
  "Bytespider",
  "Diffbot",
  "Omgilibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // /api/og is the OpenGraph image generator — an image endpoint, never a
        // page. Social scrapers ignore robots.txt, so previews keep working;
        // this just keeps it out of Google's crawl/index. Data APIs and /_next
        // stay open — Googlebot needs them to render the pages.
        userAgent: "*",
        allow: "/",
        disallow: "/api/og",
      },
      {
        userAgent: TRAINING_CRAWLER,
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
