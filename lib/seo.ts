import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

/**
 * Build a branded OG image URL (1200x630) rendered by /api/og in "brand" mode.
 * Keep title/subtitle free of subscript/superscript glyphs (e.g. CO₂) — the OG
 * font is JetBrains Mono Bold and lacks them, they render as tofu.
 */
export function brandOgImage(title: string, subtitle = ""): string {
  const p = new URLSearchParams({ view: "brand", t: title });
  if (subtitle) p.set("s", subtitle);
  return `${BASE_URL}/api/og?${p.toString()}`;
}

/**
 * OG image (1200x630) featuring a live snapshot of Germany's current renewable
 * generation as a radial chart, rendered by /api/og in "energy" mode. Used on
 * the homepage. The route fetches live data and revalidates at the CDN, so the
 * card stays current instead of freezing; falls back to a text card on error.
 */
export function energyOgImage(): string {
  return `${BASE_URL}/api/og?view=energy`;
}

interface PageMetaInput {
  /** Canonical path, e.g. "/strommix-deutschland". Resolved against metadataBase. */
  path: string;
  title: string;
  description: string;
  /** OG/Twitter title — defaults to `title`. */
  ogTitle?: string;
  /** OG/Twitter description — defaults to `description`. */
  ogDescription?: string;
  /** Big headline on the generated OG card — defaults to `ogTitle`. */
  ogImageTitle?: string;
  /** Subtitle on the generated OG card. */
  ogImageSubtitle?: string;
  /** Pre-built OG image URL — overrides the generated brand card. */
  ogImage?: string;
}

/**
 * Shared per-route metadata: canonical URL + OpenGraph + Twitter card with a
 * branded OG image. Centralizes the boilerplate so every public page ships a
 * canonical (critical for the share-URL pages that append query params) and a
 * share preview image.
 */
export function pageMetadata(input: PageMetaInput): Metadata {
  const ogTitle = input.ogTitle ?? input.title;
  const ogDescription = input.ogDescription ?? input.description;
  const image =
    input.ogImage ??
    brandOgImage(input.ogImageTitle ?? ogTitle, input.ogImageSubtitle ?? "");

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      url: input.path,
      siteName: "Solar Check",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [image],
    },
  };
}
