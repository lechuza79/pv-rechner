/**
 * Serialize an object for embedding inside a
 * <script type="application/ld+json"> block.
 *
 * Escapes "<" to its JSON unicode form so a "</script>" (or "<!--") sequence
 * inside any string value — e.g. a funding-program name or FAQ text pulled from
 * the database — cannot break out of the script tag and inject markup. JSON
 * semantics are unchanged (parsers read < as "<").
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * BreadcrumbList schema built from an existing breadcrumb trail. The last item
 * (the current page) may omit its path — Google treats the final crumb as the
 * page itself. Paths are resolved to absolute URLs against `baseUrl`.
 */
export function breadcrumbJsonLd(
  items: { name: string; path?: string }[],
  baseUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: `${baseUrl}${it.path}` } : {}),
    })),
  };
}
