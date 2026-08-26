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
  "Applebot-Extended", // Apple-Training; der normale Applebot bleibt offen
  "CCBot", // Common Crawl — Sammelbecken, aus dem viele Modelle schöpfen
  "Bytespider",
  "Omgilibot",
];

// BEWUSST NICHT GESPERRT, obwohl sie Training bedienen — sie bedienen eben nicht
// NUR das (Audit 17.08.2026, an den Anbieter-Dokumentationen geprüft):
//
//   Google-Extended steuert außer dem Gemini-Training auch das Grounding, also
//     das Nachschlagen im Suchindex zur Antwortzeit. Grounding IST der
//     Zitierfall. Eine Sperre hätte uns aus Gemini-Antworten genommen, ohne
//     dass irgendetwas kaputtgegangen wäre — die Sorte Fehler, die man erst an
//     ausbleibendem Verkehr merkt.
//   Meta-ExternalAgent nennt in Metas eigener Beschreibung neben dem Training
//     ausdrücklich das Indexieren von Inhalten für Produkte.
//   Diffbot baut einen Wissensgraphen und führt Quellen.
//
// Wer einen dieser Namen doch aufnimmt, prüft vorher die Doku des Anbieters und
// begründet es hier — "klingt nach KI" reicht nicht.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // /api/og is the OpenGraph image generator — an image endpoint, never a
        // page. Social scrapers ignore robots.txt, so previews keep working;
        // this just keeps it out of Google's crawl/index. Data APIs and /_next
        // stay open — Googlebot needs them to render the pages.
        //
        // /solar-atlas/ranking ist die zweite Sperre, und sie ist eine KOSTEN-
        // entscheidung, keine SEO-Entscheidung. Gemessen am 26.08.2026 über 24 h:
        // 8.909 von 15.757 Funktionsaufrufen der ganzen Domain (57 %) gingen auf
        // diese eine Route, und die Stichprobe über drei Stunden fand
        // AUSNAHMSLOS `x-vercel-cache: MISS` — also jedes Mal ein voller
        // Serverless-Render mit seinen Datenbank-Abfragen, ein ISR-Write und
        // eine Übertragung vom Origin ans CDN. Das ist der größte Einzelposten
        // der Vercel-Rechnung (25.07.–24.08.2026: 259 $ netto, davon ~185 $ auf
        // der Auslieferungsseite).
        //
        // WARUM DAS HIER GEFAHRLOS IST — und nur hier: Die Ranglisten stehen
        // ohnehin auf `noindex` (atlasRobots(false) in der Route) und in KEINER
        // Sitemap. Wir sperren also nichts aus, was in einer Suchmaschine stehen
        // soll; wir hören nur auf, es Crawlern zum Abholen anzubieten. Für
        // Menschen bleibt jede Seite normal erreichbar und aus dem Atlas
        // verlinkt.
        //
        // Der Grund für den Dauer-MISS ist die Kombinatorik: Kennzahl ×
        // Größenklasse × Bundesland × Landkreis ergibt Tausende Adressen, viele
        // davon inhaltlich leer (Landeshauptstädte innerhalb eines Landkreises
        // gibt es nicht). Bei so vielen Adressen ist der Cache nie warm — der
        // Aufwärm-Lauf deckt nur die obersten zwei Ebenen ab.
        //
        // NICHT auf die Gemeinde-, Kreis- oder Förderseiten ausweiten: Die
        // sollen gefunden werden, dort wäre dieselbe Zeile ein SEO-Schaden.
        userAgent: "*",
        allow: "/",
        disallow: ["/api/og", "/solar-atlas/ranking"],
      },
      {
        userAgent: TRAINING_CRAWLER,
        // Die Erklärung des Vorbehalts bleibt lesbar: Ein Disallow über die
        // ganze Domain deckt sonst auch /.well-known/tdmrep.json ab — wir
        // würden dem Sammler die Datei vorenthalten, die ihm sagt, woran er
        // sich halten soll.
        allow: "/.well-known/",
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
